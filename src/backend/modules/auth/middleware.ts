import { createMiddleware } from "hono/factory";
import type { Env } from "@shared/types/env";
import { getSso } from "./sso";

type HonoEnv = { Bindings: Env };

// All three middlewares route through sso.authenticate(), the single place
// that reads the session cookie and transparently renews the access token
// (see @ropean/sso-client's tryLockSession/waitForSession) before a route
// handler ever runs.
export const optionalAuth = createMiddleware<HonoEnv>((c, next) => getSso(c.env).authenticate({ optional: true })(c, next));

export const requireAuth = createMiddleware<HonoEnv>((c, next) => getSso(c.env).authenticate()(c, next));
