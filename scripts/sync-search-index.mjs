#!/usr/bin/env node
/**
 * @title Search Index Sync
 * @description Fetch every repo (+ file tree) from GitHub/GitLab and push the index to this app's own ingest API
 * @author ropean, Claude Sonnet (Anthropic)
 *
 * Fetches repos straight from the platform APIs and calls its own
 * `/api/v1/*` endpoints (docs/SEARCH_API_SPEC.md) — no `data/repos-*.json`
 * intermediate.
 *
 * This is an additive, optional job: if SEARCH_API_BASE_URL / SEARCH_API_KEY_ID
 * / SEARCH_API_PRIVATE_KEY aren't all configured, this exits 0 having done
 * nothing. See docs/SEARCH_INDEX_SYNC_SETUP.md.
 *
 * @example
 * node scripts/sync-search-index.mjs
 * node scripts/sync-search-index.mjs --force
 */

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";

import { GitHubAdapter } from "./adapters/github.mjs";
import { GitLabAdapter } from "./adapters/gitlab.mjs";
import { fetchWithRetry } from "./lib/fetcher.mjs";
import { loadSearchApiConfig, signedRequest } from "./lib/signRequest.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADAPTERS = { github: GitHubAdapter, gitlab: GitLabAdapter };
const UPLOAD_CONCURRENCY = 6;
const FORCE = process.argv.includes("--force");

// Sentinel head_sha for repos with no commits yet. Reusing git's own
// "no object" sha keeps it stable across runs, so the server's idempotent
// fast path (same headSha + already indexed) skips re-touching FTS5 rows
// on every subsequent sync instead of re-diffing an always-empty repo.
const EMPTY_REPO_SHA = "0000000000000000000000000000000000000000";

/** Reads platform base URL / token from env, keyed by scripts/config/platforms.json. */
const getPlatformRuntimeConfig = async () => {
  const configPath = join(__dirname, "config", "platforms.json");
  const { platforms } = JSON.parse(await readFile(configPath, "utf-8"));

  const result = {};
  for (const platform of platforms) {
    if (!platform.enabled || !ADAPTERS[platform.name]) continue;
    const owner = process.env[platform.envVars.owner];
    const token = process.env[platform.envVars.token];
    if (!owner && !token) continue;

    result[platform.name] = new ADAPTERS[platform.name]({
      name: platform.name,
      baseUrl: platform.baseUrl,
      token,
      owner,
      authType: platform.authType,
    });
  }
  return result;
};

/** Paginates a platform's "list repositories" endpoint into repo detail payloads (SyncStartRepoPayload shape). */
const listPlatformRepos = async (platform, adapter) => {
  const repos = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = adapter.buildReposUrl(page, 100);
    const response = await fetchWithRetry(url, { headers: adapter.getHeaders() });
    if (!response.ok) throw new Error(`${platform} repos fetch failed: ${response.status} ${response.statusText}`);

    const rateLimit = adapter.checkRateLimit(response);
    if (rateLimit.warning) {
      const resetInfo = rateLimit.resetTime ? ` (resets at ${rateLimit.resetTime.toLocaleTimeString()})` : "";
      console.warn(`  ⚠️  ${platform} rate limit warning: ${rateLimit.remaining} requests remaining${resetInfo}`);
    }

    const raw = await response.json();
    repos.push(...raw.map((r) => adapter.convertToRepoDetail(r)));

    hasMore = adapter.hasMorePages(raw, 100);
    page++;
  }

  return repos;
};

const splitFullName = (fullName) => {
  const idx = fullName.indexOf("/");
  return { owner: fullName.slice(0, idx), repo: fullName.slice(idx + 1) };
};

/** Runs async tasks with a concurrency cap; never throws, collects errors instead. */
const runWithConcurrency = async (items, limit, worker) => {
  const results = [];
  let cursor = 0;

  const runNext = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      try {
        results[index] = { ok: true, value: await worker(items[index]) };
      } catch (error) {
        results[index] = { ok: false, error, item: items[index] };
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runNext));
  return results;
};

const fetchGitHubTree = async (adapter, fullName, branch) => {
  const url = adapter.buildTreeUrl(fullName, branch);
  const response = await fetchWithRetry(url, { headers: adapter.getHeaders() });
  if (response.status === 404) {
    // GitHub's git/trees endpoint 404s when `branch` has no commits, which
    // is exactly what an empty repo looks like. Treat that as zero files
    // instead of an upload failure, so one empty repo can't permanently
    // block sync/complete for every future run.
    return { headSha: EMPTY_REPO_SHA, files: [], truncated: false };
  }
  if (!response.ok) throw new Error(`GitHub tree fetch failed: ${response.status}`);
  return adapter.parseTreeResponse(await response.json());
};

const MAX_GITLAB_TREE_PAGES = 200;

const fetchGitLabTree = async (adapter, fullName, branch) => {
  const branchResponse = await fetchWithRetry(adapter.buildBranchUrl(fullName, branch), { headers: adapter.getHeaders() });
  if (branchResponse.status === 404) {
    // Same empty-repo case as GitHub: an empty GitLab project has no
    // branches at all, so the branch lookup 404s before the tree is ever
    // paginated. Zero files, not a failure.
    return { headSha: EMPTY_REPO_SHA, files: [], truncated: false };
  }
  if (!branchResponse.ok) throw new Error(`GitLab branch fetch failed: ${branchResponse.status}`);
  const headSha = adapter.parseBranchResponse(await branchResponse.json());

  const files = [];
  let page = 1;
  let truncated = false;
  const perPage = 100;

  while (page <= MAX_GITLAB_TREE_PAGES) {
    const response = await fetchWithRetry(adapter.buildTreeUrl(fullName, branch, page, perPage), { headers: adapter.getHeaders() });
    if (!response.ok) throw new Error(`GitLab tree fetch failed: ${response.status}`);
    const pageItems = await response.json();
    files.push(...adapter.parseTreePage(pageItems));

    if (pageItems.length < perPage) break;
    page++;
    if (page > MAX_GITLAB_TREE_PAGES) truncated = true;
  }

  return { headSha, files, truncated };
};

const fetchTree = (platform, adapter, fullName, branch) => {
  if (platform === "github") return fetchGitHubTree(adapter, fullName, branch);
  if (platform === "gitlab") return fetchGitLabTree(adapter, fullName, branch);
  throw new Error(`No tree fetcher implemented for platform: ${platform}`);
};

const main = async () => {
  const searchConfig = loadSearchApiConfig();
  if (!searchConfig.enabled) {
    console.log("⊘ Search index sync skipped: missing env vars:", searchConfig.missing.join(", "));
    process.exitCode = 0;
    return;
  }

  const adapters = await getPlatformRuntimeConfig();
  if (Object.keys(adapters).length === 0) {
    console.log("⊘ Search index sync skipped: no platform credentials configured (GIT_GITHUB_* / GIT_GITLAB_*).");
    process.exitCode = 0;
    return;
  }

  console.log("Listing repositories from all configured platforms...");
  const allRepos = [];
  for (const [platform, adapter] of Object.entries(adapters)) {
    const repos = await listPlatformRepos(platform, adapter);
    console.log(`  ${platform}: ${repos.length} repositories`);
    allRepos.push(...repos);
  }

  const activeRepos = allRepos.filter((r) => !r.disabled);

  const runId = randomUUID();
  const generatedAt = new Date().toISOString();

  console.log(`Syncing search index for ${activeRepos.length} repositories (run ${runId})...`);

  let startResponse;
  try {
    startResponse = await signedRequest(searchConfig, "POST", "/api/v1/sync/start", {
      runId,
      generatedAt,
      repos: activeRepos,
    });
  } catch (error) {
    console.error("✗ sync/start failed, aborting this run:", error.message);
    process.exitCode = 1;
    return;
  }

  const needsUpload = new Set((startResponse?.needsUpload || []).map((r) => `${r.platform}:${r.fullName}`));
  const toUpload = FORCE ? activeRepos : activeRepos.filter((r) => needsUpload.has(`${r.platform}:${r.fullName}`));

  console.log(FORCE ? `  ${toUpload.length} repositories force-uploaded (--force, ignoring needsUpload).` : `  ${toUpload.length} repositories need a fresh file index.`);

  const uploadResults = await runWithConcurrency(toUpload, UPLOAD_CONCURRENCY, async (repo) => {
    const adapter = adapters[repo.platform];
    const { headSha, files, truncated } = await fetchTree(repo.platform, adapter, repo.fullName, repo.defaultBranch || "main");
    if (truncated) {
      console.warn(`  ⚠️  ${repo.fullName}: file tree truncated, index may be incomplete`);
    }

    const { owner, repo: repoName } = splitFullName(repo.fullName);
    await signedRequest(searchConfig, "PUT", `/api/v1/repos/${repo.platform}/${owner}/${repoName}/files`, {
      runId,
      headSha,
      generatedAt: new Date().toISOString(),
      files,
    });
    return repo.fullName;
  });

  const failed = uploadResults.filter((r) => !r.ok);
  const succeeded = uploadResults.filter((r) => r.ok);

  for (const failure of failed) {
    console.error(`  ✗ ${failure.item.fullName}: ${failure.error.message}`);
  }

  if (failed.length > 0) {
    console.warn(`⚠️  ${failed.length}/${toUpload.length} repositories failed to upload. Skipping sync/complete so the backend keeps deferring deletions until a clean run.`);
    process.exitCode = 0;
    return;
  }

  await signedRequest(searchConfig, "POST", "/api/v1/sync/complete", {
    runId,
    generatedAt: new Date().toISOString(),
    stats: {
      totalRepos: activeRepos.length,
      changed: succeeded.length,
      unchanged: activeRepos.length - toUpload.length,
    },
  });

  console.log(`✓ Search index sync complete: ${succeeded.length} updated, run ${runId}`);
  process.exitCode = 0;
};

main().catch((error) => {
  console.error("✗ Unexpected error during search index sync:", error);
  process.exitCode = 1;
});
