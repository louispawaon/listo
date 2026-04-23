/**
 * .listo file save/load helpers.
 *
 * `.listo` is simply the serialized `ListoDocument` as JSON. We use the
 * `version` field to guard against stale or malformed files.
 */

import type { ListoDocument } from "../../types/listo";

export type LoadResult =
  | { success: true; data: ListoDocument }
  | { success: false; error: string }
  | { success: false; error: "cancelled"; cancelled: true };

function safeBasename(name: string, fallback: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return fallback;
  return trimmed.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_");
}

export function saveListoFile(doc: ListoDocument): void {
  const payload: ListoDocument = { ...doc, savedAt: new Date().toISOString() };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeBasename(doc.meta.name, "Trip")}.listo`;
  anchor.click();
  setTimeout(() => { URL.revokeObjectURL(url); }, 10_000);
}

function isListoDocument(val: unknown): val is ListoDocument {
  if (typeof val !== "object" || val === null) return false;
  const record = val as Record<string, unknown>;
  if (record["version"] !== 1) return false;
  if (typeof record["savedAt"] !== "string") return false;
  if (typeof record["meta"] !== "object" || record["meta"] === null) return false;
  if (!Array.isArray(record["sections"])) return false;
  if (!Array.isArray(record["days"])) return false;
  return true;
}

export async function loadListoFile(): Promise<LoadResult> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".listo,application/json";

    let settled = false;
    const settle = (result: LoadResult): void => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    // If the user dismisses the file picker, `change` never fires. We use
    // the `focus` event (after the picker closes) as a cancellation signal.
    const handleCancel = (): void => {
      window.removeEventListener("focus", handleCancel);
      setTimeout(() => {
        settle({ success: false, error: "cancelled", cancelled: true });
      }, 300);
    };

    input.addEventListener("change", () => {
      window.removeEventListener("focus", handleCancel);
      const file = input.files?.[0];
      if (file === undefined) {
        settle({ success: false, error: "cancelled", cancelled: true });
        return;
      }

      file
        .text()
        .then((text) => {
          try {
            const parsed: unknown = JSON.parse(text);
            if (!isListoDocument(parsed)) {
              settle({
                success: false,
                error: "Not a valid .listo file (unrecognised schema).",
              });
              return;
            }
            settle({ success: true, data: parsed });
          } catch {
            settle({ success: false, error: "Failed to parse .listo file." });
          }
        })
        .catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : "Failed to read file.";
          settle({ success: false, error: msg });
        });
    });

    window.addEventListener("focus", handleCancel);
    input.click();
  });
}
