/**
 * VDR-01..09 — evidence-locked drafting/version-run receipt evaluators against
 * vdr-run-receipt.json.
 *
 * No genuine vdr-run-receipt.json has ever been materialised in this environment. These
 * evaluators are written against the schema assumed below (documented, not fabricated as real)
 * and exercised end-to-end in the contracts test with synthetic fixtures; on real inputs they
 * honestly report `not_exercised` until a real vdr-run-receipt.json exists for a case.
 *
 * Assumed schema:
 *   {
 *     "sourceBinarySha256": string,
 *     "casebrainOutputSha256": string,
 *     "appCommit": string,
 *     "orderedMembershipSha256": string,
 *     "corpusSchema": string,
 *     "detectorRegistryVersion": string,
 *     "modelPromptVersion": string | null,
 *     "findingIds": string[],
 *     "completenessClaimed": boolean,
 *     "dispositions": { [findingId]: { disposition: string, decidedAt: string } },
 *     "beforeAfterMapping": Array<{ before: string, after: string }>,
 *     "addedRemovedRetained": { added: string[], removed: string[], retained: string[] }
 *   }
 *
 * Rule (per spec): a missing pin is `not_exercised`/`unresolved` — never PASS. A receipt that
 * claims completeness (`completenessClaimed: true`) while a critical pin is empty is a finding.
 */

import type { EssentialCaseInputs } from "../inputs/load-essential-inputs";
import type { EssentialControlId } from "../constants";
import type { EssentialControlResult, EssentialHit } from "../types";

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function notExercised(controlId: EssentialControlId, reason: string): EssentialControlResult {
  return {
    controlId,
    namedControlExerciseStatus: "not_exercised",
    applicable: false,
    missingInputReason: reason,
    evidenceRefs: [],
    hits: [],
    backing: "capture_receipt",
    phraseProbeUsed: false,
  };
}

function unresolved(controlId: EssentialControlId, evidenceRefs: string[], reason: string): EssentialControlResult {
  return {
    controlId,
    namedControlExerciseStatus: "unresolved",
    applicable: true,
    missingInputReason: reason,
    evidenceRefs,
    hits: [],
    backing: "capture_receipt",
    phraseProbeUsed: false,
  };
}

function evaluated(controlId: EssentialControlId, evidenceRefs: string[], hits: EssentialHit[]): EssentialControlResult {
  return {
    controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    evidenceRefs,
    hits,
    backing: "capture_receipt",
    phraseProbeUsed: false,
  };
}

function completenessMismatchHit(controlId: EssentialControlId, receipt: Record<string, unknown>, field: string, ref: string): EssentialHit | null {
  const claimed = receipt.completenessClaimed === true;
  const empty =
    receipt[field] == null ||
    (Array.isArray(receipt[field]) && (receipt[field] as unknown[]).length === 0) ||
    (typeof receipt[field] === "string" && (receipt[field] as string).trim() === "");
  if (claimed && empty) {
    return {
      findingCode: `${controlId}-COMPLETENESS-CLAIMED-BUT-EMPTY`,
      occurrenceRef: ref,
      exactWording: "",
      plainEnglish: `vdr-run-receipt.json sets completenessClaimed=true while ${field} is empty — receipt claims completeness it does not evidence.`,
      evidenceRefs: [ref],
      candidateClass: "candidate_defect",
    };
  }
  return null;
}

function pinCheck(args: {
  controlId: EssentialControlId;
  receipt: Record<string, unknown>;
  field: string;
  ref: string;
  crossCheckValue?: string | null;
}): EssentialControlResult {
  const value = args.receipt[args.field];
  const present = typeof value === "string" && value.trim().length > 0;
  if (!present) {
    return unresolved(args.controlId, [args.ref], `vdr-run-receipt.json.${args.field} missing/empty — pin unresolved, not PASS.`);
  }
  const hits: EssentialHit[] = [];
  const mismatch = completenessMismatchHit(args.controlId, args.receipt, args.field, args.ref);
  if (mismatch) hits.push(mismatch);
  if (args.crossCheckValue != null && value !== args.crossCheckValue) {
    hits.push({
      findingCode: `${args.controlId}-PIN-MISMATCH`,
      occurrenceRef: args.ref,
      exactWording: String(value),
      plainEnglish: `${args.field} in vdr-run-receipt.json (${String(value)}) does not match the independently-observed value (${args.crossCheckValue}).`,
      evidenceRefs: [args.ref],
      candidateClass: "candidate_defect",
    });
  }
  return evaluated(args.controlId, [args.ref], hits);
}

export function evaluateVdrFamily(inputs: EssentialCaseInputs): EssentialControlResult[] {
  const raw = inputs.vdrRunReceipt.value;
  const controlIds: EssentialControlId[] = [
    "MAA2-VDR-01-SOURCE-CASE-HASHES",
    "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER",
    "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD",
    "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS",
    "MAA2-VDR-05-MODEL-PROMPT-VERSION",
    "MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS",
    "MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS",
    "MAA2-VDR-08-BEFORE-AFTER-MAPPING",
    "MAA2-VDR-09-ADDED-REMOVED-RETAINED",
  ];

  if (!raw) {
    return controlIds.map((id) =>
      notExercised(id, "vdr-run-receipt.json absent for this case — evidence-locked drafting version-run receipt controls not_exercised (honest; this capture receipt has never been materialised in this environment)."),
    );
  }
  if (!isObj(raw)) {
    return controlIds.map((id) => notExercised(id, "vdr-run-receipt.json present but not a JSON object — unresolved schema, fail-closed."));
  }

  const results: EssentialControlResult[] = [];
  results.push(
    pinCheck({
      controlId: "MAA2-VDR-01-SOURCE-CASE-HASHES",
      receipt: raw,
      field: "sourceBinarySha256",
      ref: "/sourceBinarySha256",
    }),
  );
  // VDR-01 secondary pin: casebrainOutputSha256 must match what we independently hashed. Only
  // meaningful once VDR-01 was actually evaluated (sourceBinarySha256 present).
  if (results[0].namedControlExerciseStatus === "evaluated") {
    const declared = typeof raw.casebrainOutputSha256 === "string" ? raw.casebrainOutputSha256 : null;
    if (declared && inputs.casebrainOutputSha256 && declared !== inputs.casebrainOutputSha256) {
      results[0].hits.push({
        findingCode: "MAA2-VDR-01-CASEBRAIN-OUTPUT-SHA-MISMATCH",
        occurrenceRef: "/casebrainOutputSha256",
        exactWording: declared,
        plainEnglish: `vdr-run-receipt.json.casebrainOutputSha256 (${declared}) does not match the casebrain-output.json actually loaded for this case (${inputs.casebrainOutputSha256}).`,
        evidenceRefs: ["/casebrainOutputSha256"],
        candidateClass: "candidate_defect",
      });
    } else if (!declared) {
      results[0].hits.push({
        findingCode: "MAA2-VDR-01-CASEBRAIN-OUTPUT-SHA-MISSING",
        occurrenceRef: "/casebrainOutputSha256",
        exactWording: "",
        plainEnglish: "vdr-run-receipt.json does not carry casebrainOutputSha256 — source/output hash pinning incomplete.",
        evidenceRefs: ["/casebrainOutputSha256"],
        candidateClass: "candidate_defect",
      });
    }
  }
  results.push(pinCheck({ controlId: "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER", receipt: raw, field: "orderedMembershipSha256", ref: "/orderedMembershipSha256" }));
  results.push(pinCheck({ controlId: "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD", receipt: raw, field: "appCommit", ref: "/appCommit" }));
  {
    const corpusOk = typeof raw.corpusSchema === "string" && raw.corpusSchema.trim().length > 0;
    const detOk = typeof raw.detectorRegistryVersion === "string" && raw.detectorRegistryVersion.trim().length > 0;
    if (!corpusOk || !detOk) {
      results.push(
        unresolved(
          "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS",
          ["/corpusSchema", "/detectorRegistryVersion"],
          `Missing pin(s): ${!corpusOk ? "corpusSchema " : ""}${!detOk ? "detectorRegistryVersion" : ""}`.trim(),
        ),
      );
    } else {
      results.push(evaluated("MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS", ["/corpusSchema", "/detectorRegistryVersion"], []));
    }
  }
  {
    const mpv = raw.modelPromptVersion;
    if (mpv == null) {
      results.push(unresolved("MAA2-VDR-05-MODEL-PROMPT-VERSION", ["/modelPromptVersion"], "modelPromptVersion missing/null — optional pin unresolved, not PASS."));
    } else {
      results.push(evaluated("MAA2-VDR-05-MODEL-PROMPT-VERSION", ["/modelPromptVersion"], []));
    }
  }
  {
    const findingIds = Array.isArray(raw.findingIds) ? raw.findingIds : null;
    if (!findingIds) {
      results.push(unresolved("MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS", ["/findingIds"], "findingIds missing/not an array."));
    } else {
      const hits: EssentialHit[] = [];
      const m = completenessMismatchHit("MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS", raw, "findingIds", "/findingIds");
      if (m) hits.push(m);
      results.push(evaluated("MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS", ["/findingIds"], hits));
    }
  }
  {
    const dispositions = raw.dispositions;
    if (!isObj(dispositions) || Object.keys(dispositions).length === 0) {
      results.push(unresolved("MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS", ["/dispositions"], "dispositions missing/empty."));
    } else {
      const missingTimestamp = Object.entries(dispositions).filter(([, v]) => !isObj(v) || typeof v.decidedAt !== "string");
      const hits: EssentialHit[] = missingTimestamp.map(([k]) => ({
        findingCode: "MAA2-VDR-07-DISPOSITION-MISSING-TIMESTAMP",
        occurrenceRef: `/dispositions/${k}`,
        exactWording: "",
        plainEnglish: `Disposition ${k} lacks a decidedAt timestamp.`,
        evidenceRefs: [`/dispositions/${k}`],
        candidateClass: "candidate_defect",
      }));
      results.push(evaluated("MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS", ["/dispositions"], hits));
    }
  }
  {
    const mapping = raw.beforeAfterMapping;
    if (!Array.isArray(mapping) || mapping.length === 0) {
      results.push(unresolved("MAA2-VDR-08-BEFORE-AFTER-MAPPING", ["/beforeAfterMapping"], "beforeAfterMapping missing/empty."));
    } else {
      results.push(evaluated("MAA2-VDR-08-BEFORE-AFTER-MAPPING", ["/beforeAfterMapping"], []));
    }
  }
  {
    const arr = raw.addedRemovedRetained;
    if (!isObj(arr) || !Array.isArray(arr.added) || !Array.isArray(arr.removed) || !Array.isArray(arr.retained)) {
      results.push(unresolved("MAA2-VDR-09-ADDED-REMOVED-RETAINED", ["/addedRemovedRetained"], "addedRemovedRetained missing or incomplete (added/removed/retained arrays required)."));
    } else {
      results.push(evaluated("MAA2-VDR-09-ADDED-REMOVED-RETAINED", ["/addedRemovedRetained"], []));
    }
  }

  return results;
}
