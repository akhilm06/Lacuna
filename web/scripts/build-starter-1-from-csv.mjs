/**
 * Reads data/starter-1-source.csv → data/works.starter.json
 * Run from web/: node scripts/build-starter-1-from-csv.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n" || c === "\r") {
        if (c === "\r" && next === "\n") i++;
        row.push(field);
        if (row.some((x) => x.length)) rows.push(row);
        row = [];
        field = "";
      } else {
        field += c;
      }
    }
  }
  row.push(field);
  if (row.some((x) => x.length)) rows.push(row);
  return rows;
}

const EXCERPT_IDS = [
  "s1-ex-cic-div",
  "s1-ex-plut-cons",
  "s1-ex-simp-de-an",
  "s1-ex-iamb-prot",
  "s1-ex-cic-hort",
  "s1-ex-dl-lives",
  "s1-ex-aelian-var",
  "s1-ex-quint-inst",
];

function workId(i) {
  const tail = String(i).padStart(3, "0");
  return `a100000${i}-000${i}-4000-8000-000000000${tail}`;
}

const raw = fs.readFileSync(path.join(root, "data/starter-1-source.csv"), "utf8");
const table = parseCSV(raw);
const header = table[0].map((h) => h.trim().toLowerCase());
if (header[0] !== "title" || header[1] !== "author") {
  console.error("Unexpected CSV header", table[0]);
  process.exit(1);
}

const dataRows = table.slice(1).filter((r) => r.length >= 3);
const baseMs = Date.parse("2026-04-18T12:00:00.000Z");
const works = dataRows.map((r, idx) => {
  const i = idx + 1;
  const title = r[0].trim();
  const author = r[1].trim();
  const text = r[2].trim();
  return {
    id: workId(i),
    title,
    author,
    createdAt: new Date(baseMs + (i - 1) * 1000).toISOString(),
    excerpts: [{ id: EXCERPT_IDS[idx] ?? `s1-ex-${i}`, text }],
  };
});

const out = path.join(root, "data/works.starter.json");
fs.writeFileSync(out, `${JSON.stringify(works, null, 2)}\n`, "utf8");
console.log("Wrote", out, "works:", works.length);
