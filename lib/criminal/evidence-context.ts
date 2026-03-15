/**
 * Phase 5.2: Build a short evidence/disclosure context string for evidence-aware chat.
 * Used by Defence Plan chat so the model knows what evidence the case has and what's missing.
 */

import type { CaseSnapshot } from "./case-snapshot-adapter";

/**
 * Returns a plain-text summary of evidence and disclosure for this case (for chat context).
 * Puts Safety panel missing items FIRST with an explicit "use ONLY these" rule so the model
 * does not fall back to generic disclosure (Charge Sheet, Witness Statements, etc.).
 */
export function buildEvidenceContext(
  snapshot: CaseSnapshot | null | undefined,
  outstandingItems?: string[] | null
): string {
  const parts: string[] = [];

  // 1) Safety panel missing items FIRST – authoritative list for chat (no generic fallbacks)
  if (outstandingItems?.length) {
    parts.push(
      `MISSING DISCLOSURE ITEMS (use ONLY these in answers – do not refer to Charge Sheet, Witness Statements, Key Documentary Evidence, or any item not in this list): ${outstandingItems.join("; ")}.`
    );
  }

  if (!snapshot?.evidence) {
    return parts.join(" ");
  }

  const { documents, disclosureItems, disclosureTimeline, missingEvidence } = snapshot.evidence;

  if (documents?.length) {
    parts.push(
      `Documents in case: ${documents.map((d) => d.name || d.id).join("; ")}.`
    );
  }

  if (disclosureItems?.length) {
    const received = disclosureItems.filter((i) => i.status === "Received");
    const outstanding = disclosureItems.filter((i) => i.status === "Outstanding" || i.status === "Partial");
    if (received.length) parts.push(`Disclosure received: ${received.map((i) => i.item).join("; ")}.`);
    if (outstanding.length && !outstandingItems?.length) parts.push(`Disclosure outstanding: ${outstanding.map((i) => i.item).join("; ")}.`);
  }

  if (disclosureTimeline?.length) {
    const recent = disclosureTimeline.slice(0, 5).map((e) => `${e.item} – ${e.action} ${e.date ?? ""}`.trim());
    parts.push(`Timeline: ${recent.join("; ")}.`);
  }

  if (missingEvidence?.length && !outstandingItems?.length) {
    const critical = missingEvidence.filter((m) => m.priority === "CRITICAL" || m.priority === "HIGH");
    if (critical.length) {
      parts.push(`Missing / critical: ${critical.map((m) => m.label).join("; ")}.`);
    }
  }

  return parts.join(" ");
}

/**
 * Phase 5.3: Build a short timeline context (key dates, next hearing, disclosure events) for chat.
 */
export function buildTimelineContext(snapshot: CaseSnapshot | null | undefined): string {
  if (!snapshot) return "";

  const parts: string[] = [];

  if (snapshot.caseMeta?.hearingNextAt) {
    const type = snapshot.caseMeta.hearingNextType ?? "Hearing";
    const date = new Date(snapshot.caseMeta.hearingNextAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    parts.push(`Next hearing: ${type} ${date}.`);
  }

  if (snapshot.evidence?.disclosureTimeline?.length) {
    const entries = snapshot.evidence.disclosureTimeline
      .slice(0, 8)
      .map((e) => (e.date ? `${e.item} – ${e.action} (${e.date})` : `${e.item} – ${e.action}`));
    parts.push(`Disclosure timeline: ${entries.join("; ")}.`);
  }

  return parts.join(" ");
}
