function firstNonEmpty(
  ...vals: (string | undefined)[]
): string | undefined {
  for (const v of vals) {
    const t = v?.trim();
    if (t) return t;
  }
  return undefined;
}

function normalizeGeminiApiKey(raw: string): string {
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s.replace(/\s+/g, "");
}

export function resolveGeminiApiKey(): string {
  // Bracket access: read at runtime on the server (avoids stale inlining in some bundlers).
  const key = firstNonEmpty(
    process.env["GEMINI_API_KEY"],
    process.env["GOOGLE_API_KEY"],
  );
  if (key) return normalizeGeminiApiKey(key);
  throw new MissingGeminiApiKeyError();
}

export function getGeminiModel(): string {
  return (
    firstNonEmpty(process.env["GEMINI_MODEL"]) ?? "gemini-2.0-flash"
  );
}

export function getPipelineLang(): string {
  return (
    firstNonEmpty(process.env["LACUNA_PIPELINE_LANG"]) ?? "en"
  );
}

export class MissingGeminiApiKeyError extends Error {
  constructor() {
    super(
      "No Gemini API key: set GEMINI_API_KEY (or GOOGLE_API_KEY) in the server environment (e.g. web/.env.local).",
    );
    this.name = "MissingGeminiApiKeyError";
  }
}
