/** Replace a repo's entire file list (SEARCH_API_SPEC.md §4.2 — always a full delete+insert, never a diff). */
export async function replaceRepoFiles(db: D1Database, repoId: string, paths: string[]): Promise<number> {
  const statements: D1PreparedStatement[] = [db.prepare("DELETE FROM files WHERE repo_id = ?").bind(repoId)];

  // D1 caps bound parameters at 100 per statement, and each row binds 2
  // (repo_id, path) - so the row chunk size must be half that, not 100.
  const CHUNK_SIZE = 50;
  for (let i = 0; i < paths.length; i += CHUNK_SIZE) {
    const chunk = paths.slice(i, i + CHUNK_SIZE);
    const placeholders = chunk.map(() => "(?, ?)").join(", ");
    const params = chunk.flatMap((path) => [repoId, path]);
    statements.push(db.prepare(`INSERT INTO files (repo_id, path) VALUES ${placeholders}`).bind(...params));
  }

  await db.batch(statements);
  return paths.length;
}

export async function countFilesForRepo(db: D1Database, repoId: string): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM files WHERE repo_id = ?").bind(repoId).first<{ n: number }>();
  return row?.n ?? 0;
}
