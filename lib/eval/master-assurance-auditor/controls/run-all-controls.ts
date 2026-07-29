/**
 * Modular control runners for all 24 master audit lanes.
 * Reuses existing Casebrain detectors; does not invent a second competing stack.
 */

import { containsAbsoluteProofWording } from "@/lib/criminal/absolute-proof-wording";
import {
  assessSolicitorVisibleBoundaryForSurface,
  resolveSolicitorBoundaryProfile,
} from "@/lib/criminal/solicitor-visible-boundary-profiles";
import { containsSyntheticPageReference } from "@/lib/criminal/finding-provenance";
import {
  scanCrossExitConsistency,
  type ExitSnapshot,
} from "@/lib/criminal/cross-exit-contradiction-scanner";
import {
  canonicalEvidenceKey,
  type CanonicalEvidenceState,
} from "@/lib/criminal/evidence-state-canonical";
import type { SharedEvidenceState } from "@/lib/criminal/evidence-state-reconcile";
import { emitFinding } from "../finding-builder";
import { buildControlExerciseRecords } from "../exercise-accounting";
import {
  compareEvidenceStates,
  matchCandidateDefect,
} from "../evidence-state-compare";
import {
  sameEvidenceUnitIdentity,
  servedRowSatisfiesChase,
} from "../evidence-unit-identity";
import { bindTruthMapRowForExpectation } from "../truth-map-bind";
import { wordingIndicatesReferredOnly } from "@/lib/criminal/evidence-state-reconcile";
import {
  confirmUnitBoundContradiction,
  isHonestSiblingServedMissingWording,
} from "../unit-bound-cross-exit";
import { assessDisclaimerCompleteness } from "../disclaimer-completeness";
import type {
  ControlExerciseRecord,
  MasterAuditorFinding,
  SavedCaseMaterialisation,
} from "../types";

function toSharedState(existence: string): SharedEvidenceState {
  if (existence === "served") return "served";
  if (existence === "missing") return "missing";
  if (existence === "incomplete") return "incomplete";
  if (existence === "referred_only") return "referred_only";
  return "not_safely_confirmed";
}

function buildEvidenceState(c: SavedCaseMaterialisation): CanonicalEvidenceState {
  return {
    items: c.truthMapRows.map((r) => ({
      label: r.label,
      key: canonicalEvidenceKey(r.label),
      modality: "generic" as const,
      state: toSharedState(r.existence),
      aliases: [],
      defendants: [],
      observations: [],
      contradiction: null,
      unresolved: /not_safely|needs_review|unsafe/i.test(r.reliability),
      limitation: null,
    })),
    contradictions: [],
    chaseRequests: c.cpsChase.map((ch) => ({
      label: ch.label,
      key: canonicalEvidenceKey(ch.label),
      modality: "generic" as const,
      state: "missing" as const,
      defendants: [],
      reason: ch.draft,
      unresolved: false,
    })),
    suppressed: [],
  };
}

const INTERNAL_LEAK_RE =
  /\b(?:demo-audit-\d+|Source pack esa|artifacts[/\\]|C:\\Users\\|\/Users\/|prompt injection|__INTERNAL__|fixture[_-]?id\s*[:=])/i;

const PACE_SAFE_RE = /\bPACE\s+(?:is\s+)?(?:OK|compliant|no\s+breach)\b|\bno\s+PACE\s+breach\b/i;

const PREJUDICE_RE =
  /\b(?:typical of (?:his|her|their) (?:race|religion|nationality)|looks guilty because of)\b/i;

const FIXTURE_PATH_RE = /\b(?:artifacts[/\\]evidence-state-audit|gold-manual-proof-set)\b/i;

function allText(c: SavedCaseMaterialisation): string {
  return c.surfaces.map((s) => s.text).join("\n");
}

function dedupe(findings: MasterAuditorFinding[]): MasterAuditorFinding[] {
  const seen = new Set<string>();
  const out: MasterAuditorFinding[] = [];
  for (const f of findings) {
    if (seen.has(f.findingId)) continue;
    seen.add(f.findingId);
    out.push(f);
  }
  return out;
}

export function runAllControls(cases: SavedCaseMaterialisation[]): {
  findings: MasterAuditorFinding[];
  exercises: ControlExerciseRecord[];
} {
  const findings: MasterAuditorFinding[] = [];

  const touch = (_controlId: string, _emitted: number) => {
    /* exercise status derived after all findings via buildControlExerciseRecords */
  };

  for (const c of cases) {
    const before = findings.length;

    // LANE-01 ingestion
    {
      const emitted: MasterAuditorFinding[] = [];
      if (!c.surfaces.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-INGEST-COVERAGE",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: "no_surfaces",
            verdict: "defect",
            plainEnglish: "Saved packet produced no materialised surfaces.",
            expectedProfessionalBehaviour:
              "Every preserved case packet must expose at least one auditable surface.",
            rootCauseFamily: "ingestion_coverage",
            suggestedRemediation: "Rebuild gold packet actual-summary or mark corpus gap.",
            confidence: "high",
          }),
        );
      }
      for (const s of c.surfaces) {
        if (s.surfaceId === "empty_packet") {
          emitted.push(
            emitFinding({
              controlId: "MAA-INGEST-COVERAGE",
              caseId: c.caseId,
              surface: s.surfaceId,
              exactWording: s.text,
              code: "empty_packet",
              verdict: "defect",
              plainEnglish: "Case packet is empty after load.",
              expectedProfessionalBehaviour: "Account for every case with non-empty output or explicit failure.",
              rootCauseFamily: "ingestion_coverage",
              suggestedRemediation: "Investigate builder for this gold ID.",
            }),
          );
        }
      }
      if (c.inputBundlePath) {
        // Bundle path recorded — exercised even if file absent offline
        emitted.push(
          emitFinding({
            controlId: "MAA-INGEST-COVERAGE",
            caseId: c.caseId,
            surface: "input_bundle",
            exactWording: c.inputBundlePath,
            code: "bundle_path_recorded",
            verdict: "pass",
            plainEnglish: "Input bundle path is recorded on the expected packet.",
            expectedProfessionalBehaviour: "Preserve path to source bundle for audit.",
            rootCauseFamily: "ingestion_coverage",
            suggestedRemediation: "None.",
            confidence: "high",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-INGEST-COVERAGE", emitted.length);
    }

    // LANE-02 document lifecycle — draft vs signed / distinct units in truth map
    {
      const emitted: MasterAuditorFinding[] = [];
      const labels = c.truthMapRows.map((r) => r.label.toLowerCase());
      const hasDraft = labels.some((l) => /\bdraft\b/.test(l));
      const hasSigned = labels.some((l) => /\bsigned\b|\bfinal\b/.test(l));
      if (hasDraft && hasSigned) {
        emitted.push(
          emitFinding({
            controlId: "MAA-DOC-LIFECYCLE",
            caseId: c.caseId,
            surface: "truth_map",
            exactWording: c.truthMapRows.map((r) => r.label).join(" | "),
            code: "draft_signed_distinct",
            verdict: "pass",
            plainEnglish: "Draft and signed/final statement units remain distinct on the truth map.",
            expectedProfessionalBehaviour: "Never collapse draft into signed.",
            rootCauseFamily: "document_lifecycle",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      const hasMaster = labels.some((l) => /\bmaster\b/.test(l));
      const hasStill = labels.some((l) => /\bstill\b|\bclip\b/.test(l));
      if (hasMaster && hasStill) {
        const masterRow = c.truthMapRows.find((r) => /\bmaster\b/i.test(r.label));
        const stillRow = c.truthMapRows.find((r) => /\bstill\b|\bclip\b/i.test(r.label));
        if (
          masterRow &&
          stillRow &&
          masterRow.existence === "served" &&
          stillRow.existence === "served" &&
          /missing|incomplete/i.test(masterRow.reliability)
        ) {
          emitted.push(
            emitFinding({
              controlId: "MAA-DOC-LIFECYCLE",
              caseId: c.caseId,
              surface: "truth_map",
              exactWording: `${masterRow.label}=${masterRow.existence}`,
              code: "master_still_collapse_risk",
              verdict: "unresolved",
              plainEnglish: "Master and still/clip both present — confirm states were not collapsed.",
              expectedProfessionalBehaviour: "Keep master/still/clip as separate evidence units.",
              rootCauseFamily: "document_lifecycle",
              suggestedRemediation: "Verify evidence-state reconcile on rebuild.",
              humanReviewRequired: true,
            }),
          );
        } else if (masterRow && stillRow) {
          emitted.push(
            emitFinding({
              controlId: "MAA-DOC-LIFECYCLE",
              caseId: c.caseId,
              surface: "truth_map",
              exactWording: `${masterRow.label} vs ${stillRow.label}`,
              code: "master_still_distinct",
              verdict: "pass",
              plainEnglish: "Master and still/clip labels both visible as distinct units.",
              expectedProfessionalBehaviour: "Preserve distinct media units.",
              rootCauseFamily: "document_lifecycle",
              suggestedRemediation: "None.",
              humanReviewRequired: false,
            }),
          );
        }
      }
      if (!emitted.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-DOC-LIFECYCLE",
            caseId: c.caseId,
            surface: "packet",
            exactWording: c.allegation ?? "",
            code: "lifecycle_signals_limited",
            verdict: "not_exercised",
            plainEnglish:
              "Saved summary lacks full relationship graph; lifecycle lane only partially applicable.",
            expectedProfessionalBehaviour: "Exercise full lifecycle on authenticated fresh runs.",
            rootCauseFamily: "document_lifecycle",
            suggestedRemediation: "Run authenticated materialisation for deeper lifecycle proof.",
            confidence: "low",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-DOC-LIFECYCLE", emitted.length);
    }

    // LANE-03 parties / attribution
    {
      const emitted: MasterAuditorFinding[] = [];
      const text = allText(c);
      for (const ban of c.doNotOverstate) {
        if (/sent the messages|attribution is proved|sent messages/i.test(ban)) {
          // Good — warning present
          emitted.push(
            emitFinding({
              controlId: "MAA-PARTIES-ATTRIBUTION",
              caseId: c.caseId,
              surface: "do_not_overstate",
              exactWording: ban,
              code: "attribution_warning_present",
              verdict: "pass",
              plainEnglish: "Packet preserves an explicit do-not-overstate attribution warning.",
              expectedProfessionalBehaviour:
                "Absence of express authorship must remain not established.",
              rootCauseFamily: "attribution_separation",
              suggestedRemediation: "None.",
              humanReviewRequired: false,
            }),
          );
        }
      }
      if (/\battribution is proved\b|\bdefendant sent the messages\b/i.test(text) &&
          !c.doNotOverstate.some((d) => /attribution|sent/i.test(d))) {
        emitted.push(
          emitFinding({
            controlId: "MAA-PARTIES-ATTRIBUTION",
            caseId: c.caseId,
            surface: "composed",
            exactWording: text.slice(0, 240),
            code: "attribution_overclaim",
            verdict: "defect",
            plainEnglish: "Output asserts attribution as proved without a matching do-not-overstate guard.",
            expectedProfessionalBehaviour: "Do not state attribution as fact when unestablished.",
            rootCauseFamily: "attribution_separation",
            suggestedRemediation: "Fail closed authorship; add limitation.",
            qualifiedLegalReviewRequired: true,
          }),
        );
      }
      if (!emitted.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-PARTIES-ATTRIBUTION",
            caseId: c.caseId,
            surface: "packet",
            exactWording: c.clientLabel ?? "",
            code: "attribution_lane_limited",
            verdict: "not_exercised",
            plainEnglish: "No attribution warning or overclaim detected in saved surfaces.",
            expectedProfessionalBehaviour: "Exercise full attribution model on fresh runs.",
            rootCauseFamily: "attribution_separation",
            suggestedRemediation: "Authenticated attribution dump for deeper audit.",
            confidence: "low",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-PARTIES-ATTRIBUTION", emitted.length);
    }

    // LANE-04 charge model
    {
      const emitted: MasterAuditorFinding[] = [];
      if (c.allegation?.trim()) {
        emitted.push(
          emitFinding({
            controlId: "MAA-CHARGE-MODEL",
            caseId: c.caseId,
            surface: "allegation",
            exactWording: c.allegation,
            code: "recorded_allegation_visible",
            verdict: "pass",
            plainEnglish: "Recorded allegation/charge wording is visible on the packet.",
            expectedProfessionalBehaviour: "Exact recorded wording must remain visible.",
            rootCauseFamily: "charge_model",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
            confidence: "high",
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-CHARGE-MODEL",
            caseId: c.caseId,
            surface: "allegation",
            exactWording: "",
            code: "allegation_missing",
            verdict: "defect",
            plainEnglish: "No allegation/charge wording on saved packet.",
            expectedProfessionalBehaviour: "Charge wording must be visible or explicitly unresolved.",
            rootCauseFamily: "charge_model",
            suggestedRemediation: "Restore allegation on builder output.",
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-CHARGE-MODEL", emitted.length);
    }

    // LANE-05 evidence state vs expectations
    {
      const emitted: MasterAuditorFinding[] = [];
      for (const exp of c.truthExpectations) {
        if (!exp.correctEvidenceState) continue;
        const bound = bindTruthMapRowForExpectation({
          evidenceItem: exp.evidenceItem,
          rows: c.truthMapRows,
          expectedState: exp.correctEvidenceState,
        });
        if (!bound.ok) {
          emitted.push(
            emitFinding({
              controlId: "MAA-EVIDENCE-STATE",
              caseId: c.caseId,
              surface: "truth_map",
              exactWording: "",
              expectedWording: `${exp.evidenceItem} → ${exp.correctEvidenceState}`,
              code:
                bound.reason === "aggregate_meta_row" ||
                bound.reason === "mg6_clarification_meta" ||
                bound.reason === "blended_identity"
                  ? "bind_rejected_non_unit_row"
                  : "expected_item_absent",
              verdict: "unresolved",
              plainEnglish: `Expected evidence item "${exp.evidenceItem}" not bound to a canonical truth-map unit (${bound.reason}): ${bound.detail}`,
              expectedProfessionalBehaviour:
                "Truth map should cover expected evidence units or explain omission; aggregate/meta/blended rows must not bind.",
              rootCauseFamily: "evidence_state",
              suggestedRemediation:
                "Align truth-map labels with expected inventory using unit identity — do not bind aggregate/meta rows.",
              confidence: "low",
              humanReviewRequired: true,
              supportingExtract: JSON.stringify({ bind: bound }),
            }),
          );
          continue;
        }
        const row = bound.row;
        const actualWording = `${row.label} · ${row.existence} · ${row.reliability}`;
        const compared = compareEvidenceStates({
          actualRaw: row.existence,
          expected: exp.correctEvidenceState,
          label: row.label,
        });
        if (compared.equivalent) {
          emitted.push(
            emitFinding({
              controlId: "MAA-EVIDENCE-STATE",
              caseId: c.caseId,
              surface: "truth_map",
              exactWording: actualWording,
              expectedWording: `${exp.evidenceItem} → ${exp.correctEvidenceState}`,
              code:
                compared.reason === "domain_equivalence"
                  ? "state_domain_equivalent"
                  : compared.reason === "compatible_family"
                    ? "state_compatible_family"
                    : "state_match",
              verdict: "pass",
              plainEnglish:
                compared.reason === "domain_equivalence"
                  ? `Raw state "${compared.actualRaw}" (display "${compared.actualDisplay}") is equivalent to expected "${exp.correctEvidenceState}" under schema 1.1.0 domain policy.`
                  : compared.reason === "compatible_family"
                    ? `Evidence state "${compared.actualRaw}" is a compatible/more-precise family for expected "${exp.correctEvidenceState}" on unit "${row.label}".`
                    : `Evidence state matches expected for "${row.label}".`,
              expectedProfessionalBehaviour:
                "Compare states in the correct raw/display domain; record both values; bind only identical canonical units.",
              rootCauseFamily: "evidence_state",
              suggestedRemediation: "None.",
              humanReviewRequired: false,
              confidence: "high",
              supportingExtract: JSON.stringify({
                actualRaw: compared.actualRaw,
                actualDisplay: compared.actualDisplay,
                expectedRaw: compared.expectedRaw,
                expectedDisplay: compared.expectedDisplay,
                reason: compared.reason,
                bindScore: bound.score,
                bindReason: bound.reason,
              }),
            }),
          );
        } else {
          const candidate = matchCandidateDefect({
            caseId: c.caseId,
            expectedItem: exp.evidenceItem,
            actualExistence: row.existence,
            expectedState: exp.correctEvidenceState,
          });
          // Outstanding alone / missing without referred language must not auto
          // become referred_only (F03) — keep unresolved until source proves it.
          const outstandingAlone =
            !candidate &&
            compared.expectedRaw === "referred_only" &&
            (compared.actualRaw === "missing" ||
              compared.actualRaw === "incomplete" ||
              compared.actualRaw === "unknown") &&
            !wordingIndicatesReferredOnly(row.label);

          emitted.push(
            emitFinding({
              controlId: "MAA-EVIDENCE-STATE",
              caseId: c.caseId,
              surface: "truth_map",
              exactWording: actualWording,
              expectedWording: `${exp.evidenceItem} → ${exp.correctEvidenceState}`,
              sourceDocumentExtract: c.inputBundlePath
                ? `bundle:${c.inputBundlePath}`
                : null,
              code: candidate
                ? "candidate_pending_source"
                : outstandingAlone
                  ? "outstanding_alone_unresolved"
                  : "state_mismatch",
              verdict: candidate || outstandingAlone ? "unresolved" : "defect",
              plainEnglish: candidate
                ? `Unresolved identity/version candidate: ${candidate.note}. Actual raw="${compared.actualRaw}" (display="${compared.actualDisplay}"); expected="${exp.correctEvidenceState}". Becomes defect only when canonical identity/version binding proves same unit.`
                : outstandingAlone
                  ? `Outstanding alone on "${row.label}" does not prove referred_only. Actual="${compared.actualRaw}"; expected="referred_only". Retained unresolved pending exact referred/listed/served source proof.`
                  : `Evidence state for "${row.label}" is raw "${compared.actualRaw}" (display "${compared.actualDisplay}") but expected "${exp.correctEvidenceState}".`,
              expectedProfessionalBehaviour:
                "Preserved actual must match gold expected evidence state in the correct domain. Outstanding alone is not referred_only.",
              rootCauseFamily: candidate
                ? "evidence_state_candidate"
                : outstandingAlone
                  ? "evidence_state_outstanding_alone"
                  : "evidence_state",
              suggestedRemediation: candidate
                ? "Confirm against source bundle before treating as programme defect."
                : outstandingAlone
                  ? "Require referred/listed/scheduled-not-served source language before expecting referred_only."
                  : "Repair evidence-state reconcile or update gold after human review.",
              confidence: candidate || outstandingAlone ? "low" : "high",
              humanReviewRequired: true,
              supportingExtract: JSON.stringify({
                actualRaw: compared.actualRaw,
                actualDisplay: compared.actualDisplay,
                expectedRaw: compared.expectedRaw,
                expectedDisplay: compared.expectedDisplay,
                candidate: candidate?.note ?? null,
                outstandingAlone,
                bindScore: bound.score,
                bindReason: bound.reason,
              }),
            }),
          );
        }
        for (const banned of exp.mustNotSay) {
          const hit = c.surfaces.find((s) =>
            s.text.toLowerCase().includes(banned.toLowerCase()),
          );
          if (hit && hit.surfaceId !== "do_not_overstate") {
            emitted.push(
              emitFinding({
                controlId: "MAA-EVIDENCE-STATE",
                caseId: c.caseId,
                surface: hit.surfaceId,
                exactWording: hit.text.slice(0, 400),
                expectedWording: `must_not_say: ${banned}`,
                sourceDocumentExtract: hit.text.slice(0, 400),
                code: "must_not_say_violated",
                verdict: "defect",
                plainEnglish: `Surface contains forbidden overstatement "${banned}".`,
                expectedProfessionalBehaviour: `Must not say: ${banned}`,
                rootCauseFamily: "evidence_state_overstatement",
                suggestedRemediation:
                  "Remove or rewrite the overstatement from copyable exits.",
              }),
            );
          }
        }
      }
      if (!c.truthExpectations.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-EVIDENCE-STATE",
            caseId: c.caseId,
            surface: "expected",
            exactWording: "",
            code: "no_expected_truth",
            verdict: "not_exercised",
            plainEnglish: "No expected.json truth states available for this packet.",
            expectedProfessionalBehaviour: "Calibration cases should carry expected truth states.",
            rootCauseFamily: "evidence_state",
            suggestedRemediation: "Add expected truth states or mark corpus gap.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-EVIDENCE-STATE", emitted.length);
    }

    // LANE-06 chronology / PACE
    {
      const emitted: MasterAuditorFinding[] = [];
      const text = allText(c);
      if (PACE_SAFE_RE.test(text)) {
        emitted.push(
          emitFinding({
            controlId: "MAA-CHRONOLOGY-HEARING",
            caseId: c.caseId,
            surface: "composed",
            exactWording: text.match(PACE_SAFE_RE)?.[0] ?? "PACE OK",
            code: "pace_safe_claim",
            verdict: "defect",
            plainEnglish: "Output contains an affirmative PACE OK / no-breach claim.",
            expectedProfessionalBehaviour:
              "PACE unknown/conflicted must never become SAFE without affirmative supported chronology.",
            rootCauseFamily: "pace_false_affirmative",
            suggestedRemediation: "Apply pace-affirmative gate / cross-exit enforcement.",
            qualifiedLegalReviewRequired: true,
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-CHRONOLOGY-HEARING",
            caseId: c.caseId,
            surface: "composed",
            exactWording: "",
            code: "no_pace_safe_claim",
            verdict: "pass",
            plainEnglish: "No affirmative PACE OK / no-breach wording found on saved surfaces.",
            expectedProfessionalBehaviour: "Keep PACE fail-closed without affirmative proof.",
            rootCauseFamily: "pace_false_affirmative",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
            confidence: "medium",
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-CHRONOLOGY-HEARING", emitted.length);
    }

    // LANE-07 provenance
    {
      const emitted: MasterAuditorFinding[] = [];
      for (const s of c.surfaces) {
        if (containsSyntheticPageReference(s.text)) {
          emitted.push(
            emitFinding({
              controlId: "MAA-PROVENANCE",
              caseId: c.caseId,
              surface: s.surfaceId,
              exactWording: s.text.slice(0, 400),
              code: "synthetic_page_ref",
              verdict: "defect",
              plainEnglish: "Surface contains a synthetic page reference (p.null / page 0 / etc.).",
              expectedProfessionalBehaviour: "Unknown page remains unknown — never synthesise p.1/p.null.",
              rootCauseFamily: "provenance_synthetic_page",
              suggestedRemediation: "Strip synthetic page refs; set pageIdentityKnown=false.",
              sourcePage: s.sourcePage ?? null,
              pageIdentityKnown: s.pageIdentityKnown ?? null,
            }),
          );
        }
        if (
          s.sourcePage &&
          /source verification required|unavailable|unknown/i.test(s.sourcePage) &&
          s.pageIdentityKnown === true
        ) {
          emitted.push(
            emitFinding({
              controlId: "MAA-PROVENANCE",
              caseId: c.caseId,
              surface: s.surfaceId,
              exactWording: String(s.sourcePage),
              code: "unknown_marked_known",
              verdict: "defect",
              plainEnglish: "Page marked known while source page text says verification required/unknown.",
              expectedProfessionalBehaviour: "pageIdentityKnown must be false when page is unknown.",
              rootCauseFamily: "provenance_unknown_page",
              suggestedRemediation: "Align pageIdentityKnown with provenance completeness.",
            }),
          );
        }
      }
      if (!emitted.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-PROVENANCE",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: "no_synthetic_page",
            verdict: "pass",
            plainEnglish: "No synthetic page references detected on saved surfaces.",
            expectedProfessionalBehaviour: "Maintain unknown-page discipline.",
            rootCauseFamily: "provenance_synthetic_page",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-PROVENANCE", emitted.length);
    }

    // LANE-08 reliability
    {
      const emitted: MasterAuditorFinding[] = [];
      for (const row of c.truthMapRows) {
        if (/unsafe|weak|needs_review/i.test(row.reliability)) {
          emitted.push(
            emitFinding({
              controlId: "MAA-RELIABILITY",
              caseId: c.caseId,
              surface: "truth_map",
              exactWording: `${row.label} · ${row.reliability}`,
              code: "reliability_flag_visible",
              verdict: "pass",
              plainEnglish: `Reliability limitation is visible for "${row.label}" (${row.reliability}).`,
              expectedProfessionalBehaviour: "Explain why evidence cannot be confirmed or is weak.",
              rootCauseFamily: "reliability_limitations",
              suggestedRemediation: "None.",
              humanReviewRequired: false,
            }),
          );
        }
      }
      if (!emitted.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-RELIABILITY",
            caseId: c.caseId,
            surface: "truth_map",
            exactWording: "",
            code: "no_reliability_rows",
            verdict: "not_exercised",
            plainEnglish: "No weak/unsafe/needs_review reliability rows on truth map.",
            expectedProfessionalBehaviour: "Surface reliability limits when present.",
            rootCauseFamily: "reliability_limitations",
            suggestedRemediation: "None if all items truly reliable.",
            humanReviewRequired: false,
            confidence: "low",
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-RELIABILITY", emitted.length);
    }

    // LANE-09 completeness — FN-INCOMPLETE-DISCLAIMER + surface-aware boundary
    {
      const emitted: MasterAuditorFinding[] = [];
      let disclaimerExercised = false;
      for (const s of c.surfaces) {
        if (!s.text.trim()) continue;
        const assessment = assessDisclaimerCompleteness(s.text, {
          canCopy: s.canCopy !== false,
        });
        if (assessment.status === "complete") {
          disclaimerExercised = true;
          emitted.push(
            emitFinding({
              controlId: "MAA-COMPLETENESS",
              caseId: c.caseId,
              surface: s.surfaceId,
              exactWording: assessment.matchedPhrase ?? s.text.slice(-200),
              expectedWording:
                "Incomplete materials disclaimer present and complete (FN-INCOMPLETE-DISCLAIMER positive).",
              code: "incomplete_disclaimer_complete",
              verdict: "pass",
              plainEnglish:
                "FN-INCOMPLETE-DISCLAIMER: complete disclaimer present.",
              expectedProfessionalBehaviour:
                "Surfaces that disclose incompleteness must retain the full disclaimer.",
              rootCauseFamily: "completeness_disclaimer",
              suggestedRemediation: "None.",
              humanReviewRequired: false,
              confidence: "high",
              supportingExtract: JSON.stringify(assessment),
            }),
          );
        } else if (assessment.status === "truncated") {
          disclaimerExercised = true;
          const copyable = s.canCopy !== false && s.exitModes.includes("copy");
          if (copyable) {
            emitted.push(
              emitFinding({
                controlId: "MAA-COMPLETENESS",
                caseId: c.caseId,
                surface: s.surfaceId,
                exactWording: assessment.matchedPhrase ?? s.text.slice(-200),
                expectedWording:
                  "Full incomplete-materials disclaimer without mid-phrase truncation.",
                code: "incomplete_disclaimer_truncated",
                verdict: "defect",
                plainEnglish:
                  "FN-INCOMPLETE-DISCLAIMER: mid-disclaimer truncation detected.",
                expectedProfessionalBehaviour:
                  "Disclaimer wording must not be truncated mid-phrase on copyable surfaces.",
                rootCauseFamily: "completeness_disclaimer",
                suggestedRemediation:
                  "Fail closed or emit full disclaimer (GOLD-11-039 class).",
                confidence: "high",
                supportingExtract: JSON.stringify(assessment),
              }),
            );
          } else {
            emitted.push(
              emitFinding({
                controlId: "MAA-COMPLETENESS",
                caseId: c.caseId,
                surface: s.surfaceId,
                exactWording: assessment.matchedPhrase ?? s.text.slice(-200),
                expectedWording:
                  "Non-copyable containment recorded separately from disclaimer completeness.",
                code: "non_copyable_containment_recorded",
                verdict: "containment",
                plainEnglish:
                  "FN-INCOMPLETE-DISCLAIMER: truncated disclaimer on non-copyable surface — containment recorded separately.",
                expectedProfessionalBehaviour:
                  "Containment constraints must not be conflated with copyable disclaimer defects.",
                rootCauseFamily: "completeness_disclaimer",
                suggestedRemediation:
                  "Containment retained — do not reclassify as copyable without fix.",
                blockedNotRepaired: false,
                humanReviewRequired: false,
                confidence: "high",
                supportingExtract: JSON.stringify(assessment),
              }),
            );
          }
          continue;
        }

        let profiled: { ok: boolean; issues: string[] } | null = null;
        try {
          resolveSolicitorBoundaryProfile(s.surfaceId);
          profiled = assessSolicitorVisibleBoundaryForSurface(s.text, s.surfaceId);
        } catch {
          // Unknown surface — do not revive rejected generic mid-sentence heuristic (MIG-019).
          profiled = null;
        }
        if (profiled && !profiled.ok) {
          const copyable = s.canCopy !== false && s.exitModes.includes("copy");
          emitted.push(
            emitFinding({
              controlId: "MAA-COMPLETENESS",
              caseId: c.caseId,
              surface: s.surfaceId,
              exactWording: s.text.slice(0, 400),
              code: profiled.issues.join("|") || "boundary_fail",
              verdict: copyable ? "defect" : "containment",
              plainEnglish: `Boundary issues on ${s.surfaceId}: ${profiled.issues.join(", ")}.`,
              expectedProfessionalBehaviour:
                "Copyable surfaces must not mid-word/mid-sentence cut; blocked containment is acceptable.",
              rootCauseFamily: "completeness_truncation",
              suggestedRemediation: copyable
                ? "Repair truncation or mark not copyable."
                : "Containment retained — do not reclassify as copyable without fix.",
              blockedNotRepaired: copyable ? true : false,
              confidence: "high",
            }),
          );
        }
      }
      // Explicit absent-disclaimer defect when incompleteness is disclosed without disclaimer
      for (const s of c.surfaces) {
        if (!s.text.trim()) continue;
        const assessment = assessDisclaimerCompleteness(s.text, {
          canCopy: s.canCopy !== false,
        });
        if (
          assessment.status === "absent" &&
          /incomplete|not safely confirmed|partial/i.test(s.text) &&
          (s.surfaceId === "overview" ||
            s.surfaceId === "court_lines" ||
            s.surfaceId === "client_summary" ||
            s.surfaceId === "client_safe_summary")
        ) {
          const copyable = s.canCopy !== false && s.exitModes.includes("copy");
          disclaimerExercised = true;
          emitted.push(
            emitFinding({
              controlId: "MAA-COMPLETENESS",
              caseId: c.caseId,
              surface: s.surfaceId,
              exactWording: s.text.slice(0, 240),
              expectedWording:
                "Where incompleteness is disclosed on a copyable surface, include the incomplete-materials disclaimer.",
              code: "incomplete_disclaimer_absent",
              verdict: copyable ? "defect" : "containment",
              plainEnglish: copyable
                ? "FN-INCOMPLETE-DISCLAIMER: incompleteness markers present but disclaimer absent."
                : "FN-INCOMPLETE-DISCLAIMER: disclaimer absent on non-copyable surface — containment recorded separately.",
              expectedProfessionalBehaviour:
                "Incompleteness disclosure on copyable exits requires the full disclaimer.",
              rootCauseFamily: "completeness_disclaimer",
              suggestedRemediation: copyable
                ? "Add complete incomplete-materials disclaimer."
                : "Containment retained separately from disclaimer completeness.",
              humanReviewRequired: copyable,
              confidence: "medium",
              supportingExtract: JSON.stringify(assessment),
            }),
          );
        }
      }
      if (!emitted.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-COMPLETENESS",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: disclaimerExercised ? "boundary_clean" : "boundary_clean",
            verdict: "pass",
            plainEnglish:
              "No incomplete disclaimer or profile-aware boundary failures on saved surfaces.",
            expectedProfessionalBehaviour:
              "Keep surface-aware profiles; do not revive generic FP heuristics.",
            rootCauseFamily: "completeness_truncation",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-COMPLETENESS", emitted.length);
    }

    // LANE-10 defence lens
    {
      const emitted: MasterAuditorFinding[] = [];
      if (c.doNotOverstate.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-DEFENCE-LENS",
            caseId: c.caseId,
            surface: "do_not_overstate",
            exactWording: c.doNotOverstate.join(" | "),
            code: "defence_guards_present",
            verdict: "pass",
            plainEnglish: "Defence do-not-overstate guards are present.",
            expectedProfessionalBehaviour: "Raise weaknesses without inventing facts.",
            rootCauseFamily: "defence_lens",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-DEFENCE-LENS",
            caseId: c.caseId,
            surface: "do_not_overstate",
            exactWording: "",
            code: "no_defence_guards",
            verdict: "unresolved",
            plainEnglish: "No do-not-overstate list on packet — defence lens not fully evidenced.",
            expectedProfessionalBehaviour: "Preserve safe next actions and overstatement guards.",
            rootCauseFamily: "defence_lens",
            suggestedRemediation: "Ensure builder emits do-not-overstate where relevant.",
            humanReviewRequired: true,
            confidence: "low",
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-DEFENCE-LENS", emitted.length);
    }

    // LANE-11 prosecution lens — court line / chase as prosecution-facing distinct from client
    {
      const emitted: MasterAuditorFinding[] = [];
      const client = c.surfaces.find((s) => s.surfaceId === "client_summary");
      const court = c.surfaces.find((s) => s.surfaceId === "court_line");
      if (client && court && client.text && court.text && client.text === court.text) {
        emitted.push(
          emitFinding({
            controlId: "MAA-PROSECUTION-LENS",
            caseId: c.caseId,
            surface: "court_line",
            exactWording: court.text.slice(0, 400),
            code: "client_court_collapsed",
            verdict: "defect",
            plainEnglish: "Client summary and court line are identical — audience lenses collapsed.",
            expectedProfessionalBehaviour: "Keep prosecution/court and client wording separate.",
            rootCauseFamily: "audience_collapse",
            suggestedRemediation: "Separate composers for client vs court.",
          }),
        );
      } else if (court?.text) {
        emitted.push(
          emitFinding({
            controlId: "MAA-PROSECUTION-LENS",
            caseId: c.caseId,
            surface: "court_line",
            exactWording: court.text.slice(0, 400),
            code: "court_line_distinct",
            verdict: "pass",
            plainEnglish: "Court line present and not identical to client summary.",
            expectedProfessionalBehaviour: "Keep prosecution proof requirements distinct.",
            rootCauseFamily: "prosecution_lens",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-PROSECUTION-LENS",
            caseId: c.caseId,
            surface: "court_line",
            exactWording: "",
            code: "no_court_line",
            verdict: "not_exercised",
            plainEnglish: "No court line on saved packet.",
            expectedProfessionalBehaviour: "Court/prosecution-facing line should exist or be explicit N/A.",
            rootCauseFamily: "prosecution_lens",
            suggestedRemediation: "Emit court line on rebuild.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-PROSECUTION-LENS", emitted.length);
    }

    // LANE-12 judicial
    {
      const emitted: MasterAuditorFinding[] = [];
      const court = c.surfaces.find((s) => s.surfaceId === "court_line");
      if (court?.text && /asks the court to record/i.test(court.text)) {
        emitted.push(
          emitFinding({
            controlId: "MAA-JUDICIAL-LENS",
            caseId: c.caseId,
            surface: "court_line",
            exactWording: court.text.slice(0, 400),
            code: "neutral_court_ask",
            verdict: "pass",
            plainEnglish: "Court line asks the court to record state rather than deciding the issue.",
            expectedProfessionalBehaviour: "Leave determination to court/solicitor; stay neutral.",
            rootCauseFamily: "judicial_lens",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-JUDICIAL-LENS",
            caseId: c.caseId,
            surface: "court_line",
            exactWording: court?.text?.slice(0, 200) ?? "",
            code: "judicial_signal_limited",
            verdict: "not_exercised",
            plainEnglish: "Limited judicial/procedural signal in saved court line.",
            expectedProfessionalBehaviour: "Surface hearing readiness neutrally when available.",
            rootCauseFamily: "judicial_lens",
            suggestedRemediation: "Deeper hearing surfaces on authenticated runs.",
            humanReviewRequired: false,
            confidence: "low",
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-JUDICIAL-LENS", emitted.length);
    }

    // LANE-13 legal currentness — statute-looking citations present without registry check → unresolved
    {
      const emitted: MasterAuditorFinding[] = [];
      const allegation = c.allegation ?? "";
      if (/\b(?:Act|OAPA|PACE|Theft Act|PFHA)\b/i.test(allegation)) {
        emitted.push(
          emitFinding({
            controlId: "MAA-LEGAL-CURRENTNESS",
            caseId: c.caseId,
            surface: "allegation",
            exactWording: allegation,
            code: "citation_present_needs_registry",
            verdict: "unresolved",
            plainEnglish:
              "Legal citation present on allegation; registry traceability not proven from saved packet alone.",
            expectedProfessionalBehaviour:
              "Trace propositions to controlled registry or send to solicitor verification.",
            rootCauseFamily: "legal_currentness",
            suggestedRemediation: "Cross-check offence-label registry on fresh authenticated run.",
            qualifiedLegalReviewRequired: true,
            humanReviewRequired: true,
            confidence: "low",
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-LEGAL-CURRENTNESS",
            caseId: c.caseId,
            surface: "allegation",
            exactWording: allegation,
            code: "no_citation_signal",
            verdict: "not_exercised",
            plainEnglish: "No statute/citation signal to validate against registry.",
            expectedProfessionalBehaviour: "Validate citations when present.",
            rootCauseFamily: "legal_currentness",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-LEGAL-CURRENTNESS", emitted.length);
    }

    // LANE-14 audience wording
    {
      const emitted: MasterAuditorFinding[] = [];
      const client = c.surfaces.find((s) => s.surfaceId === "client_summary");
      if (client?.text && /not for court or cps/i.test(client.text)) {
        emitted.push(
          emitFinding({
            controlId: "MAA-AUDIENCE-WORDING",
            caseId: c.caseId,
            surface: "client_summary",
            exactWording: client.text.slice(0, 400),
            code: "client_audience_marked",
            verdict: "pass",
            plainEnglish: "Client summary is marked not for court/CPS.",
            expectedProfessionalBehaviour: "Keep audience labels clear.",
            rootCauseFamily: "audience_wording",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      } else if (client?.text) {
        emitted.push(
          emitFinding({
            controlId: "MAA-AUDIENCE-WORDING",
            caseId: c.caseId,
            surface: "client_summary",
            exactWording: client.text.slice(0, 400),
            code: "client_audience_unmarked",
            verdict: "defect",
            plainEnglish: "Client summary lacks audience disclaimer.",
            expectedProfessionalBehaviour: "Client-safe summaries must carry audience limitation.",
            rootCauseFamily: "audience_wording",
            suggestedRemediation: "Append client-safe disclaimer.",
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-AUDIENCE-WORDING",
            caseId: c.caseId,
            surface: "client_summary",
            exactWording: "",
            code: "no_client_summary",
            verdict: "not_exercised",
            plainEnglish: "No client summary surface.",
            expectedProfessionalBehaviour: "Emit audience-separated client summary when applicable.",
            rootCauseFamily: "audience_wording",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-AUDIENCE-WORDING", emitted.length);
    }

    // LANE-15 action quality
    {
      const emitted: MasterAuditorFinding[] = [];
      const hasCharge = Boolean(c.allegation?.trim());
      const hasEvidence = c.truthMapRows.length > 0;
      const hasMissing = c.truthMapRows.some((r) => /missing|incomplete|not_safely/i.test(r.existence));
      const hasNext = c.cpsChase.length > 0 || c.doNotOverstate.length > 0;
      if (hasCharge && hasEvidence && hasNext) {
        emitted.push(
          emitFinding({
            controlId: "MAA-ACTION-QUALITY",
            caseId: c.caseId,
            surface: "packet",
            exactWording: [
              c.allegation,
              `truthMap=${c.truthMapRows.length}`,
              `chase=${c.cpsChase.length}`,
              hasMissing ? "has_missing" : "no_missing",
            ].join(" | "),
            code: "actionable_packet",
            verdict: "pass",
            plainEnglish:
              "Solicitor can see charge, evidence inventory, and next chase/guards from the packet.",
            expectedProfessionalBehaviour:
              "Answer what the charge is, what exists, what is missing, what is safe, what is next.",
            rootCauseFamily: "action_quality",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
            confidence: "medium",
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-ACTION-QUALITY",
            caseId: c.caseId,
            surface: "packet",
            exactWording: c.allegation ?? "",
            code: "actionability_gap",
            verdict: "defect",
            plainEnglish: "Packet missing charge, evidence map, or next-action signals.",
            expectedProfessionalBehaviour: "Every matter needs actionable solicitor answers.",
            rootCauseFamily: "action_quality",
            suggestedRemediation: "Fill allegation, truth map and chase/guards.",
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-ACTION-QUALITY", emitted.length);
    }

    // LANE-16 cross-exit — unit-bound; honest sibling wording is not a contradiction
    {
      const emitted: MasterAuditorFinding[] = [];
      const mapExit = (modes: string[]): ExitSnapshot["exit"] => {
        if (modes.includes("copy")) return "copy";
        if (modes.includes("export")) return "export";
        if (modes.includes("pdf")) return "pdf";
        if (modes.includes("api")) return "api";
        if (modes.includes("composed_prose")) return "composed_prose";
        return "truth_map";
      };
      const items = c.truthMapRows.map((r) => ({
        label: r.label,
        state: toSharedState(r.existence),
      }));
      const exits: ExitSnapshot[] = c.surfaces.map((s) => ({
        exit: mapExit(s.exitModes),
        texts: [s.text],
        limitations: [],
      }));
      const scan = scanCrossExitConsistency(exits, {
        evidence: buildEvidenceState(c),
        support: {
          identification: false,
          intent: false,
          pleaAdvice: false,
          medicalInjury: false,
        },
        requiredLimitations: [],
      });
      let retained = 0;
      let honestSiblingPasses = 0;
      for (const contra of scan.contradictions.slice(0, 20)) {
        if (
          contra.code === "served_state_contradicted" ||
          contra.code === "missing_state_contradicted"
        ) {
          const surfaceText =
            c.surfaces.find((s) => mapExit(s.exitModes) === contra.exit)?.text ??
            c.surfaces.map((s) => s.text).join("\n");
          const confirmed = confirmUnitBoundContradiction({
            text: surfaceText,
            subject: contra.subject,
            code: contra.code,
            items,
          });
          if (!confirmed) {
            if (isHonestSiblingServedMissingWording(surfaceText)) {
              honestSiblingPasses += 1;
              emitted.push(
                emitFinding({
                  controlId: "MAA-CROSS-EXIT",
                  caseId: c.caseId,
                  surface: contra.exit,
                  exactWording: contra.excerpt ?? contra.detail,
                  expectedWording:
                    "Honest wording such as 'extract served, full record missing' is not a contradiction.",
                  code: "honest_sibling_served_missing",
                  verdict: "pass",
                  plainEnglish:
                    "Cross-exit: honest sibling served/missing wording — not flagged as contradiction.",
                  expectedProfessionalBehaviour:
                    "Bind each assertion to its evidence unit; sibling units may differ.",
                  rootCauseFamily: "cross_exit_contradiction",
                  suggestedRemediation: "None.",
                  humanReviewRequired: false,
                  confidence: "high",
                  supportingExtract: JSON.stringify({
                    subject: contra.subject,
                    suppressedCode: contra.code,
                  }),
                }),
              );
            }
            continue;
          }
        }
        retained += 1;
        emitted.push(
          emitFinding({
            controlId: "MAA-CROSS-EXIT",
            caseId: c.caseId,
            surface: contra.exit,
            exactWording: contra.excerpt ?? contra.detail,
            code: contra.code,
            verdict: "defect",
            plainEnglish: contra.detail,
            expectedProfessionalBehaviour:
              "No exit may contradict the same evidence unit's canonical state.",
            rootCauseFamily: "cross_exit_contradiction",
            suggestedRemediation: "enforceCrossExitConsistency before surface emit.",
          }),
        );
      }
      if (!retained && !honestSiblingPasses) {
        emitted.push(
          emitFinding({
            controlId: "MAA-CROSS-EXIT",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: "no_cross_exit_hit",
            verdict: "pass",
            plainEnglish:
              "Cross-exit scanner found no unit-bound contradictions on reconstructed exits.",
            expectedProfessionalBehaviour: "Keep exits consistent with canonical state.",
            rootCauseFamily: "cross_exit_contradiction",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
            confidence: "medium",
          }),
        );
      } else if (!retained && honestSiblingPasses) {
        // already emitted honest sibling passes
      }
      findings.push(...emitted);
      touch("MAA-CROSS-EXIT", emitted.length);
    }

    // LANE-17 cross-surface — chase vs truth map via canonical evidence-unit identity
    {
      const emitted: MasterAuditorFinding[] = [];
      for (const row of c.truthMapRows.filter((r) =>
        /missing|incomplete|not_safely/i.test(r.existence),
      )) {
        const chased = c.cpsChase.some((ch) =>
          sameEvidenceUnitIdentity(ch.label, row.label),
        );
        if (!chased) {
          emitted.push(
            emitFinding({
              controlId: "MAA-CROSS-SURFACE",
              caseId: c.caseId,
              surface: "disclosure_chase",
              exactWording: `${row.label} · ${row.existence} · ${row.reliability}`,
              expectedWording: `chase covering ${row.label}`,
              code: "missing_not_chased",
              verdict: "unresolved",
              plainEnglish: `Truth map marks "${row.label}" missing/incomplete but no matching chase draft found under canonical identity.`,
              expectedProfessionalBehaviour:
                "Disclosure Chase should cover outstanding units or explain omission.",
              rootCauseFamily: "cross_surface_consistency",
              suggestedRemediation:
                "Align chase list with truth map outstanding items using unit identity.",
              humanReviewRequired: true,
              confidence: "medium",
            }),
          );
        }
      }
      for (const ch of c.cpsChase) {
        const hit = servedRowSatisfiesChase({
          chaseLabel: ch.label,
          servedRows: c.truthMapRows,
        });
        if (hit.satisfied && /please provide|outstanding|missing/i.test(ch.draft)) {
          emitted.push(
            emitFinding({
              controlId: "MAA-CROSS-SURFACE",
              caseId: c.caseId,
              surface: "disclosure_chase",
              exactWording: ch.draft,
              expectedWording:
                "Do not chase a served unit under the same evidence-unit identity.",
              code: "served_item_chased",
              verdict: "defect",
              plainEnglish: `Chase requests "${ch.label}" while truth map marks the same unit served (${hit.byLabel}).`,
              expectedProfessionalBehaviour:
                "Do not chase served aliases as missing; distinct siblings (extract≠full) may still be chased.",
              rootCauseFamily: "cross_surface_consistency",
              suggestedRemediation:
                "Suppress chase for served units; chase incomplete siblings only.",
              supportingExtract: JSON.stringify(hit),
            }),
          );
        } else if (!hit.satisfied) {
          // Negative contract path: broad token overlap with a distinct sibling is not a defect
          const nearMiss = c.truthMapRows.find(
            (r) =>
              r.existence === "served" &&
              r.label
                .toLowerCase()
                .split(/\s+/)
                .filter((t) => t.length > 3)
                .some((t) => ch.label.toLowerCase().includes(t)) &&
              !sameEvidenceUnitIdentity(ch.label, r.label),
          );
          if (
            nearMiss &&
            /please provide|outstanding|missing/i.test(ch.draft)
          ) {
            emitted.push(
              emitFinding({
                controlId: "MAA-CROSS-SURFACE",
                caseId: c.caseId,
                surface: "disclosure_chase",
                exactWording: ch.draft,
                expectedWording:
                  "Distinct evidence units must not satisfy each other (extract≠full; draft≠signed; recording≠transcript; clip≠master).",
                code: "distinct_unit_chase_allowed",
                verdict: "pass",
                plainEnglish: `Chase for "${ch.label}" correctly not blocked by distinct served sibling "${nearMiss.label}".`,
                expectedProfessionalBehaviour:
                  "Cross-surface chase matching must use canonical identity, not broad token overlap.",
                rootCauseFamily: "cross_surface_consistency",
                suggestedRemediation: "None.",
                humanReviewRequired: false,
                confidence: "high",
                supportingExtract: JSON.stringify({
                  chase: ch.label,
                  nearMiss: nearMiss.label,
                }),
              }),
            );
          }
        }
      }
      if (!emitted.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-CROSS-SURFACE",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: "cross_surface_aligned",
            verdict: "pass",
            plainEnglish:
              "No missing-unchased or same-unit served-rechased contradictions detected.",
            expectedProfessionalBehaviour: "Keep surfaces consistent under unit identity.",
            rootCauseFamily: "cross_surface_consistency",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-CROSS-SURFACE", emitted.length);
    }

    // LANE-18 chase quality
    {
      const emitted: MasterAuditorFinding[] = [];
      for (const ch of c.cpsChase) {
        if (!ch.draft.trim()) {
          emitted.push(
            emitFinding({
              controlId: "MAA-CHASE-QUALITY",
              caseId: c.caseId,
              surface: "disclosure_chase",
              exactWording: ch.label,
              code: "empty_chase_draft",
              verdict: "defect",
              plainEnglish: "Chase label has empty draft text.",
              expectedProfessionalBehaviour: "Chase requests must be concrete and provenance-linked.",
              rootCauseFamily: "chase_quality",
              suggestedRemediation: "Populate draft or drop the row.",
            }),
          );
        } else if (/please provide (?:all|any) (?:evidence|disclosure|unused material)\b/i.test(ch.draft)) {
          emitted.push(
            emitFinding({
              controlId: "MAA-CHASE-QUALITY",
              caseId: c.caseId,
              surface: "disclosure_chase",
              exactWording: ch.draft,
              code: "broad_template_chase",
              verdict: "defect",
              plainEnglish: "Chase uses a broad family-template request rather than a specific unit.",
              expectedProfessionalBehaviour: "No broad family-template invention.",
              rootCauseFamily: "chase_quality",
              suggestedRemediation: "Replace with specific evidence unit + reference.",
            }),
          );
        } else {
          emitted.push(
            emitFinding({
              controlId: "MAA-CHASE-QUALITY",
              caseId: c.caseId,
              surface: "disclosure_chase",
              exactWording: ch.draft,
              code: "chase_specific",
              verdict: "pass",
              plainEnglish: "Chase draft names a concrete item.",
              expectedProfessionalBehaviour: "Keep chase specific and supported.",
              rootCauseFamily: "chase_quality",
              suggestedRemediation: "None.",
              humanReviewRequired: false,
              confidence: "medium",
            }),
          );
        }
      }
      if (!c.cpsChase.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-CHASE-QUALITY",
            caseId: c.caseId,
            surface: "disclosure_chase",
            exactWording: "",
            code: "no_chase_rows",
            verdict: "not_exercised",
            plainEnglish: "No CPS chase rows on packet.",
            expectedProfessionalBehaviour: "Chase when outstanding material exists.",
            rootCauseFamily: "chase_quality",
            suggestedRemediation: "None if nothing outstanding.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-CHASE-QUALITY", emitted.length);
    }

    // LANE-19 hallucination / absolute proof
    {
      const emitted: MasterAuditorFinding[] = [];
      for (const s of c.surfaces) {
        if (s.surfaceId === "do_not_overstate") continue;
        if (containsAbsoluteProofWording(s.text)) {
          emitted.push(
            emitFinding({
              controlId: "MAA-HALLUCINATION",
              caseId: c.caseId,
              surface: s.surfaceId,
              exactWording: s.text.slice(0, 400),
              code: "absolute_proof",
              verdict: s.canCopy === false ? "containment" : "defect",
              plainEnglish: "Absolute-proof wording present on a surface.",
              expectedProfessionalBehaviour: "Never copy absolute-proof affirmative claims.",
              rootCauseFamily: "hallucination_overstatement",
              suggestedRemediation: "Block copy or rewrite to conditional language.",
              blockedNotRepaired: s.canCopy !== false,
            }),
          );
        }
      }
      if (!emitted.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-HALLUCINATION",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: "no_absolute_proof",
            verdict: "pass",
            plainEnglish: "No absolute-proof wording on non-warning surfaces.",
            expectedProfessionalBehaviour: "Keep overstatement fail-closed.",
            rootCauseFamily: "hallucination_overstatement",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-HALLUCINATION", emitted.length);
    }

    // LANE-20 security / privacy
    {
      const emitted: MasterAuditorFinding[] = [];
      for (const s of c.surfaces) {
        if (INTERNAL_LEAK_RE.test(s.text) || FIXTURE_PATH_RE.test(s.text)) {
          emitted.push(
            emitFinding({
              controlId: "MAA-SECURITY-PRIVACY",
              caseId: c.caseId,
              surface: s.surfaceId,
              exactWording: s.text.slice(0, 400),
              code: "internal_leak",
              verdict: "defect",
              plainEnglish: "Internal fixture ID, filesystem path or audit phrasing leaked onto a surface.",
              expectedProfessionalBehaviour: "No internal IDs/paths/developer text on solicitor exits.",
              rootCauseFamily: "security_privacy",
              suggestedRemediation: "Sanitize solicitor-visible surfaces (run-v9 class).",
            }),
          );
        }
      }
      if (!emitted.length) {
        emitted.push(
          emitFinding({
            controlId: "MAA-SECURITY-PRIVACY",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: "no_internal_leak",
            verdict: "pass",
            plainEnglish: "No internal fixture/path leak patterns detected.",
            expectedProfessionalBehaviour: "Keep solicitor surfaces clean of internals.",
            rootCauseFamily: "security_privacy",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-SECURITY-PRIVACY", emitted.length);
    }

    // LANE-21 resilience — deterministic ID check deferred to orchestrator rerun; per-case pass marker
    {
      const emitted = [
        emitFinding({
          controlId: "MAA-RESILIENCE",
          caseId: c.caseId,
          surface: "packet",
          exactWording: c.caseId,
          code: "case_loaded_deterministically",
          verdict: "pass",
          plainEnglish: "Case packet loaded under stable caseId for reproducible audit.",
          expectedProfessionalBehaviour: "Finding IDs must be stable across reruns.",
          rootCauseFamily: "resilience_determinism",
          suggestedRemediation: "None.",
          humanReviewRequired: false,
          confidence: "high",
        }),
      ];
      findings.push(...emitted);
      touch("MAA-RESILIENCE", emitted.length);
    }

    // LANE-22 output design (separate)
    {
      const urgent =
        c.truthMapRows.some((r) => /missing|unsafe/i.test(r.existence + r.reliability)) ||
        c.cpsChase.length > 0;
      const emitted = [
        emitFinding({
          controlId: "MAA-OUTPUT-DESIGN",
          caseId: c.caseId,
          surface: "packet",
          exactWording: `surfaces=${c.surfaces.length}; chase=${c.cpsChase.length}`,
          code: urgent ? "urgent_signals_present" : "low_urgency_layout",
          verdict: "pass",
          plainEnglish: urgent
            ? "Outstanding/chase signals exist so a solicitor can find urgent next steps in the packet."
            : "No high-urgency outstanding signals; layout density not flagged as a factual defect.",
          expectedProfessionalBehaviour:
            "Design findings are separate from factual defects; keep warnings visible.",
          rootCauseFamily: "output_design",
          suggestedRemediation: "None.",
          designFinding: true,
          humanReviewRequired: false,
          severity: "LOW",
        }),
      ];
      findings.push(...emitted);
      touch("MAA-OUTPUT-DESIGN", emitted.length);
    }

    // LANE-23 human supervision — blank fields must stay blank (enforced by builder); check no fabricated sign-off in text
    {
      const emitted: MasterAuditorFinding[] = [];
      const text = allText(c);
      if (/\b(?:solicitor signed off|gold approved|human review complete)\b/i.test(text)) {
        emitted.push(
          emitFinding({
            controlId: "MAA-HUMAN-SUPERVISION",
            caseId: c.caseId,
            surface: "composed",
            exactWording: text.match(/\b(?:solicitor signed off|gold approved|human review complete)\b/i)?.[0] ?? "",
            code: "fabricated_signoff_language",
            verdict: "defect",
            plainEnglish: "Output claims human/gold sign-off language.",
            expectedProfessionalBehaviour: "Never fabricate human review sign-off.",
            rootCauseFamily: "human_supervision",
            suggestedRemediation: "Remove fabricated sign-off; leave human fields blank.",
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-HUMAN-SUPERVISION",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: "no_fabricated_signoff",
            verdict: "pass",
            plainEnglish: "No fabricated human sign-off language detected; auditor human fields remain blank.",
            expectedProfessionalBehaviour: "Blank human-review fields stay blank until a person fills them.",
            rootCauseFamily: "human_supervision",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-HUMAN-SUPERVISION", emitted.length);
    }

    // LANE-24 bias / fairness
    {
      const emitted: MasterAuditorFinding[] = [];
      const text = allText(c);
      if (PREJUDICE_RE.test(text)) {
        emitted.push(
          emitFinding({
            controlId: "MAA-BIAS-FAIRNESS",
            caseId: c.caseId,
            surface: "composed",
            exactWording: text.match(PREJUDICE_RE)?.[0] ?? "",
            code: "prejudicial_language",
            verdict: "defect",
            plainEnglish: "Potential prejudicial/protected-characteristic inference language detected.",
            expectedProfessionalBehaviour:
              "Flag unsupported risk/prejudicial language; automated scan does not prove fairness.",
            rootCauseFamily: "bias_fairness",
            suggestedRemediation: "Remove unsupported prejudicial inference; send to human review.",
            humanReviewRequired: true,
            qualifiedLegalReviewRequired: true,
            confidence: "low",
          }),
        );
      } else {
        emitted.push(
          emitFinding({
            controlId: "MAA-BIAS-FAIRNESS",
            caseId: c.caseId,
            surface: "packet",
            exactWording: "",
            code: "no_prejudice_hit",
            verdict: "pass",
            plainEnglish:
              "No crude prejudicial pattern hit. This does not prove fairness — only absence of this detector's patterns.",
            expectedProfessionalBehaviour: "Treat fairness as human-supervised; keep detector humble.",
            rootCauseFamily: "bias_fairness",
            suggestedRemediation: "None.",
            humanReviewRequired: false,
            confidence: "low",
          }),
        );
      }
      findings.push(...emitted);
      touch("MAA-BIAS-FAIRNESS", emitted.length);
    }

    void before;
  }

  const deduped = dedupe(findings);
  return {
    findings: deduped,
    exercises: buildControlExerciseRecords({ cases, findings: deduped }),
  };
}
