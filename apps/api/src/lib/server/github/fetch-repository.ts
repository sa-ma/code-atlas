import type {
  AnalysisWarning,
  RepositoryFile,
  RepositoryMetadata,
  RepositoryRef,
  RepositorySnapshot,
  RepositoryTreeEntry,
} from "@/lib/types/code-atlas";
import { selectRelevantPaths } from "@/lib/server/github/select-relevant-files";

const GITHUB_API_BASE = "https://api.github.com";

function getHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN;

  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "code-atlas",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function githubRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    headers: getHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("GitHub API rate limit reached. Add GITHUB_TOKEN to increase capacity.");
    }

    if (response.status === 404) {
      throw new Error("Repository not found or not publicly accessible.");
    }

    throw new Error(`GitHub API request failed with status ${response.status}.`);
  }

  return (await response.json()) as T;
}

async function fetchRepositoryMetadata(ref: RepositoryRef): Promise<RepositoryMetadata> {
  const payload = await githubRequest<{
    default_branch: string;
    description: string | null;
    html_url: string;
  }>(`/repos/${ref.owner}/${ref.repo}`);

  return {
    ...ref,
    defaultBranch: payload.default_branch,
    description: payload.description,
    htmlUrl: payload.html_url,
  };
}

async function fetchRepositoryTree(
  ref: RepositoryMetadata,
  branch: string,
): Promise<RepositoryTreeEntry[]> {
  const payload = await githubRequest<{
    tree: Array<{ path: string; type: "blob" | "tree"; size?: number }>;
    truncated?: boolean;
  }>(`/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);

  return payload.tree;
}

async function fetchFileContents(
  ref: RepositoryMetadata,
  branch: string,
  path: string,
): Promise<RepositoryFile | null> {
  const payload = await githubRequest<{
    content?: string;
    encoding?: string;
    size: number;
    type: string;
  }>(`/repos/${ref.owner}/${ref.repo}/contents/${path}?ref=${encodeURIComponent(branch)}`);

  if (payload.type !== "file" || !payload.content || payload.encoding !== "base64") {
    return null;
  }

  const content = Buffer.from(payload.content, "base64").toString("utf8");

  return {
    path,
    content,
    size: payload.size,
  };
}

export async function fetchRepositorySnapshot(ref: RepositoryRef): Promise<RepositorySnapshot> {
  const repo = await fetchRepositoryMetadata(ref);
  const branch = ref.branch ?? repo.defaultBranch;
  const tree = await fetchRepositoryTree(repo, branch);
  const warnings: AnalysisWarning[] = [];

  const { paths, warnings: selectionWarnings } = selectRelevantPaths(tree);
  warnings.push(...selectionWarnings);

  const fileResults = await Promise.all(
    paths.map((path) => fetchFileContents(repo, branch, path)),
  );

  const files = fileResults.filter((file): file is RepositoryFile => Boolean(file));

  return {
    repo: {
      ...repo,
      branch,
      defaultBranch: branch,
    },
    tree,
    files,
    warnings,
  };
}
