import Image from "next/image";
import type { ReactNode } from "react";

import { LacunaCanvasPanel } from "@/components/lacuna-canvas-panel";
import { ScrollRegion } from "@/components/scroll-region";
import { SiteHeader } from "@/components/site-header";
import {
  lacunaCardHeadingClass,
  lacunaCardPaddingClass,
  lacunaCardTitleRuleClass,
} from "@/lib/lacuna-card-style";

type AboutCell =
  | { kind: "title"; title: string; body?: ReactNode }
  | {
      kind: "image";
      src: string;
      alt: string;
      imgClassName?: string;
      priority?: boolean;
    };

const CELLS: AboutCell[] = [
  {
    kind: "title",
    title: "Problem",
    body: (
      <>
        <p>
          About 99% of ancient Greek literature has been lost to history. For
          example:
        </p>
        <ul className="list-disc space-y-1 pl-5 marker:text-lacuna-ink/80">
          <li>Of the 123 plays Sophocles wrote, we have 7.</li>
          <li>Of Aeschylus&apos;s roughly 90 plays, we have 7.</li>
          <li>Of Euripides&apos;s ~90 plays, we have 19.</li>
          <li>
            Aristotle is thought to have written around 200 works. We have about
            31.
          </li>
        </ul>
        <p>
          For many lost works, their existence is solely known or understood
          through reference and allusion. And by flagging when works are quoted,
          paraphrased, or alluded to, scholars are able to construct profiles
          that most accurately convey the essence of the work.
        </p>
        <p>
          As of now, however, the process of doing so still requires much manual
          sifting and interpretation. No method currently exists to easily
          navigate or visualize the works holistically, known or lost.
        </p>
      </>
    ),
  },
  {
    kind: "title",
    title: "Solution",
    body: (
      <>
        <p>
          Lacuna performs lost work profile construction and provides an
          aesthetic interactive knowledge graph that contains both regular and
          &apos;ghost&apos; nodes linked by citation reference.
        </p>
        <p>
          The interactive knowledge graph functions as a library. Information
          generated within a ghost node is always linked to its original
          reference and dispositionally conservative in order to avoid
          hallucination and compounding drift.
        </p>
        <p>
          Unlike static fragment collections compiled manually by individual
          scholars, Lacuna dynamically synthesizes references across the corpus
          into living profiles.
        </p>
      </>
    ),
  },
  {
    kind: "image",
    src: "/about/hermes-praxiteles.jpg",
    alt: "Hermes and the Infant Dionysus, marble sculpture attributed to Praxiteles",
    imgClassName: "object-cover object-[center_20%]",
    priority: true,
  },
  {
    kind: "image",
    src: "/about/library-of-celsus.jpg",
    alt: "Facade of the Library of Celsus at Ephesus",
  },
  {
    kind: "title",
    title: "How To Use",
    body: (
      <>
        <p className="font-medium text-lacuna-ink">Within Main Page:</p>
        <ul className="list-disc space-y-1 pl-5 marker:text-lacuna-ink/80">
          <li>
            Known nodes are marked green, while ghost nodes are marked dashed
            and blue.
          </li>
          <li>
            Adespota nodes are generated when title, author, or both, are left
            unknown. These nodes serve as catch-alls.
          </li>
          <li>
            Click a node on the graph to open its details in the sidebar.
          </li>
          <li>Use the index to filter the graph by author.</li>
        </ul>
        <p className="font-medium text-lacuna-ink">Within Admin:</p>
        <ul className="list-disc space-y-1 pl-5 marker:text-lacuna-ink/80">
          <li>Add works by including title, author name, and excerpts.</li>
          <li>
            Run analysis flow (
            <strong>
              requires including Gemini API key within Environmental Variables file
            </strong>
            ).
          </li>
          <li>
            Restore or swap starter library, remove constructed ghost nodes, or
            delete all data.
          </li>
          <li>Export your results.</li>
        </ul>
      </>
    ),
  },
  {
    kind: "title",
    title: "Analysis Flow",
    body: (
      <>
        <p>Lacuna employs the multi-pass flow listed below:</p>
        <ol className="list-decimal space-y-1 pl-5 marker:text-lacuna-ink/80">
          <li>Normalize and translate excerpts.</li>
          <li>Distill title, author, and relevant excerpts.</li>
          <li>Merge to create ghost nodes (deduplication).</li>
          <li>Generate Brief Overview section.</li>
          <li>Generate What Is Known section.</li>
          <li>Verify information is accurate (loop until satisfied).</li>
        </ol>
      </>
    ),
  },
];

export default function AboutPage() {
  return (
    <div className="relative flex h-[100dvh] max-h-[100dvh] min-h-0 flex-1 flex-col overflow-hidden bg-lacuna-page">
      <SiteHeader active="about" />
      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="grid h-full min-h-0 flex-1 grid-cols-3 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] border border-solid border-lacuna-border">
          {CELLS.map((cell, i) => (
            <div
              key={i}
              className="flex min-h-0 min-w-0 overflow-hidden border-r border-b border-solid border-lacuna-border p-3 sm:p-4 [&:nth-child(3n)]:border-r-0 [&:nth-child(n+4)]:border-b-0"
            >
              {cell.kind === "title" ? (
                <LacunaCanvasPanel
                  className={`flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden ${lacunaCardPaddingClass}`}
                >
                  <div className={lacunaCardTitleRuleClass}>
                    <h2 className={lacunaCardHeadingClass}>{cell.title}</h2>
                  </div>
                  {cell.body ? (
                    <div className="mt-3 flex min-h-0 flex-1 flex-col">
                      <ScrollRegion className="space-y-3 pr-1.5 text-sm leading-relaxed text-lacuna-ink sm:pr-2">
                        {cell.body}
                      </ScrollRegion>
                    </div>
                  ) : null}
                </LacunaCanvasPanel>
              ) : (
                <LacunaCanvasPanel
                  surface="transparent"
                  className="relative flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden p-0"
                >
                  <div className="relative h-full min-h-0 w-full min-w-0 flex-1">
                    <Image
                      src={cell.src}
                      alt={cell.alt}
                      fill
                      priority={cell.priority}
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className={`${cell.imgClassName ?? "object-cover object-center"} mix-blend-multiply`}
                    />
                  </div>
                </LacunaCanvasPanel>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
