"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";

import { createWork, type CreateWorkState } from "@/app/admin/actions";
import { LacunaCanvasPanel } from "@/components/lacuna-canvas-panel";
import {
  lacunaCardHeadingClass,
  lacunaCardPaddingClass,
  lacunaCardTitleRuleCenterClass,
  lacunaInkOutlineButtonClass,
  lacunaPrimaryButtonClass,
} from "@/lib/lacuna-card-style";
import type { WorkExcerpt } from "@/lib/works";

const inputClass =
  "w-full border border-solid border-lacuna-border bg-lacuna-canvas px-3 py-2 text-base text-lacuna-ink placeholder:text-lacuna-ink/45 focus:outline-none focus:ring-2 focus:ring-lacuna-ink/25 disabled:opacity-60";

const textareaClass =
  "min-h-[5.5rem] w-full resize-y border border-solid border-lacuna-border bg-lacuna-canvas px-3 py-2 text-sm leading-relaxed text-lacuna-ink placeholder:text-lacuna-ink/45 focus:outline-none focus:ring-2 focus:ring-lacuna-ink/25 disabled:opacity-60";

const SOURCE_LANG_ANCIENT_AND_MEDIEVAL: { value: string; label: string }[] = [
  { value: "grc", label: "Ancient Greek" },
  { value: "la", label: "Latin" },
  { value: "he", label: "Hebrew" },
  { value: "hbo", label: "Biblical Hebrew" },
  { value: "syc", label: "Syriac (classical)" },
  { value: "cop", label: "Coptic" },
  { value: "arc", label: "Aramaic" },
  { value: "gez", label: "Geʿez (Ethiopic)" },
  { value: "sa", label: "Sanskrit" },
  { value: "pal", label: "Middle Persian (Pahlavi)" },
  { value: "got", label: "Gothic" },
  { value: "fro", label: "Old French" },
  { value: "ang", label: "Old English" },
  { value: "enm", label: "Middle English" },
  { value: "non", label: "Old Norse" },
  { value: "cu", label: "Church Slavonic" },
];

const SOURCE_LANG_MODERN: { value: string; label: string }[] = [
  { value: "el", label: "Greek (modern)" },
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "it", label: "Italian" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ar", label: "Arabic" },
  { value: "fa", label: "Persian" },
  { value: "tr", label: "Turkish" },
];

function normLangTag(s: string): string {
  return s.trim().toLowerCase().split("-")[0] || "en";
}

function filterNotPipelineLang(
  opts: readonly { value: string; label: string }[],
  pipelineTag: string,
): { value: string; label: string }[] {
  return opts.filter((o) => normLangTag(o.value) !== pipelineTag);
}

export function AddWorkForm({
  pipelineLang = "en",
}: {
  pipelineLang?: string;
}) {
  const pipelineTag = normLangTag(pipelineLang);
  const ancientLangOptions = useMemo(
    () => filterNotPipelineLang(SOURCE_LANG_ANCIENT_AND_MEDIEVAL, pipelineTag),
    [pipelineTag],
  );
  const modernLangOptions = useMemo(
    () => filterNotPipelineLang(SOURCE_LANG_MODERN, pipelineTag),
    [pipelineTag],
  );

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [excerpts, setExcerpts] = useState<WorkExcerpt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const addExcerpt = useCallback(() => {
    setExcerpts((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: "", sourceLang: "" },
    ]);
  }, []);

  const updateExcerptText = useCallback((id: string, text: string) => {
    setExcerpts((prev) =>
      prev.map((e) => (e.id === id ? { ...e, text } : e)),
    );
  }, []);

  const updateExcerptSourceLang = useCallback((id: string, sourceLang: string) => {
    setExcerpts((prev) =>
      prev.map((e) => (e.id === id ? { ...e, sourceLang } : e)),
    );
  }, []);

  const removeExcerpt = useCallback((id: string) => {
    setExcerpts((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const submit = useCallback(() => {
    setError(null);
    startTransition(async () => {
      const result: CreateWorkState = await createWork(title, author, excerpts);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.success) {
        setTitle("");
        setAuthor("");
        setExcerpts([]);
        router.refresh();
      }
    });
  }, [author, excerpts, router, title]);

  return (
    <LacunaCanvasPanel className={lacunaCardPaddingClass}>
      <div className={lacunaCardTitleRuleCenterClass}>
        <h2 className={lacunaCardHeadingClass}>Add work</h2>
      </div>
      <div className="mt-3 w-full space-y-4">
        <div className="space-y-1">
          <label htmlFor="work-title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="work-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoComplete="off"
            disabled={isPending}
            className={inputClass}
            placeholder="e.g. Oedipus Tyrannus"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="work-author" className="block text-sm font-medium">
            Author
          </label>
          <input
            id="work-author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            autoComplete="off"
            disabled={isPending}
            className={inputClass}
            placeholder="e.g. Sophocles"
          />
        </div>

        <div className="space-y-2 border-t border-solid border-lacuna-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={lacunaCardHeadingClass}>Excerpts</span>
            <button
              type="button"
              onClick={addExcerpt}
              disabled={isPending}
              className={lacunaPrimaryButtonClass}
            >
              Add excerpt
            </button>
          </div>
          {excerpts.length > 0 ? (
            <ul className="space-y-3">
              {excerpts.map((ex, index) => (
                <li
                  key={ex.id}
                  className="space-y-2 rounded-[var(--lacuna-radius)] border border-solid border-lacuna-border bg-lacuna-canvas p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold tracking-wide text-lacuna-ink">
                      Excerpt {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeExcerpt(ex.id)}
                      disabled={isPending}
                      className={`${lacunaInkOutlineButtonClass} shrink-0 px-2.5 py-1 text-xs`}
                    >
                      Delete
                    </button>
                  </div>
                  <label className="sr-only" htmlFor={`new-excerpt-${ex.id}`}>
                    Excerpt {index + 1} text
                  </label>
                  <textarea
                    id={`new-excerpt-${ex.id}`}
                    value={ex.text}
                    onChange={(e) => updateExcerptText(ex.id, e.target.value)}
                    disabled={isPending}
                    placeholder="Paste or type the passage…"
                    className={textareaClass}
                    rows={4}
                  />
                  <div className="space-y-1">
                    <label
                      className="block text-xs font-medium text-lacuna-ink/90"
                      htmlFor={`new-excerpt-lang-${ex.id}`}
                    >
                      Source language (optional override)
                    </label>
                    <select
                      id={`new-excerpt-lang-${ex.id}`}
                      value={ex.sourceLang ?? ""}
                      onChange={(e) =>
                        updateExcerptSourceLang(ex.id, e.target.value)
                      }
                      disabled={isPending}
                      className={`${inputClass} text-sm`}
                    >
                      <option value="">
                        Auto (detect when running analysis flow)
                      </option>
                      <option value={pipelineTag}>
                        Pipeline language ({pipelineTag}) — no translation
                      </option>
                      <optgroup label="Ancient & medieval">
                        {ancientLangOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} ({opt.value})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Modern & other">
                        {modernLangOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} ({opt.value})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                    <p className="text-xs text-lacuna-ink/65">
                      The list is only for quick overrides. Any language can be
                      used—leave Auto and Gemini will still detect it.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-lacuna-ink" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={submit}
            disabled={isPending}
            className={lacunaPrimaryButtonClass}
          >
            {isPending ? "Saving…" : "Add work"}
          </button>
        </div>
      </div>
    </LacunaCanvasPanel>
  );
}
