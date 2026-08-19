export interface ListFilesForRepoOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

/** Paginated file listing for a single repo's file-browser page — plain path LIKE scan, no FTS needed at this scale. */
export async function listFilesForRepo(db: D1Database, repoId: string, options: ListFilesForRepoOptions = {}): Promise<{ paths: string[]; hasMore: boolean }> {
  const { search, limit = 100, offset = 0 } = options;

  const conditions: string[] = ["repo_id = ?"];
  const params: (string | number)[] = [repoId];

  if (search) {
    conditions.push("path LIKE ?");
    params.push(`%${search}%`);
  }

  const sql = `
    SELECT path FROM files
    WHERE ${conditions.join(" AND ")}
    ORDER BY path
    LIMIT ? OFFSET ?
  `;
  // Fetch one extra row to detect hasMore without a second COUNT query.
  params.push(limit + 1, offset);

  const result = await db
    .prepare(sql)
    .bind(...params)
    .all<{ path: string }>();
  const hasMore = result.results.length > limit;
  return { paths: result.results.slice(0, limit).map((r) => r.path), hasMore };
}
