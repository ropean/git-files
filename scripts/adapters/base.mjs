/**
 * Base adapter class for Git platforms. Platform adapters extend this.
 * Covers only what scripts/sync-search-index.mjs actually needs (repo
 * listing + file-tree fetching) — no "normalize + write to data/*.json"
 * step.
 */
export class BaseAdapter {
  constructor(config) {
    this.name = config.name;
    this.baseUrl = config.baseUrl;
    this.token = config.token;
    this.owner = config.owner;
    this.authType = config.authType;
  }

  /** Get API headers for requests. Must be implemented by subclasses. */
  getHeaders() {
    throw new Error(`${this.name}: Must implement getHeaders()`);
  }

  /**
   * Build the URL for fetching repositories. Must be implemented by subclasses.
   * @param {number} page
   * @param {number} perPage
   * @returns {string}
   */
  buildReposUrl(_page, _perPage) {
    throw new Error(`${this.name}: Must implement buildReposUrl()`);
  }

  /**
   * Check rate limit from response headers. Optional override.
   * @param {Response} response
   * @returns {{ warning: boolean, remaining: number|null, resetTime: Date|null }}
   */
  checkRateLimit(_response) {
    return { warning: false, remaining: null, resetTime: null };
  }

  /** @param {object[]} repos @param {number} perPage @returns {boolean} */
  hasMorePages(repos, perPage) {
    return repos.length === perPage;
  }

  /** Convert a raw platform repo object into the sync/start repo detail payload. Must be implemented by subclasses. */
  convertToRepoDetail(_repo) {
    throw new Error(`${this.name}: Must implement convertToRepoDetail()`);
  }
}
