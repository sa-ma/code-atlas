import { buildArchitectureRead } from "@/lib/server/analysis/build-architecture-read";
import { generateArchitectureMermaid } from "@/lib/server/analysis/generate-architecture-mermaid";
import { inventoryRepository } from "@/lib/server/analysis/inventory-repository";
import { readArchitectureFromRepository } from "@/lib/server/analysis/read-architecture-from-repository";
import { fetchRepositorySnapshot } from "@/lib/server/github/fetch-repository";
import { parseGitHubUrl } from "@/lib/server/github/parse-github-url";
import type {
  AnalyzeRepositoryResponse,
  ArchitectureRead,
} from "@/lib/types/code-atlas";

function createSummary(architecture: ArchitectureRead): string {
  const boxCount =
    architecture.containers.length +
    architecture.components.length +
    architecture.datastores.length +
    architecture.externalServices.length +
    architecture.domainEntities.length;

  return [
    `This repo reads as a ${architecture.repoContext.appKind.replace(/-/g, " ")}.`,
    `${boxCount} architecture boxes were grouped from repo structure, framework conventions, and selected source files.`,
  ].join(" ");
}

export async function analyzeRepository(repoUrl: string): Promise<AnalyzeRepositoryResponse> {
  const ref = parseGitHubUrl(repoUrl);
  const snapshot = await fetchRepositorySnapshot(ref);
  const inventory = inventoryRepository(snapshot);
  const sourceRead = readArchitectureFromRepository(snapshot, inventory);
  const architecture = buildArchitectureRead(sourceRead, inventory, snapshot);

  const warnings = [
    ...snapshot.warnings,
    ...inventory.warnings,
  ];

  return {
    repo: snapshot.repo,
    architecture,
    mermaid: generateArchitectureMermaid(architecture),
    summary: createSummary(architecture),
    warnings,
  };
}
