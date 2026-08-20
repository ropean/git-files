import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "~/lib/api";
import { Icon } from "~/components/ui/Icon";
import type { SyncRun } from "@shared/types/models";
import s from "./SyncRunsPanel.module.css";

function formatTime(unixSeconds: number | null): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString();
}

export function SyncRunsPanel() {
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["sync-runs"],
    queryFn: () => apiFetch<{ runs: SyncRun[] }>("/api/sync-runs?limit=20"),
  });

  return (
    <section className={`card ${s.section}`}>
      <div className={s.headingRow}>
        <h2 className={s.heading}>Sync run history</h2>
        <button className="btn btn-outline" onClick={() => refetch()} disabled={isFetching}>
          <Icon id="refresh" size={12} />
          Refresh
        </button>
      </div>
      <p className={s.hint}>Recent runs from this repo's daily indexing job.</p>

      <ul className={s.list}>
        {data?.runs.map((run) => (
          <li key={run.id} className={s.row}>
            <span className={`${s.statusBadge} ${s[run.status]}`}>
              {run.status === "completed" && <Icon id="check" size={11} />}
              {run.status}
            </span>
            <span className={s.time}>{formatTime(run.created_at)}</span>
            <span className={s.counts}>
              {run.repo_count} repos · {run.needs_upload_count} changed
            </span>
          </li>
        ))}
        {data && data.runs.length === 0 && <li className={s.empty}>No sync runs recorded yet.</li>}
      </ul>
    </section>
  );
}
