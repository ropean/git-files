/**
 * @title Ed25519 request signer
 * @description Client-side counterpart to server/lib/signature.ts + server/middleware/requireSignedRequest.ts
 *
 * git-files signs its own ingest requests (it fetches repos from
 * GitHub/GitLab itself and pushes the resulting file index to its own
 * `/api/v1/*` endpoints — see docs/SEARCH_API_SPEC.md and
 * docs/SEARCH_INDEX_SYNC_SETUP.md).
 *
 * This is deliberately a separate code path from server/lib/signature.ts:
 * that file *verifies* signatures inside the Workers runtime; this one
 * *creates* them from Node's `crypto` module, which is only available to
 * scripts run outside the Workers sandbox.
 */
import { createHash, createPrivateKey, sign } from "node:crypto";
import { fetchWithRetry } from "./fetcher.mjs";

const REQUIRED_ENV_VARS = ["SEARCH_API_BASE_URL", "SEARCH_API_KEY_ID", "SEARCH_API_PRIVATE_KEY"];

const readEnv = (name) => process.env[name];

/**
 * Reads SEARCH_API_* configuration from the environment.
 * Returns { enabled: false, missing } (not throws) when any required
 * variable is missing, so the sync can be skipped cleanly when unconfigured.
 */
export const loadSearchApiConfig = () => {
  const missing = REQUIRED_ENV_VARS.filter((name) => !readEnv(name));
  if (missing.length > 0) {
    return { enabled: false, missing };
  }

  return {
    enabled: true,
    baseUrl: readEnv("SEARCH_API_BASE_URL").replace(/\/+$/, ""),
    keyId: readEnv("SEARCH_API_KEY_ID"),
    privateKey: loadPrivateKey(readEnv("SEARCH_API_PRIVATE_KEY")),
  };
};

/**
 * Accepts a PEM-formatted Ed25519 private key or a bare base64-encoded
 * PKCS8 DER key. PEM armor (if present) and all whitespace are stripped
 * before decoding, so this also tolerates secret stores that mangle PEM
 * line breaks (e.g. collapse a multi-line secret to a single line while
 * keeping the BEGIN/END markers) instead of only handling the fully
 * newline-free case.
 */
const loadPrivateKey = (raw) => {
  const base64 = raw
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return createPrivateKey({
    key: Buffer.from(base64, "base64"),
    format: "der",
    type: "pkcs8",
  });
};

const signRequest = (config, method, path, rawBody) => {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash("sha256").update(rawBody).digest("hex");
  const signingString = `${method}\n${path}\n${timestamp}\n${bodyHash}`;
  const signature = sign(null, Buffer.from(signingString), config.privateKey).toString("base64");

  return {
    "X-Key-Id": config.keyId,
    "X-Timestamp": timestamp,
    "X-Signature": signature,
  };
};

/**
 * Sends a signed JSON request to the ingest API.
 * @param {ReturnType<typeof loadSearchApiConfig>} config
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method
 * @param {string} path - request path, e.g. '/api/v1/sync/start'
 * @param {object} [body]
 */
export const signedRequest = async (config, method, path, body) => {
  const rawBody = body === undefined ? "" : JSON.stringify(body);
  const headers = {
    "Content-Type": "application/json",
    ...signRequest(config, method, path, rawBody),
  };

  const response = await fetchWithRetry(`${config.baseUrl}${path}`, {
    method,
    headers,
    body: rawBody || undefined,
  });

  if (!response.ok) {
    throw new Error(`Ingest API ${method} ${path} failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};
