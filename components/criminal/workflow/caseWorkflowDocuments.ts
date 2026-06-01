import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

export type CaseWorkflowDocument = {
  id: string;
  name: string;
  created_at: string;
  type?: string | null;
  extractionStatus?: "full" | "summary_only" | "no_text";
  extractionMessage?: string;
};

/** Map snapshot evidence rows for workflow Documents panel / compact strip. */
export function mapSnapshotToWorkflowDocuments(
  snapshot: CaseSnapshot | null | undefined,
): CaseWorkflowDocument[] {
  const rows = snapshot?.evidence?.documents ?? [];
  return rows.map((d) => {
    const hasText = d.extractionStatus === "full" || (d.extractionCharCount ?? 0) > 50;
    return {
      id: d.id,
      name: d.name,
      created_at: d.createdAt,
      type: d.type ?? null,
      extractionStatus: d.extractionStatus ?? (hasText ? "full" : "no_text"),
      extractionMessage:
        d.extractionMessage ??
        (hasText ? undefined : "This file may be image-only; we couldn't extract text."),
      extractionCharCount: d.extractionCharCount,
    };
  });
}
