import { Module } from "@nestjs/common";
import { AnalysisController } from "@/modules/analysis/analysis.controller";
import { AnalysisService } from "@/modules/analysis/analysis.service";

@Module({
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
