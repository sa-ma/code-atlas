import { CodeAtlasExplorer } from "@/components/code-atlas-explorer";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string }>;
}) {
  const params = await searchParams;
  const repoUrl = params.repo ?? "";

  return <CodeAtlasExplorer repoUrl={repoUrl} />;
}
