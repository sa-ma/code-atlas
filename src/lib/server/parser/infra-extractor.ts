import type { ExtractorInput, ExtractorOutput } from "@/lib/server/parser/utils";
import { createEvidence } from "@/lib/server/parser/utils";

export function extractInfrastructureFacts(input: ExtractorInput): ExtractorOutput {
  const dockerFiles = input.files.filter((file) =>
    /(Dockerfile|docker-compose|render\.yaml|vercel\.json|\.github\/workflows)/i.test(file.path),
  );

  if (dockerFiles.length === 0) {
    return {};
  }

  return {
    confidenceNotes: dockerFiles.map((file) => {
      if (/render\.yaml/i.test(file.path)) {
        return "Render deployment inferred from render.yaml";
      }

      if (/vercel\.json/i.test(file.path)) {
        return "Vercel deployment inferred from vercel.json";
      }

      if (/Dockerfile/i.test(file.path)) {
        return "Containerization inferred from Docker configuration";
      }

      return "CI/CD inferred from workflow configuration";
    }),
    evidence: dockerFiles.map((file) =>
      createEvidence(file.path, "Infrastructure configuration detected"),
    ),
  };
}
