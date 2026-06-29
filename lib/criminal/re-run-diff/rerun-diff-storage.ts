import { lintEvidenceChangeOutput } from "@/lib/criminal/evidence-change-detector/evidence-change-sanitize";
import type { RerunDiffSnapshot } from "./rerun-diff-types";
import { RERUN_DIFF_STORAGE_PREFIX } from "./rerun-diff-types";

export function rerunDiffStorageKey(caseId: string): string {
  return `${RERUN_DIFF_STORAGE_PREFIX}${caseId}`;
}

export function loadRerunDiffSnapshot(caseId: string): RerunDiffSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(rerunDiffStorageKey(caseId));
    if (!raw) return null;
    if (lintEvidenceChangeOutput(raw).length) return null;
    const parsed = JSON.parse(raw) as RerunDiffSnapshot;
    if (parsed?.schemaVersion !== "rerun-diff-v1") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveRerunDiffSnapshot(caseId: string, snapshot: RerunDiffSnapshot): boolean {
  if (typeof window === "undefined") return false;
  const blob = JSON.stringify(snapshot);
  if (lintEvidenceChangeOutput(blob).length) return false;
  try {
    window.localStorage.setItem(rerunDiffStorageKey(caseId), blob);
    return true;
  } catch {
    return false;
  }
}
