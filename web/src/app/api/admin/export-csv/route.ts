import JSZip from "jszip";
import { NextResponse } from "next/server";

import { ghostWorksToCsv, worksToCsv } from "@/lib/admin-csv-export";
import { getLacunaAiFlow } from "@/lib/lacuna-ai-flow";
import { getWorks } from "@/lib/works";

export const runtime = "nodejs";

export async function GET() {
  const [works, aiFlow] = await Promise.all([getWorks(), getLacunaAiFlow()]);
  const zip = new JSZip();
  zip.file("known-works.csv", worksToCsv(works));
  zip.file("ghost-works.csv", ghostWorksToCsv(aiFlow.ghostWorks));
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="lacuna-csv-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
