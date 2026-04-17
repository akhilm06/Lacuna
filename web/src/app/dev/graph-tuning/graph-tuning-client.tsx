"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useLacunaGraphTuning } from "@/components/lacuna-graph-tuning-provider";
import {
  LACUNA_GRAPH_TUNING_DEFAULTS,
  type LacunaGraphTuning,
} from "@/lib/lacuna-graph-tuning";

function numField<K extends keyof LacunaGraphTuning>(
  key: K,
  label: string,
  min: number,
  max: number,
  step: number,
  tuning: LacunaGraphTuning,
  patch: (p: Partial<LacunaGraphTuning>) => void,
) {
  const v = tuning[key] as number;
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-lacuna-ink/85">{label}</span>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={v}
          onChange={(e) =>
            patch({ [key]: Number(e.target.value) } as Partial<LacunaGraphTuning>)
          }
          className="min-w-0 flex-1 accent-lacuna-ink"
        />
        <output className="w-14 shrink-0 tabular-nums text-lacuna-ink/70">
          {Number.isInteger(step) ? v : Number(v.toFixed(4))}
        </output>
      </div>
    </label>
  );
}

function boolField<K extends keyof LacunaGraphTuning>(
  key: K,
  label: string,
  tuning: LacunaGraphTuning,
  patch: (p: Partial<LacunaGraphTuning>) => void,
) {
  const v = tuning[key] as boolean;
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={v}
        onChange={(e) =>
          patch({ [key]: e.target.checked } as Partial<LacunaGraphTuning>)
        }
        className="size-4 accent-lacuna-ink"
      />
      <span className="text-lacuna-ink/85">{label}</span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-lg border border-solid border-lacuna-border bg-lacuna-canvas/60 p-4">
      <h2 className="text-sm font-semibold text-lacuna-ink">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function GraphTuningClient() {
  const { tuning, patchTuning, resetTuning } = useLacunaGraphTuning();
  const patch = patchTuning;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <p className="text-pretty text-sm leading-relaxed text-lacuna-ink/80">
        Adjust forces and rendering live. Values are saved to{" "}
        <code className="text-xs">localStorage</code> and apply to the graph on
        the home page.{" "}
        <Link href="/" className="font-medium text-lacuna-ink underline-offset-2 hover:underline">
          Open graph
        </Link>
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={resetTuning}
          className="rounded-md border border-solid border-lacuna-border bg-lacuna-page px-3 py-1.5 text-sm font-medium text-lacuna-ink hover:bg-lacuna-canvas"
        >
          Reset to defaults
        </button>
      </div>

      <Section title="Links & charge">
        {numField(
          "linkDefaultDistance",
          "Link distance",
          8,
          80,
          1,
          tuning,
          patch,
        )}
        {numField(
          "knownLinkPullScale",
          "Known link pull scale",
          0.05,
          1.2,
          0.01,
          tuning,
          patch,
        )}
        {numField(
          "chargeStrength",
          "Charge (negative = repel)",
          -120,
          -4,
          1,
          tuning,
          patch,
        )}
      </Section>

      <Section title="Collide">
        {numField(
          "collideRadiusFactor",
          "Radius factor",
          0.8,
          2.2,
          0.02,
          tuning,
          patch,
        )}
        {numField("collideStrength", "Strength", 0, 1.2, 0.02, tuning, patch)}
        {numField(
          "collideIterations",
          "Iterations",
          1,
          8,
          1,
          tuning,
          patch,
        )}
      </Section>

      <Section title="Radial rings">
        {numField(
          "radialGhostStrength",
          "Ghost radial strength",
          0,
          0.5,
          0.01,
          tuning,
          patch,
        )}
        {numField(
          "radialKnownStrength",
          "Known radial strength",
          0,
          0.5,
          0.005,
          tuning,
          patch,
        )}
        {numField(
          "radialShrinkNumerator",
          "Shrink numerator",
          12,
          80,
          1,
          tuning,
          patch,
        )}
        {numField(
          "radialGhostMul",
          "Ghost radius multiplier",
          0.1,
          1.2,
          0.05,
          tuning,
          patch,
        )}
        {numField(
          "radialKnownMul",
          "Known radius multiplier",
          0.5,
          3,
          0.05,
          tuning,
          patch,
        )}
        {numField(
          "radialMinGhost",
          "Min ghost radius",
          8,
          60,
          1,
          tuning,
          patch,
        )}
        {numField(
          "radialMinKnown",
          "Min known radius",
          30,
          160,
          1,
          tuning,
          patch,
        )}
        {numField(
          "radialRefPx",
          "Layout ref px",
          320,
          720,
          8,
          tuning,
          patch,
        )}
        {numField(
          "radialLayoutMin",
          "Layout scale min",
          0.4,
          1,
          0.02,
          tuning,
          patch,
        )}
        {numField(
          "radialLayoutMax",
          "Layout scale max",
          1,
          1.6,
          0.02,
          tuning,
          patch,
        )}
        {numField(
          "radialNodeCountExponent",
          "Ring spread vs n (exponent p in 1/n^p)",
          0.15,
          0.55,
          0.01,
          tuning,
          patch,
        )}
      </Section>

      <Section title="Center & viewport boundary">
        {numField(
          "centerStrength",
          "Center strength",
          0,
          0.35,
          0.01,
          tuning,
          patch,
        )}
        {numField(
          "boundaryCushionFraction",
          "Boundary cushion",
          0.02,
          0.25,
          0.01,
          tuning,
          patch,
        )}
        {numField(
          "boundaryKOut",
          "Boundary kOut",
          0.2,
          2,
          0.05,
          tuning,
          patch,
        )}
        {numField(
          "boundaryKIn",
          "Boundary kIn",
          0.05,
          0.8,
          0.02,
          tuning,
          patch,
        )}
        {numField(
          "boundaryScaleBase",
          "Boundary scale base",
          0.1,
          1,
          0.02,
          tuning,
          patch,
        )}
        {numField(
          "boundaryDragPull",
          "Drag pull (clamped drag)",
          0.2,
          1,
          0.02,
          tuning,
          patch,
        )}
        {numField(
          "viewportPadPx",
          "Viewport pad (px)",
          0,
          48,
          1,
          tuning,
          patch,
        )}
      </Section>

      <Section title="Viewport mix & panel height">
        {numField(
          "viewportMinDimMix",
          "Blend toward long side (0=min,1=max) for zoom + rings",
          0,
          1,
          0.05,
          tuning,
          patch,
        )}
        {numField(
          "graphPanelMinHeightVh",
          "Panel min height (vh in min(vh,rem))",
          25,
          90,
          1,
          tuning,
          patch,
        )}
        {numField(
          "graphPanelMinHeightRem",
          "Panel min height (rem in min(vh,rem))",
          12,
          48,
          1,
          tuning,
          patch,
        )}
      </Section>

      <Section title="Simulation & zoom">
        {numField(
          "simAlphaTarget",
          "Alpha target (drift)",
          0,
          0.02,
          0.0005,
          tuning,
          patch,
        )}
        {numField(
          "simVelocityDecay",
          "Velocity decay",
          0.05,
          0.85,
          0.01,
          tuning,
          patch,
        )}
        {numField(
          "zoomNodesFactor",
          "Zoom nodes factor",
          4,
          28,
          0.5,
          tuning,
          patch,
        )}
        {numField(
          "zoomRefPx",
          "Zoom ref px",
          320,
          720,
          8,
          tuning,
          patch,
        )}
        {numField(
          "zoomViewportMin",
          "Zoom viewport min",
          0.35,
          1,
          0.02,
          tuning,
          patch,
        )}
        {numField(
          "zoomViewportMax",
          "Zoom viewport max",
          1,
          2,
          0.02,
          tuning,
          patch,
        )}
        {numField(
          "zoomNodeCountExponent",
          "Zoom vs node count (exponent p in 1/n^p)",
          0.15,
          0.55,
          0.01,
          tuning,
          patch,
        )}
        {numField(
          "d3AlphaMin",
          "d3 alpha min (0 = off)",
          0,
          0.05,
          0.001,
          tuning,
          patch,
        )}
        {numField(
          "d3AlphaDecay",
          "d3 alpha decay",
          0.005,
          0.08,
          0.001,
          tuning,
          patch,
        )}
        {numField(
          "simAlphaRestoreFraction",
          "Restore alpha after drag (fraction of target)",
          0.05,
          1,
          0.05,
          tuning,
          patch,
        )}
        {numField("minZoom", "Min zoom (wheel)", 0.005, 0.6, 0.005, tuning, patch)}
        {numField("maxZoom", "Max zoom (wheel)", 4, 200, 1, tuning, patch)}
      </Section>

      <Section title="Node & link drawing">
        {numField("nodeRelSize", "Node rel size (at ref min-dim)", 2, 12, 0.5, tuning, patch)}
        {numField(
          "nodeRelSizeRefMinDimPx",
          "Node size ref min-dim (px)",
          320,
          900,
          8,
          tuning,
          patch,
        )}
        {numField(
          "nodeRelSizeViewportExponent",
          "Node size vs panel (0 = off)",
          0,
          0.45,
          0.02,
          tuning,
          patch,
        )}
        {numField(
          "nodeRelSizeViewportMin",
          "Node rel min clamp",
          2,
          8,
          0.25,
          tuning,
          patch,
        )}
        {numField(
          "nodeRelSizeViewportMax",
          "Node rel max clamp",
          6,
          14,
          0.25,
          tuning,
          patch,
        )}
        {numField(
          "nodeValUniform",
          "Node val (√ scales radius)",
          0.25,
          4,
          0.05,
          tuning,
          patch,
        )}
        {numField(
          "renderLinkWidth",
          "Link width",
          0.4,
          3,
          0.05,
          tuning,
          patch,
        )}
        {numField(
          "linkColorAlpha",
          "Link alpha",
          0.05,
          1,
          0.01,
          tuning,
          patch,
        )}
        {numField(
          "renderGhostLineW",
          "Ghost line width",
          0.5,
          3,
          0.05,
          tuning,
          patch,
        )}
        {numField(
          "renderGhostDashA",
          "Ghost dash A",
          1,
          10,
          0.25,
          tuning,
          patch,
        )}
        {numField(
          "renderGhostDashB",
          "Ghost dash B",
          1,
          10,
          0.25,
          tuning,
          patch,
        )}
        {numField("renderRingW", "Ring width", 0.5, 5, 0.1, tuning, patch)}
        {numField(
          "renderLabelGap",
          "Label gap",
          2,
          14,
          0.5,
          tuning,
          patch,
        )}
        {numField(
          "renderLabelFontPx",
          "Label font px",
          9,
          20,
          0.5,
          tuning,
          patch,
        )}
        {numField(
          "renderLabelFontWeight",
          "Label font weight",
          400,
          700,
          100,
          tuning,
          patch,
        )}
        {numField(
          "linkCurvature",
          "Link curvature",
          0,
          0.45,
          0.02,
          tuning,
          patch,
        )}
      </Section>

      <section className="space-y-3 rounded-lg border border-solid border-lacuna-border bg-lacuna-canvas/60 p-4">
        <h2 className="text-sm font-semibold text-lacuna-ink">Interaction</h2>
        <div className="flex flex-col gap-2">
          {boolField("autoPauseRedraw", "Auto pause redraw", tuning, patch)}
          {boolField(
            "enableZoomInteraction",
            "Enable zoom interaction",
            tuning,
            patch,
          )}
          {boolField(
            "enablePanInteraction",
            "Enable pan interaction",
            tuning,
            patch,
          )}
        </div>
      </section>

      <p className="text-xs text-lacuna-ink/60">
        Default JSON (reference):{" "}
        <code className="break-all">
          {JSON.stringify(LACUNA_GRAPH_TUNING_DEFAULTS)}
        </code>
      </p>
    </div>
  );
}
