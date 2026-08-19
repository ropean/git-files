import { createSso, type SsoModule } from "@ropean/sso-client";
import { KvStore } from "@ropean/sso-client/store/kv";
import type { Env } from "@shared/types/env";

// Single point of construction for the SSO client: config parsing, JWKS
// caching, session storage, and transparent access-token refresh (with
// distributed locking on KV) all live inside this one instance. Every
// authenticated route goes through `getSso(env).authenticate()`, so
// renewal logic is never duplicated across routes.
let sso: SsoModule | undefined;

export function getSso(env: Env): SsoModule {
  if (!sso) {
    sso = createSso({
      env: env as unknown as Record<string, string | undefined>,
      store: new KvStore(env.KV),
    });
  }
  return sso;
}
