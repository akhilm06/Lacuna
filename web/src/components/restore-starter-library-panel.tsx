"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { restoreStarterLibrary } from "@/app/admin/actions";
import { LacunaCanvasPanel } from "@/components/lacuna-canvas-panel";
import {
  lacunaCardHeadingClass,
  lacunaCardPaddingClass,
  lacunaCardTitleRuleCenterClass,
  lacunaPrimaryButtonClass,
} from "@/lib/lacuna-card-style";

const CONFIRM = "RESTORE";

export function RestoreStarterLibraryPanel() {
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [doneFlash, setDoneFlash] = useState(false);
  const [isPending, startTransition] = useTransition();

  const restore = useCallback(() => {
    setError(null);
    setDoneFlash(false);
    startTransition(async () => {
      const result = await restoreStarterLibrary(phrase);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setPhrase("");
      setDoneFlash(true);
      router.refresh();
    });
  }, [phrase, router]);

  const canSubmit = phrase.trim() === CONFIRM && !isPending;

  return (
    <LacunaCanvasPanel
      className={`${lacunaCardPaddingClass} text-center`}
    >
      <section aria-labelledby="restore-starter-heading">
        <div className={lacunaCardTitleRuleCenterClass}>
          <h2 id="restore-starter-heading" className={lacunaCardHeadingClass}>
            Restore starter library
          </h2>
        </div>
        <div className="mt-4 space-y-2">
          <label
            htmlFor="restore-starter-confirm"
            className="block text-sm font-medium"
          >
            Type <span className="font-mono">{CONFIRM}</span> to confirm
          </label>
          <input
            id="restore-starter-confirm"
            type="text"
            value={phrase}
            onChange={(e) => {
              setPhrase(e.target.value);
              setError(null);
              setDoneFlash(false);
            }}
            disabled={isPending}
            autoComplete="off"
            className="mx-auto block max-w-xs border border-solid border-lacuna-border bg-lacuna-canvas px-3 py-2 font-mono text-sm text-lacuna-ink focus:outline-none focus:ring-2 focus:ring-lacuna-ink/25 disabled:opacity-60"
            placeholder={CONFIRM}
          />
        </div>
        {error ? (
          <p className="mt-3 text-sm text-lacuna-ink" role="alert">
            {error}
          </p>
        ) : null}
        {doneFlash ? (
          <p className="mt-3 text-sm text-lacuna-ink/80" role="status">
            Starter library restored.
          </p>
        ) : null}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={restore}
            disabled={!canSubmit}
            className={lacunaPrimaryButtonClass}
          >
            {isPending ? "Restoring…" : "Restore starter library"}
          </button>
        </div>
      </section>
    </LacunaCanvasPanel>
  );
}
