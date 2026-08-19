import { Hono } from "hono";
import type { Env } from "@shared/types/env";
import { optionalAuth } from "../auth/middleware";
import { listRepos, getRepoStats, getRepoByFullName, toRepoDetail } from "./repos.db";
import { listFilesForRepo } from "./files.db";
import { buildFileUrl } from "./repoUrl";
import type { PlatformStats, RepoStatsResponse, ReposListResponse, RepoFilesResponse } from "@shared/types/models";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.get("/", optionalAuth, async (c) => {
  const search = c.req.query("q")?.trim() || undefined;
  const visibilityParam = c.req.query("visibility");
  const visibility = visibilityParam === "public" || visibilityParam === "private" ? visibilityParam : undefined;
  const platform = c.req.query("platform")?.trim() || undefined;
  const limit = Math.min(Number(c.req.query("limit")) || 50, 200);
  const offset = Math.max(Number(c.req.query("offset")) || 0, 0);
  const isAuthenticated = Boolean(c.get("user"));

  const { repos, hasMore, total } = await listRepos(c.env.DB, { search, isAuthenticated, visibility, platform, limit, offset });
  const response: ReposListResponse = { repos, limit, offset, hasMore, total };
  return c.json(response);
});

app.get("/stats", optionalAuth, async (c) => {
  const isAuthenticated = Boolean(c.get("user"));
  const rows = await getRepoStats(c.env.DB, { isAuthenticated });

  const byPlatform = new Map<string, PlatformStats>();
  for (const r of rows) {
    const existing = byPlatform.get(r.platform) ?? {
      platform: r.platform as PlatformStats["platform"],
      publicRepoCount: 0,
      publicFileCount: 0,
      privateRepoCount: 0,
      privateFileCount: 0,
    };
    if (r.visibility === "private") {
      existing.privateRepoCount += r.repo_count;
      existing.privateFileCount += r.file_count;
    } else {
      existing.publicRepoCount += r.repo_count;
      existing.publicFileCount += r.file_count;
    }
    byPlatform.set(r.platform, existing);
  }

  const platforms = [...byPlatform.values()];
  const response: RepoStatsResponse = {
    platforms,
    totalPublicRepos: platforms.reduce((sum, p) => sum + p.publicRepoCount, 0),
    totalPublicFiles: platforms.reduce((sum, p) => sum + p.publicFileCount, 0),
    totalPrivateRepos: platforms.reduce((sum, p) => sum + p.privateRepoCount, 0),
    totalPrivateFiles: platforms.reduce((sum, p) => sum + p.privateFileCount, 0),
  };
  return c.json(response);
});

// fullName can itself contain slashes (GitLab nested-namespace projects like
// "group/subgroup/project"), so it's captured as a greedy regex param rather
// than split into fixed :owner/:name segments.
app.get("/:fullName{.+}/files", optionalAuth, async (c) => {
  const fullName = c.req.param("fullName");
  const isAuthenticated = Boolean(c.get("user"));

  const repo = await getRepoByFullName(c.env.DB, fullName);
  if (!repo || (repo.visibility === "private" && !isAuthenticated)) {
    return c.json({ error: "Not found" }, 404);
  }

  const search = c.req.query("q")?.trim() || undefined;
  // No pagination UI on the repo file-tree page — it fetches the whole repo
  // listing in one shot and builds the tree client-side. 10000 comfortably
  // covers any repo this tool indexes.
  const limit = Math.min(Number(c.req.query("limit")) || 10000, 10000);
  const offset = Math.max(Number(c.req.query("offset")) || 0, 0);

  const { paths, hasMore } = await listFilesForRepo(c.env.DB, repo.id, { search, limit, offset });

  const response: RepoFilesResponse = {
    repo: toRepoDetail(repo),
    files: paths.map((path) => ({ path, url: buildFileUrl(repo.platform, repo.full_name, repo.default_branch, path) })),
    limit,
    offset,
    hasMore,
  };
  return c.json(response);
});

export default app;
