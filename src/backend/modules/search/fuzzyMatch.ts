/**
 * fzf/VS Code "Go to File" style subsequence fuzzy matcher. Every character
 * of `q` must appear in `path`, in order, but not necessarily contiguously
 * ("gpf" matches "getProfile.ts"). Used to re-rank a bounded SQL candidate
 * pool - see searchFiles() in db/files.ts for why the SQL layer alone
 * (trigram bm25) isn't enough on its own.
 */
export function fuzzyScore(path: string, q: string): number | null {
  if (q.length === 0) return 0;

  const hay = path.toLowerCase();
  const needle = q.toLowerCase();

  let score = 0;
  let searchFrom = 0;
  let prevMatchIndex = -1;
  let consecutiveRun = 0;

  for (let i = 0; i < needle.length; i++) {
    const foundAt = hay.indexOf(needle[i], searchFrom);
    if (foundAt === -1) return null;

    const prevChar = hay[foundAt - 1];
    const isSeparatorBoundary = foundAt === 0 || prevChar === "/" || prevChar === "_" || prevChar === "-" || prevChar === ".";
    const isCamelBoundary = foundAt > 0 && /[a-z0-9]/.test(path[foundAt - 1]) && /[A-Z]/.test(path[foundAt]);
    const isConsecutive = foundAt === prevMatchIndex + 1;

    consecutiveRun = isConsecutive ? consecutiveRun + 1 : 1;
    score += 1 + consecutiveRun * 2 + (isSeparatorBoundary || isCamelBoundary ? 5 : 0) - (foundAt - searchFrom);

    prevMatchIndex = foundAt;
    searchFrom = foundAt + 1;
  }

  // Same match density in a shorter path (closer to a whole-filename match) ranks higher.
  score += (needle.length / hay.length) * 10;
  return score;
}

/**
 * Multi-word query matcher: `query` is split on whitespace into independent
 * words, each of which must fuzzyScore-match somewhere in `path` - order
 * between words doesn't matter, only within each word. Without this, "dev
 * exam" would require a literal space character in `path` (via fuzzyScore
 * treating the whole query as one subsequence), which real file paths
 * essentially never contain, so every candidate would score null.
 */
export function matchQuery(path: string, query: string): number | null {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  let total = 0;
  for (const word of words) {
    const score = fuzzyScore(path, word);
    if (score === null) return null;
    total += score;
  }
  return total;
}
