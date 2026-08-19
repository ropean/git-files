import { Hono } from "hono";
import type { Env } from "@shared/types/env";
import { getSso } from "./modules/auth/sso";

import syncRoutes from "./modules/sync/routes";
import searchRoutes from "./modules/search/routes";
import reposRoutes from "./modules/repos/routes";
import syncKeysRoutes from "./modules/settings/syncKeys.routes";
import syncRunsRoutes from "./modules/settings/syncRuns.routes";
import themeRoutes from "./modules/settings/theme.routes";

type HonoEnv = { Bindings: Env };

const app = new Hono<HonoEnv>();

app.route("/api/v1", syncRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/repos", reposRoutes);
app.route("/api/sync-keys", syncKeysRoutes);
app.route("/api/sync-runs", syncRunsRoutes);
app.route("/api/theme", themeRoutes);

app.all("/auth/*", (c) => getSso(c.env).handleAt(c.req.raw, "/auth"));

app.onError((err, c) => {
  console.error(err);
  // /api/v1/* (syncRoutes) requires a valid Ed25519 request signature
  // (SEARCH_API_SPEC.md §2) before any handler runs, so that caller is
  // already trusted — safe to save it a round trip to Cloudflare logs by
  // echoing err.message. Every other route here is public/optionalAuth
  // (repos, search, theme, the SSO'd settings routes), so those must not
  // leak internals.
  if (c.req.path.startsWith("/api/v1/")) {
    return c.json({ error: "Internal Server Error", message: err.message }, 500);
  }
  return c.json({ error: "Internal Server Error" }, 500);
});

export default app;
