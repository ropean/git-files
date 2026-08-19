import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "~/features/auth/useAuth";
import { apiFetch } from "~/lib/api";
import { Icon } from "~/components/ui/Icon";
import { RepoRow } from "~/components/repo/RepoRow";
import type { ReposListResponse, Platform, Visibility } from "@shared/types/models";
import s from "./ReposPage.module.css";

const LIMIT = 30;

export function ReposPage() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  // Three-state segmented control per group: "All" (no param, both kinds
  // shown), or exactly one value (param set to just that one). Every click
  // targets one explicit state, so there's no ambiguity — Public/Private and
  // GitHub/GitLab always switch in one click, and "All" is its own button
  // rather than something you have to deselect your way back into.
  const effectiveVisibility = searchParams.get("visibility") as Visibility | null;
  const effectivePlatform = searchParams.get("platform") as Platform | null;
  const offset = Number(searchParams.get("offset")) || 0;
  const [input, setInput] = useState(q);

  useEffect(() => setInput(q), [q]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["repos", q, effectiveVisibility, effectivePlatform, offset, Boolean(user)],
    queryFn: () => {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) });
      if (q) params.set("q", q);
      if (effectiveVisibility) params.set("visibility", effectiveVisibility);
      if (effectivePlatform) params.set("platform", effectivePlatform);
      return apiFetch<ReposListResponse>(`/api/repos?${params.toString()}`);
    },
    enabled: !authLoading,
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    params.delete("offset");
    if (input) params.set("q", input);
    else params.delete("q");
    setSearchParams(params);
  }

  function clear() {
    setInput("");
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    params.delete("offset");
    setSearchParams(params);
  }

  function setFilter(key: "visibility" | "platform", value: string) {
    const params = new URLSearchParams(searchParams);
    params.delete("offset");
    params.set(key, value);
    setSearchParams(params);
  }

  function clearFilter(key: "visibility" | "platform") {
    const params = new URLSearchParams(searchParams);
    params.delete("offset");
    params.delete(key);
    setSearchParams(params);
  }

  function goToOffset(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set("offset", String(next));
    setSearchParams(params);
  }

  return (
    <div className={s.page}>
      <div className={s.hero}>
        <div className={s.titleRow}>
          <h1 className={s.title}>Repos</h1>
          {data && <span className={s.totalCount}>{data.total.toLocaleString()} repos</span>}
        </div>
        <p className={s.scope}>{authLoading ? " " : user ? "Signed in — showing all repos, including private." : "Public repos only — sign in for full access."}</p>
        <form onSubmit={submit} className={s.form}>
          <div className="search-wrap" style={{ maxWidth: 480 }}>
            <span className="search-icon">
              <Icon id="search" size={14} />
            </span>
            <input className={`search-input ${s.searchInput}`} placeholder="Search repo name" value={input} onChange={(e) => setInput(e.target.value)} autoFocus autoComplete="off" />
            {input && (
              <button type="button" className="search-clear" onClick={clear} aria-label="Clear search">
                <Icon id="close" size={10} />
              </button>
            )}
          </div>
        </form>
        <div className={s.filters}>
          {user && (
            <>
              <div className={s.filterGroup}>
                <button type="button" className={`${s.filterChip} ${effectiveVisibility === null ? s.filterChipActive : ""}`} aria-pressed={effectiveVisibility === null} onClick={() => clearFilter("visibility")}>
                  All
                </button>
                <button type="button" className={`${s.filterChip} ${effectiveVisibility === "public" ? s.filterChipActive : ""}`} aria-pressed={effectiveVisibility === "public"} onClick={() => setFilter("visibility", "public")}>
                  <Icon id="globe" size={11} />
                  Public
                </button>
                <button type="button" className={`${s.filterChip} ${effectiveVisibility === "private" ? s.filterChipActive : ""}`} aria-pressed={effectiveVisibility === "private"} onClick={() => setFilter("visibility", "private")}>
                  <Icon id="lock" size={11} />
                  Private
                </button>
              </div>
              <span className={s.filterDivider} />
            </>
          )}
          <div className={s.filterGroup}>
            <button type="button" className={`${s.filterChip} ${effectivePlatform === null ? s.filterChipActive : ""}`} aria-pressed={effectivePlatform === null} onClick={() => clearFilter("platform")}>
              All
            </button>
            <button type="button" className={`${s.filterChip} ${effectivePlatform === "github" ? s.filterChipActive : ""}`} aria-pressed={effectivePlatform === "github"} onClick={() => setFilter("platform", "github")}>
              <Icon id="github" size={11} />
              GitHub
            </button>
            <button type="button" className={`${s.filterChip} ${effectivePlatform === "gitlab" ? s.filterChipActive : ""}`} aria-pressed={effectivePlatform === "gitlab"} onClick={() => setFilter("platform", "gitlab")}>
              <Icon id="gitlab" size={11} />
              GitLab
            </button>
          </div>
        </div>
      </div>

      <div className={s.results}>
        {isFetching && <p className={s.status}>Loading…</p>}
        {error && <p className={s.status}>{(error as Error).message}</p>}
        {data && data.repos.length === 0 && !isFetching && <p className={s.status}>No repos found.</p>}

        {data && data.repos.length > 0 && (
          <ul className={s.list}>
            {data.repos.map((r) => (
              <RepoRow key={r.id} fullName={r.full_name} platform={r.platform} visibility={r.visibility} fileCount={r.file_count} description={r.description} />
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
    </div>
  );
}
