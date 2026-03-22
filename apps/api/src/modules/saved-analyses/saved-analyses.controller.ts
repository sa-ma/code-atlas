import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import type {
  SavedAnalysisRecord,
  SavedAnalysisSummary,
} from "@code-atlas/shared";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { SaveAnalysisDto } from "@/modules/saved-analyses/dto/save-analysis.dto";
import { SavedAnalysesService } from "@/modules/saved-analyses/saved-analyses.service";

@Controller("api/analyses")
export class SavedAnalysesController {
  constructor(private readonly savedAnalysesService: SavedAnalysesService) {}

  @Get()
  list(
    @Session() session: UserSession,
  ): Promise<SavedAnalysisSummary[]> {
    return this.savedAnalysesService.list(session.user.id);
  }

  @Get(":id")
  get(
    @Session() session: UserSession,
    @Param("id") id: string,
  ): Promise<SavedAnalysisRecord> {
    return this.savedAnalysesService.get(session.user.id, id);
  }

  @Post()
  save(
    @Session() session: UserSession,
    @Body() body: SaveAnalysisDto,
  ): Promise<SavedAnalysisRecord> {
    return this.savedAnalysesService.save(session.user.id, body);
  }

  @Delete(":id")
  async remove(@Session() session: UserSession, @Param("id") id: string) {
    await this.savedAnalysesService.remove(session.user.id, id);
    return { ok: true };
  }
}
