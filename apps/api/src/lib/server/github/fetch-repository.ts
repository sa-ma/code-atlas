import type {
  AnalysisWarning,
  RepositoryRef,
  RepositorySnapshot,
} from "@/lib/types/code-atlas";
import { getGitHubClient } from "@/lib/server/github/github-client";
import { selectRelevantPaths } from "@/lib/server/github/select-relevant-files";

export async function fetchRepositorySnapshot(ref: RepositoryRef): Promise<RepositorySnapshot> {
  const github = await getGitHubClient();
  const repo = await github.fetchRepositoryMetadata(ref);
  const branch = ref.branch ?? repo.defaultBranch;
  const tree = await github.fetchRepositoryTree(repo, branch);
  const warnings: AnalysisWarning[] = [];

  const { paths, warnings: selectionWarnings } = selectRelevantPaths(tree);
  warnings.push(...selectionWarnings);

  const fileResults = await Promise.all(
    paths.map((path) => github.fetchRepositoryFile(repo, branch, path)),
  );

  const files = fileResults.filter((file): file is NonNullable<typeof file> => Boolean(file));

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
