import type { ServiceFinding } from "@/lib/types/code-atlas";
import type { ExtractorInput, ExtractorOutput } from "@/lib/server/parser/utils";
import { createEvidence } from "@/lib/server/parser/utils";

export function extractWorkerFacts(input: ExtractorInput): ExtractorOutput {
  const workerFiles = input.files.filter((file) =>
    /(worker|workers|jobs|queue)/i.test(file.path),
  );

  if (workerFiles.length === 0) {
    return {};
  }

  const worker: ServiceFinding = {
    id: "worker",
    label: "Worker",
    type: "worker",
    tech: ["Node.js", "Background jobs"],
    evidence: workerFiles.slice(0, 5).map((file) =>
      createEvidence(file.path, "Worker-related source file detected", false),
    ),
  };

  return {
    services: [worker],
    confidenceNotes: ["Background workers inferred from worker and queue file names"],
    evidence: worker.evidence,
  };
}
