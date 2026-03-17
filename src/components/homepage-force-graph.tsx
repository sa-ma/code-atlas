"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ForceGraphMethods,
  GraphData,
  LinkObject,
} from "react-force-graph-2d";
import ForceGraph2D from "react-force-graph-2d";
import {
  HOMEPAGE_GRAPH,
  type HomepageGraphLink,
  type HomepageGraphNode,
} from "@/components/homepage-force-graph-data";

const ACTIVE_LINKS = HOMEPAGE_GRAPH.links.filter((link) => link.active);
const EMPTY_LABEL = "";
const GRAPH_DATA: GraphData<HomepageGraphNode, HomepageGraphLink> = HOMEPAGE_GRAPH;

export function HomepageForceGraph() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphMethods<HomepageGraphNode, HomepageGraphLink> | undefined>(
    undefined,
  );
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      setViewport({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => {
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  useEffect(() => {
    const graph = graphRef.current;

    if (!graph || viewport.width === 0 || viewport.height === 0) {
      return;
    }

    const chargeForce = graph.d3Force("charge");
    if (chargeForce && "strength" in chargeForce) {
      chargeForce.strength(-170);
    }

    const linkForce = graph.d3Force("link");
    if (linkForce && "distance" in linkForce && "strength" in linkForce) {
      linkForce.distance((link: LinkObject<HomepageGraphNode, HomepageGraphLink>) =>
        link.active ? 180 : 230,
      );
      linkForce.strength((link: LinkObject<HomepageGraphNode, HomepageGraphLink>) =>
        link.active ? 0.22 : 0.14,
      );
    }

    graph.d3ReheatSimulation();
    graph.centerAt(viewport.width * 0.12, viewport.height * 0.18, 0);
    graph.zoom(viewport.width < 560 ? 0.92 : 1.08, 0);
  }, [viewport]);

  useEffect(() => {
    if (prefersReducedMotion) {
      return;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      const graph = graphRef.current;

      if (!graph) {
        return;
      }

      for (let offset = 0; offset < 3; offset += 1) {
        const link = ACTIVE_LINKS[(index + offset) % ACTIVE_LINKS.length];
        graph.emitParticle(link);
      }

      index = (index + 1) % ACTIVE_LINKS.length;
    }, 220);

    return () => {
      window.clearInterval(timer);
    };
  }, [prefersReducedMotion]);

  if (viewport.width === 0 || viewport.height === 0) {
    return <div ref={containerRef} className="homepage-force-graph" aria-hidden="true" />;
  }

  return (
    <div ref={containerRef} className="homepage-force-graph" aria-hidden="true">
      <ForceGraph2D
        ref={graphRef}
        graphData={GRAPH_DATA}
        width={viewport.width}
        height={viewport.height}
        backgroundColor="rgba(0,0,0,0)"
        nodeRelSize={1}
        nodeVal={(node) => node.size}
        nodeLabel={() => EMPTY_LABEL}
        nodeColor={(node) => node.color}
        linkLabel={() => EMPTY_LABEL}
        linkColor={(link) => link.color ?? "rgba(24, 24, 27, 0.12)"}
        linkWidth={(link) => link.width ?? 1}
        linkCurvature={(link) => link.curvature ?? 0}
        linkDirectionalParticles={() => 0}
        linkDirectionalParticleWidth={(link) => (link.active ? 2.4 : 1.6)}
        linkDirectionalParticleColor={(link) => link.particleColor ?? "rgba(24, 24, 27, 0.7)"}
        linkDirectionalParticleSpeed={(link) => link.particleSpeed ?? 0.0023}
        autoPauseRedraw={false}
        minZoom={0.8}
        maxZoom={2.4}
        cooldownTicks={0}
        cooldownTime={prefersReducedMotion ? 0 : 15000}
        d3AlphaDecay={0.016}
        d3VelocityDecay={0.24}
      />
    </div>
  );
}
