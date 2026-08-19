export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  // --- @ropean/sso-client config (see src/backend/modules/auth/sso.ts) ---
  OAUTH_ISSUER: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_CLIENT_SECRET: string;
  PUBLIC_ORIGIN: string;
  SESSION_SECRET: string;
  OAUTH_SCOPES?: string;
  OAUTH_AUDIENCE?: string;
  OAUTH_REDIRECT_URI?: string;
  OAUTH_POST_LOGOUT_REDIRECT_URI?: string;
  COOKIE_NAME?: string;
  COOKIE_DOMAIN?: string;
  COOKIE_SECURE?: string;
  COOKIE_SAMESITE?: string;
  COOKIE_MAX_AGE_SEC?: string;
  SSO_REFRESH_SKEW_MS?: string;
  IS_DEBUG?: string;
}
