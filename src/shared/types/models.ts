export type Platform = "github" | "gitlab";
export type Visibility = "public" | "private";
export type RepoStatus = "active" | "pending_delete";
export type SyncRunStatus = "in_progress" | "completed" | "stale";

export interface RepoOwner {
  login: string;
  avatarUrl: string | null;
  htmlUrl: string | null;
  type: string | null;
}

export interface Repo {
  id: string;
  platform: Platform;
  full_name: string;
  visibility: Visibility;
  default_branch: string;
  head_sha: string | null;
  pushed_at: number | null;
  indexed_at: number | null;
  status: RepoStatus;
  pending_delete_run_id: string | null;
  created_at: number;
  updated_at: number;

  // --- Repo detail fields (migrations/0002_repo_details.sql) ---
  description: string | null;
  homepage: string | null;
  language: string | null;
  language_color: string | null;
  is_fork: number;
  is_archived: number;
  is_disabled: number;
  is_template: number;
  has_issues: number;
  has_projects: number;
  has_wiki: number;
  has_pages: number;
  has_discussions: number;
  size: number;
  stars: number;
  forks: number;
  watchers: number;
  open_issues: number;
  repo_created_at: number | null;
  html_url: string | null;
  clone_url: string | null;
  license: string | null;
  owner_login: string | null;
  owner_avatar_url: string | null;
  owner_html_url: string | null;
  owner_type: string | null;
  topics: string; // JSON-encoded string[] — see toRepoDetail() in src/backend/modules/repos/repos.db.ts
  mirror_url: string | null;
}

/** API-facing shape of a repo's detail fields — booleans as booleans, topics parsed, camelCase. Built by toRepoDetail() from a Repo row. */
export interface RepoDetail {
  id: string;
  platform: Platform;
  fullName: string;
  visibility: Visibility;
  defaultBranch: string;
  headSha: string | null;
  pushedAt: number | null;
  indexedAt: number | null;

  description: string | null;
  homepage: string | null;
  language: string | null;
  languageColor: string | null;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  isTemplate: boolean;
  hasIssues: boolean;
  hasProjects: boolean;
  hasWiki: boolean;
  hasPages: boolean;
  hasDiscussions: boolean;
  size: number;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  createdAt: number | null;
  htmlUrl: string | null;
  cloneUrl: string | null;
  license: string | null;
  owner: RepoOwner | null;
  topics: string[];
  mirrorUrl: string | null;
}

export interface RepoWithFileCount extends Repo {
  file_count: number;
}

export interface FileEntry {
  id: number;
  repo_id: string;
  path: string;
}

export interface SyncRun {
  id: string;
  status: SyncRunStatus;
  generated_at: string;
  repo_count: number;
  needs_upload_count: number;
  stats_json: string | null;
  created_at: number;
  completed_at: number | null;
}

export interface SyncKey {
  key_id: string;
  public_key: string;
  label: string;
  created_at: number;
  revoked_at: number | null;
}

export interface SearchResultItem {
  repo: {
    id: number;
    fullName: string;
    platform: Platform;
    visibility: Visibility;
    defaultBranch: string;
  };
  path: string;
  url: string | null;
}

export interface RepoSearchMatch {
  id: string;
  fullName: string;
  platform: Platform;
  visibility: Visibility;
  description: string | null;
  fileCount: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  repos: RepoSearchMatch[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PlatformStats {
  platform: Platform;
  publicRepoCount: number;
  publicFileCount: number;
  privateRepoCount: number;
  privateFileCount: number;
}

export interface RepoStatsResponse {
  platforms: PlatformStats[];
  totalPublicRepos: number;
  totalPublicFiles: number;
  totalPrivateRepos: number;
  totalPrivateFiles: number;
}

export interface ReposListResponse {
  repos: RepoWithFileCount[];
  limit: number;
  offset: number;
  hasMore: boolean;
  total: number;
}

export interface RepoFileListItem {
  path: string;
  url: string | null;
}

export interface RepoFilesResponse {
  repo: RepoDetail;
  files: RepoFileListItem[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

// Shape of GET /auth/me (from @ropean/sso-client), trimmed to the fields the UI uses.
export interface AuthUser {
  sub: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  picture: string | null;
  org_id: string | null;
  role: string | null;
}

// --- Ingest API payloads (SEARCH_API_SPEC.md v1) ---

export interface SyncStartRepoPayload {
  platform: Platform;
  fullName: string;
  visibility: Visibility;
  defaultBranch: string | null;
  pushedAt: string;

  // --- Repo detail fields, all optional: upserted every sync/start but not
  // part of the pushedAt-based needsUpload diff (docs/SEARCH_API_SPEC.md §4.1) ---
  description?: string | null;
  homepage?: string | null;
  language?: string | null;
  languageColor?: string | null;
  fork?: boolean;
  archived?: boolean;
  disabled?: boolean;
  isTemplate?: boolean;
  hasIssues?: boolean;
  hasProjects?: boolean;
  hasWiki?: boolean;
  hasPages?: boolean;
  hasDiscussions?: boolean;
  size?: number;
  stars?: number;
  forks?: number;
  watchers?: number;
  openIssues?: number;
  createdAt?: string | null;
  htmlUrl?: string | null;
  cloneUrl?: string | null;
  license?: string | null;
  owner?: RepoOwner | null;
  topics?: string[];
  mirrorUrl?: string | null;
}

export interface SyncStartRequest {
  runId: string;
  generatedAt: string;
  repos: SyncStartRepoPayload[];
}

export interface SyncStartResponse {
  runId: string;
  needsUpload: { platform: Platform; fullName: string }[];
}

export interface SyncFilesRequest {
  runId: string;
  headSha: string;
  generatedAt: string;
  files: { path: string }[];
}

export interface SyncCompleteRequest {
  runId: string;
  generatedAt: string;
  stats: { totalRepos: number; changed: number; unchanged: number };
}
