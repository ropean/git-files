import { createMiddleware } from "hono/factory";
import type { Env } from "@shared/types/env";
import { getActiveSyncKey } from "../modules/sync/syncKeys.db";
import { sha256Hex, buildSigningString, verifyEd25519 } from "../lib/signature";

export type SignedRequestEnv = { Bindings: Env; Variables: { signedBody: unknown } };

const TIMESTAMP_WINDOW_SECONDS = 300; // ±5 minutes, per SEARCH_API_SPEC.md §2.3

/**
 * Verifies the Ed25519-signed ingest requests from SEARCH_API_SPEC.md §2.
 * Mirrors the shape of modules/auth/middleware.ts's requireAuth/optionalAuth
 * (a Hono middleware gating a route), but for the daily sync-search-index
 * Action rather than a human SSO session.
 *
 * Reads the raw request body exactly once (required to compute the body
 * hash for the signing string) and stashes the parsed JSON on the context
 * via c.set("signedBody", ...) — route handlers must read it from there
 * instead of calling c.req.json(), since the underlying body stream can
 * only be consumed once.
 */
export const requireSignedRequest = createMiddleware<SignedRequestEnv>(async (c, next) => {
  const keyId = c.req.header("X-Key-Id");
  const timestamp = c.req.header("X-Timestamp");
  const signature = c.req.header("X-Signature");
  if (!keyId || !timestamp || !signature) {
    return c.json({ error: "Missing signature headers" }, 400);
  }

  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > TIMESTAMP_WINDOW_SECONDS) {
    return c.json({ error: "Timestamp outside allowed window" }, 401);
  }

  const syncKey = await getActiveSyncKey(c.env.DB, keyId);
  if (!syncKey) {
    return c.json({ error: "Unknown key id" }, 401);
  }

  const rawText = await c.req.text();
  const bodyHash = await sha256Hex(rawText);
  const signingString = buildSigningString(c.req.method, c.req.path, timestamp, bodyHash);

  if (!(await verifyEd25519(syncKey.public_key, signingString, signature))) {
    return c.json({ error: "Invalid signature" }, 401);
  }

  let body: unknown = {};
  try {
    if (rawText.length > 0) body = JSON.parse(rawText);
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }
  c.set("signedBody", body);

  await next();
});
