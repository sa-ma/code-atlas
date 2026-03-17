import type { ExtractorInput, ExtractorOutput } from "@/lib/server/parser/utils";
import { createEvidence, unique } from "@/lib/server/parser/utils";
import type { ServiceFinding } from "@/lib/types/code-atlas";

function detectApiRoutes(treePaths: string[]): string[] {
  return treePaths.filter((path) =>
    /(app\/api\/.+\/route|pages\/api\/.+|src\/pages\/api\/.+)\.(ts|tsx|js|jsx)$/.test(path),
  );
}

export function extractRouteFacts(input: ExtractorInput): ExtractorOutput {
  const apiRoutes = detectApiRoutes(input.treePaths);

  if (apiRoutes.length === 0) {
    return {};
  }

  const apiService: ServiceFinding = {
    id: "api",
    label: "API",
    type: "backend",
    tech: unique(["Node.js", "HTTP"]),
    evidence: apiRoutes.slice(0, 5).map((path) => createEvidence(path, "API route detected")),
  };

  return {
    services: [apiService],
    confidenceNotes: ["API service inferred from /api route structure"],
    evidence: apiService.evidence,
  };
}
