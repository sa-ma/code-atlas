"use client";

import dynamic from "next/dynamic";

const HomepageForceGraph = dynamic(
  () => import("@/components/homepage-force-graph").then((module) => module.HomepageForceGraph),
  { ssr: false },
);

export function HomepageForceGraphRegion() {
  return (
    <>
      <div className="absolute inset-y-0 right-0 z-0 w-[72vw] min-w-[20rem] max-w-232 lg:w-[54vw]">
        <HomepageForceGraph />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 bg-linear-to-r from-background via-background/84 to-background/38" />
    </>
  );
}
