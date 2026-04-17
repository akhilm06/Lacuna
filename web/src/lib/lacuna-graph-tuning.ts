// Graph sim + zoom + canvas knobs; dev tuning may persist in localStorage.

export const LACUNA_GRAPH_LINK_RGB = { r: 193, g: 127, b: 90 } as const;

export type LacunaGraphTuning = {
  linkDefaultDistance: number;
  knownLinkPullScale: number;
  chargeStrength: number;
  collideRadiusFactor: number;
  collideStrength: number;
  collideIterations: number;
  radialGhostStrength: number;
  radialKnownStrength: number;
  radialShrinkNumerator: number;
  radialGhostMul: number;
  radialKnownMul: number;
  radialMinGhost: number;
  radialMinKnown: number;
  radialRefPx: number;
  radialLayoutMin: number;
  radialLayoutMax: number;
  centerStrength: number;
  boundaryCushionFraction: number;
  boundaryKOut: number;
  boundaryKIn: number;
  boundaryScaleBase: number;
  boundaryDragPull: number;
  simAlphaTarget: number;
  simVelocityDecay: number;
  viewportPadPx: number;
  zoomNodesFactor: number;
  zoomRefPx: number;
  zoomViewportMin: number;
  zoomViewportMax: number;
  viewportMinDimMix: number;
  zoomNodeCountExponent: number;
  radialNodeCountExponent: number;
  d3AlphaMin: number;
  d3AlphaDecay: number;
  minZoom: number;
  maxZoom: number;
  simAlphaRestoreFraction: number;
  nodeValUniform: number;
  linkCurvature: number;
  renderLabelFontWeight: number;
  graphPanelMinHeightVh: number;
  graphPanelMinHeightRem: number;
  nodeRelSize: number;
  nodeRelSizeRefMinDimPx: number;
  nodeRelSizeViewportExponent: number;
  nodeRelSizeViewportMin: number;
  nodeRelSizeViewportMax: number;
  renderLinkWidth: number;
  renderGhostLineW: number;
  renderGhostDashA: number;
  renderGhostDashB: number;
  renderRingW: number;
  renderLabelGap: number;
  renderLabelFontPx: number;
  linkColorAlpha: number;
  autoPauseRedraw: boolean;
  enableZoomInteraction: boolean;
  enablePanInteraction: boolean;
};

export const LACUNA_GRAPH_TUNING_STORAGE_KEY = "lacuna-graph-tuning-v1";

export const LACUNA_GRAPH_TUNING_DEFAULTS: LacunaGraphTuning = {
  linkDefaultDistance: 54,
  knownLinkPullScale: 0.28,
  chargeStrength: -78,
  collideRadiusFactor: 1.38,
  collideStrength: 0.93,
  collideIterations: 4,
  radialGhostStrength: 0.08,
  radialKnownStrength: 0.12 * 0.16,
  radialShrinkNumerator: 44,
  radialGhostMul: 0.47,
  radialKnownMul: 1.8,
  radialMinGhost: 26,
  radialMinKnown: 92,
  radialRefPx: 448,
  radialLayoutMin: 0.72,
  radialLayoutMax: 1.12,
  centerStrength: 0.038,
  boundaryCushionFraction: 0.1,
  boundaryKOut: 0.85,
  boundaryKIn: 0.32,
  boundaryScaleBase: 0.42,
  boundaryDragPull: 0.72,
  simAlphaTarget: 0,
  simVelocityDecay: 0.5,
  viewportPadPx: 14,
  zoomNodesFactor: 6.5,
  zoomRefPx: 540,
  zoomViewportMin: 0.38,
  zoomViewportMax: 0.82,
  viewportMinDimMix: 0.34,
  zoomNodeCountExponent: 0.38,
  radialNodeCountExponent: 1 / 3,
  d3AlphaMin: 0,
  d3AlphaDecay: 0.0228,
  minZoom: 0.02,
  maxZoom: 64,
  simAlphaRestoreFraction: 0.25,
  nodeValUniform: 1,
  linkCurvature: 0,
  renderLabelFontWeight: 600,
  graphPanelMinHeightVh: 50,
  graphPanelMinHeightRem: 24,
  nodeRelSize: 10,
  nodeRelSizeRefMinDimPx: 520,
  nodeRelSizeViewportExponent: 0.22,
  nodeRelSizeViewportMin: 8,
  nodeRelSizeViewportMax: 15.5,
  renderLinkWidth: 1.2,
  renderGhostLineW: 1.35,
  renderGhostDashA: 3.5,
  renderGhostDashB: 2.8,
  renderRingW: 2,
  renderLabelGap: 16,
  renderLabelFontPx: 13,
  linkColorAlpha: 0.42,
  autoPauseRedraw: false,
  enableZoomInteraction: false,
  enablePanInteraction: false,
};

export function mergeLacunaGraphTuningPatch(
  base: LacunaGraphTuning,
  patch: Partial<LacunaGraphTuning>,
): LacunaGraphTuning {
  return { ...base, ...patch };
}

export function loadLacunaGraphTuning(): LacunaGraphTuning {
  if (typeof window === "undefined") return LACUNA_GRAPH_TUNING_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(LACUNA_GRAPH_TUNING_STORAGE_KEY);
    if (!raw) return LACUNA_GRAPH_TUNING_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<LacunaGraphTuning>;
    return mergeLacunaGraphTuningPatch(LACUNA_GRAPH_TUNING_DEFAULTS, parsed);
  } catch {
    return LACUNA_GRAPH_TUNING_DEFAULTS;
  }
}

export function saveLacunaGraphTuning(tuning: LacunaGraphTuning): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LACUNA_GRAPH_TUNING_STORAGE_KEY,
      JSON.stringify(tuning),
    );
  } catch {}
}

export function graphTuningLinkColorRgba(t: LacunaGraphTuning): string {
  const { r, g, b } = LACUNA_GRAPH_LINK_RGB;
  return `rgba(${r}, ${g}, ${b}, ${t.linkColorAlpha})`;
}

export function effectiveNodeRelSizeFromViewport(
  viewportMinDimPx: number,
  t: LacunaGraphTuning,
): number {
  const base = t.nodeRelSize;
  if (t.nodeRelSizeViewportExponent <= 0) {
    return Math.max(
      t.nodeRelSizeViewportMin,
      Math.min(t.nodeRelSizeViewportMax, base),
    );
  }
  const ref = Math.max(1, t.nodeRelSizeRefMinDimPx);
  const ratio = Math.max(0.2, viewportMinDimPx) / ref;
  const scaled = base * Math.pow(ratio, t.nodeRelSizeViewportExponent);
  return Math.max(
    t.nodeRelSizeViewportMin,
    Math.min(t.nodeRelSizeViewportMax, scaled),
  );
}

export function effectiveViewportMinDimPx(
  widthPx: number,
  heightPx: number,
  t: LacunaGraphTuning,
): number {
  const w = Math.max(0, widthPx);
  const h = Math.max(0, heightPx);
  const mn = Math.min(w, h);
  const mx = Math.max(w, h);
  const u = Math.max(0, Math.min(1, t.viewportMinDimMix));
  return mn + (mx - mn) * u;
}

export function radialTargetsFromTuning(
  nodeCount: number,
  widthPx: number,
  heightPx: number,
  t: LacunaGraphTuning,
): { ghost: number; known: number } {
  const n = Math.max(1, nodeCount);
  const shrink =
    t.radialShrinkNumerator /
    Math.pow(n, Math.max(0.05, t.radialNodeCountExponent));
  const ref = t.radialRefPx;
  const minDim = effectiveViewportMinDimPx(widthPx, heightPx, t);
  const layoutScale = Math.sqrt(
    Math.max(
      t.radialLayoutMin,
      Math.min(t.radialLayoutMax, minDim / ref),
    ),
  );
  return {
    ghost: Math.max(t.radialMinGhost, shrink * t.radialGhostMul) * layoutScale,
    known: Math.max(t.radialMinKnown, shrink * t.radialKnownMul) * layoutScale,
  };
}

export function zoomScaleForViewportFromTuning(
  nodeCount: number,
  widthPx: number,
  heightPx: number,
  t: LacunaGraphTuning,
): number {
  const n = Math.max(1, nodeCount);
  const exp = Math.max(0.05, t.zoomNodeCountExponent);
  const base = t.zoomNodesFactor / Math.pow(n, exp);
  const minDim = effectiveViewportMinDimPx(widthPx, heightPx, t);
  const viewportFactor = Math.max(
    t.zoomViewportMin,
    Math.min(t.zoomViewportMax, minDim / t.zoomRefPx),
  );
  return base * viewportFactor;
}
