"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { deleteWork } from "@/app/admin/actions";
import { lacunaInkOutlineButtonClass } from "@/lib/lacuna-card-style";
import type { Work } from "@/lib/works";

export function WorkListItem({ work }: { work: Work }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const removeWork = useCallback(() => {
    if (
      !window.confirm(
        `Delete “${work.title}” by ${work.author}? This cannot be undone. Related graph and analysis flow links will be removed.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteWork(work.id);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }, [router, work.author, work.id, work.title]);

  return (
    <li className="py-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 text-base leading-snug">
            <span className="font-medium text-lacuna-ink">{work.title}</span>
            <span className="text-lacuna-ink/80"> — </span>
            <span className="text-lacuna-ink">{work.author}</span>
            {work.excerpts.length > 0 ? (
              <p className="mt-1.5 text-sm text-lacuna-ink">
                {work.excerpts.length} excerpt
                {work.excerpts.length === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={removeWork}
              disabled={isPending}
              className={lacunaInkOutlineButtonClass}
            >
              {isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-red-900/90" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </li>
  );
}
