"use client";

import type { ReactNode } from "react";

import {
  graphAuthorKey,
  type GraphAuthorHighlight,
  type GraphAuthorScope,
} from "@/components/graph-author-highlight";
import type { LacunaAiFlowState } from "@/lib/lacuna-ai-flow-model";
import { ghostRowAuthorLabel } from "@/lib/lacuna-ai-flow-model";
import {
  GRAPH_NODE_KNOWN_FILL,
  graphGhostFillRgba,
  graphGhostStrokeRgba,
} from "@/lib/graph-node-styles";
import type { Work } from "@/lib/works";

import {
  lacunaCardHeadingClass,
  lacunaCardPaddingClass,
  lacunaCardTitleRuleClass,
} from "@/lib/lacuna-card-style";

import { LacunaCanvasPanel } from "./lacuna-canvas-panel";
import { ScrollRegion } from "./scroll-region";

function sectionFilterToggleRowClass(
  empty: boolean,
  allSelected: boolean,
  someSelected: boolean,
) {
  return (
    "flex w-full min-w-0 items-center gap-2 rounded-sm px-0.5 py-1 text-left transition-colors duration-150 ease-out motion-reduce:transition-none " +
    (empty
      ? "cursor-not-allowed opacity-40"
      : "cursor-pointer hover:bg-lacuna-ink/[0.04] ") +
    (allSelected
      ? "bg-lacuna-ink/[0.09] ring-1 ring-inset ring-lacuna-ink/12 hover:bg-lacuna-ink/[0.11] "
      : "") +
    (someSelected
      ? "bg-lacuna-ink/[0.05] hover:bg-lacuna-ink/[0.07] "
      : "")
  );
}

function SectionFilterHeader({
  scope,
  authors,
  title,
  totalCount,
  filterAuthorKeys,
  onSectionFilterToggle,
  onAuthorHover,
}: {
  scope: GraphAuthorScope;
  authors: string[];
  title: string;
  totalCount: number;
  filterAuthorKeys?: ReadonlySet<string>;
  onSectionFilterToggle?: (
    scope: GraphAuthorScope,
    authors: string[],
  ) => void;
  onAuthorHover?: (highlight: GraphAuthorHighlight | null) => void;
}) {
  const empty = authors.length === 0;
  const selectedCount = authors.filter((a) =>
    filterAuthorKeys?.has(graphAuthorKey(scope, a)),
  ).length;
  const allSelected = !empty && selectedCount === authors.length;
  const someSelected = !empty && selectedCount > 0 && !allSelected;

  const rowClass = sectionFilterToggleRowClass(empty, allSelected, someSelected);

  return (
    <div className={`mb-2 ${lacunaCardTitleRuleClass}`}>
      <button
        type="button"
        className={rowClass}
        disabled={empty}
        onMouseEnter={() =>
          !empty && onAuthorHover?.({ kind: "scope", scope })
        }
        onClick={() => {
          onSectionFilterToggle?.(scope, authors);
        }}
        aria-label={
          empty
            ? title
            : allSelected
              ? scope === "known"
                ? "Clear all known authors from the graph filter"
                : "Clear all ghost authors from the graph filter"
              : scope === "known"
                ? "Add all known authors to the graph filter"
                : "Add all ghost authors to the graph filter"
        }
      >
        <h2 className={`min-w-0 flex-1 truncate ${lacunaCardHeadingClass}`}>
          {title}
        </h2>
        <span
          className="shrink-0 tabular-nums text-lacuna-ink"
          aria-label={`${totalCount} total`}
        >
          {totalCount}
        </span>
      </button>
    </div>
  );
}

function KeySectionFilterButton({
  scope,
  label,
  totalCount,
  authors,
  filterAuthorKeys,
  onSectionFilterToggle,
  onAuthorHover,
  swatch,
}: {
  scope: GraphAuthorScope;
  label: string;
  totalCount: number;
  authors: string[];
  filterAuthorKeys?: ReadonlySet<string>;
  onSectionFilterToggle?: (
    scope: GraphAuthorScope,
    authors: string[],
  ) => void;
  onAuthorHover?: (highlight: GraphAuthorHighlight | null) => void;
  swatch: ReactNode;
}) {
  const empty = authors.length === 0;
  const selectedCount = authors.filter((a) =>
    filterAuthorKeys?.has(graphAuthorKey(scope, a)),
  ).length;
  const allSelected = !empty && selectedCount === authors.length;
  const someSelected = !empty && selectedCount > 0 && !allSelected;

  return (
    <button
      type="button"
      className={sectionFilterToggleRowClass(empty, allSelected, someSelected)}
      disabled={empty}
      onMouseEnter={() =>
        !empty && onAuthorHover?.({ kind: "scope", scope })
      }
      onClick={() => {
        onSectionFilterToggle?.(scope, authors);
      }}
      aria-label={
        empty
          ? label
          : allSelected
            ? scope === "known"
              ? "Clear all known authors from the graph filter"
              : "Clear all ghost authors from the graph filter"
            : scope === "known"
              ? "Add all known authors to the graph filter"
              : "Add all ghost authors to the graph filter"
      }
    >
      {swatch}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
      <span
        className="shrink-0 tabular-nums text-lacuna-ink"
        aria-label={`${totalCount} total`}
      >
        {totalCount}
      </span>
    </button>
  );
}

export function GraphIndexSidebar({
  works,
  aiFlow,
  onAuthorHover,
  filterAuthorKeys,
  onAuthorFilterToggle,
  onSectionFilterToggle,
  onKeySelectAllToggle,
}: {
  works: Work[];
  aiFlow: LacunaAiFlowState;
  onAuthorHover?: (highlight: GraphAuthorHighlight | null) => void;
  filterAuthorKeys?: ReadonlySet<string>;
  onAuthorFilterToggle?: (
    scope: GraphAuthorScope,
    author: string,
  ) => void;
  onSectionFilterToggle?: (
    scope: GraphAuthorScope,
    authors: string[],
  ) => void;
  onKeySelectAllToggle?: (
    knownAuthors: string[],
    ghostAuthors: string[],
  ) => void;
}) {
  const knownCountByAuthor = new Map<string, number>();
  for (const w of works) {
    const a = w.author.trim();
    if (!a) continue;
    knownCountByAuthor.set(a, (knownCountByAuthor.get(a) ?? 0) + 1);
  }

  const knownAuthors = [...knownCountByAuthor.keys()].sort((a, b) =>
    a.localeCompare(b),
  );

  const ghostCountByLabel = new Map<string, number>();
  for (const g of aiFlow.ghostWorks) {
    const label = ghostRowAuthorLabel(g);
    ghostCountByLabel.set(label, (ghostCountByLabel.get(label) ?? 0) + 1);
  }

  const ghostAuthors = [...ghostCountByLabel.keys()].sort((a, b) =>
    a.localeCompare(b),
  );

  const keyAllKeys = [
    ...knownAuthors.map((a) => graphAuthorKey("known", a)),
    ...ghostAuthors.map((a) => graphAuthorKey("ghost", a)),
  ];
  const keyEmpty = keyAllKeys.length === 0;
  const keySelectedCount = keyAllKeys.filter((k) =>
    filterAuthorKeys?.has(k),
  ).length;
  const keyAllSelected =
    !keyEmpty && keySelectedCount === keyAllKeys.length;
  const keySomeSelected =
    !keyEmpty && keySelectedCount > 0 && !keyAllSelected;

  return (
    <div
      className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden"
      onMouseLeave={() => onAuthorHover?.(null)}
    >
      <LacunaCanvasPanel
        className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden ${lacunaCardPaddingClass}`}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <ScrollRegion className="flex flex-col gap-8 pr-1.5 sm:pr-2">
          <section>
            <SectionFilterHeader
              scope="known"
              authors={knownAuthors}
              title="Known works"
              totalCount={works.length}
              filterAuthorKeys={filterAuthorKeys}
              onSectionFilterToggle={onSectionFilterToggle}
              onAuthorHover={onAuthorHover}
            />
            {knownAuthors.length === 0 ? (
              <p className="text-sm text-lacuna-ink/60">None yet.</p>
            ) : (
              <ul className="space-y-1 text-sm text-lacuna-ink">
                {knownAuthors.map((a) => {
                  const selected =
                    filterAuthorKeys?.has(graphAuthorKey("known", a)) ?? false;
                  const n = knownCountByAuthor.get(a) ?? 0;
                  return (
                    <li key={`known-${a}`} className="min-w-0">
                      <button
                        type="button"
                        onMouseEnter={() =>
                          onAuthorHover?.({
                            kind: "author",
                            scope: "known",
                            author: a,
                          })
                        }
                        onClick={() => {
                          onAuthorFilterToggle?.("known", a);
                        }}
                        aria-pressed={selected}
                        aria-label={
                          selected
                            ? `Remove ${a} from the graph filter (${n} works)`
                            : `Add ${a} to the graph filter (${n} works)`
                        }
                        className={
                          "flex w-full min-w-0 items-center justify-between gap-2 rounded-sm px-0.5 py-0.5 text-left transition-colors duration-150 ease-out motion-reduce:transition-none " +
                          (selected
                            ? "cursor-pointer bg-lacuna-ink/[0.09] font-medium text-lacuna-ink ring-1 ring-inset ring-lacuna-ink/12 hover:bg-lacuna-ink/[0.11] "
                            : "cursor-pointer text-lacuna-ink hover:bg-lacuna-ink/[0.04] ")
                        }
                      >
                        <span className="min-w-0 flex-1 truncate">{a}</span>
                        <span className="shrink-0 tabular-nums text-lacuna-ink">
                          {n}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section>
            <SectionFilterHeader
              scope="ghost"
              authors={ghostAuthors}
              title="Ghost works"
              totalCount={aiFlow.ghostWorks.length}
              filterAuthorKeys={filterAuthorKeys}
              onSectionFilterToggle={onSectionFilterToggle}
              onAuthorHover={onAuthorHover}
            />
            {ghostAuthors.length === 0 ? (
              <p className="text-sm text-lacuna-ink/60">None yet.</p>
            ) : (
              <ul className="space-y-1 text-sm text-lacuna-ink">
                {ghostAuthors.map((a) => {
                  const selected =
                    filterAuthorKeys?.has(graphAuthorKey("ghost", a)) ?? false;
                  const n = ghostCountByLabel.get(a) ?? 0;
                  return (
                    <li key={`ghost-${a}`} className="min-w-0">
                      <button
                        type="button"
                        onMouseEnter={() =>
                          onAuthorHover?.({
                            kind: "author",
                            scope: "ghost",
                            author: a,
                          })
                        }
                        onClick={() => {
                          onAuthorFilterToggle?.("ghost", a);
                        }}
                        aria-pressed={selected}
                        aria-label={
                          selected
                            ? `Remove ghost works by ${a} from the graph filter (${n} nodes)`
                            : `Add ghost works by ${a} to the graph filter (${n} nodes)`
                        }
                        className={
                          "flex w-full min-w-0 items-center justify-between gap-2 rounded-sm px-0.5 py-0.5 text-left transition-colors duration-150 ease-out motion-reduce:transition-none " +
                          (selected
                            ? "cursor-pointer bg-lacuna-ink/[0.09] font-medium text-lacuna-ink ring-1 ring-inset ring-lacuna-ink/12 hover:bg-lacuna-ink/[0.11] "
                            : "cursor-pointer text-lacuna-ink hover:bg-lacuna-ink/[0.04] ")
                        }
                      >
                        <span className="min-w-0 flex-1 truncate">{a}</span>
                        <span className="shrink-0 tabular-nums text-lacuna-ink">
                          {n}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          </ScrollRegion>
        </div>
      </LacunaCanvasPanel>

      <section aria-label="Graph node key" className="shrink-0">
        <LacunaCanvasPanel className={`w-full shrink-0 ${lacunaCardPaddingClass}`}>
          <div className={`mb-3 ${lacunaCardTitleRuleClass}`}>
            <button
              type="button"
              className={sectionFilterToggleRowClass(
                keyEmpty,
                keyAllSelected,
                keySomeSelected,
              )}
              disabled={keyEmpty}
              onMouseEnter={() =>
                !keyEmpty && onAuthorHover?.({ kind: "all" })
              }
              onClick={() => {
                onKeySelectAllToggle?.(knownAuthors, ghostAuthors);
              }}
              aria-label={
                keyEmpty
                  ? "Key"
                  : keyAllSelected
                    ? "Clear all authors from the graph filter"
                    : "Add all known and ghost authors to the graph filter"
              }
            >
              <h2
                className={`min-w-0 flex-1 truncate text-left ${lacunaCardHeadingClass}`}
              >
                Key
              </h2>
            </button>
          </div>
          <ul className="space-y-2.5 text-sm text-lacuna-ink">
            <li className="min-w-0">
              <KeySectionFilterButton
                scope="known"
                label="Known works"
                totalCount={works.length}
                authors={knownAuthors}
                filterAuthorKeys={filterAuthorKeys}
                onSectionFilterToggle={onSectionFilterToggle}
                onAuthorHover={onAuthorHover}
                swatch={
                  <span
                    className="inline-block size-3.5 shrink-0 rounded-full"
                    style={{ backgroundColor: GRAPH_NODE_KNOWN_FILL }}
                    aria-hidden
                  />
                }
              />
            </li>
            <li className="min-w-0">
              <KeySectionFilterButton
                scope="ghost"
                label="Ghost works"
                totalCount={aiFlow.ghostWorks.length}
                authors={ghostAuthors}
                filterAuthorKeys={filterAuthorKeys}
                onSectionFilterToggle={onSectionFilterToggle}
                onAuthorHover={onAuthorHover}
                swatch={
                  <span
                    className="inline-block size-3.5 shrink-0 rounded-full border border-dashed"
                    style={{
                      backgroundColor: graphGhostFillRgba(),
                      borderColor: graphGhostStrokeRgba(),
                    }}
                    aria-hidden
                  />
                }
              />
            </li>
          </ul>
        </LacunaCanvasPanel>
      </section>
    </div>
  );
}
