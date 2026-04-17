import type { CSSProperties, ReactNode } from "react";

import {
  LACUNA_GRAPH_PANEL_STYLE,
  LACUNA_PANEL_FRAME_ONLY_STYLE,
  LACUNA_PANEL_SURFACE_STYLE,
} from "@/lib/lacuna-canvas-surface";

export function LacunaCanvasPanel({
  children,
  className = "",
  surface = "canvas",
  dotGrid = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  surface?: "canvas" | "transparent";
  dotGrid?: boolean;
  style?: CSSProperties;
}) {
  const baseStyle: CSSProperties =
    surface === "transparent"
      ? LACUNA_PANEL_FRAME_ONLY_STYLE
      : dotGrid
        ? LACUNA_GRAPH_PANEL_STYLE
        : LACUNA_PANEL_SURFACE_STYLE;
  return (
    <div
      className={`overflow-hidden rounded-[var(--lacuna-radius)] border border-solid border-lacuna-border ${className}`}
      style={style ? { ...baseStyle, ...style } : baseStyle}
    >
      {children}
    </div>
  );
}
