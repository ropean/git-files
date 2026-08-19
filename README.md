# Git Files

A cross-repo Git file-index and search tool. A daily GitHub Actions cron in
this repo (`scripts/sync-search-index.mjs`) fetches every repo (including
private ones) from GitHub/GitLab and pushes each one's file paths and
detail metadata here over a signed ingest API; this app is a small SPA for
searching and browsing them — public repos only when signed out, all repos
(including private) once signed in.

## Features

- **Search** filenames/paths across every indexed repo, with substring
  matching (SQLite FTS5 trigram)
- **Repo details** — description, language, license, stars/forks/watchers,
  topics, owner, and more, fetched daily alongside the file index
- **Public vs. private scope** — anonymous visitors see public repos only;
  signing in (SSO) unlocks everything
- **Signed ingest API** — an Ed25519-authenticated `sync/start` →
  `PUT files` → `sync/complete` flow (see
  [CLAUDE.md](CLAUDE.md#ingest-protocol-ed25519-signed)) — called by this
  repo's own `scripts/sync-search-index.mjs`, not an external project
- **Settings page** — manage the Ed25519 public keys used to verify ingest
  requests, and view recent sync run history
- **Light & dark themes**

## Tech Stack

| Layer          | Technology                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| Frontend       | React 19 + [React Router](https://reactrouter.com) (client-side)                 |
| Backend        | [Hono](https://hono.dev) on Cloudflare Pages Functions                           |
| Runtime        | [Cloudflare Pages](https://pages.cloudflare.com) (Workers)                       |
| Database       | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite + FTS5)           |
| Session Store  | [Cloudflare KV](https://developers.cloudflare.com/kv/)                           |
| Auth           | OIDC / OAuth2 via [`@ropean/sso-client`](https://sc.ropean.org/docs/sso-flow.md) |
| Ingest signing | [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519)                   |

## Quick Start

```bash
pnpm install
cp .dev.vars.example .dev.vars   # fill in SSO credentials
pnpm db:migrate
pnpm dev                         # → http://localhost:5023
```

Then, to let `scripts/sync-search-index.mjs` push to its own ingest API,
generate an Ed25519 keypair with `pnpm gen:sync-key` and register the
public key on the app's Settings page (see
[CLAUDE.md](CLAUDE.md#ingest-protocol-ed25519-signed) for the protocol).
To run the sync locally:

```bash
cp .env.example .env               # fill in GIT_GITHUB_*/GIT_GITLAB_* + SEARCH_API_*
pnpm run sync-search
```

## Project Structure

```
src/
├── frontend/            # Vite + React Router SPA
│   ├── app/             # router, layout, providers — bootstrap only
│   ├── features/        # auth, search, repos, sync, settings
│   ├── components/      # ui/, shell/, repo/ — cross-feature shared widgets
│   ├── lib/             # api.ts — fetch wrapper
│   └── styles/          # global CSS, tokens, themes
├── backend/             # Hono app, runs as a Cloudflare Pages Function
│   ├── modules/         # auth, repos, search, sync, settings
│   ├── middleware/      # signed-request guard for the ingest API
│   └── lib/             # Ed25519 signature verification
└── shared/
    └── types/           # types shared between frontend/ and backend/
functions/              # Cloudflare Pages Functions entrypoint
migrations/             # D1 SQL migration files
scripts/                # sync-search-index.mjs (daily cron) + its adapters/, dev tooling
docs/                   # RESTRUCTURE.md — rationale for this layout
tests/                  # Unit tests
```

See [CLAUDE.md](CLAUDE.md) for the architecture notes and invariants behind
this structure.

## License

MIT
