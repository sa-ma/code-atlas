import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import type {
  SaveAnalysisRequest,
  SavedAnalysisRecord,
  SavedAnalysisSummary,
} from "@code-atlas/shared";

function normalizeRepositoryKey(owner: string, repo: string) {
  return `${owner.trim().toLowerCase()}/${repo.trim().toLowerCase()}`;
}

@Injectable()
export class SavedAnalysesService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(userId: string): Promise<SavedAnalysisSummary[]> {
    const analyses = await this.prisma.savedAnalysis.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return analyses.map((analysis) => ({
      id: analysis.id,
      repoUrl: analysis.repoUrl,
      owner: analysis.owner,
      repo: analysis.repo,
      branch: analysis.branch,
      title: `${analysis.owner}/${analysis.repo}`,
      summary: analysis.summary ?? undefined,
      createdAt: analysis.createdAt.toISOString(),
      updatedAt: analysis.updatedAt.toISOString(),
    }));
  }

  async get(userId: string, id: string): Promise<SavedAnalysisRecord> {
    const saved = await this.prisma.savedAnalysis.findFirst({
      where: { id, userId },
    });

    if (!saved) {
      throw new NotFoundException("Saved analysis not found.");
    }

    return {
      id: saved.id,
      repoUrl: saved.repoUrl,
      owner: saved.owner,
      repo: saved.repo,
      branch: saved.branch,
      title: `${saved.owner}/${saved.repo}`,
      summary: saved.summary ?? undefined,
      result: saved.result as unknown as SavedAnalysisRecord["result"],
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }

  async save(userId: string, payload: SaveAnalysisRequest): Promise<SavedAnalysisRecord> {
    const result = payload.result;
    const repositoryKey = normalizeRepositoryKey(result.repo.owner, result.repo.repo);

    const saved = await this.prisma.savedAnalysis.upsert({
      where: {
        userId_repositoryKey: {
          userId,
          repositoryKey,
        },
      },
      create: {
        userId,
        repoUrl: payload.repoUrl,
        owner: result.repo.owner,
        repo: result.repo.repo,
        repositoryKey,
        branch: result.repo.branch ?? null,
        summary: result.summary ?? null,
        result: result as unknown as Prisma.InputJsonValue,
      },
      update: {
        repoUrl: payload.repoUrl,
        owner: result.repo.owner,
        repo: result.repo.repo,
        branch: result.repo.branch ?? null,
        summary: result.summary ?? null,
        result: result as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      id: saved.id,
      repoUrl: saved.repoUrl,
      owner: saved.owner,
      repo: saved.repo,
      branch: saved.branch,
      title: `${saved.owner}/${saved.repo}`,
      summary: saved.summary ?? undefined,
      result,
      createdAt: saved.createdAt.toISOString(),
      updatedAt: saved.updatedAt.toISOString(),
    };
  }

  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.prisma.savedAnalysis.findFirst({
      where: {
        id,
        userId,
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException("Saved analysis not found.");
    }

    await this.prisma.savedAnalysis.delete({
      where: { id },
    });
  }
}
