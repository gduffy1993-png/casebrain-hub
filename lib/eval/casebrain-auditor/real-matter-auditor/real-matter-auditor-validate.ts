import type { RealMatterLocalManifest } from "./real-matter-auditor-types";

const FORBIDDEN_COMMITTED_PATTERNS = [
  /artifacts\//,
  /\b[a-z]:\\/i,
  /@.*\.(com|co\.uk)/i,
  /\bURN\b/i,
  /\b\d{2}\/\d{2}\/\d{4}\b/,
];

export function validateLocalManifest(raw: unknown): { ok: true; manifest: RealMatterLocalManifest } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { ok: false, errors: ["manifest must be an object"] };
  }
  const m = raw as Record<string, unknown>;

  if (typeof m.localId !== "string" || !/^rm-[a-z0-9-]+$/i.test(m.localId)) {
    errors.push("localId must match rm-xxx pattern");
  }
  if (typeof m.anonymisedLabel !== "string" || !m.anonymisedLabel.trim()) {
    errors.push("anonymisedLabel required");
  }
  if (typeof m.offenceFamily !== "string" || !m.offenceFamily.trim()) {
    errors.push("offenceFamily required");
  }
  if (!["bundle-text", "bundle-pdf", "mixed"].includes(String(m.inputType))) {
    errors.push("inputType must be bundle-text | bundle-pdf | mixed");
  }
  if (!["anonymised", "redacted", "needs_redaction"].includes(String(m.redactionStatus))) {
    errors.push("redactionStatus invalid");
  }
  if (m.neverCommit !== true) {
    errors.push("neverCommit must be true");
  }

  const blob = JSON.stringify({
    localId: m.localId,
    anonymisedLabel: m.anonymisedLabel,
    offenceFamily: m.offenceFamily,
    stage: m.stage,
    knownMissingMaterial: m.knownMissingMaterial,
    knownContradictions: m.knownContradictions,
  });
  for (const re of FORBIDDEN_COMMITTED_PATTERNS) {
    if (re.test(blob)) errors.push(`manifest contains disallowed pattern: ${re}`);
  }

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    manifest: m as unknown as RealMatterLocalManifest,
  };
}

/** Fictional template used in committed tests only. */
export const FICTIONAL_TEMPLATE_MANIFEST: RealMatterLocalManifest = {
  localId: "rm-000-fictional-template",
  anonymisedLabel: "Fictional template — Defendant A",
  offenceFamily: "generic_provisional",
  stage: "Magistrates — first hearing",
  inputType: "bundle-text",
  documentTypesExpected: ["charge_sheet", "mg5"],
  knownMissingMaterial: ["cctv master"],
  knownContradictions: [],
  redactionStatus: "anonymised",
  discoveryNotes: "Committed test fixture only — not a real matter.",
  holdout: false,
  neverCommit: true,
};
