import Link from "next/link";

import { GraphTuningClient } from "@/app/dev/graph-tuning/graph-tuning-client";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Graph tuning · Lacuna",
  description: "Adjust Lacuna force-graph physics and rendering (local only).",
};

export default function GraphTuningPage() {
  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr] bg-lacuna-page">
      <SiteHeader active="graph" />
      <main className="min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto mb-6 max-w-4xl">
          <p className="text-xs font-medium uppercase tracking-wide text-lacuna-ink/55">
            <Link
              href="/admin"
              className="text-lacuna-ink/70 hover:text-lacuna-ink hover:underline"
            >
              Admin
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            Dev
          </p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-lacuna-ink">
            Graph physics & rendering
          </h1>
        </div>
        <GraphTuningClient />
      </main>
    </div>
  );
}
