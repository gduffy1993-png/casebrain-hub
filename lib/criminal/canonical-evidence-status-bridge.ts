import type { AuthenticatedMatterCanonicalPayload } from "@/lib/criminal/authenticated-matter-canonical";
import type { CanonicalEvidenceState } from "@/lib/criminal/evidence-state-canonical";

export type BuilderMissingMaterial = { label: string; status: string };

export function canonicalEvidenceStatusForBuilder(
  existence: string | null | undefined,
): BuilderMissingMaterial["status"] {
  switch (existence) {
    case "missing":
      return "MISSING";
    case "incomplete":
    case "referred_only":
    case "not_safely_confirmed":
      return "UNASSESSED";
    case "served":
      return "SERVED";
    default:
      return "UNASSESSED";
  }
}

export function canonicalRowsForBuilder(
  canonical: AuthenticatedMatterCanonicalPayload | null | undefined,
): BuilderMissingMaterial[] {
  const rows: BuilderMissingMaterial[] = [];
  const seen = new Set<string>();
  const push = (label: string | null | undefined, status: string) => {
    const clean = label?.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ label: clean, status });
  };

  for (const row of canonical?.evidenceRows ?? []) {
    push(row.label, canonicalEvidenceStatusForBuilder(row.existence));
  }
  for (const label of canonical?.chaseLabels ?? []) {
    push(label, "MISSING");
  }

  return rows.filter((row) => row.status !== "SERVED");
}

export function canonicalEvidenceStateRowsForBuilder(
  evidenceState: CanonicalEvidenceState | null | undefined,
): BuilderMissingMaterial[] {
  const rows: BuilderMissingMaterial[] = [];
  const seen = new Set<string>();
  const push = (label: string | null | undefined, status: string) => {
    const clean = label?.trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ label: clean, status });
  };

  for (const item of evidenceState?.items ?? []) {
    push(item.label, canonicalEvidenceStatusForBuilder(item.state));
  }
  for (const request of evidenceState?.chaseRequests ?? []) {
    push(request.label, canonicalEvidenceStatusForBuilder(request.state));
  }

  return rows.filter((row) => row.status !== "SERVED");
}
