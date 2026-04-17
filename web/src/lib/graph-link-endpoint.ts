export function linkEndpointId(end: unknown): string {
  if (end != null && typeof end === "object" && "id" in end) {
    const id = (end as { id: unknown }).id;
    if (id !== undefined && id !== null) return String(id);
  }
  return String(end ?? "");
}
