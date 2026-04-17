"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { runAiFlowIngest } from "@/app/admin/actions";
import { LacunaCanvasPanel } from "@/components/lacuna-canvas-panel";
import {
  lacunaCardHeadingClass,
  lacunaCardPaddingClass,
  lacunaCardTitleRuleCenterClass,
  lacunaPrimaryButtonClass,
} from "@/lib/lacuna-card-style";

export function RunAiFlowPanel() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [doneFlash, setDoneFlash] = useState(false);
  const [isPending, startTransition] = useTransition();

  const run = useCallback(() => {
    setError(null);
    setDoneFlash(false);
    startTransition(async () => {
      const result = await runAiFlowIngest();
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDoneFlash(true);
      router.refresh();
    });
  }, [router]);

  return (
    <LacunaCanvasPanel
      className={`${lacunaCardPaddingClass} text-center`}
    >
      <section aria-labelledby="analysis-flow-run-heading">
        <div className={lacunaCardTitleRuleCenterClass}>
          <h2 id="analysis-flow-run-heading" className={lacunaCardHeadingClass}>
            Run analysis flow
          </h2>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-lacuna-ink" role="alert">
            {error}
          </p>
        ) : null}
        {doneFlash ? (
          <p className="mt-3 text-sm text-lacuna-ink/80" role="status">
            Analysis flow finished. Lost works and graph are updated.
          </p>
        ) : null}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={run}
            disabled={isPending}
            className={lacunaPrimaryButtonClass}
          >
            {isPending ? "Running…" : "Run analysis flow"}
          </button>
        </div>
      </section>
    </LacunaCanvasPanel>
  );
}
