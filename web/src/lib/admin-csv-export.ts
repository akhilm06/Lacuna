import type { GhostWork } from "@/lib/lacuna-ai-flow-model";
import type { Work } from "@/lib/works";

function csvCell(value: string): string {
  const s = value.replace(/\r\n/g, "\n");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(",");
}

export function worksToCsv(works: Work[]): string {
  const header = csvRow([
    "id",
    "title",
    "author",
    "createdAt",
    "excerptCount",
  ]);
  const lines = [header];
  for (const w of works) {
    lines.push(
      csvRow([
        w.id,
        w.title,
        w.author,
        w.createdAt,
        String(w.excerpts.length),
      ]),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}

export function ghostWorksToCsv(ghosts: GhostWork[]): string {
  const header = csvRow([
    "id",
    "ghostKind",
    "title",
    "author",
    "briefOverview",
    "whatIsKnown",
    "evidenceJson",
  ]);
  const lines = [header];
  for (const g of ghosts) {
    lines.push(
      csvRow([
        g.id,
        g.ghostKind,
        g.title,
        g.author ?? "",
        g.briefOverview ?? "",
        g.whatIsKnown ?? "",
        JSON.stringify(g.evidence),
      ]),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
