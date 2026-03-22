import { IsObject, IsString, MinLength } from "class-validator";
import type { AnalyzeRepositoryResponse } from "@code-atlas/shared";

export class SaveAnalysisDto {
  @IsString()
  @MinLength(1)
  repoUrl!: string;

  @IsObject()
  result!: AnalyzeRepositoryResponse;
}
