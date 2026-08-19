import type { SyncKey } from "@shared/types/models";

export async function listSyncKeys(db: D1Database): Promise<SyncKey[]> {
  const result = await db.prepare("SELECT * FROM sync_keys ORDER BY created_at DESC").all<SyncKey>();
  return result.results;
}

export async function getActiveSyncKey(db: D1Database, keyId: string): Promise<SyncKey | null> {
  return db.prepare("SELECT * FROM sync_keys WHERE key_id = ? AND revoked_at IS NULL").bind(keyId).first<SyncKey>();
}

export async function addSyncKey(db: D1Database, data: { keyId: string; publicKey: string; label: string }): Promise<void> {
  await db.prepare("INSERT INTO sync_keys (key_id, public_key, label) VALUES (?, ?, ?)").bind(data.keyId, data.publicKey, data.label).run();
}

export async function revokeSyncKey(db: D1Database, keyId: string): Promise<void> {
  await db.prepare("UPDATE sync_keys SET revoked_at = unixepoch() WHERE key_id = ? AND revoked_at IS NULL").bind(keyId).run();
}
