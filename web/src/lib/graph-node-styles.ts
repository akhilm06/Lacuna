export const GRAPH_NODE_KNOWN_FILL = "#7A8C6E";

export const GRAPH_GHOST_NODE_RGB = "168, 181, 196";

export const GRAPH_GHOST_NODE_FILL_ALPHA = 0.38;

export const GRAPH_GHOST_STROKE_ALPHA = 0.85;

export const GRAPH_PRIMARY_INK = "#c17f5a";

export const GRAPH_LINK_COLOR = "rgba(193, 127, 90, 0.38)";

export function graphGhostFillRgba(): string {
  return `rgba(${GRAPH_GHOST_NODE_RGB}, ${GRAPH_GHOST_NODE_FILL_ALPHA})`;
}

export function graphGhostStrokeRgba(): string {
  return `rgba(${GRAPH_GHOST_NODE_RGB}, ${GRAPH_GHOST_STROKE_ALPHA})`;
}
