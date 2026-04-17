import { GraphHomeClient } from "@/components/graph-home-client";
import { SiteHeader } from "@/components/site-header";
import { getLacunaAiFlow } from "@/lib/lacuna-ai-flow";
import { getWorks } from "@/lib/works";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [works, aiFlow] = await Promise.all([getWorks(), getLacunaAiFlow()]);

  return (
    <div className="grid min-h-dvh grid-rows-[auto_auto] overflow-x-hidden md:h-dvh md:min-h-0 md:grid-rows-[auto_minmax(0,1fr)] md:overflow-hidden">
      <SiteHeader active="graph" />

      <GraphHomeClient works={works} aiFlow={aiFlow} />
    </div>
  );
}
