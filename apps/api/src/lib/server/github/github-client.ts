import type {
  RepositoryFile,
  RepositoryMetadata,
  RepositoryRef,
  RepositoryTreeEntry,
} from "@/lib/types/code-atlas";

type GitHubRepositoryResponse = {
  default_branch: string;
  description: string | null;
  html_url: string;
};

type GitHubTreeResponse = {
  tree: Array<{ path?: string; type?: string; size?: number }>;
  truncated?: boolean;
};

type GitHubContentResponse =
  | Array<unknown>
  | {
      type?: string;
      content?: string;
      encoding?: string;
      size?: number;
    };

interface GitHubRestClient {
  getAuthenticatedUser(): Promise<unknown>;
  getRepository(owner: string, repo: string): Promise<GitHubRepositoryResponse>;
  getTree(owner: string, repo: string, branch: string): Promise<GitHubTreeResponse>;
  getContent(owner: string, repo: string, path: string, ref: string): Promise<GitHubContentResponse>;
}

export interface GitHubClient {
  validateToken(): Promise<void>;
  fetchRepositoryMetadata(ref: RepositoryRef): Promise<RepositoryMetadata>;
  fetchRepositoryTree(ref: RepositoryMetadata, branch: string): Promise<RepositoryTreeEntry[]>;
  fetchRepositoryFile(
    ref: RepositoryMetadata,
    branch: string,
    path: string,
  ): Promise<RepositoryFile | null>;
}

let clientPromise: Promise<GitHubClient> | undefined;

function getStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }

  return undefined;
}

function isRateLimitError(error: unknown): boolean {
  const status = getStatus(error);

  if (status === 403 || status === 429) {
    return true;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return /rate limit|secondary rate limit|abuse/i.test(
      (error as { message: string }).message,
    );
  }

  return false;
}

function toGitHubRequestError(error: unknown): Error {
  const status = getStatus(error);

  if (status === 404) {
    return new Error("Repository not found or not publicly accessible.");
  }

  if (isRateLimitError(error)) {
    return new Error("GitHub API rate limit reached. Check GITHUB_TOKEN permissions and capacity.");
  }

  if (status) {
    return new Error(`GitHub API request failed with status ${status}.`);
  }

  return error instanceof Error ? error : new Error("GitHub API request failed.");
}

function toGitHubTokenValidationError(error: unknown): Error {
  const status = getStatus(error);

  if (status === 401 || status === 403) {
    return new Error("Invalid GITHUB_TOKEN. GitHub rejected the configured API token.");
  }

  if (status) {
    return new Error(`GITHUB_TOKEN validation failed with status ${status}.`);
  }

  return error instanceof Error
    ? new Error(`GITHUB_TOKEN validation failed: ${error.message}`)
    : new Error("GITHUB_TOKEN validation failed.");
}

export function mapRepositoryMetadata(
  ref: RepositoryRef,
  payload: GitHubRepositoryResponse,
): RepositoryMetadata {
  return {
    ...ref,
    defaultBranch: payload.default_branch,
    description: payload.description,
    htmlUrl: payload.html_url,
  };
}

export function mapRepositoryTreeEntries(payload: GitHubTreeResponse): RepositoryTreeEntry[] {
  return payload.tree
    .filter((entry): entry is { path: string; type: string; size?: number } => {
      return typeof entry.path === "string" && typeof entry.type === "string";
    })
    .filter((entry): entry is { path: string; type: "blob" | "tree"; size?: number } => {
      return entry.type === "blob" || entry.type === "tree";
    })
    .map((entry) => {
      if (typeof entry.size === "number") {
        return {
          path: entry.path,
          type: entry.type,
          size: entry.size,
        };
      }

      return {
        path: entry.path,
        type: entry.type,
      };
    });
}

export function decodeRepositoryContent(
  path: string,
  payload: GitHubContentResponse,
): RepositoryFile | null {
  if (Array.isArray(payload)) {
    return null;
  }

  if (
    payload.type !== "file" ||
    typeof payload.content !== "string" ||
    payload.encoding !== "base64" ||
    typeof payload.size !== "number"
  ) {
    return null;
  }

  return {
    path,
    content: Buffer.from(payload.content, "base64").toString("utf8"),
    size: payload.size,
  };
}

async function createOctokitRestClient(): Promise<GitHubRestClient> {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN is required.");
  }

  const { Octokit } = await import("octokit");
  const octokit = new Octokit({
    auth: token,
    userAgent: "code-atlas",
  });

  return {
    getAuthenticatedUser() {
      return octokit.rest.users.getAuthenticated();
    },
    async getRepository(owner: string, repo: string) {
      const response = await octokit.rest.repos.get({
        owner,
        repo,
      });

      return response.data;
    },
    async getTree(owner: string, repo: string, branch: string) {
      const response = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: "true",
      });

      return response.data;
    },
    async getContent(owner: string, repo: string, path: string, ref: string) {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      return response.data as GitHubContentResponse;
    },
  };
}

export async function createGitHubClient(restClient?: GitHubRestClient): Promise<GitHubClient> {
  const client = restClient ?? (await createOctokitRestClient());

  return {
    async validateToken() {
      try {
        await client.getAuthenticatedUser();
      } catch (error) {
        throw toGitHubTokenValidationError(error);
      }
    },
    async fetchRepositoryMetadata(ref) {
      try {
        const payload = await client.getRepository(ref.owner, ref.repo);
        return mapRepositoryMetadata(ref, payload);
      } catch (error) {
        throw toGitHubRequestError(error);
      }
    },
    async fetchRepositoryTree(ref, branch) {
      try {
        const payload = await client.getTree(ref.owner, ref.repo, branch);
        return mapRepositoryTreeEntries(payload);
      } catch (error) {
        throw toGitHubRequestError(error);
      }
    },
    async fetchRepositoryFile(ref, branch, path) {
      try {
        const payload = await client.getContent(ref.owner, ref.repo, path, branch);
        return decodeRepositoryContent(path, payload);
      } catch (error) {
        throw toGitHubRequestError(error);
      }
    },
  };
}

export async function getGitHubClient(): Promise<GitHubClient> {
  clientPromise ??= createGitHubClient();
  return clientPromise;
}

export async function validateGitHubToken(client?: GitHubClient): Promise<void> {
  const gitHubClient = client ?? (await getGitHubClient());
  await gitHubClient.validateToken();
}
