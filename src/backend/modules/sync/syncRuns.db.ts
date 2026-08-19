import type { SyncRun } from "@shared/types/models";

const STALE_AFTER_SECONDS = 3600;

/**
 * Cloudflare Pages Functions have no cron trigger to expire stale runs on a
 * schedule, so this runs lazily at the top of every sync/start instead —
 * which is exactly the fallback SEARCH_API_SPEC.md §5 itself describes
 * ("等第二天新的一轮 sync/start 重新判定").
 */
export async function expireStaleRuns(db: D1Database): Promise<void> {
  await db.prepare(`UPDATE sync_runs SET status = 'stale' WHERE status = 'in_progress' AND created_at < (unixepoch() - ?)`).bind(STALE_AFTER_SECONDS).run();
}

export async function getInProgressRun(db: D1Database): Promise<SyncRun | null> {
  return db.prepare("SELECT * FROM sync_runs WHERE status = 'in_progress' LIMIT 1").first<SyncRun>();
}

export async function getSyncRunById(db: D1Database, id: string): Promise<SyncRun | null> {
  return db.prepare("SELECT * FROM sync_runs WHERE id = ?").bind(id).first<SyncRun>();
}

export async function createSyncRun(db: D1Database, data: { id: string; generatedAt: string; repoCount: number; needsUploadCount: number }): Promise<void> {
  await db.prepare("INSERT INTO sync_runs (id, status, generated_at, repo_count, needs_upload_count) VALUES (?, 'in_progress', ?, ?, ?)").bind(data.id, data.generatedAt, data.repoCount, data.needsUploadCount).run();
}

export async function completeSyncRun(db: D1Database, id: string, statsJson: string): Promise<void> {
  await db.prepare("UPDATE sync_runs SET status = 'completed', completed_at = unixepoch(), stats_json = ? WHERE id = ?").bind(statsJson, id).run();
}

export async function listRecentSyncRuns(db: D1Database, limit = 20): Promise<SyncRun[]> {
  const result = await db.prepare("SELECT * FROM sync_runs ORDER BY created_at DESC LIMIT ?").bind(limit).all<SyncRun>();
  return result.results;
}
