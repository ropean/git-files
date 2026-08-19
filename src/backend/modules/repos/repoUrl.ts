function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

export function buildFileUrl(platform: string, fullName: string, defaultBranch: string, path: string): string | null {
  const encodedPath = encodePath(path);
  if (platform === "github") return `https://github.com/${fullName}/blob/${defaultBranch}/${encodedPath}`;
  if (platform === "gitlab") return `https://gitlab.com/${fullName}/-/blob/${defaultBranch}/${encodedPath}`;
  return null;
}
