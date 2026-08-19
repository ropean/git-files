import { Hono } from "hono";
import type { SyncCompleteRequest, SyncFilesRequest, SyncStartRequest, SyncStartResponse } from "@shared/types/models";
import { requireSignedRequest, type SignedRequestEnv } from "../../middleware/requireSignedRequest";
import { getActiveRepoKeys, getRepoByPlatformFullName, markReposPendingDelete, upsertReposBatch, updateRepoAfterFilesUpload, deletePendingDeleteForRun, revertPendingDeleteForStaleRuns } from "../repos/repos.db";
import { replaceRepoFiles, countFilesForRepo } from "./files.db";
import { expireStaleRuns, getInProgressRun, createSyncRun, getSyncRunById, completeSyncRun } from "./syncRuns.db";

const app = new Hono<SignedRequestEnv>();

function isSyncStartRequest(body: unknown): body is SyncStartRequest {
  const b = body as Partial<SyncStartRequest>;
  return typeof b?.runId === "string" && typeof b?.generatedAt === "string" && Array.isArray(b?.repos);
}

function isSyncFilesRequest(body: unknown): body is SyncFilesRequest {
  const b = body as Partial<SyncFilesRequest>;
  return typeof b?.runId === "string" && typeof b?.headSha === "string" && Array.isArray(b?.files);
}

function isSyncCompleteRequest(body: unknown): body is SyncCompleteRequest {
  const b = body as Partial<SyncCompleteRequest>;
  return typeof b?.runId === "string" && typeof b?.stats === "object" && b?.stats !== null;
}

// POST /api/v1/sync/start — SEARCH_API_SPEC.md §4.1
app.post("/sync/start", requireSignedRequest, async (c) => {
  const db = c.env.DB;
  const body = c.get("signedBody");
  if (!isSyncStartRequest(body)) return c.json({ error: "Invalid request body" }, 400);

  // Lazily expire runs that never reached sync/complete — the fallback
  // SEARCH_API_SPEC.md §5 itself prescribes, since Pages Functions have no
  // cron trigger to run this on a schedule.
  await expireStaleRuns(db);
  await revertPendingDeleteForStaleRuns(db);

  const inProgress = await getInProgressRun(db);
  if (inProgress && inProgress.id !== body.runId) {
    return c.json({ error: "Another sync run is already in progress" }, 409);
  }

  const activeBefore = await getActiveRepoKeys(db);
  const activePushedAtByKey = new Map(activeBefore.map((r) => [`${r.platform}/${r.full_name}`, r.pushed_at]));
  const payloadKeys = new Set(body.repos.map((r) => `${r.platform}/${r.fullName}`));

  // Diff on pushedAt, not headSha — headSha only exists after a tree fetch
  // (step 4.2), while pushedAt comes free with the repo list (SEARCH_API_SPEC.md §4.1 note).
  const needsUpload = body.repos.filter((r) => activePushedAtByKey.get(`${r.platform}/${r.fullName}`) !== Math.floor(new Date(r.pushedAt).getTime() / 1000)).map((r) => ({ platform: r.platform, fullName: r.fullName }));

  const toMarkDeleted = activeBefore.filter((r) => !payloadKeys.has(`${r.platform}/${r.full_name}`)).map((r) => ({ platform: r.platform, full_name: r.full_name }));

  await upsertReposBatch(db, body.repos);

  // A matching in-progress runId means this is a client retry of the same
  // call — the run row already exists, so just recompute the response.
  // Must happen before markReposPendingDelete below: pending_delete_run_id
  // FK-references sync_runs(id), so the run row has to exist first.
  if (!inProgress) {
    await createSyncRun(db, { id: body.runId, generatedAt: body.generatedAt, repoCount: body.repos.length, needsUploadCount: needsUpload.length });
  }

  if (toMarkDeleted.length > 0) await markReposPendingDelete(db, body.runId, toMarkDeleted);

  const response: SyncStartResponse = { runId: body.runId, needsUpload };
  return c.json(response);
});

// PUT /api/v1/repos/{platform}/{owner}/{repo}/files — SEARCH_API_SPEC.md §4.2
app.put("/repos/:platform/:owner/:repo/files", requireSignedRequest, async (c) => {
  const db = c.env.DB;
  const { platform, owner, repo } = c.req.param();
  const fullName = `${owner}/${repo}`;

  const body = c.get("signedBody");
  if (!isSyncFilesRequest(body)) return c.json({ error: "Invalid request body" }, 400);

  const run = await getSyncRunById(db, body.runId);
  if (!run) return c.json({ error: "Unknown runId" }, 404);

  const repoRow = await getRepoByPlatformFullName(db, platform, fullName);
  if (!repoRow) return c.json({ error: "Unknown repo" }, 404);

  // Idempotent fast path (spec §4.2: "同一 headSha 重复提交，结果一致") — skip
  // rewriting (and re-triggering the FTS5 sync triggers) on a pure retry.
  if (repoRow.head_sha === body.headSha && repoRow.indexed_at !== null) {
    return c.json({ ok: true, filesIndexed: await countFilesForRepo(db, repoRow.id) });
  }

  const paths = body.files.map((f) => f.path);
  const filesIndexed = await replaceRepoFiles(db, repoRow.id, paths);
  await updateRepoAfterFilesUpload(db, repoRow.id, { headSha: body.headSha });

  return c.json({ ok: true, filesIndexed });
});

// POST /api/v1/sync/complete — SEARCH_API_SPEC.md §4.3
app.post("/sync/complete", requireSignedRequest, async (c) => {
  const db = c.env.DB;
  const body = c.get("signedBody");
  if (!isSyncCompleteRequest(body)) return c.json({ error: "Invalid request body" }, 400);

  const run = await getSyncRunById(db, body.runId);
  if (!run) return c.json({ error: "Unknown runId" }, 404);

  // Idempotent no-op for a duplicate/late complete call — a stale run's
  // pending_delete marks were already reverted by expireStaleRuns().
  if (run.status === "completed" || run.status === "stale") {
    return c.json({ ok: true });
  }

  await deletePendingDeleteForRun(db, body.runId);
  await completeSyncRun(db, body.runId, JSON.stringify(body.stats));

  return c.json({ ok: true });
});

export default app;
