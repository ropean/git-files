import { Hono } from "hono";
import type { Env } from "@shared/types/env";
import { requireAuth } from "../auth/middleware";
import { listRecentSyncRuns } from "../sync/syncRuns.db";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.get("/", requireAuth, async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 20, 100);
  const runs = await listRecentSyncRuns(c.env.DB, limit);
  return c.json({ runs });
});

export default app;
