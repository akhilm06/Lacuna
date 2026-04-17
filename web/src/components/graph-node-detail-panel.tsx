"use client";

import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  formatGhostGraphCaption,
  type LacunaAiFlowState,
} from "@/lib/lacuna-ai-flow-model";
import { LACUNA_PANEL_SURFACE_STYLE } from "@/lib/lacuna-canvas-surface";
import {
  lacunaCardHeadingClass,
  lacunaCardTitleRuleClass,
} from "@/lib/lacuna-card-style";
import { buildGhostCitationSources } from "@/lib/ghost-profile-citations";
import { whatIsKnownBulletLines } from "@/lib/ghost-profile-text";
import {
  formatGraphNodeCaption,
  isGhostNodeKind,
  type NodeKind,
} from "@/lib/graph-work-types";
import type { Work } from "@/lib/works";

function WhatIsKnownLineWithSuperscripts({ line }: { line: string }) {
  let s = line.trimEnd();
  let trailingPunct = "";
  const punct = s.match(/([.,;:!?]+)\s*$/);
  if (punct && punct.index !== undefined) {
    trailingPunct = punct[1];
    s = s.slice(0, punct.index).trimEnd();
  }

  const nums: string[] = [];
  for (;;) {
    const m = s.match(/\s*(?:,|;)?\s*(?:\[(\d+)\]|\((\d+)\))\s*$/);
    if (!m || m.index === undefined) break;
    nums.unshift(m[1] ?? m[2]);
    s = s.slice(0, m.index).trimEnd();
  }

  if (nums.length === 0) return <>{line}</>;

  const joined = nums.join(",");
  const title =
    nums.length === 1
      ? `Source ${nums[0]}`
      : `Sources ${nums.join(", ")}`;

  return (
    <Fragment>
      <span>{s}</span>
      {trailingPunct ? <span>{trailingPunct}</span> : null}
      <span
        className="relative -top-[0.08em] ml-0.5 inline-block text-[0.74em] font-semibold leading-none tabular-nums text-lacuna-ink"
        title={title}
      >
        {joined}
      </span>
    </Fragment>
  );
}

export type GraphDetailNode = {
  id: string;
  title: string;
  author: string;
  nodeKind: NodeKind;
  graphCaption?: string;
};

type GraphNodeDetailPanelProps = {
  node: GraphDetailNode;
  works: Work[];
  aiFlow: LacunaAiFlowState;
  onClose: () => void;
  onNavigateToNode: (target: { id: string; nodeKind: NodeKind }) => void;
  onLinkedNodeHover?: (target: { id: string; nodeKind: NodeKind } | null) => void;
};

const linkedNavRowButtonClass =
  "w-full cursor-pointer rounded-sm border-0 bg-transparent p-0 text-left text-inherit transition-colors hover:bg-lacuna-ink/[0.06] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lacuna-ink/35";

export function GraphNodeDetailPanel({
  node,
  works,
  aiFlow,
  onClose,
  onNavigateToNode,
  onLinkedNodeHover,
}: GraphNodeDetailPanelProps) {
  const titleId = "graph-node-detail-title";
  const closeRef = useRef<HTMLButtonElement>(null);
  const [entered, setEntered] = useState(false);
  const [topUnderHeader, setTopUnderHeader] = useState<number | null>(null);

  useLayoutEffect(() => {
    closeRef.current?.focus();
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useLayoutEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;

    const sync = () => {
      setTopUnderHeader(header.getBoundingClientRect().bottom);
    };

    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(header);
    window.addEventListener("resize", sync);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
    };
  }, []);

  const knownWork =
    node.nodeKind === "known"
      ? works.find((w) => w.id === node.id) ?? null
      : null;

  const ghostFull = isGhostNodeKind(node.nodeKind)
    ? (aiFlow.ghostWorks.find((g) => g.id === node.id) ?? null)
    : null;

  const worksById = useMemo(
    () => new Map(works.map((w) => [w.id, w])),
    [works],
  );

  const citationSources = useMemo(() => {
    if (!ghostFull) return [];
    return buildGhostCitationSources(ghostFull, worksById);
  }, [ghostFull, worksById]);

  const linkedGhostWorks = useMemo(() => {
    if (!knownWork) return [];
    const ids = new Set<string>();
    for (const e of aiFlow.edges) {
      if (e.sourceWorkId === knownWork.id) ids.add(e.targetGhostId);
    }
    return aiFlow.ghostWorks
      .filter((g) => ids.has(g.id))
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [knownWork, aiFlow.edges, aiFlow.ghostWorks]);

  const panel = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className={[
        "fixed right-0 bottom-0 z-50 flex w-full max-w-sm flex-col border border-solid border-lacuna-border shadow-xl sm:max-w-md",
        "transition-transform duration-200 ease-out motion-reduce:translate-x-0 motion-reduce:transition-none",
        entered ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
      style={{
        ...LACUNA_PANEL_SURFACE_STYLE,
        top:
          topUnderHeader != null
            ? `${topUnderHeader}px`
            : "4rem" /* fallback until measured */,
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-solid border-lacuna-border px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="min-w-0 text-base font-semibold leading-snug text-lacuna-ink"
          >
            {formatGraphNodeCaption(node)}
          </h2>
          {isGhostNodeKind(node.nodeKind) && ghostFull ? (
            <p className="mt-1.5 text-xs leading-snug text-lacuna-ink">
              Evidence from {ghostFull.evidence.length} source
              {ghostFull.evidence.length === 1 ? "" : "s"}.
            </p>
          ) : null}
          {node.nodeKind === "known" && knownWork ? (
            <p className="mt-1.5 text-xs leading-snug text-lacuna-ink">
              {knownWork.excerpts.length === 0
                ? "No excerpts stored yet."
                : `${knownWork.excerpts.length} excerpt${knownWork.excerpts.length === 1 ? "" : "s"} on record.`}
            </p>
          ) : node.nodeKind === "known" ? (
            <p className="mt-1.5 text-xs leading-snug text-lacuna-ink">
              Known work
            </p>
          ) : null}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer rounded border border-solid border-lacuna-border bg-lacuna-page/40 px-2 py-1 text-xs font-medium text-lacuna-ink/80 transition-colors hover:bg-lacuna-ink/10 hover:text-lacuna-ink"
          aria-label="Close node details"
        >
          Close
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
        {node.nodeKind === "known" && knownWork && (
          <div className="space-y-3 text-sm text-lacuna-ink">
            <div>
              <div className={lacunaCardTitleRuleClass}>
                <p className={lacunaCardHeadingClass}>Excerpts</p>
              </div>
              {knownWork.excerpts.length === 0 ? (
                <p className="mt-2 text-sm leading-relaxed text-lacuna-ink">
                  None
                </p>
              ) : (
                <>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-lacuna-ink">
                    {knownWork.excerpts.slice(0, 8).map((ex) => {
                      const src = ex.text.trim();
                      const pt = ex.pipelineText?.trim() ?? "";
                      const showOriginalBelow =
                        pt.length > 0 && pt !== src;
                      return (
                        <li key={ex.id} className="pl-0.5">
                          {showOriginalBelow ? (
                            <div className="space-y-1.5">
                              <p className="whitespace-pre-wrap">{pt}</p>
                              <p className="whitespace-pre-wrap text-xs leading-relaxed text-lacuna-ink/65">
                                {ex.text}
                              </p>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap">{ex.text}</p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {knownWork.excerpts.length > 8 ? (
                    <p className="mt-1.5 text-xs leading-snug text-lacuna-ink/60">
                      + {knownWork.excerpts.length - 8} more
                    </p>
                  ) : null}
                </>
              )}
            </div>

            {linkedGhostWorks.length > 0 ? (
              <div>
                <div className={lacunaCardTitleRuleClass}>
                  <p className={lacunaCardHeadingClass}>Linked ghost works</p>
                </div>
                <ol
                  className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-lacuna-ink marker:text-lacuna-ink/70"
                  onMouseLeave={() => onLinkedNodeHover?.(null)}
                >
                  {linkedGhostWorks.map((g) => {
                    const label = formatGhostGraphCaption(g);
                    return (
                      <li key={g.id} className="pl-1">
                        <button
                          type="button"
                          className={linkedNavRowButtonClass}
                          onMouseEnter={() =>
                            onLinkedNodeHover?.({
                              id: g.id,
                              nodeKind: "ghost",
                            })
                          }
                          onClick={() =>
                            onNavigateToNode({ id: g.id, nodeKind: "ghost" })
                          }
                          aria-label={`Open sidebar for ${label}`}
                        >
                          <span className="font-medium text-lacuna-ink">
                            {label}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </div>
        )}

        {node.nodeKind === "known" && !knownWork && (
          <p className="mt-4 text-sm text-lacuna-ink/60">
            Full library entry not found for this id.
          </p>
        )}

        {isGhostNodeKind(node.nodeKind) && ghostFull && (
          <div className="space-y-3 text-sm text-lacuna-ink">
            {ghostFull.briefOverview ? (
              <div>
                <div className={lacunaCardTitleRuleClass}>
                  <p className={lacunaCardHeadingClass}>Brief overview</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-lacuna-ink">
                  {ghostFull.briefOverview}
                </p>
              </div>
            ) : null}
            {ghostFull.whatIsKnown ? (
              <div>
                <div className={lacunaCardTitleRuleClass}>
                  <p className={lacunaCardHeadingClass}>What is known</p>
                </div>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-lacuna-ink">
                  {whatIsKnownBulletLines(ghostFull.whatIsKnown).map(
                    (line, i) => (
                      <li key={i} className="pl-0.5">
                        <WhatIsKnownLineWithSuperscripts line={line} />
                      </li>
                    ),
                  )}
                </ul>
                {ghostFull.droppedClaimsCount &&
                ghostFull.droppedClaimsCount > 0 ? (
                  <p className="mt-1.5 text-[0.7rem] leading-snug text-lacuna-ink/60">
                    {ghostFull.droppedClaimsCount} claim
                    {ghostFull.droppedClaimsCount === 1 ? "" : "s"} dropped
                    during verification
                  </p>
                ) : null}
              </div>
            ) : null}
            {citationSources.length > 0 ? (
              <div>
                <div className={lacunaCardTitleRuleClass}>
                  <p className={lacunaCardHeadingClass}>Linked known works</p>
                </div>
                <ol
                  className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-lacuna-ink marker:text-lacuna-ink/70"
                  onMouseLeave={() => onLinkedNodeHover?.(null)}
                >
                  {citationSources.map((s) => {
                    const line = s.author
                      ? `${s.title} · ${s.author}`
                      : s.title;
                    return (
                      <li key={s.workId} className="pl-1">
                        <button
                          type="button"
                          className={linkedNavRowButtonClass}
                          onMouseEnter={() =>
                            onLinkedNodeHover?.({
                              id: s.workId,
                              nodeKind: "known",
                            })
                          }
                          onClick={() =>
                            onNavigateToNode({
                              id: s.workId,
                              nodeKind: "known",
                            })
                          }
                          aria-label={`Open sidebar for ${line}`}
                        >
                          <span className="font-medium text-lacuna-ink">
                            {s.title}
                          </span>
                          {s.author ? (
                            <span className="font-normal text-lacuna-ink">
                              {" "}
                              · {s.author}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : null}
          </div>
        )}

        {isGhostNodeKind(node.nodeKind) && !ghostFull && (
          <p className="mt-4 text-sm text-lacuna-ink/60">
            Ghost metadata not found for this id.
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
