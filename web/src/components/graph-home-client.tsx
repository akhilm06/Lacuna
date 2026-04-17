"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import type { LacunaAiFlowState } from "@/lib/lacuna-ai-flow-model";
import type { Work } from "@/lib/works";

import {
  graphAuthorKey,
  type GraphAuthorHighlight,
  type GraphAuthorScope,
} from "@/components/graph-author-highlight";
import { GraphIndexSidebar } from "@/components/graph-index-sidebar";

const WorksForceGraph = dynamic(
  () =>
    import("@/components/works-force-graph").then((m) => m.WorksForceGraph),
  { ssr: false },
);

export type { GraphAuthorHighlight, GraphAuthorScope };

export function GraphHomeClient({
  works,
  aiFlow,
}: {
  works: Work[];
  aiFlow: LacunaAiFlowState;
}) {
  const [indexHoverHighlight, setIndexHoverHighlight] =
    useState<GraphAuthorHighlight | null>(null);
  const [filterAuthorKeys, setFilterAuthorKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleAuthorFilter = useCallback(
    (scope: GraphAuthorScope, author: string) => {
      const key = graphAuthorKey(scope, author);
      setFilterAuthorKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    },
    [],
  );

  const toggleSectionFilter = useCallback(
    (scope: GraphAuthorScope, authors: string[]) => {
      if (authors.length === 0) return;
      setFilterAuthorKeys((prev) => {
        const keys = authors.map((a) => graphAuthorKey(scope, a));
        const allOn = keys.every((k) => prev.has(k));
        const next = new Set(prev);
        if (allOn) {
          for (const k of keys) next.delete(k);
        } else {
          for (const k of keys) next.add(k);
        }
        return next;
      });
    },
    [],
  );

  const toggleKeySelectAll = useCallback(
    (knownAuthors: string[], ghostAuthors: string[]) => {
      const keys = [
        ...knownAuthors.map((a) => graphAuthorKey("known", a)),
        ...ghostAuthors.map((a) => graphAuthorKey("ghost", a)),
      ];
      if (keys.length === 0) return;
      setFilterAuthorKeys((prev) => {
        const allOn = keys.every((k) => prev.has(k));
        const next = new Set(prev);
        if (allOn) {
          for (const k of keys) next.delete(k);
        } else {
          for (const k of keys) next.add(k);
        }
        return next;
      });
    },
    [],
  );

  return (
    <main className="flex h-full min-h-0 min-w-0 flex-col divide-y divide-solid divide-lacuna-border overflow-hidden md:flex-row md:divide-x md:divide-y-0">
      <aside
        className="flex w-full min-w-0 shrink-0 flex-col overflow-hidden px-4 py-6 max-md:min-h-[min(40vh,20rem)] max-md:max-h-[min(72vh,40rem)] sm:px-6 md:h-full md:max-h-none md:min-h-0 md:w-[22rem] lg:w-[24rem]"
        aria-label="Index"
      >
        <GraphIndexSidebar
          works={works}
          aiFlow={aiFlow}
          onAuthorHover={setIndexHoverHighlight}
          filterAuthorKeys={filterAuthorKeys}
          onAuthorFilterToggle={toggleAuthorFilter}
          onSectionFilterToggle={toggleSectionFilter}
          onKeySelectAllToggle={toggleKeySelectAll}
        />
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 md:h-full md:min-h-0 lg:px-8">
        <h1 className="sr-only">Lacuna graph</h1>
        <WorksForceGraph
          works={works}
          aiFlow={aiFlow}
          indexHoverHighlight={indexHoverHighlight}
          filterAuthorKeys={filterAuthorKeys}
        />
      </section>
    </main>
  );
}
