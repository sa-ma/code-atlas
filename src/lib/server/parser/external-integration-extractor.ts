import type { ExtractorInput, ExtractorOutput } from "@/lib/server/parser/utils";
import { createEvidence, parseJsonFile } from "@/lib/server/parser/utils";
import type { GraphEdge } from "@/lib/types/code-atlas";

export function extractExternalIntegrationFacts(input: ExtractorInput): ExtractorOutput {
  const packageFiles = input.files.filter((file) => file.path.endsWith("package.json"));
  const externalServices = [];
  const edges: GraphEdge[] = [];
  const confidenceNotes: string[] = [];

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

    if (dependencySet.has("stripe")) {
      externalServices.push({
        id: "stripe",
        label: "Stripe",
        type: "external_api" as const,
        tech: ["Stripe"],
        evidence: [createEvidence(file.path, "Stripe dependency found in package manifest")],
      });
      edges.push({ from: "api", to: "stripe", label: "API calls" });
      confidenceNotes.push("Stripe inferred from package + imports");
    }
  }

  return {
    externalServices,
    edges,
    confidenceNotes,
    evidence: externalServices.flatMap((entry) => entry.evidence),
  };
}
