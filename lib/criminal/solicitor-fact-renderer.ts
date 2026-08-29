/**
 * One renderer for solicitor fact slots.
 * Unknown slots become "Not confirmed on the file." — never a guessed charge or family.
 */

import type { SolicitorFactRecord, SolicitorFactSlot } from "@/lib/criminal/solicitor-fact-record";

export const NOT_CONFIRMED_ON_FILE = "Not confirmed on the file.";

export type RenderedSolicitorFacts = {
  chargeLine: string;
  familyLine: string;
  hearingLine: string;
  evidenceCountsLine: string;
  chaseLine: string;
  mg11Line: string;
  displayLines: string[];
  chatFactSheet: string;
};

function lineFor(label: string, slot: SolicitorFactSlot): string {
  if (slot.status !== "confirmed" || !slot.value) {
    return `${label}: ${NOT_CONFIRMED_ON_FILE}`;
  }
  return `${label}: ${slot.value}`;
}

function formatConfirmedCounts(
  parts: Array<{ n: SolicitorFactSlot; label: string }>,
): string | null {
  const shown = parts.filter((p) => p.n.status === "confirmed" && p.n.value && p.n.value !== "0");
  if (!shown.length) return null;
  return shown.map((p) => `${p.n.value} ${p.label}`).join(" · ");
}

export function renderSolicitorFacts(record: SolicitorFactRecord): RenderedSolicitorFacts {
  const s = record.slots;
  const chargeLine = lineFor("Charge", s.charge);
  const familyLine = lineFor("Offence family", s.family);
  const hearingLine = lineFor("Hearing", s.hearing);
  const mg11Line = lineFor("MG11", s.mg11);

  const countsJoined = formatConfirmedCounts([
    { n: s.evidenceServed, label: "served" },
    { n: s.evidenceReferred, label: "referred" },
    { n: s.evidenceMissing, label: "missing" },
    { n: s.evidenceIncomplete, label: "incomplete" },
    { n: s.evidenceNotSafelyConfirmed, label: "not safely confirmed" },
  ]);
  const evidenceCountsLine = countsJoined
    ? `Evidence: ${countsJoined}`
    : s.evidenceServed.status === "unknown"
      ? `Evidence: ${NOT_CONFIRMED_ON_FILE}`
      : "Evidence: No evidence states listed.";

  const chaseJoined = formatConfirmedCounts([
    { n: s.chaseTotal, label: "chase items" },
    { n: s.chaseOverdue, label: "overdue" },
  ]);
  const chaseLine = chaseJoined
    ? `Chase: ${chaseJoined}`
    : s.chaseTotal.status === "unknown"
      ? `Chase: ${NOT_CONFIRMED_ON_FILE}`
      : "Chase: No chase items listed.";

  const displayLines = [chargeLine, familyLine, hearingLine, evidenceCountsLine, chaseLine, mg11Line];

  return {
    chargeLine,
    familyLine,
    hearingLine,
    evidenceCountsLine,
    chaseLine,
    mg11Line,
    displayLines,
    chatFactSheet: [
      "SOLICITOR FACT RECORD — only these facts may be asserted. Anything else is not confirmed on the file.",
      ...displayLines,
      record.fingerprint ? `Fingerprint: ${record.fingerprint}` : "Fingerprint: not available.",
    ].join("\n"),
  };
}

const WRONG_FAMILY_WHEN_UNKNOWN: Array<{ re: RegExp; label: string }> = [
  { re: /\bpwits\b|intent to supply|supply of (?:a )?controlled drug/i, label: "drugs supply / PWITS" },
  { re: /\bpossession of (?:a )?controlled drug\b|\bdrug continuity\b/i, label: "drugs possession" },
  { re: /\bdefensive force\b|\bself[-\s]?defence\b|\breasonable force\b/i, label: "defensive force / self-defence" },
  { re: /\bvehicle ownership\b/i, label: "vehicle ownership" },
];

/**
 * True when `text` asserts a family concept the record has not confirmed.
 * Used as a last-line lint — not a replacement for the existing integrity gate.
 */
export function solicitorTextAssertsUnconfirmedFamily(text: string, record: SolicitorFactRecord): string[] {
  if (record.slots.family.status === "confirmed") return [];
  return WRONG_FAMILY_WHEN_UNKNOWN.filter((w) => w.re.test(text)).map((w) => w.label);
}
