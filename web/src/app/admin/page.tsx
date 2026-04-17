import { LacunaCanvasPanel } from "@/components/lacuna-canvas-panel";
import { AddWorkForm } from "@/components/add-work-form";
import { ClearAiFlowPanel } from "@/components/clear-ai-flow-panel";
import { RestoreStarterLibraryPanel } from "@/components/restore-starter-library-panel";
import { RunAiFlowPanel } from "@/components/run-ai-flow-panel";
import { SiteHeader } from "@/components/site-header";
import { WipeLibraryPanel } from "@/components/wipe-library-panel";
import { WorkListItem } from "@/components/work-list-item";
import {
  lacunaCardHeadingClass,
  lacunaCardPaddingClass,
  lacunaCardTitleRuleCenterClass,
  lacunaPrimaryButtonClass,
} from "@/lib/lacuna-card-style";
import { buildGhostCitationSources } from "@/lib/ghost-profile-citations";
import { whatIsKnownBulletLines } from "@/lib/ghost-profile-text";
import { getLacunaAiFlow } from "@/lib/lacuna-ai-flow";
import { getPipelineLang } from "@/lib/ai/config";
import { getWorks } from "@/lib/works";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [works, aiFlow] = await Promise.all([getWorks(), getLacunaAiFlow()]);
  const pipelineLang = getPipelineLang();
  const sorted = [...works].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const workById = new Map(sorted.map((w) => [w.id, w]));

  return (
    <div className="grid h-dvh min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <SiteHeader active="admin" />
      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <LacunaCanvasPanel
            className={`${lacunaCardPaddingClass} text-center`}
          >
            <div className={lacunaCardTitleRuleCenterClass}>
              <h1 className={lacunaCardHeadingClass}>Admin</h1>
            </div>
            <p className="mt-3 w-full text-pretty text-sm leading-relaxed text-lacuna-ink">
              Welcome to Admin. In order to use this page, you must be running Lacuna
              locally. For full functionality, set Gemini API key in the server
              environment. Read our about page for additional context.
            </p>
          </LacunaCanvasPanel>

          <RunAiFlowPanel />

          <AddWorkForm pipelineLang={pipelineLang} />

          <LacunaCanvasPanel className={lacunaCardPaddingClass}>
            <section aria-labelledby="works-list-heading">
              <div className={lacunaCardTitleRuleCenterClass}>
                <h2 id="works-list-heading" className={lacunaCardHeadingClass}>
                  Saved works
                </h2>
              </div>
              {sorted.length === 0 ? (
                <p className="mt-3 text-sm text-lacuna-ink/75">
                  No works yet. Add one above.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-solid divide-lacuna-border">
                  {sorted.map((w) => (
                    <WorkListItem key={w.id} work={w} />
                  ))}
                </ul>
              )}
            </section>
          </LacunaCanvasPanel>

          {/* Lost works (analysis flow) list — disabled */}
          {false && (
          <LacunaCanvasPanel className={lacunaCardPaddingClass}>
            <section aria-labelledby="lost-works-heading">
              <div className={lacunaCardTitleRuleCenterClass}>
                <h2 id="lost-works-heading" className={lacunaCardHeadingClass}>
                  Lost works (analysis flow)
                </h2>
              </div>
              {aiFlow.lastRunAt ? (
                <p className="mt-2 text-xs text-lacuna-ink/60">
                  Last run: {aiFlow.lastRunAt}
                </p>
              ) : null}
              {aiFlow.ghostWorks.length === 0 ? (
                <p className="mt-3 text-sm text-lacuna-ink/75">
                  No lost-work extractions yet. Add excerpts to saved works, then
                  run the analysis flow below.
                </p>
              ) : (
                <ul className="mt-3 divide-y divide-solid divide-lacuna-border">
                  {aiFlow.ghostWorks.map((g) => {
                    const citationRefs = buildGhostCitationSources(g, workById);
                    return (
                    <li key={g.id} className="py-3 text-sm text-lacuna-ink first:pt-0">
                      <div className="font-medium text-lacuna-ink">
                        {g.title}
                        {g.author ? (
                          <span className="font-normal text-lacuna-ink">
                            {" "}
                            · {g.author}
                          </span>
                        ) : null}
                      </div>
                      {g.briefOverview ? (
                        <div className="mt-2">
                          <div className={lacunaCardTitleRuleCenterClass}>
                            <p className={lacunaCardHeadingClass}>
                              Brief overview
                            </p>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-lacuna-ink">
                            {g.briefOverview}
                          </p>
                        </div>
                      ) : null}
                      {g.whatIsKnown ? (
                        <div className="mt-2">
                          <div className={lacunaCardTitleRuleCenterClass}>
                            <p className={lacunaCardHeadingClass}>
                              What is known
                            </p>
                          </div>
                          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-relaxed text-lacuna-ink">
                            {whatIsKnownBulletLines(g.whatIsKnown).map(
                              (line, i) => (
                                <li key={i} className="pl-0.5">
                                  {line}
                                </li>
                              ),
                            )}
                          </ul>
                          {g.droppedClaimsCount && g.droppedClaimsCount > 0 ? (
                            <p className="mt-1.5 text-[0.7rem] leading-snug text-lacuna-ink/60">
                              {g.droppedClaimsCount} claim
                              {g.droppedClaimsCount === 1 ? "" : "s"} dropped
                              during verification
                            </p>
                          ) : null}
                          {citationRefs.length > 0 ? (
                            <p className="mt-1.5 text-[0.7rem] leading-snug text-lacuna-ink/75">
                              Bracketed numbers match the list below.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                      {citationRefs.length > 0 ? (
                        <div className="mt-2">
                          <div className={lacunaCardTitleRuleCenterClass}>
                            <p className={lacunaCardHeadingClass}>
                              Linked known works
                            </p>
                          </div>
                          <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-lacuna-ink marker:text-lacuna-ink/70">
                            {citationRefs.map((s) => (
                              <li key={s.workId}>
                                <span className="font-medium">{s.title}</span>
                                {s.author ? (
                                  <span className="font-normal">
                                    {" "}
                                    · {s.author}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ol>
                        </div>
                      ) : null}
                      <ul className="mt-2 list-disc pl-5 text-xs text-lacuna-ink/75">
                        {g.evidence.map((ev) => (
                          <li key={`${g.id}-${ev.workId}`}>
                            Work{" "}
                            <code className="text-[0.7rem]">{ev.workId}</code>:{" "}
                            {ev.excerptIds.length} excerpt
                            {ev.excerptIds.length === 1 ? "" : "s"}
                            {ev.excerptIds.length > 0 ? (
                              <span className="text-lacuna-ink/60">
                                {" "}
                                ({ev.excerptIds.join(", ")})
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </LacunaCanvasPanel>
          )}

          <LacunaCanvasPanel
            className={`${lacunaCardPaddingClass} text-center`}
          >
            <div className={lacunaCardTitleRuleCenterClass}>
              <h2 className={lacunaCardHeadingClass}>Export</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-lacuna-ink">
              Download your library and analysis flow results as a CSV bundle.
            </p>
            <p className="mt-8">
              <a
                className={`inline-flex ${lacunaPrimaryButtonClass} no-underline`}
                href="/api/admin/export-csv"
              >
                Export CSV (zip)
              </a>
            </p>
          </LacunaCanvasPanel>

          <ClearAiFlowPanel />

          <RestoreStarterLibraryPanel />

          <WipeLibraryPanel />

          <p className="pb-8 text-center text-xs text-lacuna-ink">
            Designed and developed by Akhil Muthyala.
          </p>
        </div>
      </main>
    </div>
  );
}
