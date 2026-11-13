import type { RepoFileListItem } from "@shared/types/models";

export interface TreeNode {
  name: string;
  path: string;
  type: "dir" | "file";
  url?: string | null;
  children?: TreeNode[];
}

export function buildTree(files: RepoFileListItem[]): TreeNode[] {
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

/**
 * Render a tree as plain text in the style of the Unix `tree` command:
 *
 *   repo/
 *   ├── src/
 *   │   ├── a.ts
 *   │   └── b.ts
 *   └── README.md
 *
 * Box-drawing connectors (rather than bare spaces/tabs) keep the nesting
 * unambiguous wherever it's pasted — Markdown, chat, an LLM prompt.
 * Directories get a trailing "/" so empty-looking branches still read as dirs.
 */
export function formatTreeText(nodes: TreeNode[], rootLabel?: string): string {
  const lines: string[] = [];
  if (rootLabel) lines.push(`${rootLabel}/`);

  const walk = (list: TreeNode[], prefix: string) => {
    list.forEach((n, i) => {
      const last = i === list.length - 1;
      lines.push(`${prefix}${last ? "└── " : "├── "}${n.name}${n.type === "dir" ? "/" : ""}`);
      if (n.children) walk(n.children, prefix + (last ? "    " : "│   "));
    });
  };
  walk(nodes, "");

  return lines.join("\n");
}
