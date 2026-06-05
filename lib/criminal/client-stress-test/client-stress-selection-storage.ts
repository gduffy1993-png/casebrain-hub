import type { ClientAccountOption, ClientStressInput } from "./client-stress-types";
import { CLIENT_STRESS_SELECTION_STORAGE_PREFIX } from "./client-stress-types";
import { sanitizeClientStressNote } from "./client-stress-sanitize";

export type StoredClientStressSelection = {
  selectedOptions: ClientAccountOption[];
  otherNote: string | null;
  updatedAt: string;
};

export function selectionStorageKey(caseId: string): string {
  return `${CLIENT_STRESS_SELECTION_STORAGE_PREFIX}${caseId}`;
}

export function loadClientStressSelection(caseId: string): ClientStressInput | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(selectionStorageKey(caseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredClientStressSelection;
    if (!Array.isArray(parsed.selectedOptions)) return null;
    return {
      selectedOptions: parsed.selectedOptions,
      otherNote: sanitizeClientStressNote(parsed.otherNote),
    };
  } catch {
    return null;
  }
}

export function saveClientStressSelection(caseId: string, input: ClientStressInput): void {
  if (typeof window === "undefined") return;
  const payload: StoredClientStressSelection = {
    selectedOptions: input.selectedOptions,
    otherNote: sanitizeClientStressNote(input.otherNote),
    updatedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(selectionStorageKey(caseId), JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function selectionBlobContainsForbiddenContent(blob: string): boolean {
  const lower = blob.toLowerCase();
  if (lower.includes("artifacts/")) return true;
  if (/\b[a-z]:\\/.test(blob)) return true;
  if (lower.includes("=== section:")) return true;
  if (lower.includes("frontmatterscan")) return true;
  return false;
}
