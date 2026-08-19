import { BaseAdapter } from "./base.mjs";

/** GitLab API adapter: repo listing + full file-tree fetch. */
export class GitLabAdapter extends BaseAdapter {
  getHeaders() {
    const headers = { "User-Agent": "git-files-sync" };
    if (this.token) headers["PRIVATE-TOKEN"] = this.token; // GitLab uses PRIVATE-TOKEN, not Authorization
    return headers;
  }

  buildReposUrl(page, perPage = 100) {
    if (this.token) {
      return `${this.baseUrl}/projects?owned=true&per_page=${perPage}&page=${page}&order_by=last_activity_at&sort=desc`;
    } else if (this.owner) {
      return `${this.baseUrl}/users/${this.owner}/projects?per_page=${perPage}&page=${page}&order_by=last_activity_at&sort=desc`;
    }
    throw new Error("GitLab: Either token or owner must be provided");
  }

  checkRateLimit(response) {
    const remaining = response.headers.get("RateLimit-Remaining");
    const reset = response.headers.get("RateLimit-Reset");
    if (remaining && parseInt(remaining) < 10) {
      return { warning: true, remaining: parseInt(remaining), resetTime: reset ? new Date(parseInt(reset) * 1000) : null };
    }
    return { warning: false, remaining: null, resetTime: null };
  }

  /** Raw GitLab project object -> sync/start repo detail payload (SyncStartRepoPayload in shared/types/models.ts). */
  convertToRepoDetail(project) {
    const owner = project.owner || {
      username: project.namespace.path,
      avatar_url: project.namespace.avatar_url || "",
      web_url: project.namespace.web_url,
    };

    return {
      platform: "gitlab",
      fullName: project.path_with_namespace,
      visibility: project.visibility === "private" ? "private" : "public",
      defaultBranch: project.default_branch || "main",
      pushedAt: project.last_activity_at,
      description: project.description || null,
      homepage: null, // GitLab doesn't have a separate homepage field
      language: null, // GitLab doesn't provide primary language in the list API
      languageColor: null,
      fork: false, // GitLab doesn't expose fork status in the basic API
      archived: Boolean(project.archived),
      disabled: Boolean(project.empty_repo),
      isTemplate: false, // GitLab uses a different template system
      hasIssues: true, // GitLab projects have issues by default
      hasProjects: false, // GitLab uses different project management
      hasWiki: true, // Most GitLab projects have wiki enabled
      hasPages: false, // Would need an additional API call
      hasDiscussions: true,
      size: 0, // GitLab doesn't provide size in the list API
      stars: project.star_count || 0,
      forks: project.forks_count || 0,
      watchers: 0, // GitLab doesn't have a watchers concept
      openIssues: project.open_issues_count || 0,
      createdAt: project.created_at || null,
      htmlUrl: project.web_url || null,
      cloneUrl: project.http_url_to_repo || null,
      license: "NOASSERTION", // Would need an additional API call
      owner: {
        login: owner.username,
        avatarUrl: owner.avatar_url || null,
        htmlUrl: owner.web_url || null,
        type: project.namespace.kind === "group" ? "Organization" : "User",
      },
      topics: project.topics || [],
      mirrorUrl: null,
    };
  }

  /**
   * GitLab has no single-call "give me the whole tree + its sha" endpoint
   * like GitHub, so the head commit sha is fetched separately from the
   * branch info, and the tree itself is paginated.
   */
  buildBranchUrl(fullName, branch) {
    return `${this.baseUrl}/projects/${encodeURIComponent(fullName)}/repository/branches/${encodeURIComponent(branch)}`;
  }

  parseBranchResponse(json) {
    return json?.commit?.id;
  }

  buildTreeUrl(fullName, branch, page, perPage = 100) {
    return `${this.baseUrl}/projects/${encodeURIComponent(fullName)}/repository/tree?ref=${encodeURIComponent(branch)}&recursive=true&per_page=${perPage}&page=${page}`;
  }

  /** @returns {{path: string}[]} - one page of blob entries */
  parseTreePage(json) {
    return (json || []).filter((item) => item.type === "blob").map((item) => ({ path: item.path }));
  }
}
