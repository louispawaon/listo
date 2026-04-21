/** Build a safe single-segment basename for `download` attributes (no path separators). */
export function safeDownloadBasename(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return fallback;
  }
  const noSpace = trimmed.replace(/\s+/g, "_");
  const noIllegal = noSpace.replace(/[/\\?%*:|"<>]/g, "_");
  return noIllegal.length > 0 ? noIllegal.slice(0, 180) : fallback;
}
