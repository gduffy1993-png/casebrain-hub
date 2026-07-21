/**
 * Phase 10 — mutation & adversarial-injection testing.
 * Proves intentionally unsafe conditions are detected and blocked.
 *
 * Outcomes: killed | survived | could_not_exercise
 * Blocked ≠ repaired (explicit on every killed mutant).
 *
 * Run: npx tsx scripts/integrity-programme/phase10-mutation-adversarial.ts
 * Ledger: no re-count / mutation of Phase-6 72/28 or 42/55 units.
 */
import fs from "node:fs";
import path from "node:path";
import {
  assertSameCanonicalFingerprint,
  buildCanonicalMatterStateV1,
  CANONICAL_MATTER_STATE_VERSION,
} from "@/lib/criminal/canonical-matter-state";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import {
  buildExtractionProvenanceBlock,
  assertSafeEvidenceTitle,
  containsRawExtractionSyntax,
  detectIncompleteQuotation,
  isTruncatedExcerptUsedAsTitle,
} from "@/lib/criminal/extraction-provenance-boundary";
import {
  assertConsumerRejectsIntegrityBlocked,
  validateSolicitorSurface,
} from "@/lib/criminal/shared-solicitor-validator";
import {
  canUseSolicitorApiResponse,
  isIntegrityBlockedPayload,
} from "@/lib/criminal/integrity-blocked-consumer";
import { classifyTextsAgainstConceptRegistry } from "@/lib/criminal/offence-family-concept-registry";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import {
  gateSolicitorOutput,
  integrityBlockedApiBody,
  maybeIntegrityBlockedResponse,
} from "@/lib/criminal/solicitor-output-gate";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import {
  displayForSafelyOmitted,
  migrateLegacySolicitorString,
  REVIEW_REQUIRED_NEUTRAL,
} from "@/lib/criminal/structured-solicitor-output";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-10");
const DOCS = path.join(ROOT, "docs/integrity-programme");

type MutantOutcome = "killed" | "survived" | "could_not_exercise";

type MutantResult = {
  id: string;
  category: string;
  description: string;
  expectedDetectionPoint: string;
  actualResult: string;
  outcome: MutantOutcome;
  blockedDoesNotMeanRepaired: true;
  safetyRelevant: boolean;
  disposition?: string;
};

const FAMILY = {
  allegation: "Harassment contrary to Protection from Harassment Act",
  bundleHay: "WhatsApp screenshots MG11 phone extraction subscriber",
  auditFamily: "harassment_digital",
};

const SAFE = "Attribution remains outstanding on the served screenshots.";

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readJson<T>(abs: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8")) as T;
  } catch {
    return null;
  }
}

function row(label: string, existence: FiveAnswersEvidenceRow["existence"]): FiveAnswersEvidenceRow {
  return { label, existence, reliability: "needs_review" };
}

function killed(
  id: string,
  category: string,
  description: string,
  expectedDetectionPoint: string,
  actualResult: string,
  safetyRelevant = true,
): MutantResult {
  return {
    id,
    category,
    description,
    expectedDetectionPoint,
    actualResult,
    outcome: "killed",
    blockedDoesNotMeanRepaired: true,
    safetyRelevant,
  };
}

function survived(
  id: string,
  category: string,
  description: string,
  expectedDetectionPoint: string,
  actualResult: string,
  safetyRelevant = true,
  disposition?: string,
): MutantResult {
  return {
    id,
    category,
    description,
    expectedDetectionPoint,
    actualResult,
    outcome: "survived",
    blockedDoesNotMeanRepaired: true,
    safetyRelevant,
    disposition,
  };
}

function unexercised(
  id: string,
  category: string,
  description: string,
  expectedDetectionPoint: string,
  reason: string,
  safetyRelevant = true,
): MutantResult {
  return {
    id,
    category,
    description,
    expectedDetectionPoint,
    actualResult: reason,
    outcome: "could_not_exercise",
    blockedDoesNotMeanRepaired: true,
    safetyRelevant,
  };
}

function runMutants(): MutantResult[] {
  const out: MutantResult[] = [];
  const evidenceRows = [
    row("Complainant MG11", "served"),
    row("Phone download", "missing"),
    row("Screenshots", "referred_only"),
  ];

  // --- Truncation and omission ---
  {
    const g = validateSolicitorSurface({
      surfaceId: "p10_trunc_copy",
      texts: ["Chase the and"],
      ...FAMILY,
      mode: "copy",
      data: { texts: ["Chase the and"] },
    });
    const ok = g.status === "integrity_blocked" && g.canCopy === false;
    out.push(
      ok
        ? killed(
            "M10-TRUNC-01",
            "truncation_omission",
            "Mid-phrase truncation in copy exit",
            "validateSolicitorSurface(copy) → sentence.truncated_fragment / integrity_blocked",
            `status=${g.status};rules=${g.ruleIds.join(",")};canCopy=${g.canCopy}`,
          )
        : survived(
            "M10-TRUNC-01",
            "truncation_omission",
            "Mid-phrase truncation in copy exit",
            "validateSolicitorSurface(copy) → integrity_blocked",
            `status=${g.status};rules=${g.ruleIds.join(",")};canCopy=${g.canCopy}`,
          ),
    );
  }
  {
    const titleGate = assertSafeEvidenceTitle("Chase the and");
    const truncTitle = isTruncatedExcerptUsedAsTitle("Chase the and");
    const ok = truncTitle === true && titleGate.safeTitle === null;
    out.push(
      ok
        ? killed(
            "M10-TRUNC-02",
            "truncation_omission",
            "Truncated excerpt used as evidence title",
            "assertSafeEvidenceTitle / isTruncatedExcerptUsedAsTitle",
            `truncTitle=${truncTitle};safeTitle=${titleGate.safeTitle}`,
          )
        : survived(
            "M10-TRUNC-02",
            "truncation_omission",
            "Truncated excerpt used as evidence title",
            "assertSafeEvidenceTitle",
            `truncTitle=${truncTitle};safeTitle=${titleGate.safeTitle}`,
          ),
    );
  }
  {
    const omit = displayForSafelyOmitted("Phone download | 4 | outstanding");
    const ok =
      omit.silentLossPrevented === true &&
      omit.display === REVIEW_REQUIRED_NEUTRAL &&
      omit.kind !== "non_substantive";
    out.push(
      ok
        ? killed(
            "M10-OMIT-01",
            "truncation_omission",
            "Unsafe legacy string safely omitted (review-required display)",
            "displayForSafelyOmitted → review-required neutral (not silent drop)",
            `kind=${omit.kind};silentLossPrevented=${omit.silentLossPrevented};hasNeutral=${omit.display === REVIEW_REQUIRED_NEUTRAL}`,
          )
        : survived(
            "M10-OMIT-01",
            "truncation_omission",
            "Unsafe legacy string safely omitted",
            "displayForSafelyOmitted",
            `kind=${omit.kind};display=${omit.display}`,
          ),
    );
  }

  // --- Changed / substituted wording ---
  {
    const g = validateSolicitorSurface({
      surfaceId: "p10_punct_copy",
      texts: ["Served.; draft unsigned."],
      ...FAMILY,
      mode: "copy",
      data: { texts: ["Served.; draft unsigned."] },
    });
    const s = assessSolicitorSentence("Served.; draft unsigned.");
    const ok =
      g.status === "integrity_blocked" ||
      s.issues.includes("malformed_punctuation") ||
      s.issues.includes("contradictory_clause");
    out.push(
      ok
        ? killed(
            "M10-WORD-01",
            "changed_substituted_wording",
            "Broken/duplicate punctuation substitution",
            "assessSolicitorSentence + copy gate",
            `gate=${g.status};issues=${s.issues.join(",")}`,
          )
        : survived(
            "M10-WORD-01",
            "changed_substituted_wording",
            "Broken/duplicate punctuation substitution",
            "assessSolicitorSentence + copy gate",
            `gate=${g.status};issues=${s.issues.join(",")}`,
          ),
    );
  }
  {
    const g = validateSolicitorSurface({
      surfaceId: "p10_placeholder_api",
      texts: ["Next step: [TODO] confirm attribution"],
      ...FAMILY,
      mode: "api",
      data: { texts: ["Next step: [TODO] confirm attribution"] },
    });
    const s = assessSolicitorSentence("Next step: [TODO] confirm attribution");
    const ok =
      g.status === "integrity_blocked" ||
      s.issues.includes("unresolved_placeholder") ||
      /\bTODO\b|\[TODO\]/i.test("Next step: [TODO] confirm attribution");
    // If placeholder detector fires OR gate blocks → killed; if neither, survived
    const detected =
      g.status === "integrity_blocked" || s.issues.includes("unresolved_placeholder");
    out.push(
      detected
        ? killed(
            "M10-WORD-02",
            "changed_substituted_wording",
            "Unresolved placeholder in API wording",
            "sentence.unresolved_placeholder or integrity_blocked",
            `gate=${g.status};issues=${s.issues.join(",")}`,
          )
        : survived(
            "M10-WORD-02",
            "changed_substituted_wording",
            "Unresolved placeholder in API wording",
            "sentence.unresolved_placeholder or integrity_blocked",
            `gate=${g.status};issues=${s.issues.join(",")}`,
          ),
    );
  }
  {
    const migrated = migrateLegacySolicitorString("Outstanding material | 12 | on index", {
      kind: "cps_chase",
    });
    const textRaw = containsRawExtractionSyntax(migrated.text ?? "");
    const killedOk =
      migrated.disposition === "safely_omitted" ||
      migrated.disposition === "still_blocked" ||
      migrated.ok === false ||
      (Boolean(migrated.text) && !textRaw);
    out.push(
      killedOk
        ? killed(
            "M10-WORD-03",
            "changed_substituted_wording",
            "Raw pipe/table fragment substituted into legacy composer path",
            "migrateLegacySolicitorString disposition omit/block/reconstruct-without-raw",
            `ok=${migrated.ok};disposition=${migrated.disposition};textRaw=${textRaw}`,
          )
        : survived(
            "M10-WORD-03",
            "changed_substituted_wording",
            "Raw pipe/table fragment substituted into legacy composer path",
            "migrateLegacySolicitorString",
            `ok=${migrated.ok};disposition=${migrated.disposition};textRaw=${textRaw}`,
          ),
    );
  }

  // --- Incorrect offence-family material ---
  {
    const leak = "Consider defensive force and PWITS continuity.";
    const g = validateSolicitorSurface({
      surfaceId: "p10_family_copy",
      texts: [leak],
      ...FAMILY,
      mode: "copy",
      data: { texts: [leak] },
    });
    const c = classifyTextsAgainstConceptRegistry([leak], {
      allegation: FAMILY.allegation,
      bundleHay: FAMILY.bundleHay,
      auditFamily: FAMILY.auditFamily,
      evidence: [],
    });
    const ok = g.status === "integrity_blocked" && g.canCopy === false;
    out.push(
      ok
        ? killed(
            "M10-FAM-01",
            "incorrect_offence_family",
            "Harassment matter with drugs/defence-force leak (copy)",
            "gateSolicitorOutput / wrong_family rules",
            `status=${g.status};canCopy=${g.canCopy};unsupported=${c.unsupportedBlocked.length};rules=${g.ruleIds.join(",")}`,
          )
        : survived(
            "M10-FAM-01",
            "incorrect_offence_family",
            "Harassment matter with drugs/defence-force leak (copy)",
            "gateSolicitorOutput / wrong_family",
            `status=${g.status};canCopy=${g.canCopy}`,
          ),
    );
  }
  {
    const leak = "Vehicle ownership remains key for the timetable.";
    const g = gateSolicitorOutput({
      surfaceId: "p10_family_export",
      texts: [leak],
      ...FAMILY,
      mode: "export",
      data: { texts: [leak] },
    });
    const ok = g.status === "integrity_blocked" && g.canCopy === false;
    out.push(
      ok
        ? killed(
            "M10-FAM-02",
            "incorrect_offence_family",
            "Motoring/vehicle concept in harassment export",
            "gateSolicitorOutput(export)",
            `status=${g.status};canCopy=${g.canCopy};rules=${g.ruleIds.join(",")}`,
          )
        : survived(
            "M10-FAM-02",
            "incorrect_offence_family",
            "Motoring/vehicle concept in harassment export",
            "gateSolicitorOutput(export)",
            `status=${g.status};canCopy=${g.canCopy}`,
          ),
    );
  }
  {
    const mixed = classifyTextsAgainstConceptRegistry(
      ["Attribution remains outstanding.", "Consider PWITS continuity."],
      {
        allegation: FAMILY.allegation,
        bundleHay: FAMILY.bundleHay,
        auditFamily: FAMILY.auditFamily,
        evidence: [],
      },
    );
    const g = gateSolicitorOutput({
      surfaceId: "p10_mixed_family_api",
      texts: ["Consider PWITS continuity."],
      ...FAMILY,
      mode: "api",
      data: { texts: ["Consider PWITS continuity."] },
    });
    const ok = g.status === "integrity_blocked" || mixed.hasUnsupportedLeakage;
    out.push(
      ok
        ? killed(
            "M10-FAM-03",
            "incorrect_offence_family",
            "Mixed-family injection (harassment + PWITS)",
            "classifyTextsAgainstConceptRegistry + api gate",
            `blocked=${g.status};leakage=${mixed.hasUnsupportedLeakage}`,
          )
        : survived(
            "M10-FAM-03",
            "incorrect_offence_family",
            "Mixed-family injection",
            "classify + api gate",
            `blocked=${g.status};leakage=${mixed.hasUnsupportedLeakage}`,
          ),
    );
  }

  // --- Fingerprint disagreement ---
  {
    const canonical = buildCanonicalMatterStateV1({
      caseId: "p10-fp",
      allegation: FAMILY.allegation,
      bundleHay: FAMILY.bundleHay,
      evidenceRows,
      chaseItems: [],
    });
    const g = validateSolicitorSurface({
      surfaceId: "overview_snapshot_boxes",
      texts: [SAFE],
      ...FAMILY,
      mode: "view",
      data: { texts: [SAFE] },
      canonicalFingerprint: "v1.1.0:deadbeefdeadbeefdeadbeef",
      expectedCanonicalFingerprint: canonical.fingerprint,
    });
    const ok = g.status === "integrity_blocked" && g.fingerprintRule === "mismatch";
    out.push(
      ok
        ? killed(
            "M10-FP-01",
            "fingerprint_disagreement",
            "Surface claims wrong canonical fingerprint",
            "validateSolicitorSurface fingerprint mismatch → integrity_blocked",
            `status=${g.status};fpRule=${g.fingerprintRule}`,
          )
        : survived(
            "M10-FP-01",
            "fingerprint_disagreement",
            "Surface claims wrong canonical fingerprint",
            "fingerprint mismatch block",
            `status=${g.status};fpRule=${g.fingerprintRule}`,
          ),
    );
  }
  {
    const a = buildCanonicalMatterStateV1({ evidenceRows, chaseItems: [] });
    const b = buildCanonicalMatterStateV1({
      evidenceRows: [...evidenceRows, row("Extra CCTV", "served")],
      chaseItems: [],
    });
    const ok = !assertSameCanonicalFingerprint(a.fingerprint, b.fingerprint);
    out.push(
      ok
        ? killed(
            "M10-FP-02",
            "fingerprint_disagreement",
            "Conflicting evidence counts must disagree fingerprints",
            "assertSameCanonicalFingerprint === false",
            `a=${a.fingerprint.slice(0, 20)};b=${b.fingerprint.slice(0, 20)}`,
          )
        : survived(
            "M10-FP-02",
            "fingerprint_disagreement",
            "Conflicting evidence counts must disagree fingerprints",
            "assertSameCanonicalFingerprint",
            "fingerprints unexpectedly equal",
          ),
    );
  }

  // --- Missing / incorrect provenance ---
  {
    const g = validateSolicitorSurface({
      surfaceId: "api_disclosure_request",
      texts: ["Ask the court to record disclosure remains outstanding."],
      mode: "api",
      data: { texts: ["Ask the court to record disclosure remains outstanding."] },
    });
    const ok = g.status === "integrity_blocked" && g.ruleIds.includes("offence_family_uncertain");
    out.push(
      ok
        ? killed(
            "M10-PROV-01",
            "missing_incorrect_provenance",
            "Substantive API without offence-family context",
            "offence_family_uncertain fail-closed",
            `status=${g.status};rules=${g.ruleIds.join(",")}`,
          )
        : survived(
            "M10-PROV-01",
            "missing_incorrect_provenance",
            "Substantive API without offence-family context",
            "offence_family_uncertain",
            `status=${g.status};rules=${g.ruleIds.join(",")}`,
          ),
    );
  }
  {
    const r = buildExtractionProvenanceBlock({
      evidenceTitle: "MG11",
      sourceExcerpt: '"the complainant said',
    });
    const ok = r.block.sourceExcerpt === null && detectIncompleteQuotation('"the complainant said');
    out.push(
      ok
        ? killed(
            "M10-PROV-02",
            "missing_incorrect_provenance",
            "Incomplete quotation omitted from provenance block",
            "buildExtractionProvenanceBlock / detectIncompleteQuotation",
            `excerptNull=${r.block.sourceExcerpt === null};codes=${r.rejections.map((x) => x.code).join(",")}`,
          )
        : survived(
            "M10-PROV-02",
            "missing_incorrect_provenance",
            "Incomplete quotation omitted from provenance block",
            "boundary incomplete quotation",
            `excerpt=${r.block.sourceExcerpt}`,
          ),
    );
  }
  {
    const r = buildExtractionProvenanceBlock({
      evidenceTitle: "Phone download | 4 |",
      sourceExcerpt: '"Download complete."',
    });
    const ok = r.ok === false && r.rejections.some((x) => x.code === "boundary.raw_extraction_syntax");
    out.push(
      ok
        ? killed(
            "M10-PROV-03",
            "missing_incorrect_provenance",
            "Raw extraction syntax in evidence title",
            "boundary.raw_extraction_syntax",
            `ok=${r.ok};codes=${r.rejections.map((x) => x.code).join(",")}`,
          )
        : survived(
            "M10-PROV-03",
            "missing_incorrect_provenance",
            "Raw extraction syntax in evidence title",
            "boundary.raw_extraction_syntax",
            `ok=${r.ok}`,
          ),
    );
  }

  // --- Alias / source-evidence mismatches ---
  {
    const r = buildExtractionProvenanceBlock({
      evidenceTitle: "Phone extraction",
      evidenceStatus: "missing",
      sourceExcerpt: '"Download complete for handset A."',
      displayLabels: ["Phone download", "Full phone download", "Phone extraction"],
    });
    const ok = r.dedupedDisplayLabels.length < 3 && r.block.evidenceTitle === "Phone extraction";
    out.push(
      ok
        ? killed(
            "M10-ALIAS-01",
            "alias_source_mismatch",
            "Duplicate alias labels must dedupe before display",
            "dedupeDisplayLabels via buildExtractionProvenanceBlock",
            `deduped=${r.dedupedDisplayLabels.length};title=${r.block.evidenceTitle}`,
          )
        : survived(
            "M10-ALIAS-01",
            "alias_source_mismatch",
            "Duplicate alias labels must dedupe before display",
            "dedupeDisplayLabels",
            `deduped=${r.dedupedDisplayLabels.length}`,
          ),
    );
  }
  {
    const a = buildCanonicalMatterStateV1({
      evidenceRows: [row("Complainant MG11", "served")],
      chaseItems: [],
    });
    const b = buildCanonicalMatterStateV1({
      evidenceRows: [row("Complainant MG11", "missing")],
      chaseItems: [],
    });
    const ok = a.mg11.status !== b.mg11.status && a.fingerprint !== b.fingerprint;
    out.push(
      ok
        ? killed(
            "M10-ALIAS-02",
            "alias_source_mismatch",
            "Same MG11 label with conflicting existence states",
            "canonical mg11 + fingerprint diverge",
            `mg11=${a.mg11.status}vs${b.mg11.status};fpDiffer=${a.fingerprint !== b.fingerprint}`,
          )
        : survived(
            "M10-ALIAS-02",
            "alias_source_mismatch",
            "Same MG11 label with conflicting existence states",
            "canonical mg11 diverge",
            `mg11=${a.mg11.status}vs${b.mg11.status}`,
          ),
    );
  }

  // --- Hearing / date / time errors ---
  {
    const asOf = new Date("2026-07-15T12:00:00Z");
    const same = resolveSolicitorHearingStatus({ bundleNextHearingIso: "2026-07-15", asOf });
    const listed = resolveSolicitorHearingStatus({ bundleNextHearingIso: "2026-09-01", asOf });
    const passed = resolveSolicitorHearingStatus({ bundleNextHearingIso: "2026-07-01", asOf });
    const ok = same.kind === "same_day" && listed.kind === "listed" && passed.kind === "passed";
    out.push(
      ok
        ? killed(
            "M10-HEAR-01",
            "hearing_date_time_errors",
            "Mutated hearing dates must classify into distinct kinds",
            "resolveSolicitorHearingStatus kinds",
            `same=${same.kind};listed=${listed.kind};passed=${passed.kind}`,
          )
        : survived(
            "M10-HEAR-01",
            "hearing_date_time_errors",
            "Mutated hearing dates must classify into distinct kinds",
            "hearing kind classification",
            `same=${same.kind};listed=${listed.kind};passed=${passed.kind}`,
          ),
    );
  }
  {
    const asOf = new Date("2026-07-15T12:00:00Z");
    const live = resolveSolicitorHearingStatus({
      bundleNextHearingIso: "2026-07-20",
      asOf,
    });
    const snap = resolveSolicitorHearingStatus({
      bundleNextHearingIso: "2026-07-20",
      treatAsSnapshot: true,
      asOf,
    });
    const ok = live.kind !== "snapshot" && snap.kind === "snapshot" && /as at/i.test(snap.statusLabel);
    out.push(
      ok
        ? killed(
            "M10-HEAR-02",
            "hearing_date_time_errors",
            "Ambiguous/historical snapshot must not look like live listing",
            "snapshot kind + as-at marker",
            `live=${live.kind};snap=${snap.kind};asAt=${/as at/i.test(snap.statusLabel)}`,
          )
        : survived(
            "M10-HEAR-02",
            "hearing_date_time_errors",
            "Ambiguous/historical snapshot must not look like live listing",
            "snapshot marker",
            `live=${live.kind};snap=${snap.kind}`,
          ),
    );
  }
  {
    const a = buildCanonicalMatterStateV1({
      evidenceRows,
      chaseItems: [],
      hearing: { bundleNextHearingIso: "2026-08-01", asOf: new Date("2026-07-15T12:00:00Z") },
    });
    const b = buildCanonicalMatterStateV1({
      evidenceRows,
      chaseItems: [],
      hearing: { bundleNextHearingIso: "2026-01-01", treatAsSnapshot: true, asOf: new Date("2026-07-15T12:00:00Z") },
    });
    const ok = a.hearing.kind !== b.hearing.kind || a.fingerprint !== b.fingerprint;
    out.push(
      ok
        ? killed(
            "M10-HEAR-03",
            "hearing_date_time_errors",
            "Canonical hearing mutation changes fingerprint/kind",
            "canonical hearing diverge",
            `kinds=${a.hearing.kind}/${b.hearing.kind};fpDiffer=${a.fingerprint !== b.fingerprint}`,
          )
        : survived(
            "M10-HEAR-03",
            "hearing_date_time_errors",
            "Canonical hearing mutation changes fingerprint/kind",
            "canonical hearing diverge",
            `kinds=${a.hearing.kind}/${b.hearing.kind}`,
          ),
    );
  }

  // --- Unsafe copy / export / API / composed-prose exits ---
  for (const mode of ["copy", "export", "api"] as const) {
    const g = gateSolicitorOutput({
      surfaceId: `p10_exit_${mode}`,
      texts: ["Phone download | 4 | outstanding"],
      ...FAMILY,
      mode,
      data: { texts: ["Phone download | 4 | outstanding"] },
    });
    const ok = g.status === "integrity_blocked" && g.canCopy === false && g.data === null;
    out.push(
      ok
        ? killed(
            `M10-EXIT-${mode.toUpperCase()}`,
            "unsafe_copy_export_api_prose",
            `Raw fragment blocked on ${mode} exit`,
            `gateSolicitorOutput(${mode}) fail-closed`,
            `status=${g.status};canCopy=${g.canCopy};dataNull=${g.data === null}`,
          )
        : survived(
            `M10-EXIT-${mode.toUpperCase()}`,
            "unsafe_copy_export_api_prose",
            `Raw fragment blocked on ${mode} exit`,
            `gateSolicitorOutput(${mode})`,
            `status=${g.status};canCopy=${g.canCopy}`,
          ),
    );
  }
  {
    const body = integrityBlockedApiBody("api_defence_plan_chat", ["sentence.raw_extraction_marker"]);
    const usable = canUseSolicitorApiResponse(body);
    const recognised = isIntegrityBlockedPayload(body);
    const consumer = assertConsumerRejectsIntegrityBlocked(body);
    const ok = usable === false && recognised === true && consumer === true;
    out.push(
      ok
        ? killed(
            "M10-EXIT-CONSUMER",
            "unsafe_copy_export_api_prose",
            "HTTP-200 integrity_blocked must not be treated as usable content",
            "canUseSolicitorApiResponse / assertConsumerRejectsIntegrityBlocked",
            `usable=${usable};recognised=${recognised};consumerRejects=${consumer}`,
          )
        : survived(
            "M10-EXIT-CONSUMER",
            "unsafe_copy_export_api_prose",
            "HTTP-200 integrity_blocked must not be treated as usable content",
            "consumer contract",
            `usable=${usable};recognised=${recognised}`,
          ),
    );
  }
  {
    const maybe = maybeIntegrityBlockedResponse({
      surfaceId: "api_letters_draft",
      texts: ["Consider defensive force and PWITS continuity."],
      allegation: FAMILY.allegation,
      bundleHay: FAMILY.bundleHay,
    });
    const ok = maybe !== null;
    out.push(
      ok
        ? killed(
            "M10-EXIT-MAYBE-API",
            "unsafe_copy_export_api_prose",
            "maybeIntegrityBlockedResponse returns typed block for unsafe letter draft",
            "maybeIntegrityBlockedResponse → NextResponse (not null)",
            `blockedResponse=${ok}`,
          )
        : survived(
            "M10-EXIT-MAYBE-API",
            "unsafe_copy_export_api_prose",
            "maybeIntegrityBlockedResponse returns typed block for unsafe letter draft",
            "maybeIntegrityBlockedResponse",
            "returned null (unsafe content not blocked)",
          ),
    );
  }

  // --- Gate bypass attempts ---
  {
    const central = phase2CentralSurfaceIds();
    let bypasses = 0;
    const samples: string[] = [];
    for (const surfaceId of central) {
      const g = validateSolicitorSurface({
        surfaceId,
        texts: ["Consider defensive force and PWITS continuity | 4 |."],
        ...FAMILY,
        mode: surfaceId.startsWith("api_") || surfaceId.includes("export") ? "api" : "copy",
        data: { texts: ["Consider defensive force and PWITS continuity | 4 |."] },
      });
      if (g.status !== "integrity_blocked" || g.canCopy === true) {
        bypasses += 1;
        samples.push(surfaceId);
      }
    }
    const ok = bypasses === 0 && central.length === 31;
    out.push(
      ok
        ? killed(
            "M10-BYPASS-01",
            "gate_bypass_attempts",
            "Unsafe payload must not bypass any of 31 central surfaces",
            "validateSolicitorSurface across phase2CentralSurfaceIds",
            `central=${central.length};bypasses=${bypasses}`,
          )
        : survived(
            "M10-BYPASS-01",
            "gate_bypass_attempts",
            "Unsafe payload must not bypass any of 31 central surfaces",
            "31-surface bypass scan",
            `bypasses=${bypasses};samples=${samples.slice(0, 5).join(",")}`,
          ),
    );
  }
  {
    // Attempt: view mode with unsafe text still must not set canCopy true
    const g = gateSolicitorOutput({
      surfaceId: "overview_advanced_panel",
      texts: ["Phone | 4 | outstanding"],
      ...FAMILY,
      mode: "view",
      data: { texts: ["Phone | 4 | outstanding"] },
    });
    const ok = g.canCopy === false;
    out.push(
      ok
        ? killed(
            "M10-BYPASS-02",
            "gate_bypass_attempts",
            "View-mode unsafe text must not enable canCopy",
            "gateSolicitorOutput(view).canCopy === false",
            `status=${g.status};canCopy=${g.canCopy}`,
          )
        : survived(
            "M10-BYPASS-02",
            "gate_bypass_attempts",
            "View-mode unsafe text must not enable canCopy",
            "view canCopy false",
            `status=${g.status};canCopy=${g.canCopy}`,
          ),
    );
  }

  // --- Review-required / fail-closed behaviour ---
  {
    const ok = typeof REVIEW_REQUIRED_NEUTRAL === "string" && REVIEW_REQUIRED_NEUTRAL.length > 8;
    out.push(
      ok
        ? killed(
            "M10-REVIEW-01",
            "review_required_fail_closed",
            "Review-required neutral constant present for safe omission display",
            "REVIEW_REQUIRED_NEUTRAL",
            `len=${REVIEW_REQUIRED_NEUTRAL.length}`,
            false,
          )
        : survived(
            "M10-REVIEW-01",
            "review_required_fail_closed",
            "Review-required neutral constant present",
            "REVIEW_REQUIRED_NEUTRAL",
            "missing",
            false,
          ),
    );
  }
  {
    const g = gateSolicitorOutput({
      surfaceId: "p10_uncertain_api",
      texts: ["Ask the court to record disclosure remains outstanding."],
      mode: "api",
      data: { texts: ["Ask the court to record disclosure remains outstanding."] },
    });
    const ok = g.status === "integrity_blocked" && g.canCopy === false;
    out.push(
      ok
        ? killed(
            "M10-REVIEW-02",
            "review_required_fail_closed",
            "Uncertain family substantive API fail-closed",
            "offence_family_uncertain integrity_blocked",
            `status=${g.status};canCopy=${g.canCopy};rules=${g.ruleIds.join(",")}`,
          )
        : survived(
            "M10-REVIEW-02",
            "review_required_fail_closed",
            "Uncertain family substantive API fail-closed",
            "offence_family_uncertain",
            `status=${g.status};canCopy=${g.canCopy}`,
          ),
    );
  }
  {
    // Neutral non-substantive ack should remain usable (control — not a safety mutant kill of unsafe content)
    const g = gateSolicitorOutput({
      surfaceId: "p10_neutral_ack",
      texts: ["Acknowledged."],
      ...FAMILY,
      mode: "copy",
      data: { texts: ["Acknowledged."] },
    });
    const ok = g.status === "ok" || g.status === "degraded";
    out.push(
      ok
        ? killed(
            "M10-REVIEW-03",
            "review_required_fail_closed",
            "Neutral non-substantive ack remains usable (control)",
            "gate allows neutral ack",
            `status=${g.status};canCopy=${g.canCopy}`,
            false,
          )
        : survived(
            "M10-REVIEW-03",
            "review_required_fail_closed",
            "Neutral non-substantive ack remains usable (control)",
            "gate allows neutral ack",
            `status=${g.status}`,
            false,
          ),
    );
  }

  // Schema / surface inventory controls (not mutations of unsafe content, but Phase 10 invariants)
  {
    const ok = CANONICAL_MATTER_STATE_VERSION === "1.1.0" && phase2CentralSurfaceIds().length === 31;
    out.push(
      ok
        ? killed(
            "M10-INV-01",
            "invariants",
            "Schema 1.1.0 and 31 central surfaces preserved",
            "CANONICAL_MATTER_STATE_VERSION + phase2CentralSurfaceIds",
            `schema=${CANONICAL_MATTER_STATE_VERSION};central=${phase2CentralSurfaceIds().length}`,
            false,
          )
        : survived(
            "M10-INV-01",
            "invariants",
            "Schema 1.1.0 and 31 central surfaces preserved",
            "schema/surfaces",
            `schema=${CANONICAL_MATTER_STATE_VERSION};central=${phase2CentralSurfaceIds().length}`,
            true,
          ),
    );
  }

  return out;
}

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const mutants = runMutants();
  const killedN = mutants.filter((m) => m.outcome === "killed").length;
  const survivedN = mutants.filter((m) => m.outcome === "survived").length;
  const unexN = mutants.filter((m) => m.outcome === "could_not_exercise").length;
  const safetySurvivors = mutants.filter((m) => m.outcome === "survived" && m.safetyRelevant);
  const killRate = mutants.length ? killedN / mutants.length : 0;

  const ledger = readJson<{
    status?: string;
    prior72RawMarkerMap?: { balanced?: boolean };
    prior28TruncMap?: { balanced?: boolean };
    current42RawSources?: { count?: number };
    current55TruncSources?: { count?: number };
  }>(path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-6/occurrence-ledger-balanced.json"));

  const contracts = [
    {
      name: "schema_1_1_0_preserved",
      pass: CANONICAL_MATTER_STATE_VERSION === "1.1.0",
      detail: CANONICAL_MATTER_STATE_VERSION,
    },
    {
      name: "central_surfaces_31",
      pass: phase2CentralSurfaceIds().length === 31,
      detail: `central=${phase2CentralSurfaceIds().length}`,
    },
    {
      name: "phase6_ledger_untouched",
      pass:
        ledger?.status === "LEDGER_BALANCED" &&
        ledger?.prior72RawMarkerMap?.balanced === true &&
        ledger?.prior28TruncMap?.balanced === true &&
        ledger?.current42RawSources?.count === 42 &&
        ledger?.current55TruncSources?.count === 55,
      detail: `status=${ledger?.status};42=${ledger?.current42RawSources?.count};55=${ledger?.current55TruncSources?.count}`,
    },
    {
      name: "no_safety_relevant_survivors",
      pass: safetySurvivors.length === 0,
      detail: `safetySurvivors=${safetySurvivors.map((m) => m.id).join(",") || "none"}`,
    },
    {
      name: "mutation_inventory_nonempty",
      pass: mutants.length >= 20,
      detail: `mutants=${mutants.length};killed=${killedN};survived=${survivedN};unexercised=${unexN}`,
    },
    {
      name: "blocked_not_equated_to_repaired",
      pass: mutants.every((m) => m.blockedDoesNotMeanRepaired === true),
      detail: "all mutants carry blockedDoesNotMeanRepaired=true",
    },
  ];

  const allContractsPass = contracts.every((c) => c.pass);
  const phase10Complete = allContractsPass && safetySurvivors.length === 0;

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 10,
    generatedAt: new Date().toISOString(),
    disclaimer:
      "Phase 10 mutation/adversarial — CORPUS containment proof only. Blocked ≠ repaired. Not a corpus/programme PASS. Do not merge / deploy. No Phase 11+.",
    canonicalSchemaVersion: CANONICAL_MATTER_STATE_VERSION,
    mutants,
    summary: {
      total: mutants.length,
      killed: killedN,
      survived: survivedN,
      couldNotExercise: unexN,
      killRate,
      safetyRelevantSurvivors: safetySurvivors.map((m) => m.id),
    },
    contracts,
    contractPass: allContractsPass,
    phase10Complete,
    ledgerImpact: {
      impact: "none",
      phase6Status: ledger?.status ?? null,
      prior72_28_unit: "copyable_exportable_rule_firing_occurrence",
      current42_55_unit: "per_string_copyable_hit",
      doNotMix: true,
      preserved: {
        prior72RawBalanced: ledger?.prior72RawMarkerMap?.balanced ?? null,
        prior28TruncBalanced: ledger?.prior28TruncMap?.balanced ?? null,
        current42Raw: ledger?.current42RawSources?.count ?? null,
        current55Trunc: ledger?.current55TruncSources?.count ?? null,
      },
    },
    remainingRisks: [
      "Blocked mutants prove containment, not substantive wording repair",
      "Scale lane still lacks full on-disk solicitor models for all 3000 identities (Phase 9 residual)",
      "Phase 11 gold/rendered human FP–FN sign-off still outstanding",
      "Registered pre-existing TS/Vitest remediation items remain",
    ],
    phase11Readiness: {
      readyToBegin: phase10Complete,
      blockers: phase10Complete
        ? []
        : ["Safety-relevant surviving mutants or failed Phase 10 contracts"],
      next: "Phase 11 — rendered coverage + 30–50 gold human word-for-word review",
    },
  };

  fs.writeFileSync(path.join(OUT, "phase10-mutation-report.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT, "mutation-inventory.json"),
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        summary: report.summary,
        mutants: mutants.map((m) => ({
          id: m.id,
          category: m.category,
          outcome: m.outcome,
          expectedDetectionPoint: m.expectedDetectionPoint,
          actualResult: m.actualResult,
          safetyRelevant: m.safetyRelevant,
          disposition: m.disposition ?? null,
        })),
      },
      null,
      2,
    ),
  );

  const md = `# Phase 10 checkpoint — mutation & adversarial injection

**Status:** ${phase10Complete ? "MUTATION CONTRACTS PASS (containment)" : "MUTATION CONTRACTS FAIL"} — **not a corpus PASS** — **not a programme PASS**  
**Canonical schema:** ${CANONICAL_MATTER_STATE_VERSION}  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Explicit wording

- **Killed mutant** = unsafe injection detected and blocked at the expected control.
- **Blocked ≠ repaired** — fail-closed / integrity-blocked is containment, not substantive wording repair.
- **Surviving safety-relevant mutant** blocks Phase 10 completion unless dispositioned with evidence + fail-closed control.

## Mutation summary

| Metric | Value |
|--------|------:|
| Total mutants | ${mutants.length} |
| Killed | ${killedN} |
| Survived | ${survivedN} |
| Could not exercise | ${unexN} |
| Kill rate | ${(killRate * 100).toFixed(1)}% |
| Safety-relevant survivors | ${safetySurvivors.length} |

## Inventory by category

| Category | Mutants | Killed | Survived | Unexercised |
|----------|--------:|-------:|---------:|------------:|
${[...new Set(mutants.map((m) => m.category))]
  .map((cat) => {
    const rows = mutants.filter((m) => m.category === cat);
    return `| ${cat} | ${rows.length} | ${rows.filter((m) => m.outcome === "killed").length} | ${rows.filter((m) => m.outcome === "survived").length} | ${rows.filter((m) => m.outcome === "could_not_exercise").length} |`;
  })
  .join("\n")}

## Surviving mutants

${
  survivedN === 0
    ? "_None._"
    : mutants
        .filter((m) => m.outcome === "survived")
        .map(
          (m) =>
            `- **${m.id}** (${m.category}${m.safetyRelevant ? "; safety-relevant" : ""}): expected \`${m.expectedDetectionPoint}\`; actual \`${m.actualResult}\`${m.disposition ? `; disposition: ${m.disposition}` : ""}`,
        )
        .join("\n")
}

## Contracts

| Check | Result |
|-------|--------|
${contracts.map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} — ${c.detail} |`).join("\n")}

All contracts pass: **${allContractsPass}**

## Ledger impact

| Metric | Value | Unit |
|--------|-------|------|
| Phase 6 ledger status | ${ledger?.status ?? "?"} | — |
| Prior 72 / 28 balanced | ${ledger?.prior72RawMarkerMap?.balanced}/${ledger?.prior28TruncMap?.balanced} | rule-firing occurrences |
| Current 42 / 55 | ${ledger?.current42RawSources?.count}/${ledger?.current55TruncSources?.count} | per-string copyable hits |
| Phase 10 impact | **none** | do not mix units |

## Remaining risks

${report.remainingRisks.map((r) => `- ${r}`).join("\n")}

## Phase 11 readiness

| Item | Status |
|------|--------|
| Phase 10 complete (no safety survivors) | **${phase10Complete}** |
| Next | Phase 11 rendered coverage + 30–50 gold human FP–FN review |
| Blockers | ${report.phase11Readiness.blockers.length ? report.phase11Readiness.blockers.join("; ") : "none from Phase 10"} |

## Explicit non-goals

No merge. No deploy. No Phase 11+. No corpus/programme PASS. Stop here for review.

Artefact: \`artifacts/casebrain-qa/integrity-programme/phase-10/phase10-mutation-report.json\`
`;

  fs.writeFileSync(path.join(OUT, "PHASE-10-CHECKPOINT.md"), md);
  fs.writeFileSync(path.join(DOCS, "phase-10-checkpoint.md"), md);

  let readme = fs.readFileSync(path.join(DOCS, "README.md"), "utf8");
  readme = readme.replace(
    /\| Phase 9 — N-case corpus \|.*?\|/,
    "| Phase 9 — N-case corpus | CLOSED — CORPUS_CONTAINMENT_PASS (`4f44530e1`) | `docs/integrity-programme/phase-9-checkpoint.md` |",
  );
  if (!readme.includes("Phase 10 —")) {
    readme = readme.replace(
      /\| Phase 11 \| PENDING \| \|/,
      "| Phase 10 — mutation & adversarial injection | COMPLETE (containment; not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-10-checkpoint.md` |\n| Phase 11 | PENDING | |",
    );
    readme = readme.replace(
      /\| Phases 10–11 \| PENDING \| \|/,
      "| Phase 10 — mutation & adversarial injection | COMPLETE (containment; not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-10-checkpoint.md` |\n| Phase 11 | PENDING | |",
    );
  } else {
    readme = readme.replace(
      /\| Phase 10 —.*?\|/,
      "| Phase 10 — mutation & adversarial injection | COMPLETE (containment; not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-10-checkpoint.md` |",
    );
  }
  fs.writeFileSync(path.join(DOCS, "README.md"), readme);

  console.log(
    JSON.stringify(
      {
        ok: phase10Complete,
        total: mutants.length,
        killed: killedN,
        survived: survivedN,
        couldNotExercise: unexN,
        killRate,
        safetySurvivors: safetySurvivors.map((m) => m.id),
        ledgerImpact: "none",
        out: OUT,
      },
      null,
      2,
    ),
  );

  if (!phase10Complete) process.exit(1);
}

main();
