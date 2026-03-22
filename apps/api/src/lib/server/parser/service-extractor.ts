import type { ServiceFinding } from "@/lib/types/code-atlas";
import type { ExtractorInput, ExtractorOutput } from "@/lib/server/parser/utils";
import {
  collectPackageTech,
  createEvidence,
  parseJsonFile,
  slugify,
  unique,
} from "@/lib/server/parser/utils";

const SERVICE_TECH_MAP: Record<string, string> = {
  next: "Next.js",
  react: "React",
  express: "Express",
  fastify: "Fastify",
  hono: "Hono",
  "@nestjs/core": "NestJS",
  bullmq: "BullMQ",
};

function inferServiceType(tech: string[], path: string): ServiceFinding["type"] | null {
  if (tech.some((entry) => ["BullMQ"].includes(entry)) || /(worker|jobs|queue)/i.test(path)) {
    return "worker";
  }

  if (tech.some((entry) => ["Express", "Fastify", "Hono", "NestJS"].includes(entry))) {
    return "backend";
  }

  if (tech.some((entry) => ["Next.js", "React"].includes(entry))) {
    return "frontend";
  }

  return null;
}

function inferServiceId(path: string, type: ServiceFinding["type"], name?: string): string {
  if (type === "frontend" && path === "package.json") {
    return "web";
  }

  if (type === "backend" && path === "package.json") {
    return "api";
  }

  if (type === "worker") {
    return "worker";
  }

  return slugify(name ?? path.replace(/\/package\.json$/, ""));
}

function inferServiceLabel(id: string, type: ServiceFinding["type"], name?: string): string {
  if (name) {
    return name;
  }

  if (id === "web") {
    return "Web app";
  }

  if (id === "api") {
    return "API";
  }

  if (type === "worker") {
    return "Worker";
  }

  return id.replace(/-/g, " ");
}

export function extractServiceFacts(input: ExtractorInput): ExtractorOutput {
  const services = input.files
    .filter((file) => file.path.endsWith("package.json"))
    .flatMap((file) => {
      const manifest = parseJsonFile<{
        name?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }>(file);

      if (!manifest) {
        return [];
      }

      const tech = collectPackageTech(manifest, SERVICE_TECH_MAP);
      const type = inferServiceType(tech, file.path);

      if (!type) {
        return [];
      }

      const id = inferServiceId(file.path, type, manifest.name);

      return [
        {
          id,
          label: inferServiceLabel(id, type, manifest.name),
          type,
          tech: unique(type === "backend" ? ["Node.js", ...tech] : tech),
          evidence: [
            createEvidence(file.path, `${type} service inferred from package manifest`),
          ],
        } satisfies ServiceFinding,
      ];
    });

  return {
    services,
  };
}
