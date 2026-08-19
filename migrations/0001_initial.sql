-- repos: small table (a few hundred rows). TEXT ulid PK; platform+full_name
-- is the natural business key from SEARCH_API_SPEC.md.
CREATE TABLE repos (
    id                      TEXT PRIMARY KEY,
    platform                TEXT NOT NULL,
    full_name               TEXT NOT NULL,
    visibility              TEXT NOT NULL CHECK(visibility IN ('public', 'private')),
    default_branch          TEXT NOT NULL DEFAULT 'main',
    head_sha                TEXT,
    pushed_at               INTEGER,
    indexed_at              INTEGER,
    status                  TEXT NOT NULL DEFAULT 'active'
                                CHECK(status IN ('active', 'pending_delete')),
    -- Which sync run flagged this repo pending_delete — sync/complete must
    -- only delete repos flagged by ITS OWN run (SEARCH_API_SPEC.md §4.3/§5).
    pending_delete_run_id   TEXT REFERENCES sync_runs(id),
    created_at              INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at              INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE UNIQUE INDEX idx_repos_platform_fullname ON repos(platform, full_name);
CREATE INDEX idx_repos_status ON repos(status);
CREATE INDEX idx_repos_pending_delete_run ON repos(pending_delete_run_id);

-- files: large table (tens of thousands of rows). INTEGER PRIMARY KEY so
-- files.id is the real SQLite rowid, required for an FTS5 external-content
-- table to key off it.
CREATE TABLE files (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id  TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
    path     TEXT NOT NULL
);
CREATE INDEX idx_files_repo_id ON files(repo_id);
CREATE INDEX idx_files_path ON files(path);
CREATE UNIQUE INDEX idx_files_repo_path ON files(repo_id, path);

-- FTS5 trigram index over files.path for substring filename search
-- ("index.ts", "Dockerfile", partial fragments). External-content table
-- keyed on files.id keeps storage from being duplicated. The triggers
-- below keep it in sync automatically — PUT .../files always does a full
-- delete+insert per repo, so no extra application-level FTS maintenance
-- is needed.
CREATE VIRTUAL TABLE files_fts USING fts5(
    path,
    content='files',
    content_rowid='id',
    tokenize='trigram'
);

CREATE TRIGGER files_ai AFTER INSERT ON files BEGIN
    INSERT INTO files_fts(rowid, path) VALUES (new.id, new.path);
END;

CREATE TRIGGER files_ad AFTER DELETE ON files BEGIN
    INSERT INTO files_fts(files_fts, rowid, path) VALUES ('delete', old.id, old.path);
END;

CREATE TRIGGER files_au AFTER UPDATE ON files BEGIN
    INSERT INTO files_fts(files_fts, rowid, path) VALUES ('delete', old.id, old.path);
    INSERT INTO files_fts(rowid, path) VALUES (new.id, new.path);
END;

-- sync_runs: id is the CLIENT-supplied runId (SEARCH_API_SPEC.md §4.1 sends
-- "runId" in the request body; the backend accepts and echoes it back
-- rather than minting its own).
CREATE TABLE sync_runs (
    id                    TEXT PRIMARY KEY,
    status                TEXT NOT NULL DEFAULT 'in_progress'
                              CHECK(status IN ('in_progress', 'completed', 'stale')),
    generated_at          TEXT NOT NULL,
    repo_count            INTEGER NOT NULL DEFAULT 0,
    needs_upload_count    INTEGER NOT NULL DEFAULT 0,
    stats_json            TEXT,
    -- Server receipt time; used for the 1h staleness check (spec §5) since
    -- there is no cron trigger to expire stale runs on a schedule — the
    -- next sync/start call does it lazily instead.
    created_at            INTEGER NOT NULL DEFAULT (unixepoch()),
    completed_at          INTEGER
);
CREATE INDEX idx_sync_runs_status ON sync_runs(status);

-- sync_keys: Ed25519 public keys for verifying signed ingest requests,
-- managed via the app's Settings page. public_key is public data
-- (base64 raw 32-byte Ed25519 public key), stored as plaintext.
CREATE TABLE sync_keys (
    key_id      TEXT PRIMARY KEY,
    public_key  TEXT NOT NULL,
    label       TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
    revoked_at  INTEGER
);
