/**
 * Parametric fictional bundles for demo-audit cases 31–70 (v9 new criminal families).
 * PDF-facing text only — no synthetic/simulator wording.
 */
import type { EvidenceStateTruthKey, TruthEvidenceState } from "@/lib/eval/evidence-state-audit/types";

export type V9BundleSpec = {
  caseId: string;
  title: string;
  defendant: string;
  urn: string;
  court: string;
  officer: string;
  offenceLine: string;
  particulars: string;
  offenceFamily: string;
  familyTheme: string;
  mg5Summary: string;
  servedOnFile: string[];
  outstanding: string[];
  mg6Lines: string[];
  mg11Body: string;
  custodyBody: string;
  listingLine: string;
  indexNotes?: string;
  extraEvidenceItems?: Array<{
    evidence_item: string;
    evidence_type: string;
    correct_evidence_state: TruthEvidenceState;
    chase_needed: boolean;
    safe_to_rely_on: boolean;
  }>;
  expectedChaseItems?: string[];
};

function mg6Block(lines: string[]): string {
  return lines.map((l, i) => `MG6C/${String(i + 1).padStart(3, "0")} — ${l}`).join("\n");
}

export function buildV9CriminalBundle(p: V9BundleSpec): string {
  const indexExtra = p.indexNotes ? `\n${p.indexNotes}` : "";
  return `RESTRICTED — PROSECUTION DISCLOSURE BUNDLE

URN: ${p.urn}
Defendant: ${p.defendant}
Court: ${p.court}

=== SECTION: COVER_INDEX ===

INDEX

Document | Pages | Note
Charge sheet | 1 |
MG5 case summary | 2-3 |
MG6C disclosure schedule | 4 |
MG11 / witness statement (draft unsigned) | 5-6 |
Custody / procedural extract | 7 |
Court listing | 8 |${indexExtra}

=== SECTION: CHARGE ===

R v ${p.defendant}

Statement of Offence:
${p.offenceLine}

Particulars of Offence:
${p.particulars}

=== SECTION: MG5 ===

MG05 — OFFENCE REPORT

URN: ${p.urn}
Officer in case: ${p.officer}
Family theme: ${p.familyTheme}

Headline Summary
${p.mg5Summary}

Evidence on file (served)
${p.servedOnFile.map((s) => `- ${s}`).join("\n")}

Evidence referred or outstanding
${p.outstanding.map((s) => `- ${s}`).join("\n")}

=== SECTION: MG6 ===

MG6C — UNUSED MATERIAL SCHEDULE

${mg6Block(p.mg6Lines)}

=== SECTION: MG11 ===

MG11 — WITNESS / COMPLAINANT STATEMENT (draft unsigned)

${p.mg11Body}

Statement not yet signed — final MG11 outstanding where noted on MG6C.

=== SECTION: CUSTODY ===

CUSTODY / PROCEDURAL EXTRACT — ${p.defendant}

${p.custodyBody}

=== SECTION: LISTING ===

${p.listingLine}
`;
}

export function buildV9TruthKey(p: V9BundleSpec): EvidenceStateTruthKey {
  const base = [
    { evidence_item: "charge sheet", evidence_type: "charge", correct_evidence_state: "served" as const, chase_needed: false, safe_to_rely_on: true },
    { evidence_item: "mg5", evidence_type: "mg5", correct_evidence_state: "served" as const, chase_needed: false, safe_to_rely_on: true },
    { evidence_item: "mg6", evidence_type: "mg6", correct_evidence_state: "served" as const, chase_needed: false, safe_to_rely_on: true },
    { evidence_item: "witness MG11", evidence_type: "mg11", correct_evidence_state: "incomplete" as const, chase_needed: true, safe_to_rely_on: false },
    { evidence_item: "custody extract", evidence_type: "custody", correct_evidence_state: "incomplete" as const, chase_needed: true, safe_to_rely_on: false },
  ];
  const extras =
    p.extraEvidenceItems ??
    p.outstanding.map((item) => ({
      evidence_item: item.toLowerCase(),
      evidence_type: "disclosure",
      correct_evidence_state: "missing" as const,
      chase_needed: true,
      safe_to_rely_on: false,
    }));
  const merged = [...base, ...extras];
  const deduped = merged.filter(
    (item, idx, arr) => arr.findIndex((x) => x.evidence_item.toLowerCase() === item.evidence_item.toLowerCase()) === idx,
  );
  return {
    caseId: p.caseId,
    title: p.title,
    offenceFamily: p.offenceFamily,
    offenceWording: p.offenceLine,
    profile: "needs_review",
    bundleStatus: "pdf_backed_demo",
    proofChainMode: "pdf_backed_controlled",
    evidenceItems: deduped,
    expectedChaseItems: p.expectedChaseItems ?? p.outstanding.map((s) => s.toLowerCase()),
    expectedSendability: "provisional_check_source",
    mustNotSayGlobal: ["fully proved on current disclosure", "safely confirms guilt"],
    blockingFailPatterns: ["proves guilt on file"],
  };
}
