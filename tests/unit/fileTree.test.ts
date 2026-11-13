import { describe, it, expect } from "vitest";
import { buildTree, formatTreeText } from "../../src/frontend/features/repos/fileTree";

const files = (paths: string[]) => paths.map((path) => ({ path, url: null }));

describe("formatTreeText", () => {
  it("renders nested dirs with tree-style connectors, dirs first", () => {
    const tree = buildTree(files(["README.md", "src/b.ts", "src/lib/x.ts", "src/a.ts", "docs/guide.md"]));
    expect(formatTreeText(tree, "repo")).toBe(["repo/", "├── docs/", "│   └── guide.md", "├── src/", "│   ├── lib/", "│   │   └── x.ts", "│   ├── a.ts", "│   └── b.ts", "└── README.md"].join("\n"));
  });

  it("omits the root line when no label is given", () => {
    expect(formatTreeText(buildTree(files(["a/b/c.txt"])))).toBe(["└── a/", "    └── b/", "        └── c.txt"].join("\n"));
  });

  it("returns an empty string for no files", () => {
    expect(formatTreeText([])).toBe("");
  });
});
