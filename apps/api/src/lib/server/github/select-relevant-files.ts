import type {
  AnalysisWarning,
  RepositoryFile,
  RepositoryTreeEntry,
} from "@/lib/types/code-atlas";

const MAX_FILES = 120;
const MAX_BYTES = 500_000;

const GENERATED_PATH_PATTERNS = [
  /(^|\/)(dist|build|coverage|\.next|out|target)\//i,
];

const PRIORITY_PATTERNS: Array<[RegExp, number]> = [
  [/^package\.json$/i, 200],
  [/^README(\.md)?$/i, 198],
  [/^(pnpm-workspace\.yaml|turbo\.json|lerna\.json)$/i, 190],
  [/^apps\/[^/]+\/package\.json$/i, 185],
  [/^(packages|services)\/[^/]+\/package\.json$/i, 184],
  [/^prisma\/schema\.prisma$/i, 180],
  [/\/prisma\/schema\.prisma$/i, 179],
  [/\/(main|index|server|app)\.(ts|tsx|js|jsx)$/i, 178],
  [/^(next\.config|vite\.config|vercel\.json|render\.yaml|docker-compose).*$/i, 175],
  [/^Dockerfile/i, 175],
  [/^\.github\/workflows\/.+\.(yml|yaml)$/i, 174],
  [/\/(controllers?|routes?|middlewares?|services?|use-cases?|schemas?|models?|entities?)\//i, 173],
  [/\.(controller|route)\.(ts|tsx|js|jsx)$/i, 173],
  [/\.(service|use-case|usecase)\.(ts|tsx|js|jsx)$/i, 172],
  [/\.(entity|model|schema)\.(ts|tsx|js|jsx)$/i, 171],
  [/\/(app\/api\/.+\/route|pages\/api\/.+|src\/pages\/api\/.+)\.(ts|tsx|js|jsx)$/i, 170],
  [/\.(middleware|guard|interceptor)\.(ts|tsx|js|jsx)$/i, 169],
  [/\.(module|decorator)\.(ts|tsx|js|jsx)$/i, 168],
  [/\/(worker|workers|queue|queues|jobs)\//i, 165],
  [/\/(auth|jwt|token|session|passport|bcrypt|hash)\//i, 162],
  [/(^|\/)(auth|jwt|token|session|passport|bcrypt|hash)[^/]*\.(ts|tsx|js|jsx)$/i, 162],
  [/\/(server|api|client|app|src\/app|src\/server|src\/main|src\/index)\.(ts|tsx|js|jsx)$/i, 160],
  [/\/(stripe|redis|s3|aws|storage|db|database|prisma)\.(ts|tsx|js|jsx)$/i, 155],
];

function shouldExcludePath(path: string): boolean {
  return GENERATED_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

function scorePath(path: string): number {
  return PRIORITY_PATTERNS.reduce((max, [pattern, score]) => {
    return pattern.test(path) ? Math.max(max, score) : max;
  }, 0);
}

export function selectRelevantPaths(tree: RepositoryTreeEntry[]): {
  paths: string[];
  warnings: AnalysisWarning[];
} {
  const files = tree
    .filter((entry) => entry.type === "blob")
    .filter((entry) => !shouldExcludePath(entry.path))
    .map((entry) => ({ ...entry, score: scorePath(entry.path) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path));

  let runningBytes = 0;
  const selected: string[] = [];
  const warnings: AnalysisWarning[] = [];

  for (const entry of files) {
    if (selected.length >= MAX_FILES) {
      warnings.push({
        code: "file-limit",
        message: `Analysis capped at ${MAX_FILES} files to keep response times predictable.`,
      });
      break;
    }

    const size = entry.size ?? 0;
    if (runningBytes + size > MAX_BYTES && selected.length > 0) {
      warnings.push({
        code: "byte-limit",
        message:
          "Analysis stopped reading additional files after reaching the byte budget for this request.",
      });
      break;
    }

    selected.push(entry.path);
    runningBytes += size;
  }

  return { paths: selected, warnings };
}

export function collectWorkspacePackageFiles(files: RepositoryFile[]): RepositoryFile[] {
  return files.filter((file) => file.path.endsWith("package.json"));
}
