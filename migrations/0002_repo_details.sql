-- Adds repo detail fields carried by sync/start's SyncStartRepoPayload
-- (see docs/SEARCH_API_SPEC.md §4.1), sourced from GitHub/GitLab's repo API
-- via scripts/adapters/{github,gitlab}.mjs's convertToRepoDetail(). Excludes
-- fields that would require a second API call (branches, contributors,
-- commits, readme).
--
-- All nullable / boolean-as-INTEGER with a 0 default: a repo synced before
-- this migration (or a GitLab repo, which the platform API can't supply
-- some of these for) simply has NULLs here until its next sync/start.
ALTER TABLE repos ADD COLUMN description TEXT;
ALTER TABLE repos ADD COLUMN homepage TEXT;
ALTER TABLE repos ADD COLUMN language TEXT;
ALTER TABLE repos ADD COLUMN language_color TEXT;
ALTER TABLE repos ADD COLUMN is_fork INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN is_disabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN is_template INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN has_issues INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN has_projects INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN has_wiki INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN has_pages INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN has_discussions INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN size INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN stars INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN forks INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN watchers INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN open_issues INTEGER NOT NULL DEFAULT 0;
ALTER TABLE repos ADD COLUMN repo_created_at INTEGER;
ALTER TABLE repos ADD COLUMN html_url TEXT;
ALTER TABLE repos ADD COLUMN clone_url TEXT;
ALTER TABLE repos ADD COLUMN license TEXT;
ALTER TABLE repos ADD COLUMN owner_login TEXT;
ALTER TABLE repos ADD COLUMN owner_avatar_url TEXT;
ALTER TABLE repos ADD COLUMN owner_html_url TEXT;
ALTER TABLE repos ADD COLUMN owner_type TEXT;
-- JSON-encoded string[], e.g. '["cli","tooling"]'. Small (<20 items) and
-- never queried by content, so a normalized topics table isn't worth it.
ALTER TABLE repos ADD COLUMN topics TEXT NOT NULL DEFAULT '[]';
ALTER TABLE repos ADD COLUMN mirror_url TEXT;
