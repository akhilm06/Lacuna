export function whatIsKnownBulletLines(text: string): string[] {
  const raw = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const cleaned = raw.map((l) =>
    l
      .replace(/^\d+\.\s*/, "")
      .replace(/^[-*•]\s+/, "")
      .trim(),
  );
  const out = cleaned.filter(Boolean);
  if (out.length > 0) return out;
  const single = text.trim();
  return single ? [single] : [];
}
