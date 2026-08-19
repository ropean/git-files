import { BaseAdapter } from "./base.mjs";

// GitHub language color mapping, used for the language badge on the repo
// detail page.
const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Swift: "#ffac45",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Shell: "#89e051",
};

const getLanguageColor = (language) => LANGUAGE_COLORS[language || ""] || "#858585";

/** GitHub API adapter: repo listing + full file-tree fetch. */
export class GitHubAdapter extends BaseAdapter {
  getHeaders() {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "git-files-sync",
    };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;
    return headers;
  }

  buildReposUrl(page, perPage = 100) {
    if (this.token) {
      return `${this.baseUrl}/user/repos?sort=pushed&per_page=${perPage}&page=${page}&affiliation=owner,collaborator,organization_member`;
    } else if (this.owner) {
      return `${this.baseUrl}/users/${this.owner}/repos?sort=pushed&per_page=${perPage}&page=${page}`;
    }
    throw new Error("GitHub: Either token or owner must be provided");
  }

  checkRateLimit(response) {
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = response.headers.get("X-RateLimit-Reset");
    if (remaining && parseInt(remaining) < 10) {
      return { warning: true, remaining: parseInt(remaining), resetTime: new Date(parseInt(reset) * 1000) };
    }
    return { warning: false, remaining: null, resetTime: null };
  }

  /** Raw GitHub repo object -> sync/start repo detail payload (SyncStartRepoPayload in shared/types/models.ts). */
  convertToRepoDetail(repo) {
    return {
      platform: "github",
      fullName: repo.full_name,
      visibility: repo.private ? "private" : "public",
      defaultBranch: repo.default_branch || null,
      pushedAt: repo.pushed_at,
      description: repo.description || null,
      homepage: repo.homepage || null,
      language: repo.language || null,
      languageColor: getLanguageColor(repo.language),
      fork: Boolean(repo.fork),
      archived: Boolean(repo.archived),
      disabled: Boolean(repo.disabled),
      isTemplate: Boolean(repo.is_template),
      hasIssues: Boolean(repo.has_issues),
      hasProjects: Boolean(repo.has_projects),
      hasWiki: Boolean(repo.has_wiki),
      hasPages: Boolean(repo.has_pages),
      hasDiscussions: Boolean(repo.has_discussions),
      size: repo.size || 0,
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      watchers: repo.watchers_count || 0,
      openIssues: repo.open_issues_count || 0,
      createdAt: repo.created_at || null,
      htmlUrl: repo.html_url || null,
      cloneUrl: repo.clone_url || null,
      license: repo.license?.spdx_id || "NOASSERTION",
      owner: repo.owner
        ? {
            login: repo.owner.login,
            avatarUrl: repo.owner.avatar_url || null,
            htmlUrl: repo.owner.html_url || null,
            type: repo.owner.type || null,
          }
        : null,
      topics: repo.topics || [],
      mirrorUrl: repo.mirror_url || null,
    };
  }

  /** Build the URL to fetch a repository's full file tree in one call. `branch` is accepted directly by GitHub's trees API as a ref. */
  buildTreeUrl(fullName, branch) {
    return `${this.baseUrl}/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  }

  /**
   * @param {object} json - response body from buildTreeUrl()
   * @returns {{ headSha: string, files: {path: string}[], truncated: boolean }}
   */
  parseTreeResponse(json) {
    const files = (json.tree || []).filter((item) => item.type === "blob").map((item) => ({ path: item.path }));
    return { headSha: json.sha, files, truncated: !!json.truncated };
  }
}
