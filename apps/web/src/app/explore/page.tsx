import { CodeAtlasExplorer } from "@/components/code-atlas-explorer";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const repoUrl = params.repo ?? "";
  const savedAnalysisId = params.saved ?? "";

  return <CodeAtlasExplorer repoUrl={repoUrl} savedAnalysisId={savedAnalysisId} />;
}
