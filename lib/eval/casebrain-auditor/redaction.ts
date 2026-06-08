import type { AuditorPackId } from "./types";

const FICTIONAL_PACKS: AuditorPackId[] = ["pilot-3", "family-40", "full-960"];

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const UK_PHONE_RE = /\b(?:\+44\s?|0)\d{10,11}\b/g;
const UK_POSTCODE_RE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/gi;
const URN_RE = /\b(?:URN|CPS|NS-CPS|CB-[A-Z0-9-]+|case ref)[:\s]*[A-Z0-9-]{6,}\b/gi;
const DOB_RE = /\b(?:DOB|born)\s*[:.]?\s*\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/gi;
const LONG_ID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

export type RedactionResult = {
  text: string;
  redactionStatus: "clean" | "needs_review" | "fictional_allowed";
  flags: string[];
};

export function isFictionalEvalPack(pack: AuditorPackId): boolean {
  return FICTIONAL_PACKS.includes(pack);
}

export function redactForTraining(text: string, pack: AuditorPackId): RedactionResult {
  const flags: string[] = [];
  let out = text.slice(0, 300);

  const checks: Array<{ re: RegExp; flag: string }> = [
    { re: EMAIL_RE, flag: "email" },
    { re: UK_PHONE_RE, flag: "uk_phone" },
    { re: UK_POSTCODE_RE, flag: "uk_postcode" },
    { re: URN_RE, flag: "urn_or_case_ref" },
    { re: DOB_RE, flag: "dob_like" },
    { re: LONG_ID_RE, flag: "uuid" },
  ];

  for (const { re, flag } of checks) {
    if (re.test(out)) {
      flags.push(flag);
      out = out.replace(re, `[REDACTED_${flag.toUpperCase()}]`);
      re.lastIndex = 0;
    }
  }

  if (/\bR v\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(out) && !isFictionalEvalPack(pack)) {
    flags.push("defendant_name_pattern");
    out = out.replace(/\bR v\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, "R v [REDACTED_DEFENDANT]");
  }

  if (flags.length === 0) {
    return {
      text: out,
      redactionStatus: isFictionalEvalPack(pack) ? "fictional_allowed" : "clean",
      flags: [],
    };
  }

  return {
    text: out,
    redactionStatus: isFictionalEvalPack(pack) ? "fictional_allowed" : "needs_review",
    flags,
  };
}
