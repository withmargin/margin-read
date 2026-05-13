export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
