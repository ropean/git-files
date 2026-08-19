import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "~/lib/api";
import { Icon } from "~/components/ui/Icon";
import type { SyncKey } from "@shared/types/models";
import s from "./SyncKeysPanel.module.css";

export function SyncKeysPanel() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["sync-keys"],
    queryFn: () => apiFetch<{ keys: SyncKey[] }>("/api/sync-keys"),
  });

  const [keyId, setKeyId] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [label, setLabel] = useState("");

  const addKey = useMutation({
    mutationFn: () => apiFetch("/api/sync-keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyId, publicKey, label }) }),
    onSuccess: () => {
      setKeyId("");
      setPublicKey("");
      setLabel("");
      queryClient.invalidateQueries({ queryKey: ["sync-keys"] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/sync-keys/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sync-keys"] }),
  });

  return (
    <section className={`card ${s.section}`}>
      <h2 className={s.heading}>Sync keys</h2>
      <p className={s.hint}>
        Ed25519 public keys used to verify signed requests from this repo's <code>scripts/sync-search-index.mjs</code> job. The key id must match the SEARCH_API_KEY_ID configured there. Run <code>pnpm gen:sync-key</code> to generate a keypair.
      </p>

      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          if (keyId && publicKey) addKey.mutate();
        }}
      >
        <input className="input" placeholder="Key id" value={keyId} onChange={(e) => setKeyId(e.target.value)} />
        <input className="input" placeholder="Public key (base64)" value={publicKey} onChange={(e) => setPublicKey(e.target.value)} />
        <input className="input" placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn btn-solid" type="submit" disabled={!keyId || !publicKey || addKey.isPending}>
          <Icon id="plus" size={13} />
          Add key
        </button>
      </form>

      <ul className={s.list}>
        {data?.keys.map((k) => (
          <li key={k.key_id} className={s.row}>
            <div className={s.rowMain}>
              <span className={s.keyId}>{k.key_id}</span>
              {k.label && <span className={s.label}>{k.label}</span>}
            </div>
            {k.revoked_at ? (
              <span className={s.revoked}>Revoked</span>
            ) : (
              <button className="btn btn-outline" onClick={() => revokeKey.mutate(k.key_id)} disabled={revokeKey.isPending}>
                <Icon id="trash" size={12} />
                Revoke
              </button>
            )}
          </li>
        ))}
        {data && data.keys.length === 0 && <li className={s.empty}>No sync keys yet.</li>}
      </ul>
    </section>
  );
}
