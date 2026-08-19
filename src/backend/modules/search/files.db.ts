import type { Platform, Visibility } from "@shared/types/models";
import { matchQuery } from "./fuzzyMatch";

export interface FileSearchRow {
  path: string;
  repo_id: number;
  full_name: string;
  platform: Platform;
  visibility: Visibility;
  default_branch: string;
}

export interface SearchFilesOptions {
  q: string;
  isAuthenticated?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * OR together every trigram of every word in `q` (each individually
 * phrase-quoted, so special FTS5 query characters in the input can't be read
 * as query syntax) instead of requiring `q` as one contiguous phrase. This
 * turns "exact substring" into "shares at least one 3-char run with one of
 * the query's words, ranked by how many" - a much more forgiving candidate
 * filter, which matchQuery() then re-ranks properly (bm25 alone can't
 * distinguish a scattered partial match from a clean subsequence match).
 * Trigrams are generated per word, not across the whole string, so a
 * multi-word query doesn't waste OR terms on word-boundary/space windows
 * that can never match a file path.
 */
function toFtsFuzzyQuery(term: string): string {
  const words = term.toLowerCase().split(/\s+/).filter(Boolean);
  const grams = new Set<string>();
  for (const word of words) {
    for (let i = 0; i + 3 <= word.length; i++) {
      grams.add(word.slice(i, i + 3));
    }
  }
  return [...grams].map((g) => `"${g.replace(/"/g, '""')}"`).join(" OR ");
}

// How many bm25-ranked candidates to pull from FTS5 before re-scoring in JS.
// bm25 ranks by trigram term-frequency, which actively works against
// abbreviation-style queries (e.g. "pkgjson" for "package.json" - dropping
// internal letters destroys most trigram overlap, so the real match can rank
// behind unrelated documents that happen to repeat a couple of its trigrams
// many times). A shallow pool (300) measurably missed those; 2000 catches
// them while costing single-digit ms locally - cheap enough for D1's 5M
// rows-read/day free tier at this corpus size.
const CANDIDATE_POOL = 2000;

export async function searchFiles(db: D1Database, options: SearchFilesOptions): Promise<{ rows: FileSearchRow[]; hasMore: boolean }> {
  const { q, isAuthenticated, limit = 50, offset = 0 } = options;

  const visibilityClause = isAuthenticated ? "" : "AND r.visibility = 'public'";
  // FTS5 trigram tokenizer needs a word of at least 3 characters to produce
  // any trigram; fall back to a plain indexed LIKE scan when every word in
  // the query is shorter than that (e.g. "go", or "a b").
  const ftsQuery = toFtsFuzzyQuery(q);
  const useFts = ftsQuery.length > 0;

  if (!useFts) {
    const sql = `
      SELECT f.path, r.id AS repo_id, r.full_name, r.platform, r.visibility, r.default_branch
      FROM files f
      JOIN repos r ON r.id = f.repo_id
      WHERE f.path LIKE ? AND r.status = 'active' ${visibilityClause}
      ORDER BY r.full_name, f.path
      LIMIT ? OFFSET ?
    `;
    // Fetch one extra row to detect hasMore without a second COUNT query.
    const result = await db
      .prepare(sql)
      .bind(`%${q}%`, limit + 1, offset)
      .all<FileSearchRow>();
    const hasMore = result.results.length > limit;
    return { rows: result.results.slice(0, limit), hasMore };
  }

  const sql = `
    SELECT f.path, r.id AS repo_id, r.full_name, r.platform, r.visibility, r.default_branch
    FROM files_fts
    JOIN files f ON f.id = files_fts.rowid
    JOIN repos r ON r.id = f.repo_id
    WHERE files_fts MATCH ? AND r.status = 'active' ${visibilityClause}
    ORDER BY bm25(files_fts)
    LIMIT ?
  `;
  const candidates = await db.prepare(sql).bind(ftsQuery, CANDIDATE_POOL).all<FileSearchRow>();

  const scored = candidates.results
    .map((row) => ({ row, score: matchQuery(row.path, q) }))
    .filter((s): s is { row: FileSearchRow; score: number } => s.score !== null)
    .sort((a, b) => b.score - a.score);

  // Once the SQL candidate pool itself was truncated, we can no longer tell
  // whether unscored rows beyond it would outrank the current page - so
  // paging stops being exact past CANDIDATE_POOL. Acceptable for a fuzzy
  // file-finder box: in practice people refine the query rather than page
  // deep into it.
  const hasMore = offset + limit < scored.length;
  return { rows: scored.slice(offset, offset + limit).map((s) => s.row), hasMore };
}
