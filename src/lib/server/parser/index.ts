import type { ArchitectureFindings } from "@/lib/types/code-atlas";
import { extractDatastoreFacts } from "@/lib/server/parser/datastore-extractor";
import { extractExternalIntegrationFacts } from "@/lib/server/parser/external-integration-extractor";
import { extractFrameworkFacts } from "@/lib/server/parser/framework-extractor";
import { extractInfrastructureFacts } from "@/lib/server/parser/infra-extractor";
import { extractRouteFacts } from "@/lib/server/parser/route-extractor";
import { extractServiceFacts } from "@/lib/server/parser/service-extractor";
import { extractWorkerFacts } from "@/lib/server/parser/worker-extractor";
import type { ExtractorInput, ExtractorOutput } from "@/lib/server/parser/utils";

function mergeOutputs(outputs: ExtractorOutput[]): ArchitectureFindings {
  return {
    services: outputs.flatMap((output) => output.services ?? []),
    datastores: outputs.flatMap((output) => output.datastores ?? []),
    externalServices: outputs.flatMap((output) => output.externalServices ?? []),
    edges: outputs.flatMap((output) => output.edges ?? []),
    confidenceNotes: outputs.flatMap((output) => output.confidenceNotes ?? []),
    warnings: outputs.flatMap((output) => output.warnings ?? []),
    evidence: outputs.flatMap((output) => output.evidence ?? []),
  };
}

export function extractStaticFacts(input: ExtractorInput): ArchitectureFindings {
  return mergeOutputs([
    extractFrameworkFacts(input),
    extractServiceFacts(input),
    extractRouteFacts(input),
    extractDatastoreFacts(input),
    extractExternalIntegrationFacts(input),
    extractWorkerFacts(input),
    extractInfrastructureFacts(input),
  ]);
}
