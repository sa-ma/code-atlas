import { Body, Controller, Post } from "@nestjs/common";
import type { AnalyzeRepositoryResponse } from "@code-atlas/shared";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { AnalysisService } from "@/modules/analysis/analysis.service";
import { AnalyzeRepositoryDto } from "@/modules/analysis/dto/analyze-repository.dto";

@Controller("api")
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @AllowAnonymous()
  @Post("analyze")
  analyze(@Body() body: AnalyzeRepositoryDto): Promise<AnalyzeRepositoryResponse> {
    return this.analysisService.analyze(body.repoUrl);
  }
}
