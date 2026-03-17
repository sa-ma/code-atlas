import type {
  ArchitectureFindings,
  DatastoreFinding,
  EvidenceRecord,
  ExternalServiceFinding,
  GraphEdge,
  RepositoryFile,
  ServiceFinding,
} from "@/lib/types/code-atlas";

export interface ExtractorInput {
  files: RepositoryFile[];
  treePaths: string[];
}

export interface ExtractorOutput {
  services?: ServiceFinding[];
  datastores?: DatastoreFinding[];
  externalServices?: ExternalServiceFinding[];
  edges?: GraphEdge[];
  confidenceNotes?: string[];
  warnings?: ArchitectureFindings["warnings"];
  evidence?: EvidenceRecord[];
}

export function createEvidence(
  filePath: string,
  reason: string,
  direct = true,
): EvidenceRecord {
  return { filePath, reason, direct };
}

export function parseJsonFile<T>(file: RepositoryFile): T | null {
  try {
    return JSON.parse(file.content) as T;
  } catch {
    return null;
  }
}

export function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function hasDependency(
  manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  dependency: string,
): boolean {
  return Boolean(
    manifest.dependencies?.[dependency] ?? manifest.devDependencies?.[dependency],
  );
}

export function collectPackageTech(
  manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  mapping: Record<string, string>,
): string[] {
  return unique(
    Object.entries(mapping)
      .filter(([name]) => hasDependency(manifest, name))
      .map(([, label]) => label),
  );
}

export function findFiles(files: RepositoryFile[], pattern: RegExp): RepositoryFile[] {
  return files.filter((file) => pattern.test(file.path));
}
