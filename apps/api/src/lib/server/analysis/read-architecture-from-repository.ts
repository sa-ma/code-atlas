import type {
  ArchitectureSourceRead,
  RepositoryFile,
  RepositorySnapshot,
  RepositoryInventory,
  WorkspacePackage,
} from "@/lib/types/code-atlas";

const ROUTE_FILE_PATTERN =
  /(routes?|controllers?|route|controller)\.(ts|tsx|js|jsx)$|\/(routes?|controllers?)\//i;
const SERVICE_FILE_PATTERN = /(services?|use-cases?|usecases?)\/|\.(service|use-case|usecase)\.(ts|tsx|js|jsx)$/i;
const AUTH_FILE_PATTERN = /(auth|jwt|token|session|passport)/i;
const MIDDLEWARE_FILE_PATTERN = /(middleware|guard|interceptor)/i;
const ERROR_FILE_PATTERN = /(error-handler|exception|errors?)/i;
const STATIC_PATTERN = /(^public\/)|(^assets\/)|(^src\/assets\/)/i;
const ENTITY_PATTERN = /(models?|entities?|schemas?)\/|\.(entity|model|schema)\.(ts|tsx|js|jsx)$/i;
const ENTRYPOINT_PATTERN =
  /(^|\/)(main|index|server|app)\.(ts|tsx|js|jsx)$/i;

function evidenceFor(path: string, reason: string, direct = true) {
  return { filePath: path, reason, direct };
}

function toTitleCase(value: string): string {
  return value
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

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

function getBasename(path: string): string {
  const pieces = path.split("/");
  return pieces[pieces.length - 1];
}

function normalizeName(raw: string): string {
  return raw
    .replace(/\.(ts|tsx|js|jsx)$/i, "")
    .replace(
      /\.(controller|controllers|route|routes|service|services|middleware|handler|guard|interceptor|entity|model|schema|module|decorator)$/i,
      "",
    );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function techFromDependencies(dependencies: Set<string>): string[] {
  const tech: string[] = [];
  if (dependencies.has("next")) tech.push("Next.js");
  if (dependencies.has("react")) tech.push("React");
  if (dependencies.has("express")) tech.push("Express");
  if (dependencies.has("fastify")) tech.push("Fastify");
  if (dependencies.has("@trpc/server") || dependencies.has("@trpc/client")) tech.push("tRPC");
  if (dependencies.has("@prisma/client")) tech.push("Prisma");
  return tech;
}

function classifyWorkspacePackage(
  root: string,
  packageName: string,
  dependencies: Set<string>,
): Pick<WorkspacePackage, "section" | "category" | "subtitle" | "tech"> {
  const normalized = `${root} ${packageName}`.toLowerCase();
  const tech = techFromDependencies(dependencies);

  if (root.startsWith("apps/")) {
    if (normalized.includes("web") || dependencies.has("next")) {
      return {
        section: "Apps",
        category: "web_app",
        subtitle: "Next.js Web App",
        tech,
      };
    }

    return {
      section: "Apps",
      category: "api_app",
      subtitle: normalized.includes("proxy") ? "API proxy" : "Public/API app",
      tech,
    };
  }

  if (normalized.includes("prisma")) {
    return {
      section: "Data Layer",
      category: "data",
      subtitle: "Prisma ORM + schema",
      tech: tech.length > 0 ? tech : ["Prisma"],
    };
  }

  if (normalized.includes("trpc")) {
    return {
      section: "Shared Packages",
      category: "api_layer",
      subtitle: "Typed API layer",
      tech,
    };
  }

  if (normalized.includes("feature")) {
    return {
      section: "Shared Packages",
      category: "business_core",
      subtitle: "Core product features",
      tech,
    };
  }

  if (normalized.includes("ui")) {
    return {
      section: "Shared Packages",
      category: "shared_ui",
      subtitle: "Shared UI / components",
      tech,
    };
  }

  if (normalized.includes("platform")) {
    return {
      section: "Shared Packages",
      category: "platform",
      subtitle: "Platform libraries / examples",
      tech,
    };
  }

  if (normalized.includes("app-store")) {
    return {
      section: "Shared Packages",
      category: "app_store",
      subtitle: "App & integration ecosystem",
      tech,
    };
  }

  if (normalized.includes("embed")) {
    return {
      section: "Shared Packages",
      category: "embed",
      subtitle: "Embed SDK / snippet",
      tech,
    };
  }

  return {
    section: "Shared Packages",
    category: "other",
    subtitle: undefined,
    tech,
  };
}

function workspaceImportance(pkg: WorkspacePackage): number {
  switch (pkg.category) {
    case "web_app":
      return 100;
    case "api_app":
      return 95;
    case "business_core":
      return 92;
    case "api_layer":
      return 90;
    case "data":
      return 88;
    case "shared_ui":
      return 78;
    case "platform":
      return 76;
    case "app_store":
      return 74;
    case "embed":
      return 70;
    default:
      return 50;
  }
}

function collectWorkspacePackages(
  snapshot: RepositorySnapshot,
  inventory: RepositoryInventory,
): WorkspacePackage[] {
  const manifestFiles = snapshot.files.filter((file) =>
    /^(apps|packages|services)\/[^/]+\/package\.json$/.test(file.path),
  );

  if (inventory.repoPattern !== "monorepo") {
    return [];
  }

  const manifestData = manifestFiles
    .map((file) => {
      const manifest = parseManifest(file);
      if (!manifest) return null;
      const root = file.path.replace(/\/package\.json$/, "");
      const packageName = manifest.name ?? root;
      const dependencyNames = new Set<string>([
        ...Object.keys(manifest.dependencies ?? {}),
        ...Object.keys(manifest.devDependencies ?? {}),
      ]);

      return {
        file,
        root,
        packageName,
        dependencyNames,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  const packageNames = new Set(manifestData.map((entry) => entry.packageName));

  const workspacePackages = manifestData.map((entry) => {
    const meta = classifyWorkspacePackage(entry.root, entry.packageName, entry.dependencyNames);
    return {
      id: entry.root.replace(/[^a-zA-Z0-9]+/g, "-"),
      root: entry.root,
      packageName: entry.packageName,
      label: entry.root,
      subtitle: meta.subtitle,
      section: meta.section,
      category: meta.category,
      tech: meta.tech,
      internalDeps: [...entry.dependencyNames].filter((dep) => packageNames.has(dep)),
      evidence: [evidenceFor(entry.file.path, "Workspace package inferred from monorepo manifest")],
    } satisfies WorkspacePackage;
  });

  return workspacePackages
    .sort((left, right) => workspaceImportance(right) - workspaceImportance(left))
    .slice(0, 8);
}

function parsePrismaModels(files: RepositoryFile[]): string[] {
  const models = new Set<string>();

  for (const file of files.filter((entry) => /schema\.prisma$/.test(entry.path))) {
    for (const match of file.content.matchAll(/^\s*model\s+([A-Za-z0-9_]+)/gm)) {
      models.add(match[1]);
    }
  }

  return [...models];
}

function detectReadme(snapshot: RepositorySnapshot): RepositoryFile | undefined {
  return snapshot.files.find((file) => /^README/i.test(file.path));
}

function collectDependencies(snapshot: RepositorySnapshot): Set<string> {
  const dependencies = new Set<string>();

  for (const file of snapshot.files.filter((entry) => entry.path.endsWith("package.json"))) {
    const manifest = parseManifest(file);
    if (!manifest) continue;
    for (const name of Object.keys(manifest.dependencies ?? {})) dependencies.add(name);
    for (const name of Object.keys(manifest.devDependencies ?? {})) dependencies.add(name);
  }

  return dependencies;
}

export function readArchitectureFromRepository(
  snapshot: RepositorySnapshot,
  inventory: RepositoryInventory,
): ArchitectureSourceRead {
  const readme = detectReadme(snapshot);
  const dependencies = collectDependencies(snapshot);
  const treePaths = snapshot.tree.map((entry) => entry.path);
  const routeFiles = snapshot.files.filter((file) => ROUTE_FILE_PATTERN.test(file.path));
  const serviceFiles = snapshot.files.filter((file) => SERVICE_FILE_PATTERN.test(file.path));
  const authFiles = snapshot.files.filter((file) => AUTH_FILE_PATTERN.test(file.path));
  const middlewareFiles = snapshot.files.filter((file) => MIDDLEWARE_FILE_PATTERN.test(file.path));
  const entryFiles = snapshot.files.filter((file) => ENTRYPOINT_PATTERN.test(file.path));
  const errorFiles = snapshot.files.filter((file) => ERROR_FILE_PATTERN.test(file.path));
  const staticFiles = snapshot.files.filter((file) => STATIC_PATTERN.test(file.path));
  const entityFiles = snapshot.files.filter((file) => ENTITY_PATTERN.test(file.path));
  const prismaModels = parsePrismaModels(snapshot.files);

  const controllerNames = uniqueStrings(
    routeFiles.map((file) => {
      const basename = normalizeName(getBasename(file.path));
      return basename ? `${toTitleCase(basename)} Controller` : "";
    }),
  ).slice(0, 4);

  const serviceNames = uniqueStrings(
    serviceFiles.map((file) => {
      const basename = normalizeName(getBasename(file.path));
      return basename ? `${toTitleCase(basename)} Service` : "";
    }),
  ).slice(0, 4);

  const explicitEntityNames = uniqueStrings(
    entityFiles.map((file) => toTitleCase(normalizeName(getBasename(file.path)))),
  ).slice(0, 6);

  const inferredEntityNames =
    prismaModels.length > 0
      ? prismaModels
      : readme && /realworld|conduit/i.test(readme.content)
        ? ["User", "Article", "Comment", "Tag", "Profile"]
        : [];

  const domainEntities = uniqueStrings([...explicitEntityNames, ...inferredEntityNames]).slice(0, 6);

  const hasNextApiRoutes = treePaths.some((path) =>
    /(app\/api\/.+\/route|pages\/api\/.+|src\/pages\/api\/.+)\.(ts|tsx|js|jsx)$/.test(path),
  );

  const backendRuntime = dependencies.has("express")
    ? "Express"
    : dependencies.has("fastify")
      ? "Fastify"
      : dependencies.has("@nestjs/core")
        ? "NestJS"
        : dependencies.has("hono")
          ? "Hono"
          : hasNextApiRoutes
            ? "Next.js API Routes"
            : null;

  const persistenceTech = dependencies.has("@prisma/client") || treePaths.some((path) => /schema\.prisma$/.test(path))
    ? "Prisma"
    : dependencies.has("drizzle-orm")
      ? "Drizzle"
      : dependencies.has("typeorm")
        ? "TypeORM"
        : null;

  const databaseTech = snapshot.files
    .filter((file) => /schema\.prisma$/.test(file.path))
    .flatMap((file) => [...file.content.matchAll(/provider\s*=\s*"([^"]+)"/g)].map((match) => match[1]))
    .map((provider) => {
      switch (provider) {
        case "postgresql":
          return "PostgreSQL";
        case "mysql":
          return "MySQL";
        case "sqlite":
          return "SQLite";
        case "mongodb":
          return "MongoDB";
        default:
          return provider;
      }
    })[0] ?? null;
  const workspacePackages = collectWorkspacePackages(snapshot, inventory);

  return {
    readme,
    dependencies,
    routeFiles,
    serviceFiles,
    authFiles,
    middlewareFiles,
    entryFiles,
    errorFiles,
    staticFiles,
    entityFiles,
    controllerNames,
    serviceNames,
    domainEntities,
    backendRuntime,
    persistenceTech,
    databaseTech,
    hasWebApp:
      inventory.frameworkFamily.includes("Next.js") ||
      treePaths.some((path) => /(^|\/)(app|pages|src\/app)\//.test(path)),
    hasApi:
      Boolean(backendRuntime) ||
      routeFiles.length > 0 ||
      middlewareFiles.some((file) => /api/i.test(file.path)),
    hasWorkers:
      dependencies.has("bullmq") ||
      treePaths.some((path) => /(worker|queue|job)s?\//i.test(path)),
    hasStaticAssets: staticFiles.length > 0,
    hasAuth:
      authFiles.length > 0 ||
      dependencies.has("jsonwebtoken") ||
      dependencies.has("passport"),
    hasHashing:
      dependencies.has("bcrypt") ||
      dependencies.has("bcryptjs") ||
      authFiles.some((file) => /bcrypt|hash/i.test(file.content)),
    hasJwt:
      dependencies.has("jsonwebtoken") ||
      authFiles.some((file) => /jwt|token/i.test(file.content)),
    externalIntegrations: uniqueStrings([
      dependencies.has("stripe") ? "Stripe" : "",
      dependencies.has("@calcom/app-store") ? "App Store" : "",
      dependencies.has("@aws-sdk/client-s3") ? "S3" : "",
      dependencies.has("ioredis") || dependencies.has("redis") ? "Redis" : "",
    ]),
    workspacePackages,
  };
}
