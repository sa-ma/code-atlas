import { Injectable } from "@nestjs/common";
import type { AnalyzeRepositoryResponse } from "@code-atlas/shared";
import { analyzeRepository } from "@/lib/server/analysis/analyze-repository";

@Injectable()
export class AnalysisService {
  analyze(repoUrl: string): Promise<AnalyzeRepositoryResponse> {
    return analyzeRepository(repoUrl);
  }
}
