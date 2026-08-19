import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/features/auth/useAuth";
import { apiFetch } from "~/lib/api";
import { Icon } from "~/components/ui/Icon";
import { RepoRow } from "~/components/repo/RepoRow";
import type { RepoStatsResponse, SearchResponse } from "@shared/types/models";
import s from "./SearchPage.module.css";

const LIMIT = 50;

const PLATFORM_LABELS: Record<string, string> = {
  github: "GitHub",
  gitlab: "GitLab",
};

const PLATFORM_ICONS: Record<string, "github" | "gitlab"> = {
  github: "github",
  gitlab: "gitlab",
};

interface StatBlockData {
  key: string;
  label: string;
  icon: "repo" | "github" | "gitlab";
  publicRepos: number;
  publicFiles: number;
  privateRepos: number;
  privateFiles: number;
}

export function SearchPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const offset = Number(searchParams.get("offset")) || 0;
  const [input, setInput] = useState(q);

  useEffect(() => setInput(q), [q]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["search", q, offset, Boolean(user)],
    queryFn: () => apiFetch<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}&limit=${LIMIT}&offset=${offset}`),
    enabled: q.length > 0 && !authLoading,
  });

  const { data: stats } = useQuery({
    queryKey: ["repo-stats", Boolean(user)],
    queryFn: () => apiFetch<RepoStatsResponse>("/api/repos/stats"),
    enabled: !authLoading && !q,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSearchParams(input ? { q: input } : {});
  }

  function clear() {
    setInput("");
    setSearchParams({});
  }

  function goToOffset(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set("offset", String(next));
    setSearchParams(params);
  }

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <h1 className={s.title}>Search your repos</h1>
        <p className={s.scope}>{authLoading ? " " : user ? "Signed in — searching all repos, including private." : "Public repos only — sign in for full access."}</p>
        <form onSubmit={submit} className={s.form}>
          <div className="search-wrap" style={{ maxWidth: 560 }}>
            <span className="search-icon">
              <Icon id="search" size={14} />
            </span>
            <input className={`search-input ${s.searchInput}`} placeholder="Search filenames — e.g. index.ts, Dockerfile" value={input} onChange={(e) => setInput(e.target.value)} autoFocus autoComplete="off" />
            {input && (
              <button type="button" className="search-clear" onClick={clear} aria-label="Clear search">
                <Icon id="close" size={10} />
              </button>
            )}
          </div>
        </form>
      </div>

      {!q && stats && stats.platforms.length > 0 && (
        <div className={s.stats}>
          {(
            [
              {
                key: "overall",
                label: "Overall",
                icon: "repo",
                publicRepos: stats.totalPublicRepos,
                publicFiles: stats.totalPublicFiles,
                privateRepos: stats.totalPrivateRepos,
                privateFiles: stats.totalPrivateFiles,
              },
              ...stats.platforms.map((p) => ({
                key: p.platform,
                label: PLATFORM_LABELS[p.platform] ?? p.platform,
                icon: PLATFORM_ICONS[p.platform] ?? "repo",
                publicRepos: p.publicRepoCount,
                publicFiles: p.publicFileCount,
                privateRepos: p.privateRepoCount,
                privateFiles: p.privateFileCount,
              })),
            ] as StatBlockData[]
          ).map((b) => {
            const platformParam = b.key === "overall" ? "" : `&platform=${b.key}`;
            return (
              <div key={b.key} className={`card ${s.statBlock}`}>
                <Link to={`/repos${b.key === "overall" ? "" : `?platform=${b.key}`}`} className={s.statBlockHeader}>
                  <Icon id={b.icon} size={16} />
                  <span>{b.label}</span>
                  <span className={s.statBlockCount}>{(b.publicRepos + b.privateRepos).toLocaleString()} repos</span>
                </Link>
                <Link to={`/repos?visibility=public${platformParam}`} className={s.statRow}>
                  <Icon id="globe" size={12} className={s.statRowIcon} />
                  <span className={s.statRowLabel}>Public repos</span>
                  <span className={s.statRowValue}>{b.publicRepos.toLocaleString()}</span>
                </Link>
                <div className={s.statRow}>
                  <Icon id="file" size={12} className={s.statRowIcon} />
                  <span className={s.statRowLabel}>Public files</span>
                  <span className={s.statRowValue}>{b.publicFiles.toLocaleString()}</span>
                </div>
                {user && (
                  <>
                    <Link to={`/repos?visibility=private${platformParam}`} className={s.statRow}>
                      <Icon id="lock" size={12} className={s.statRowIcon} />
                      <span className={s.statRowLabel}>Private repos</span>
                      <span className={s.statRowValue}>{b.privateRepos.toLocaleString()}</span>
                    </Link>
                    <div className={s.statRow}>
                      <Icon id="file" size={12} className={s.statRowIcon} />
                      <span className={s.statRowLabel}>Private files</span>
                      <span className={s.statRowValue}>{b.privateFiles.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {q && (
        <div className={s.results}>
          {isFetching && <p className={s.status}>Searching…</p>}
          {error && <p className={s.status}>{(error as Error).message}</p>}
          {data && data.repos.length === 0 && data.results.length === 0 && !isFetching && <p className={s.status}>Nothing matched "{q}".</p>}

          {data && offset === 0 && data.repos.length > 0 && (
            <>
              <p className={s.sectionLabel}>Repos</p>
              <ul className={s.list}>
                {data.repos.map((r) => (
                  <RepoRow key={r.id} fullName={r.fullName} platform={r.platform} visibility={r.visibility} fileCount={r.fileCount} description={r.description} />
                ))}
              </ul>
            </>
          )}

          {data && offset === 0 && data.repos.length > 0 && data.results.length > 0 && <p className={s.sectionLabel}>Files</p>}

          {data && data.results.length > 0 && (
            <ul className={s.list}>
              {data.results.map((r, i) => (
                <li key={`${r.repo.fullName}/${r.path}/${i}`} className={`card ${s.row}`}>
                  <Icon id="file" size={14} className={s.fileIcon} />
                  <div className={s.rowMain}>
                    <div className={s.meta}>
                      <Link to={`/repos/${r.repo.fullName}`} className={s.repoName}>
                        {r.repo.fullName}
                      </Link>
                      <span className={`${s.badge} ${r.repo.visibility === "private" ? s.badgePrivate : s.badgePublic}`}>
                        <Icon id={r.repo.visibility === "private" ? "lock" : "globe"} size={10} />
                        {r.repo.visibility}
                      </span>
                    </div>
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className={s.path}>
                        {r.path}
                      </a>
                    ) : (
                      <span className={s.path}>{r.path}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {data && (data.hasMore || offset > 0) && (
            <div className={s.pagination}>
              <button className="btn btn-outline" disabled={offset === 0} onClick={() => goToOffset(Math.max(0, offset - LIMIT))}>
                Previous
              </button>
              <button className="btn btn-outline" disabled={!data.hasMore} onClick={() => goToOffset(offset + LIMIT)}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
