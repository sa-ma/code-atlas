import { NextResponse } from "next/server";
import { analyzeRepository } from "@/lib/server/analysis/analyze-repository";
import type { AnalyzeRepositoryRequest } from "@/lib/types/code-atlas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<AnalyzeRepositoryRequest>;

    if (!body.repoUrl || typeof body.repoUrl !== "string") {
      return NextResponse.json(
        { error: "Request body must include repoUrl." },
        { status: 400 },
      );
    }

    const result = await analyzeRepository(body.repoUrl);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Repository analysis failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
