-- Local dev seed data: a couple of sample repos/files so `pnpm dev` has
-- something to search against out of the box.

INSERT INTO repos (
  id, platform, full_name, visibility, default_branch, head_sha, pushed_at, indexed_at, status,
  description, language, language_color, has_issues, has_wiki, stars, forks, watchers, open_issues,
  repo_created_at, html_url, clone_url, license, owner_login, owner_avatar_url, owner_html_url, owner_type, topics
)
VALUES
  (
    '01SEEDREPOAAAAAAAAAAAAAAA0', 'github', 'ropean/example-public', 'public', 'main', 'deadbeef', unixepoch(), unixepoch(), 'active',
    'An example public repository used for local dev seeding.', 'TypeScript', '#3178c6', 1, 1, 12, 3, 12, 2,
    unixepoch(), 'https://github.com/ropean/example-public', 'https://github.com/ropean/example-public.git', 'MIT',
    'ropean', 'https://avatars.githubusercontent.com/u/1', 'https://github.com/ropean', 'User', '["cli","tooling"]'
  ),
  (
    '01SEEDREPOBBBBBBBBBBBBBBB0', 'github', 'ropean/example-private', 'private', 'main', 'cafebabe', unixepoch(), unixepoch(), 'active',
    'An example private repository used for local dev seeding.', 'JavaScript', '#f1e05a', 1, 0, 0, 0, 0, 0,
    unixepoch(), 'https://github.com/ropean/example-private', 'https://github.com/ropean/example-private.git', 'NOASSERTION',
    'ropean', 'https://avatars.githubusercontent.com/u/1', 'https://github.com/ropean', 'User', '[]'
  );

INSERT INTO files (repo_id, path)
VALUES
  ('01SEEDREPOAAAAAAAAAAAAAAA0', 'src/index.ts'),
  ('01SEEDREPOAAAAAAAAAAAAAAA0', 'README.md'),
  ('01SEEDREPOAAAAAAAAAAAAAAA0', 'src/components/SearchPage.tsx'),
  ('01SEEDREPOBBBBBBBBBBBBBBB0', 'src/components/Dockerfile'),
  ('01SEEDREPOBBBBBBBBBBBBBBB0', 'app/pages/SettingsPage.tsx');
