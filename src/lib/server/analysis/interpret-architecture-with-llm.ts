import type { ArchitectureRead } from "@/lib/types/code-atlas";

export interface LlmArchitectureInterpretation {
  mermaid?: string;
  summary?: string;
}

export async function interpretArchitectureWithLlm(
  architecture: ArchitectureRead,
): Promise<LlmArchitectureInterpretation | null> {
  void architecture;
  return null;
}
