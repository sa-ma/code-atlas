import { IsString, IsUrl, MinLength } from "class-validator";

export class AnalyzeRepositoryDto {
  @IsString()
  @MinLength(1)
  @IsUrl({
    require_protocol: true,
  })
  repoUrl!: string;
}
