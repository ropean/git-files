/**
 * @title Fetch-with-retry helper
 * @description Shared HTTP helper for scripts/sync-search-index.mjs
 *
 * git-files owns the whole sync-search-index pipeline end to end.
 */

/** Reads response body text for error messages, without letting a body-read failure mask the real HTTP error */
const readErrorBody = async (response) => {
  try {
    const text = await response.text();
    return text ? ` - ${text.slice(0, 500)}` : "";
  } catch {
    return "";
  }
};

/**
 * Fetch with retry mechanism
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Response>}
 */
export const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;

      // Don't retry authentication errors
      if (response.status === 403 || response.status === 401) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}${await readErrorBody(response)}`);
      }

      // Last attempt, throw error
      if (i === maxRetries - 1) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}${await readErrorBody(response)}`);
      }
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`  ⚠️  Retry ${i + 1}/${maxRetries - 1}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
