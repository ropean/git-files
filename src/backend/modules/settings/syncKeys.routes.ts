import { Hono } from "hono";
import type { Env } from "@shared/types/env";
import { requireAuth } from "../auth/middleware";
import { listSyncKeys, addSyncKey, revokeSyncKey } from "../sync/syncKeys.db";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.get("/", requireAuth, async (c) => {
  const keys = await listSyncKeys(c.env.DB);
  return c.json({ keys });
});

app.post("/", requireAuth, async (c) => {
  const body = await c.req.json<{ keyId?: string; publicKey?: string; label?: string }>();
  if (!body.keyId || !body.publicKey) {
    return c.json({ error: "keyId and publicKey are required" }, 400);
  }
  await addSyncKey(c.env.DB, { keyId: body.keyId, publicKey: body.publicKey, label: body.label ?? "" });
  return c.json({ ok: true });
});

app.delete("/:keyId", requireAuth, async (c) => {
  await revokeSyncKey(c.env.DB, c.req.param("keyId"));
  return c.json({ ok: true });
});

export default app;
