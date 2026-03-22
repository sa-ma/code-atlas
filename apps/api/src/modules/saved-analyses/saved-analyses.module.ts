import { Module } from "@nestjs/common";
import { SavedAnalysesController } from "@/modules/saved-analyses/saved-analyses.controller";
import { SavedAnalysesService } from "@/modules/saved-analyses/saved-analyses.service";

@Module({
  controllers: [SavedAnalysesController],
  providers: [SavedAnalysesService],
})
export class SavedAnalysesModule {}
