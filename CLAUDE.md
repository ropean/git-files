# git-files — Codebase Notes

Cross-repo Git file-index/search SPA. Built by adapting the `memos` codebase
(same Cloudflare Pages + Hono + D1 + `@ropean/sso-client` stack) to a
different domain: instead of notes/tags, this app indexes `(repo, file
path)` pairs — plus each repo's own detail metadata (description, language,
stars, owner, topics, ...) — pushed daily by this repo's own
`scripts/sync-search-index.mjs` GitHub Actions cron, and lets users search
and browse them — public repos only when signed out, all repos (including
private) when signed in.

## Layout

```
src/
├── frontend/            # Vite + React Router SPA
│   ├── app/             # router, layout, providers — bootstrap only
│   ├── features/        # auth, search, repos, sync, settings
│   ├── components/      # ui/, shell/, repo/ — cross-feature shared widgets
│   ├── lib/             # api.ts — fetch wrapper (401 -> redirect to login)
│   └── styles/          # global.css, tokens.css, themes.css
├── backend/             # Hono app, runs as a Cloudflare Pages Function
│   ├── app.ts
│   ├── modules/         # auth, repos, search, sync, settings
│   ├── middleware/      # requireSignedRequest.ts (Ed25519 ingest guard)
│   └── lib/             # signature.ts (Ed25519 / SHA-256 primitives)
└── shared/
    └── types/           # env.ts, models.ts — used by both sides

functions/    # Cloudflare Pages adapter, imports src/backend/app.ts
scripts/      # sync-search-index.mjs (daily cron) + adapters/lib, gen-sync-key.mjs, check.mjs
migrations/   # D1 SQL migrations
tests/        # unit tests
docs/         # RESTRUCTURE.md — design rationale for this layout
```

Each `src/backend/modules/*` folder owns its routes plus the D1 access
functions it needs (`*.db.ts`), rather than splitting by technical layer
(`routes/`, `db/`) the way the codebase used to. `src/frontend/features/*`
mirrors this on the client: a feature folder holds its page component(s)
and any panels used only by that feature. `src/frontend/components/` and
`src/backend/middleware/` + `src/backend/lib/` are the exception — code
genuinely used across more than one domain lives there, organized by
technical kind instead. Path aliases: `~` → `src/frontend`, `@shared` →
`src/shared`, `@backend` → `src/backend` (configured in both
`tsconfig.json` and `vite.config.ts`).

`src/backend/modules/search/files.db.ts`, `.../repos/files.db.ts`, and
`.../sync/files.db.ts` all read/write the same D1 `files` table (and its
FTS5 trigram index) — the table isn't owned by any one module, the
functions are just split by which route calls them (`searchFiles` for
search, `listFilesForRepo` for the repo file-browser, `replaceRepoFiles`/
`countFilesForRepo` for the ingest sync flow).

## Two APIs, two audiences

- **Ingest API** (`/api/v1/*`, `src/backend/modules/sync/routes.ts`) —
  called by this repo's own `scripts/sync-search-index.mjs`, run daily via
  `.github/workflows/sync-search-index.yml`, never a browser. Ed25519-signed
  (see `src/backend/middleware/requireSignedRequest.ts`), no cookies, no
  CORS — the request still goes out over public HTTPS and is fully verified
  even though client and server live in the same repo.
- **App API** (`/api/search`, `/api/repos`, `/api/sync-keys`,
  `/api/sync-runs`, `/api/theme`) — called by the SPA, cookie-authenticated
  via `@ropean/sso-client` like memos. `optionalAuth` on search/browse
  (scope narrows when signed out), `requireAuth` on settings.

## Ingest protocol (Ed25519-signed)

The client (`scripts/sync-search-index.mjs`) holds an Ed25519 private key
(GitHub Actions secret); the server only ever sees the matching public key,
managed on the Settings → Sync keys page
(`src/backend/modules/settings/syncKeys.routes.ts` +
`src/backend/modules/sync/syncKeys.db.ts`). Every ingest request carries
`X-Key-Id` / `X-Timestamp` / `X-Signature` headers; the server rebuilds
`` `${method}\n${path}\n${timestamp}\n${sha256hex(rawBody)}` `` and verifies
it against the stored public key, rejecting anything outside a ±5 minute
timestamp window (`src/backend/middleware/requireSignedRequest.ts`). Three
endpoints, always called in this order for one run (`runId`):

1. `POST /api/v1/sync/start` — uploads the full repo list (metadata only,
   no files) for the run; diffs each repo's `pushedAt` against what's
   stored to compute which repos need a file-tree re-upload, and marks any
   `active` repo missing from this run's list as `pending_delete`.
2. `PUT /api/v1/repos/{platform}/{owner}/{repo}/files` — one call per repo
   that needs it, full replace (not a diff) of that repo's file paths.
   Idempotent on `headSha`, safe to retry.
3. `POST /api/v1/sync/complete` — the only point at which repos marked
   `pending_delete` by this run are actually deleted (see below).

`gen-sync-key.mjs` (`pnpm gen:sync-key`) generates a keypair and prints
everything needed to configure both sides.

## sync-search-index owns both repo listing and file-tree fetching

`scripts/sync-search-index.mjs` and its `scripts/adapters/{github,gitlab}.mjs`
do everything end to end: paginate each platform's repo-list API
into full repo detail payloads (`adapter.convertToRepoDetail()`), diff via
`sync/start`, fetch each changed repo's full file tree, and `PUT` it. There
is no intermediate `data/repos-*.json` step — this repo talks to the
GitHub/GitLab APIs directly instead of reading another job's output.

## Repo detail fields ride along on every sync/start, not a separate fetch

`SyncStartRepoPayload` (`src/shared/types/models.ts`) carries the full repo
detail — description, language, stars/forks/watchers, owner, topics, etc.,
built by `adapter.convertToRepoDetail()` from the same repo-list API
response already being fetched to diff `pushedAt`. `upsertReposBatch()`
(`src/backend/modules/repos/repos.db.ts`) writes these columns
(`migrations/0002_repo_details.sql`) on every sync/start, independent of
whether that repo's file tree also needs re-uploading — a repo whose star
count changed but files didn't still gets its detail fields refreshed.
`toRepoDetail()` converts a DB row (snake_case, booleans as 0/1, `topics`
as a JSON string) into the API-facing `RepoDetail` shape consumed by
`RepoFilesResponse.repo` and rendered in
`src/frontend/features/repos/RepoFilesPage.tsx`'s hero section.

## Signed-request body handling

`requireSignedRequest` reads the raw request body exactly once (`c.req.text()`)
to compute the signing string's body hash, then parses and stashes it via
`c.set("signedBody", ...)`. Route handlers in
`src/backend/modules/sync/routes.ts` must read `c.get("signedBody")` —
calling `c.req.json()` again in a handler will fail because the underlying
stream can only be consumed once.

## Pending-delete tracking is per-run, not a boolean

`repos.pending_delete_run_id` records _which_ `sync_runs.id` flagged a repo
for deletion, not just a boolean. This matters because `POST
/api/v1/sync/complete` must only delete repos flagged by **its own** run —
see `deletePendingDeleteForRun()` in `src/backend/modules/repos/repos.db.ts`.
A repo flagged by a run that later turns `stale` gets its flag reverted by
`revertPendingDeleteForStaleRuns()`, called at the top of every
`sync/start` (see below) — never permanently deleted based on a run that
never completed.

## No cron trigger — stale runs expire lazily

Cloudflare Pages Functions have no cron trigger tied to the project itself.
Instead of scheduling anything, `POST /api/v1/sync/start` calls
`expireStaleRuns()` + `revertPendingDeleteForStaleRuns()`
(`src/backend/modules/sync/syncRuns.db.ts` /
`src/backend/modules/repos/repos.db.ts`) at the top of every request,
before its own mutex check — any `in_progress` run older than an hour is
marked `stale` and its pending deletes are reverted. This is a deliberate
fallback: a missed `sync/complete` (network blip, expired key, a failed
Actions run) costs at most one day's delay before the affected repo is
correctly re-flagged by the next day's `sync/start`, never a false delete.

## File search: FTS5 trigram, not LIKE

`files_fts` (migration `0001_initial.sql`) is an FTS5 virtual table with
`tokenize='trigram'`, kept in sync via `AFTER INSERT/DELETE/UPDATE`
triggers on `files` — confirmed working against this project's D1/workerd
build (see `tests/unit/signature.test.ts`'s sibling smoke test performed
during development; rerun `pnpm db:migrate` + a manual `MATCH` query if
upgrading `wrangler`/`workerd` and want to reconfirm). Trigram needs ≥3
character queries; `src/backend/modules/search/files.db.ts`'s
`searchFiles()` falls back to a plain indexed `LIKE '%term%'` scan for
shorter queries. User input is always wrapped as a quoted FTS5 phrase
before binding — never interpolated into the `MATCH` expression directly.

## Ed25519 verification uses @noble/ed25519, not WebCrypto's Ed25519 algorithm

`src/backend/lib/signature.ts` uses `@noble/ed25519`'s `verifyAsync`, which
hashes internally via `crypto.subtle.digest('SHA-512', ...)` — a
ubiquitous, uncontroversial WebCrypto primitive — rather than depending on
`crypto.subtle`'s own Ed25519 sign/verify support, which has had rollout
gating across Workers versions. Don't swap this for
`crypto.subtle.verify({name:'Ed25519'}, ...)` without confirming the
target runtime supports it.

## Login = full access, no per-repo permissions

There is no `users` table and no admin role check. `requireAuth` (any
valid SSO session, `src/backend/modules/auth/middleware.ts`) is the only
gate on `/settings` and its APIs — this is a personal, single-owner tool,
not a multi-tenant one. Don't add role/ownership checks without discussing
scope first.

## Dependency versions are pinned

Same convention as memos: `package.json` uses exact versions (no `^`/`~`)
for every dependency — `.npmrc` sets `save-exact=true` so `pnpm add` keeps
doing this automatically.
