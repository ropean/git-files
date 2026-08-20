import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "~/lib/api";
import { Icon } from "~/components/ui/Icon";
import { HighlightMatch } from "~/components/ui/HighlightMatch";
import type { RepoFilesResponse, RepoFileListItem, Platform } from "@shared/types/models";
import s from "./RepoFilesPage.module.css";

const PLATFORM_ICONS: Record<Platform, "github" | "gitlab"> = {
  github: "github",
  gitlab: "gitlab",
};

function formatDate(unixSeconds: number | null): string | null {
  if (!unixSeconds) return null;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function copyText(text: string, onCopied: () => void) {
  try {
    await navigator.clipboard.writeText(text);
    onCopied();
  } catch {
    // Clipboard API can be unavailable (insecure context, permissions) — silently no-op rather than throw.
  }
}

interface TreeNode {
  name: string;
  path: string;
  type: "dir" | "file";
  url?: string | null;
  children?: TreeNode[];
}

function buildTree(files: RepoFileListItem[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirNodes = new Map<string, TreeNode>();

  for (const f of files) {
    const parts = f.path.split("/");
    let siblings = root;
    let dirPath = "";
    for (let i = 0; i < parts.length - 1; i++) {
      dirPath = dirPath ? `${dirPath}/${parts[i]}` : parts[i];
      let node = dirNodes.get(dirPath);
      if (!node) {
        node = { name: parts[i], path: dirPath, type: "dir", children: [] };
        dirNodes.set(dirPath, node);
        siblings.push(node);
      }
      siblings = node.children!;
    }
    siblings.push({ name: parts[parts.length - 1], path: f.path, type: "file", url: f.url });
  }

  sortTree(root);
  return root;
}

function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) => (a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name)));
  for (const n of nodes) if (n.children) sortTree(n.children);
}

function TreeView({ nodes, depth, query }: { nodes: TreeNode[]; depth: number; query: string }) {
  return (
    <ul className={s.tree}>
      {nodes.map((n) =>
        n.type === "dir" ? (
          <li key={n.path}>
            <details open>
              <summary className={s.dirRow} style={{ paddingLeft: depth * 16 + 10 }}>
                <Icon id="folder" size={13} className={s.dirIcon} />
                {n.name}
              </summary>
              <TreeView nodes={n.children!} depth={depth + 1} query={query} />
            </details>
          </li>
        ) : (
          <li key={n.path} className={s.fileRow} style={{ paddingLeft: depth * 16 + 10 }}>
            <Icon id="file" size={13} className={s.fileIcon} />
            {n.url ? (
              <a href={n.url} target="_blank" rel="noopener noreferrer" className={s.path}>
                <HighlightMatch text={n.name} query={query} />
              </a>
            ) : (
              <span className={s.path}>
                <HighlightMatch text={n.name} query={query} />
              </span>
            )}
          </li>
        ),
      )}
    </ul>
  );
}

export function RepoFilesPage() {
  const { "*": fullName = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [input, setInput] = useState(q);
  const [copied, setCopied] = useState(false);

  useEffect(() => setInput(q), [q]);

  const { data, isFetching, error } = useQuery({
    queryKey: ["repo-files", fullName],
    queryFn: () => apiFetch<RepoFilesResponse>(`/api/repos/${fullName}/files`),
    retry: false,
  });

  const filteredFiles = useMemo(() => {
    if (!data) return [];
    if (!q) return data.files;
    const needle = q.toLowerCase();
    return data.files.filter((f) => f.path.toLowerCase().includes(needle));
  }, [data, q]);

  const tree = useMemo(() => buildTree(filteredFiles), [filteredFiles]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (input) params.set("q", input);
    else params.delete("q");
    setSearchParams(params);
  }

  function clear() {
    setInput("");
    const params = new URLSearchParams(searchParams);
    params.delete("q");
    setSearchParams(params);
  }

  if (error) {
    return (
      <div className={s.page}>
        <p className={s.status}>{(error as Error).message === "Not found" ? "Repo not found." : (error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <Link to="/repos" className={s.back}>
        ← All repos
      </Link>

      {data && (
        <div className={s.layout}>
          <aside className={s.sidebar}>
            <div className={s.repoHeading}>
              <Icon id={PLATFORM_ICONS[data.repo.platform] ?? "repo"} size={20} />
              <h1 className={s.title}>{data.repo.fullName}</h1>
            </div>
            <div className={s.badgeRow}>
              <span className={`${s.badge} ${data.repo.visibility === "private" ? s.badgePrivate : s.badgePublic}`}>
                <Icon id={data.repo.visibility === "private" ? "lock" : "globe"} size={10} />
                {data.repo.visibility}
              </span>
              {data.repo.archived && <span className={s.badge}>archived</span>}
              {data.repo.fork && <span className={s.badge}>fork</span>}
            </div>

            {data.repo.description && <p className={s.description}>{data.repo.description}</p>}

            <form onSubmit={submit} className={s.form}>
              <div className="search-wrap">
                <span className="search-icon">
                  <Icon id="search" size={14} />
                </span>
                <input className={`search-input ${s.searchInput}`} placeholder="Filter files in this repo" value={input} onChange={(e) => setInput(e.target.value)} autoFocus autoComplete="off" />
                {input && (
                  <button type="button" className="search-clear" onClick={clear} aria-label="Clear search">
                    <Icon id="close" size={10} />
                  </button>
                )}
              </div>
            </form>

            {data.repo.owner && (
              <div className={s.owner}>
                {data.repo.owner.avatarUrl && <img src={data.repo.owner.avatarUrl} alt={data.repo.owner.login} className={s.ownerAvatar} />}
                {data.repo.owner.htmlUrl ? (
                  <a href={data.repo.owner.htmlUrl} target="_blank" rel="noopener noreferrer" className={s.ownerName}>
                    {data.repo.owner.login}
                  </a>
                ) : (
                  <span className={s.ownerName}>{data.repo.owner.login}</span>
                )}
              </div>
            )}

            <div className={s.actions}>
              {data.repo.htmlUrl && (
                <a href={data.repo.htmlUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                  <Icon id="external-link" size={12} />
                  View repo
                </a>
              )}
              {data.repo.cloneUrl && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() =>
                    copyText(data.repo.cloneUrl!, () => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    })
                  }
                >
                  <Icon id={copied ? "check" : "repo"} size={12} />
                  {copied ? "Copied!" : "Copy clone URL"}
                </button>
              )}
              {data.repo.homepage && (
                <a href={data.repo.homepage} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                  <Icon id="home" size={12} />
                  {data.repo.homepage}
                </a>
              )}
            </div>

            <ul className={s.metaList}>
              {data.repo.language && (
                <li className={s.metaItem}>
                  <span className={s.languageDot} style={{ backgroundColor: data.repo.languageColor ?? undefined }} />
                  {data.repo.language}
                </li>
              )}
              {data.repo.license && data.repo.license !== "NOASSERTION" && (
                <li className={s.metaItem}>
                  <Icon id="shield" size={12} />
                  {data.repo.license}
                </li>
              )}
              <li className={s.metaItem}>
                <Icon id="star" size={12} />
                {data.repo.stars.toLocaleString()} stars
              </li>
              <li className={s.metaItem}>
                <Icon id="fork" size={12} />
                {data.repo.forks.toLocaleString()} forks
              </li>
              {data.repo.watchers > 0 && (
                <li className={s.metaItem}>
                  <Icon id="eye" size={12} />
                  {data.repo.watchers.toLocaleString()} watchers
                </li>
              )}
              {data.repo.openIssues > 0 && (
                <li className={s.metaItem}>
                  <Icon id="alert-circle" size={12} />
                  {data.repo.openIssues.toLocaleString()} open issues
                </li>
              )}
              {formatDate(data.repo.createdAt) && (
                <li className={s.metaItem}>
                  <Icon id="calendar" size={12} />
                  Created {formatDate(data.repo.createdAt)}
                </li>
              )}
              {formatDate(data.repo.pushedAt) && (
                <li className={s.metaItem}>
                  <Icon id="clock" size={12} />
                  Pushed {formatDate(data.repo.pushedAt)}
                </li>
              )}
            </ul>

            {data.repo.topics.length > 0 && (
              <div className={s.topics}>
                {data.repo.topics.map((topic) => (
                  <span key={topic} className={s.topic}>
                    <Icon id="tag" size={10} />
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </aside>

          <main className={s.main}>
            <div className={s.results}>
              {isFetching && <p className={s.status}>Loading…</p>}
              {filteredFiles.length === 0 && !isFetching && <p className={s.status}>{q ? `No files matched "${q}".` : "No files indexed for this repo."}</p>}
              {filteredFiles.length > 0 && (
                <>
                  <p className={s.resultsCount}>{q ? `${filteredFiles.length.toLocaleString()} of ${data.files.length.toLocaleString()} files` : `${filteredFiles.length.toLocaleString()} files`}</p>
                  <div className={`card ${s.treeCard}`}>
                    <TreeView nodes={tree} depth={0} query={q} />
                  </div>
                </>
              )}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
