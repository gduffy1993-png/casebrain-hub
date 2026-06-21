/**
 * Module 7 — client-safe explanation (plain-English packaging for Section 6).
 * Packages contradiction stack into solicitor/client call language — no new facts.
 */

import type { BundleContradiction } from "./extract-bundle-contradictions";
import { stripReqAndInternalCodes } from "@/components/criminal/workflow/matterBriefAssembly";

const FORBIDDEN_RE =
  /\b(this wins|case collapses|crowns?\s+will\s+lose|guaranteed|will\s+be\s+acquitted|plead\s+guilty|plead\s+not\s+guilty|REQ-[A-Z0-9-]+)\b/i;

export type ClientSafeExplanationInput = {
  clientLabel?: string | null;
  allegation?: string | null;
  contradictions?: BundleContradiction[] | null;
  hasOutstandingDisclosure?: boolean;
  fallback?: string | null;
};

function clientFirstName(label: string | null | undefined): string | null {
  const t = label?.trim();
  if (!t) return null;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1] ?? parts[0] ?? null;
}

function plainEnglishForContradiction(c: BundleContradiction): string | null {
  switch (c.type) {
    case "location":
      return "The papers describe the incident happening in different places, and that still needs to be checked against the full bundle.";
    case "first_contact":
      return "There is disagreement in the papers about who approached whom or who acted first.";
    case "loss_figure":
      return "The loss figures in the papers do not fully match yet, and we need the accounting material before that is clear.";
    case "cctv_window":
      return "CCTV on the papers may not cover the whole period the charge refers to — we are still chasing the full footage.";
    case "sequence_order":
      return "The order of events is described differently between witnesses and the prosecution summary.";
    case "sequence_timeline":
      return "The charge covers a longer period than the dates shown on the CCTV papers so far.";
    case "scope_multi_vs_single":
      return "The charge may refer to more than one incident, while the summary reads like a single episode.";
    case "scope_indictment_count":
      return "There are multiple counts on the charge sheet, but the summary may only describe one incident.";
    case "strength_serious_vs_minor":
      return "The injury described in the papers may be more serious in one document than in the medical or witness account.";
    case "strength_force_vs_cctv":
      return "What the witness describes does not fully match what the CCTV clip shows about contact or force.";
    case "multi_incident_dates":
      return "More than one date is mentioned on the charge, but the summary may only describe one incident.";
    case "multi_incident_complainants":
      return "More than one complainant is mentioned, but the served statements may only cover one person.";
    case "triangulation_mg11_cctv":
      return "What the witness says happened does not fully match what the CCTV served so far appears to show.";
    case "triangulation_dispatch_scene":
      return "The initial police call record sounds less serious than what the witness statements describe.";
    case "triangulation_bwv_account":
      return "The officer's body-worn video notes do not fully match the complainant's account of injury.";
    default:
      return null;
  }
}

function sanitizeClientText(text: string): string {
  let out = stripReqAndInternalCodes(text);
  out = out.replace(FORBIDDEN_RE, "").replace(/\s{2,}/g, " ").trim();
  return out;
}

/** Build client-safe explanation paragraph — provisional, no plea advice, no internal codes. */
export function buildClientSafeExplanation(input: ClientSafeExplanationInput): string {
  const name = clientFirstName(input.clientLabel);
  const allegation = input.allegation?.trim();
  const contra = input.contradictions ?? [];
  const plainLines = contra
    .map(plainEnglishForContradiction)
    .filter((line): line is string => Boolean(line?.trim()));
  const uniquePlain = [...new Set(plainLines)].slice(0, 2);

  const parts: string[] = [];

  if (name && allegation) {
    parts.push(
      `We are reviewing the papers in your case (${allegation}). This is early-stage — nothing is final until we have full disclosure and your instructions.`,
    );
  } else if (name) {
    parts.push(
      "We are still reviewing the papers in your case. This is early-stage — nothing is final until we have full disclosure and your instructions.",
    );
  } else {
    parts.push(
      "We are still reviewing the papers. This is early-stage — nothing is final until we have full disclosure and your instructions.",
    );
  }

  if (uniquePlain.length > 0) {
    parts.push(uniquePlain.join(" "));
  }

  if (input.hasOutstandingDisclosure) {
    parts.push("Some evidence is still outstanding on the papers, and we will update you when it is served.");
  }

  parts.push("We are not saying the case is won or lost — we need the full material before giving firm advice.");

  const assembled = sanitizeClientText(parts.join(" "));
  if (assembled.length >= 80) return assembled;

  const fallback = sanitizeClientText(input.fallback?.trim() ?? "");
  if (fallback.length >= 40) return fallback;

  return sanitizeClientText(
    "We are still reviewing the papers. Your position remains provisional pending disclosure and your instructions.",
  );
}
