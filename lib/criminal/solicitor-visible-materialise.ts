/**
 * Shared solicitor-visible materialisation helpers (sanitize → boundary → gate).
 * Used by scale-3000 wording review and Phase 11-style renders.
 */
import { createHash } from "node:crypto";
import {
  assertCopyableSolicitorText,
  finalizeSolicitorVisibleProse,
  type SolicitorBoundaryIssue,
} from "@/lib/criminal/solicitor-visible-boundary";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";
import {
  formatBlockedCopyPreview,
  humanBlockReason,
  inferBlockedItemLabel,
  requiresQualifiedSolicitorReviewQueue,
  sanitizeSolicitorProse,
  solicitorVisibleGatedCopy,
} from "@/lib/criminal/solicitor-visible-sanitization";
import { containsAbsoluteProofWording } from "@/lib/criminal/absolute-proof-wording";
import { CANONICAL_MATTER_STATE_VERSION } from "@/lib/criminal/canonical-matter-state";

export const SOLICITOR_MATERIALISE_PIPELINE_VERSION =
  "sanitize+boundary-profile+canonical-evidence-view+charge-model+family-quarantine+compatible-disclosure+safe-provenance+gate@scale3000-run-v9";

export const SOLICITOR_MATERIALISE_SCHEMA_VERSION = CANONICAL_MATTER_STATE_VERSION;

const BOUNDARY_ISSUE_REASON: Record<SolicitorBoundaryIssue, string> = {
  empty: "No solicitor-safe text is available to copy.",
  mid_word_cut: "Text is cut off mid-word and must not be copied until the source wording is corrected.",
  mid_sentence_cut: "Text is cut off mid-sentence and must not be copied until the source wording is corrected.",
  incomplete_disclaimer:
    "The required disclaimer is incomplete and must not be copied until the source wording is corrected.",
  open_bracket:
    "Text has an unclosed bracket (possible truncated or duplicated wording) and must not be copied until corrected.",
  open_quote: "Text has an unclosed quotation and must not be copied until corrected.",
  hard_cap_unsafe: "Text could not be safely trimmed to budget without an unsafe mid-word / mid-disclaimer cut.",
  ellipsis_cut: "Text ends with an ellipsis suggesting an unsafe cut and must not be copied.",
};

function describeBoundaryIssues(issues: SolicitorBoundaryIssue[]): string {
  return issues.map((i) => BOUNDARY_ISSUE_REASON[i] ?? "Wording failed the solicitor-visible boundary check.").join(" ");
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function renderCopyableSolicitorText(input: {
  rawText: string;
  allegation?: string | null;
  bundleHay?: string | null;
  auditFamily?: string | null;
  surfaceId: string;
  mode?: "copy" | "export";
  itemLabel?: string;
  itemIndex?: number;
  queueForQualifiedReview?: boolean;
}): { display: string; canCopy: boolean; gateStatus: string; blockedNotRepaired: boolean } {
  const itemIndex = input.itemIndex ?? 0;

  // Absolute proof / must-not-say phrases must never become affirmative copyable prose
  // (all exits: copy / export / composed).
  if (containsAbsoluteProofWording(input.rawText)) {
    const label = input.itemLabel ?? inferBlockedItemLabel(input.rawText, itemIndex);
    return {
      display: formatBlockedCopyPreview({
        itemLabel: label,
        reason:
          "Absolute or unsafe proof wording (including 'fully proved on current disclosure') is not available for copy or export.",
      }),
      canCopy: false,
      gateStatus: "absolute_proof_blocked",
      blockedNotRepaired: true,
    };
  }

  if (input.queueForQualifiedReview || requiresQualifiedSolicitorReviewQueue(input.rawText)) {
    const label = input.itemLabel ?? inferBlockedItemLabel(input.rawText, itemIndex);
    return {
      display: formatBlockedCopyPreview({
        itemLabel: label,
        reason: humanBlockReason(["qualified_solicitor_review_required"]),
      }),
      canCopy: false,
      gateStatus: "qualified_solicitor_review_queue",
      blockedNotRepaired: true,
    };
  }

  const sanitized = sanitizeSolicitorProse(input.rawText);
  const boundary = finalizeSolicitorVisibleProse(sanitized);
  if (!boundary.ok) {
    const label = input.itemLabel ?? inferBlockedItemLabel(sanitized, itemIndex);
    return {
      display: formatBlockedCopyPreview({ itemLabel: label, reason: describeBoundaryIssues(boundary.issues) }),
      canCopy: false,
      gateStatus: "boundary_blocked",
      blockedNotRepaired: true,
    };
  }

  const asserted = assertCopyableSolicitorText(boundary.text);
  if (!asserted.ok) {
    const label = input.itemLabel ?? inferBlockedItemLabel(boundary.text, itemIndex);
    return {
      display: formatBlockedCopyPreview({
        itemLabel: label,
        reason: describeBoundaryIssues(asserted.issues),
      }),
      canCopy: false,
      gateStatus: "boundary_blocked",
      blockedNotRepaired: true,
    };
  }

  const gated = gateSolicitorOutput({
    surfaceId: input.surfaceId,
    texts: [asserted.text],
    allegation: input.allegation,
    bundleHay: input.bundleHay,
    auditFamily: input.auditFamily,
    mode: input.mode ?? "copy",
    data: { texts: [asserted.text] },
  });

  const wrapped = solicitorVisibleGatedCopy({
    text: asserted.text,
    canCopy: gated.canCopy,
    blockedBanner: gated.banner,
    ruleIds: gated.ruleIds,
    itemLabel: input.itemLabel,
    itemIndex,
  });

  return {
    display: wrapped.display,
    canCopy: wrapped.canCopy,
    gateStatus: wrapped.gateStatus === "ok" ? (gated.status === "ok" ? "ok" : gated.status) : wrapped.gateStatus,
    blockedNotRepaired: !wrapped.canCopy,
  };
}

/** Normalise for template dedupe — strip names/dates/IDs that are legally variable. */
export function normaliseSolicitorTemplate(text: string): string {
  return text
    .replace(/\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b/gi, "<DATE>")
    .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "<DATE>")
    .replace(/\b\d{1,2}:\d{2}\b/g, "<TIME>")
    .replace(/\b[A-Z]{1,2}\d{6,}\b/g, "<URN>")
    .replace(/\bmessy-pdf-[a-z0-9-]+\b/gi, "<CASE_ID>")
    .replace(/\bdemo-audit-\d+[a-z0-9-]*\b/gi, "<SOURCE_ID>")
    .replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g, (m) => {
      // Keep protected acronyms / legal terms
      if (/^(MG\d+|BWV|ABE|PACE|SFR|ANPR|CPS|CCTV|DVLA|YJS|PTPH)$/i.test(m)) return m;
      if (/^(January|February|March|April|May|June|July|August|September|October|November|December)$/i.test(m)) {
        return m;
      }
      return "<NAME>";
    })
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
