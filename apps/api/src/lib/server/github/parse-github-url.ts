import type { RepositoryRef } from "@/lib/types/code-atlas";

const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

export function parseGitHubUrl(input: string): RepositoryRef {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("Enter a valid GitHub repository URL.");
  }

  if (!GITHUB_HOSTS.has(url.hostname)) {
    throw new Error("Only public GitHub repository URLs are supported.");
  }

  const segments = url.pathname.replace(/\.git$/, "").split("/").filter(Boolean);

  if (segments.length < 2) {
    throw new Error("Repository URL must include both owner and repository name.");
  }

  const [owner, repo, maybeTree, ...rest] = segments;
  const branch = maybeTree === "tree" && rest.length > 0 ? rest.join("/") : undefined;

  return {
    owner,
    repo,
    branch,
    htmlUrl: `https://github.com/${owner}/${repo}`,
  };
}
