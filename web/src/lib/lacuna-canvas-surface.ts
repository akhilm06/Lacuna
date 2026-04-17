import type { CSSProperties } from "react";

const LACUNA_CANVAS_FILL = {
  backgroundColor: "var(--lacuna-canvas)",
} as const satisfies CSSProperties;

export const LACUNA_CANVAS_DOT_GRID_STYLE = {
  ...LACUNA_CANVAS_FILL,
  backgroundImage:
    "radial-gradient(circle, color-mix(in oklab, var(--lacuna-ink) 18%, transparent) 1px, transparent 1px)",
  backgroundSize: "20px 20px",
} as const satisfies CSSProperties;

export const LACUNA_PANEL_SURFACE_STYLE = {
  ...LACUNA_CANVAS_FILL,
  boxShadow: "var(--lacuna-panel-shadow)",
} as const satisfies CSSProperties;

export const LACUNA_GRAPH_PANEL_STYLE = {
  ...LACUNA_CANVAS_DOT_GRID_STYLE,
  boxShadow: "var(--lacuna-panel-shadow)",
} as const satisfies CSSProperties;

export const LACUNA_PANEL_FRAME_ONLY_STYLE = {
  boxShadow: "var(--lacuna-panel-shadow)",
} as const satisfies CSSProperties;
