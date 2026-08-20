import { Fragment } from "react";

/**
 * Mirrors the subsequence-per-word logic in
 * src/backend/modules/search/fuzzyMatch.ts (fuzzyScore/matchQuery): each
 * word of the query must match `text` as an in-order (not necessarily
 * contiguous) subsequence, case-insensitively. Returns the matched
 * character indices so highlighting reflects what the backend actually
 * matched, not a naive substring search.
 */
function fuzzyMatchIndices(text: string, needle: string): Set<number> {
  const hay = text.toLowerCase();
  const n = needle.toLowerCase();
  const indices = new Set<number>();
  let searchFrom = 0;
  for (let i = 0; i < n.length; i++) {
    const foundAt = hay.indexOf(n[i], searchFrom);
    if (foundAt === -1) return new Set();
    indices.add(foundAt);
    searchFrom = foundAt + 1;
  }
  return indices;
}

function matchedIndices(text: string, query: string): Set<number> {
  const words = query.trim().split(/\s+/).filter(Boolean);
  const all = new Set<number>();
  for (const word of words) {
    for (const i of fuzzyMatchIndices(text, word)) all.add(i);
  }
  return all;
}

/** Renders `text` with the characters matched by `query` wrapped in <mark>. */
export function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const indices = matchedIndices(text, query);
  if (indices.size === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let runStart = 0;
  let runIsMatch = indices.has(0);

  function flushRun(end: number) {
    if (runStart === end) return;
    const chunk = text.slice(runStart, end);
    parts.push(runIsMatch ? <mark key={runStart}>{chunk}</mark> : <Fragment key={runStart}>{chunk}</Fragment>);
  }

  for (let i = 1; i <= text.length; i++) {
    const isMatch = indices.has(i);
    if (isMatch !== runIsMatch) {
      flushRun(i);
      runStart = i;
      runIsMatch = isMatch;
    }
  }
  flushRun(text.length);

  return <>{parts}</>;
}
