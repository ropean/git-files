import type { Repo, RepoDetail, RepoWithFileCount, SyncStartRepoPayload } from "@shared/types/models";
import { ulid } from "ulid";

/** Repo row (snake_case, booleans as 0/1, topics as a JSON string) -> API-facing RepoDetail (camelCase, real booleans/array). */
export function toRepoDetail(repo: Repo): RepoDetail {
  let topics: string[] = [];
  try {
    topics = JSON.parse(repo.topics || "[]");
  } catch {
    topics = [];
  }

  return {
    id: repo.id,
    platform: repo.platform,
    fullName: repo.full_name,
    visibility: repo.visibility,
    defaultBranch: repo.default_branch,
    headSha: repo.head_sha,
    pushedAt: repo.pushed_at,
    indexedAt: repo.indexed_at,

    description: repo.description,
    homepage: repo.homepage,
    language: repo.language,
    languageColor: repo.language_color,
    fork: Boolean(repo.is_fork),
    archived: Boolean(repo.is_archived),
    disabled: Boolean(repo.is_disabled),
    isTemplate: Boolean(repo.is_template),
    hasIssues: Boolean(repo.has_issues),
    hasProjects: Boolean(repo.has_projects),
    hasWiki: Boolean(repo.has_wiki),
    hasPages: Boolean(repo.has_pages),
    hasDiscussions: Boolean(repo.has_discussions),
    size: repo.size,
    stars: repo.stars,
    forks: repo.forks,
    watchers: repo.watchers,
    openIssues: repo.open_issues,
    createdAt: repo.repo_created_at,
    htmlUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    license: repo.license,
    owner: repo.owner_login
      ? {
          login: repo.owner_login,
          avatarUrl: repo.owner_avatar_url,
          htmlUrl: repo.owner_html_url,
          type: repo.owner_type,
        }
      : null,
    topics,
    mirrorUrl: repo.mirror_url,
  };
}

export interface ListReposOptions {
  search?: string;
  isAuthenticated?: boolean;
  visibility?: "public" | "private";
  platform?: string;
  limit?: number;
  offset?: number;
}

export async function listRepos(db: D1Database, options: ListReposOptions = {}): Promise<{ repos: RepoWithFileCount[]; hasMore: boolean; total: number }> {
  const { search, isAuthenticated, visibility, platform, limit = 50, offset = 0 } = options;

  const conditions: string[] = ["r.status = 'active'"];
  const params: (string | number)[] = [];

  if (!isAuthenticated) {
    conditions.push("r.visibility = 'public'");
  } else if (visibility) {
    conditions.push("r.visibility = ?");
    params.push(visibility);
  }

  if (platform) {
    conditions.push("r.platform = ?");
    params.push(platform);
  }

  if (search) {
    conditions.push("r.full_name LIKE ?");
    params.push(`%${search}%`);
  }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const sql = `
    SELECT r.*, (SELECT COUNT(*) FROM files f WHERE f.repo_id = r.id) AS file_count
    FROM repos r
    ${where}
    ORDER BY r.pushed_at DESC
    LIMIT ? OFFSET ?
  `;
  // Fetch one extra row to detect hasMore without a second COUNT query.
  const listParams = [...params, limit + 1, offset];

  const [result, countResult] = await Promise.all([
    db
      .prepare(sql)
      .bind(...listParams)
      .all<RepoWithFileCount>(),
    db
      .prepare(`SELECT COUNT(*) AS total FROM repos r ${where}`)
      .bind(...params)
      .first<{ total: number }>(),
  ]);
  const hasMore = result.results.length > limit;
  return { repos: result.results.slice(0, limit), hasMore, total: countResult?.total ?? 0 };
}

export async function getRepoByFullName(db: D1Database, fullName: string): Promise<Repo | null> {
  return db.prepare("SELECT * FROM repos WHERE full_name = ? AND status = 'active' LIMIT 1").bind(fullName).first<Repo>();
}

export interface GetRepoStatsOptions {
  isAuthenticated?: boolean;
}

export async function getRepoStats(db: D1Database, options: GetRepoStatsOptions = {}): Promise<{ platform: string; visibility: string; repo_count: number; file_count: number }[]> {
  const { isAuthenticated } = options;

  const conditions: string[] = ["r.status = 'active'"];
  if (!isAuthenticated) {
    conditions.push("r.visibility = 'public'");
  }
  const where = `WHERE ${conditions.join(" AND ")}`;

  const sql = `
    SELECT r.platform AS platform, r.visibility AS visibility, COUNT(DISTINCT r.id) AS repo_count, COUNT(f.id) AS file_count
    FROM repos r
    LEFT JOIN files f ON f.repo_id = r.id
    ${where}
    GROUP BY r.platform, r.visibility
    ORDER BY r.platform, r.visibility
  `;

  const result = await db.prepare(sql).all<{ platform: string; visibility: string; repo_count: number; file_count: number }>();
  return result.results;
}

export async function getRepoByPlatformFullName(db: D1Database, platform: string, fullName: string): Promise<Repo | null> {
  return db.prepare("SELECT * FROM repos WHERE platform = ? AND full_name = ?").bind(platform, fullName).first<Repo>();
}

/** Repos currently `active`, minimal columns — used to diff an incoming sync/start manifest against. */
export async function getActiveRepoKeys(db: D1Database): Promise<{ platform: string; full_name: string; pushed_at: number | null }[]> {
  const result = await db.prepare("SELECT platform, full_name, pushed_at FROM repos WHERE status = 'active'").all<{ platform: string; full_name: string; pushed_at: number | null }>();
  return result.results;
}

/** Upsert every repo from a sync/start manifest. Does not touch head_sha/indexed_at — those only change via replaceRepoFiles(). */
export async function upsertReposBatch(db: D1Database, repos: SyncStartRepoPayload[]): Promise<void> {
  if (repos.length === 0) return;
  const statements = repos.map((r) =>
    db
      .prepare(
        `INSERT INTO repos (
           id, platform, full_name, visibility, default_branch, pushed_at, status, pending_delete_run_id,
           description, homepage, language, language_color, is_fork, is_archived, is_disabled, is_template,
           has_issues, has_projects, has_wiki, has_pages, has_discussions,
           size, stars, forks, watchers, open_issues, repo_created_at,
           html_url, clone_url, license, owner_login, owner_avatar_url, owner_html_url, owner_type, topics, mirror_url
         )
         VALUES (?, ?, ?, ?, ?, ?, 'active', NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(platform, full_name) DO UPDATE SET
           visibility = excluded.visibility,
           default_branch = excluded.default_branch,
           pushed_at = excluded.pushed_at,
           status = 'active',
           pending_delete_run_id = NULL,
           description = excluded.description,
           homepage = excluded.homepage,
           language = excluded.language,
           language_color = excluded.language_color,
           is_fork = excluded.is_fork,
           is_archived = excluded.is_archived,
           is_disabled = excluded.is_disabled,
           is_template = excluded.is_template,
           has_issues = excluded.has_issues,
           has_projects = excluded.has_projects,
           has_wiki = excluded.has_wiki,
           has_pages = excluded.has_pages,
           has_discussions = excluded.has_discussions,
           size = excluded.size,
           stars = excluded.stars,
           forks = excluded.forks,
           watchers = excluded.watchers,
           open_issues = excluded.open_issues,
           repo_created_at = excluded.repo_created_at,
           html_url = excluded.html_url,
           clone_url = excluded.clone_url,
           license = excluded.license,
           owner_login = excluded.owner_login,
           owner_avatar_url = excluded.owner_avatar_url,
           owner_html_url = excluded.owner_html_url,
           owner_type = excluded.owner_type,
           topics = excluded.topics,
           mirror_url = excluded.mirror_url,
           updated_at = unixepoch()`,
      )
      .bind(
        ulid(),
        r.platform,
        r.fullName,
        r.visibility,
        // r.defaultBranch can be null for a repo with no commits yet (an
        // empty repo has no branches at all); default_branch is NOT NULL,
        // so a bare bind() here throws a constraint violation that fails
        // the whole batch — one empty repo would 500 every repo's sync/start.
        r.defaultBranch || "main",
        Math.floor(new Date(r.pushedAt).getTime() / 1000),
        r.description ?? null,
        r.homepage ?? null,
        r.language ?? null,
        r.languageColor ?? null,
        r.fork ? 1 : 0,
        r.archived ? 1 : 0,
        r.disabled ? 1 : 0,
        r.isTemplate ? 1 : 0,
        r.hasIssues ? 1 : 0,
        r.hasProjects ? 1 : 0,
        r.hasWiki ? 1 : 0,
        r.hasPages ? 1 : 0,
        r.hasDiscussions ? 1 : 0,
        r.size ?? 0,
        r.stars ?? 0,
        r.forks ?? 0,
        r.watchers ?? 0,
        r.openIssues ?? 0,
        r.createdAt ? Math.floor(new Date(r.createdAt).getTime() / 1000) : null,
        r.htmlUrl ?? null,
        r.cloneUrl ?? null,
        r.license ?? null,
        r.owner?.login ?? null,
        r.owner?.avatarUrl ?? null,
        r.owner?.htmlUrl ?? null,
        r.owner?.type ?? null,
        JSON.stringify(r.topics ?? []),
        r.mirrorUrl ?? null,
      ),
  );
  await db.batch(statements);
}

export async function markReposPendingDelete(db: D1Database, runId: string, keys: { platform: string; full_name: string }[]): Promise<void> {
  if (keys.length === 0) return;
  const statements = keys.map((k) => db.prepare("UPDATE repos SET status = 'pending_delete', pending_delete_run_id = ?, updated_at = unixepoch() WHERE platform = ? AND full_name = ?").bind(runId, k.platform, k.full_name));
  await db.batch(statements);
}

/** Revert `pending_delete` flags left by runs that turned stale before completing (SEARCH_API_SPEC.md §5). */
export async function revertPendingDeleteForStaleRuns(db: D1Database): Promise<void> {
  await db.prepare(`UPDATE repos SET status = 'active', pending_delete_run_id = NULL, updated_at = unixepoch() WHERE status = 'pending_delete' AND pending_delete_run_id IN (SELECT id FROM sync_runs WHERE status = 'stale')`).run();
}

export async function updateRepoAfterFilesUpload(db: D1Database, id: string, data: { headSha: string }): Promise<void> {
  await db.prepare("UPDATE repos SET head_sha = ?, indexed_at = unixepoch(), status = 'active', pending_delete_run_id = NULL, updated_at = unixepoch() WHERE id = ?").bind(data.headSha, id).run();
}

/** Delete files+repos flagged pending_delete by this specific run (SEARCH_API_SPEC.md §4.3). */
export async function deletePendingDeleteForRun(db: D1Database, runId: string): Promise<void> {
  await db.batch([db.prepare("DELETE FROM files WHERE repo_id IN (SELECT id FROM repos WHERE status = 'pending_delete' AND pending_delete_run_id = ?)").bind(runId), db.prepare("DELETE FROM repos WHERE status = 'pending_delete' AND pending_delete_run_id = ?").bind(runId)]);
}
