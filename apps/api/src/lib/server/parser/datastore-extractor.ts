import type {
  DatastoreFinding,
  GraphEdge,
  ServiceFinding,
} from "@/lib/types/code-atlas";
import type { ExtractorInput, ExtractorOutput } from "@/lib/server/parser/utils";
import {
  createEvidence,
  parseJsonFile,
  unique,
} from "@/lib/server/parser/utils";

function extractPrismaDatabase(fileContent: string): string | null {
  const match = fileContent.match(/provider\s*=\s*"([^"]+)"/);
  if (!match) {
    return null;
  }

  switch (match[1]) {
    case "postgresql":
      return "PostgreSQL";
    case "mysql":
      return "MySQL";
    case "sqlite":
      return "SQLite";
    case "mongodb":
      return "MongoDB";
    default:
      return match[1];
  }
}

function createEdgeForServices(
  services: ServiceFinding[],
  target: string,
  label: GraphEdge["label"],
): GraphEdge[] {
  return services
    .filter((service) => service.type !== "frontend")
    .map((service) => ({ from: service.id, to: target, label }));
}

export function extractDatastoreFacts(input: ExtractorInput): ExtractorOutput {
  const datastores: DatastoreFinding[] = [];
  const confidenceNotes: string[] = [];
  const edges: GraphEdge[] = [];

  const services = input.files
    .filter((file) => file.path.endsWith("package.json"))
    .flatMap((file) => {
      const manifest = parseJsonFile<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }>(file);

      if (!manifest) {
        return [];
      }

      const service: ServiceFinding = {
        id: file.path === "package.json" ? "api" : file.path.replace(/\/package\.json$/, ""),
        label: "API",
        type: "backend",
        tech: [],
        evidence: [],
      };

      return [service];
    });

  const prismaFile = input.files.find((file) => /schema\.prisma$/.test(file.path));
  if (prismaFile) {
    const database = extractPrismaDatabase(prismaFile.content);
    if (database) {
      datastores.push({
        id: database.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        label: database,
        type: "database",
        tech: unique([database, "Prisma"]),
        evidence: [
          createEvidence(prismaFile.path, `${database} provider declared in Prisma schema`),
        ],
      });
      confidenceNotes.push("Database inferred from prisma schema");
      edges.push(...createEdgeForServices(services, datastores[datastores.length - 1].id, "queries"));
    }
  }

  const packageFiles = input.files.filter((file) => file.path.endsWith("package.json"));
  for (const file of packageFiles) {
    const manifest = parseJsonFile<{
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>(file);
    if (!manifest) {
      continue;
    }

    const dependencySet = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ]);

    if (dependencySet.has("redis") || dependencySet.has("ioredis")) {
      datastores.push({
        id: "redis",
        label: "Redis",
        type: "cache",
        tech: ["Redis"],
        evidence: [createEvidence(file.path, "Redis client dependency found in package.json")],
      });
      confidenceNotes.push("Redis cache inferred from package manifest");
      edges.push(...createEdgeForServices(services, "redis", "cache"));
    }

    if (dependencySet.has("@aws-sdk/client-s3")) {
      datastores.push({
        id: "s3",
        label: "S3",
        type: "storage",
        tech: ["S3"],
        evidence: [createEvidence(file.path, "S3 client dependency found in package.json")],
      });
      confidenceNotes.push("S3 usage inferred from package manifest");
      edges.push(...createEdgeForServices(services, "s3", "storage"));
    }
  }

  return {
    datastores,
    edges,
    confidenceNotes,
    evidence: datastores.flatMap((entry) => entry.evidence),
  };
}
