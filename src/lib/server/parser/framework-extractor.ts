import type { ExtractorInput, ExtractorOutput } from "@/lib/server/parser/utils";
import { collectPackageTech, createEvidence, parseJsonFile, unique } from "@/lib/server/parser/utils";

const FRAMEWORK_MAP: Record<string, string> = {
  next: "Next.js",
  react: "React",
  express: "Express",
  fastify: "Fastify",
  hono: "Hono",
  "@nestjs/core": "NestJS",
  vite: "Vite",
  prisma: "Prisma",
  "@prisma/client": "Prisma",
  bullmq: "BullMQ",
  redis: "Redis",
  ioredis: "Redis",
  stripe: "Stripe",
  "@aws-sdk/client-s3": "S3",
};

export function extractFrameworkFacts(input: ExtractorInput): ExtractorOutput {
  const technologies = input.files
    .filter((file) => file.path.endsWith("package.json"))
    .flatMap((file) => {
      const manifest = parseJsonFile<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      }>(file);

      if (!manifest) {
        return [];
      }

      return collectPackageTech(manifest, FRAMEWORK_MAP).map((tech) => ({
        tech,
        evidence: createEvidence(file.path, `${tech} dependency declared in package.json`),
      }));
    });

  return {
    confidenceNotes: unique(
      technologies.map((entry) => `${entry.tech} inferred from package manifests`),
    ),
    evidence: technologies.map((entry) => entry.evidence),
  };
}
