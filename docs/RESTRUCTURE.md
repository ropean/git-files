# Repo Restructure Proposal

Status: executed.

## Why

Current top-level split (`app/`, `server/`, `shared/`, `functions/`,
`scripts/`) works today but has two problems as the codebase grows:

- **Naming isn't self-explanatory.** `app` = frontend, `server` = backend,
  `functions` = Cloudflare Pages adapter — none of that is obvious without
  reading this file.
- **Code is organized by technical layer, not by feature.** `server/db/`,
  `server/routes/` and `app/pages/`, `app/components/` each already split
  the same domain (repos, search, sync, settings) across multiple
  directories. Fine at today's size, gets worse as each domain grows —
  editing "sync" means hopping between `server/db/syncKeys.ts`,
  `server/db/syncRuns.ts`, `server/routes/syncKeys.ts`,
  `app/components/settings/SyncKeysPanel.tsx`, etc.

## Direction

1. Move everything under `src/`, split into `frontend/` and `backend/`
   (clearer than `app`/`server` to a newcomer).
2. Within each side, organize business code by **feature/domain** first
   (`features/` on the frontend, `modules/` on the backend), and keep only
   genuinely cross-feature code (`components/ui`, `components/shell`,
   generic `lib/`) organized by technical type.
3. `shared/` keeps its current job — types (and later schemas/constants)
   used by both sides.
4. `scripts/` stays for one-off maintainer scripts only
   (`check.mjs`, `gen-sync-key.mjs`). `sync-search-index.mjs` and its
   `adapters/`/`lib/` stay together as a standalone cron job — it's
   already organized reasonably and isn't part of the request-serving app.
5. No layered "Clean Architecture" (no forced `controller/service/repository`
   trio per module) — a module's internal shape reflects its actual
   complexity, not a template.

## Target shape (rough)

```
src/
├── frontend/
│   ├── app/          # router, layout, providers — bootstrap only
│   ├── features/     # auth, repos, search, sync, settings
│   ├── components/   # ui/, shell/ — truly shared widgets
│   ├── lib/
│   └── styles/
├── backend/
│   ├── app.ts
│   ├── modules/      # auth, repos, search, sync, settings
│   ├── middleware/   # request-level, not domain-specific (e.g. requireSignedRequest)
│   └── lib/
└── shared/
    └── types/

functions/    # Cloudflare Pages adapter, imports src/backend/app.ts
scripts/      # check.mjs, gen-sync-key.mjs
migrations/
tests/
docs/
public/
```

Path aliases (`~` → `src/frontend`, `@shared` → `src/shared`, new
`@backend` → `src/backend` if needed for cross-module server imports)
replace the current relative `../` chains — configured in both
`tsconfig.json` `paths` and `vite.config.ts` `resolve.alias`.

## `files.ts` split

`server/db/files.ts` today bundles four functions used by three different
routes: `searchFiles` (search), `listFilesForRepo` (repos), and
`replaceRepoFiles`/`countFilesForRepo` (sync). Split along those call
sites — each function moves into its caller's module. All three still
read/write the same D1 `files` table and its FTS5 trigram index, but the
table isn't owned by any one TS module, so that's not a reason to keep the
functions bundled.

## Migration approach

Mechanical move + import rewrite, one side at a time (backend first, it's
smaller), verified by `pnpm check` after each step rather than one giant
commit. `functions/[[path]].ts`, `wrangler.toml`, and `CLAUDE.md`'s path
references need updating as part of the same pass.
