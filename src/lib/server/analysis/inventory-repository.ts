import type {
  AnalysisWarning,
  RepositorySnapshot,
  RepositoryFile,
  RepositoryInventory,
  RepoAppKind,
  RepoPattern,
} from "@/lib/types/code-atlas";

function parseManifest(file: RepositoryFile): {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
} | null {
  try {
    return JSON.parse(file.content) as {
      name?: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

function collectDependencies(files: RepositoryFile[]): Set<string> {
  const dependencies = new Set<string>();

  for (const file of files.filter((entry) => entry.path.endsWith("package.json"))) {
    const manifest = parseManifest(file);
    if (!manifest) {
      continue;
    }

    for (const name of Object.keys(manifest.dependencies ?? {})) {
      dependencies.add(name);
    }

    for (const name of Object.keys(manifest.devDependencies ?? {})) {
      dependencies.add(name);
    }
  }

  return dependencies;
}

function classifyRepoPattern(treePaths: string[], packageFiles: RepositoryFile[]): RepoPattern {
  if (
    treePaths.some((path) =>
      /^(apps|packages|services)\/[^/]+\/package\.json$/.test(path),
    ) ||
    treePaths.some((path) =>
      /^(pnpm-workspace\.yaml|turbo\.json|lerna\.json|nx\.json)$/.test(path),
    )
  ) {
    return "monorepo";
  }

  if (packageFiles.length > 2) {
    return "multi-package";
  }

  return "single-package";
}

function classifyAppKind(
  treePaths: string[],
  dependencies: Set<string>,
  repoPattern: RepoPattern,
): RepoAppKind {
  const hasWeb =
    dependencies.has("next") ||
    treePaths.some((path) => /(^|\/)(app|pages|src\/app)\//.test(path));
  const hasApi =
    dependencies.has("express") ||
    dependencies.has("fastify") ||
    dependencies.has("@nestjs/core") ||
    dependencies.has("hono") ||
    treePaths.some((path) =>
      /(controllers?|routes?|app\/api|pages\/api|src\/pages\/api)/i.test(path),
    );
  const hasWorkers =
    dependencies.has("bullmq") ||
    treePaths.some((path) => /(worker|queue|job)s?\//i.test(path));

  if (repoPattern === "monorepo") {
    return "monorepo";
  }

  if (hasWeb && hasApi) {
    return "fullstack-app";
  }

  if (hasApi) {
    return "backend-api";
  }

  if (hasWeb) {
    return "web-app";
  }

  if (hasWorkers) {
    return "worker-service";
  }

  return "library-heavy";
}

function collectFrameworkFamily(
  dependencies: Set<string>,
  treePaths: string[],
  repoDescription: string | null,
): string[] {
  const frameworkFamily: string[] = [];

  if (dependencies.has("next")) frameworkFamily.push("Next.js");
  if (dependencies.has("react")) frameworkFamily.push("React");
  if (dependencies.has("express")) frameworkFamily.push("Express");
  if (dependencies.has("fastify")) frameworkFamily.push("Fastify");
  if (dependencies.has("@nestjs/core")) frameworkFamily.push("NestJS");
  if (dependencies.has("hono")) frameworkFamily.push("Hono");
  if (dependencies.has("@prisma/client") || treePaths.some((path) => /schema\.prisma$/.test(path))) {
    frameworkFamily.push("Prisma");
  }

  if (
    repoDescription &&
    /realworld|conduit/i.test(repoDescription) &&
    !frameworkFamily.includes("RealWorld")
  ) {
    frameworkFamily.push("RealWorld");
  }

  return frameworkFamily;
}

function collectCandidateRoots(treePaths: string[]): string[] {
  const roots = new Set<string>();

  for (const path of treePaths) {
    if (path === "package.json") {
      roots.add(".");
      continue;
    }

    const match = path.match(/^((?:apps|packages|services)\/[^/]+)\/package\.json$/);
    if (match) {
      roots.add(match[1]);
    }
  }

  if (roots.size === 0) {
    roots.add(".");
  }

  return [...roots];
}

export function inventoryRepository(snapshot: RepositorySnapshot): RepositoryInventory {
  const treePaths = snapshot.tree.map((entry) => entry.path);
  const packageFiles = snapshot.files.filter((file) => file.path.endsWith("package.json"));
  const dependencies = collectDependencies(snapshot.files);
  const repoPattern = classifyRepoPattern(treePaths, packageFiles);
  const appKind = classifyAppKind(treePaths, dependencies, repoPattern);
  const frameworkFamily = collectFrameworkFamily(
    dependencies,
    treePaths,
    snapshot.repo.description,
  );
  const candidateRoots = collectCandidateRoots(treePaths);

  const warnings: AnalysisWarning[] = [];
  if (!treePaths.some((path) => /^README/i.test(path))) {
    warnings.push({
      code: "missing-readme",
      message: "README was not available, so repo intent was inferred mostly from structure and manifests.",
    });
  }

  return {
    appKind,
    repoPattern,
    frameworkFamily,
    candidateRoots,
    confidenceSummary:
      frameworkFamily.length > 0
        ? `Architecture reading anchored in ${frameworkFamily.join(", ")} conventions and repo structure.`
        : "Architecture reading anchored in repo structure and selected source files.",
    warnings,
  };
}
