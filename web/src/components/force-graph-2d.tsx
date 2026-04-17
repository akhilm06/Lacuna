"use client";

import type { ComponentType } from "react";
import fromKapsule from "react-kapsule";
import ForceGraphKapsule from "force-graph";

// 2D only — `react-force-graph` loads VR/AFRAME at module scope.
const ForceGraph2D = fromKapsule(
  ForceGraphKapsule as unknown as Parameters<typeof fromKapsule>[0],
  {
  methodNames: [
    "emitParticle",
    "d3Force",
    "d3AlphaTarget",
    "d3ReheatSimulation",
    "stopAnimation",
    "pauseAnimation",
    "resumeAnimation",
    "centerAt",
    "zoom",
    "zoomToFit",
    "getGraphBbox",
    "screen2GraphCoords",
    "graph2ScreenCoords",
  ],
  },
);

ForceGraph2D.displayName = "ForceGraph2D";

export default ForceGraph2D as ComponentType<Record<string, unknown>>;
