import { Hono } from "hono";
import type { Env } from "@shared/types/env";
import type { SearchResponse } from "@shared/types/models";
import { optionalAuth } from "../auth/middleware";
import { searchFiles } from "./files.db";
import { listRepos } from "../repos/repos.db";
import { buildFileUrl } from "../repos/repoUrl";

// Small, fixed cap — this is a "did you mean this repo" hint above the file
// results, not a paginated listing (that's what /repos?q= is for).
const REPO_MATCH_LIMIT = 5;

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.get("/", optionalAuth, async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  if (!q) return c.json({ error: "q is required" }, 400);

  const limit = Math.min(Number(c.req.query("limit")) || 50, 200);
  const offset = Math.max(Number(c.req.query("offset")) || 0, 0);
  const isAuthenticated = Boolean(c.get("user"));

  const [{ rows, hasMore }, { repos }] = await Promise.all([searchFiles(c.env.DB, { q, isAuthenticated, limit, offset }), listRepos(c.env.DB, { search: q, isAuthenticated, limit: REPO_MATCH_LIMIT })]);

  const response: SearchResponse = {
    results: rows.map((row) => ({
      repo: { id: row.repo_id, fullName: row.full_name, platform: row.platform, visibility: row.visibility, defaultBranch: row.default_branch },
      path: row.path,
      url: buildFileUrl(row.platform, row.full_name, row.default_branch, row.path),
    })),
    repos: repos.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      platform: r.platform,
      visibility: r.visibility,
      description: r.description,
      fileCount: r.file_count,
    })),
    limit,
    offset,
    hasMore,
  };
  return c.json(response);
});

export default app;
