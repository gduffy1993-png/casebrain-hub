/**
 * ELD-01..14 — evidence-locked drafting version-pair evaluators against eld-version-pair.json.
 *
 * No genuine eld-version-pair.json has ever been materialised in this environment. Written
 * against the schema assumed below; exercised end-to-end in the contracts test with synthetic
 * fixtures. `not_exercised` is honest and expected when a case never went through a DRAFT/redraft
 * cycle — not every one of the 300 cases carries a version pair.
 *
 * Per spec: this evaluator accepts genuine (non-synthetic) version pairs for Stage-300 essential
 * measurement. This is a NEW, separate code path — it does not touch or loosen
 * `lib/eval/master-assurance-auditor/v2/stage300/batch4-adapters.ts`, which remains
 * synthetic-only for its own (unrelated) purpose.
 *
 * Assumed schema:
 *   {
 *     "synthetic": boolean,
 *     "before": { "sentenceReceipts": Array<{ id, text, evidenceRefs }>, "advice": string },
 *     "after":  { "sentenceReceipts": Array<{ id, text, evidenceRefs }>, "advice": string },
 *     "retained": string[], "added": string[], "removed": string[],
 *     "changed": Array<{ id: string, evidenceChanged: boolean, changeReason: string | null }>,
 *     "staleMarking": { staleIds: string[], marked: boolean } | null,
 *     "staleAcrossExits": { staleIds: string[], blockedExits: string[] } | null,
 *     "approval": { beforeExternalRelease: boolean, approvedAt: string | null } | null,
 *     "revisionHistory": Array<{ revisionId: string, status: string }> | null,
 *     "crossAudienceTruthUnchanged": boolean | null,
 *     "uncertainProvenance": Array<{ id: string, qualified: boolean }> | null,
 *     "crossExitPropagation": { exits: string[], complete: boolean } | null,
 *     "rollback": { occurred: boolean, supersededSourceRef: string | null } | null,
 *     "auditTrail": Array<{ actor: string|null, time: string|null, source: string|null, approval: string|null }> | null
 *   }
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

export function evaluateEldFamily(inputs: EssentialCaseInputs): EssentialControlResult[] {
  const raw = inputs.eldVersionPair.value;
  const controlIds: EssentialControlId[] = [
    "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS",
    "MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES",
    "MAA2-ELD-03-STALE-DRAFT-MARKING",
    "MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS",
    "MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE",
    "MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON",
    "MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL",
    "MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY",
    "MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH",
    "MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL",
    "MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED",
    "MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE",
    "MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE",
    "MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT",
  ];

  if (!raw) {
    return controlIds.map((id) =>
      notExercised(
        id,
        "eld-version-pair.json absent for this case — not all Stage-300 cases went through a DRAFT/redraft cycle; evidence-locked-drafting version-pair controls not_exercised (honest).",
      ),
    );
  }
  if (!isObj(raw)) {
    return controlIds.map((id) => notExercised(id, "eld-version-pair.json present but not a JSON object — unresolved schema, fail-closed."));
  }

  const before = isObj(raw.before) ? raw.before : null;
  const after = isObj(raw.after) ? raw.after : null;
  const beforeReceipts = before && Array.isArray(before.sentenceReceipts) ? before.sentenceReceipts : null;
  const afterReceipts = after && Array.isArray(after.sentenceReceipts) ? after.sentenceReceipts : null;

  const results: EssentialControlResult[] = [];

  // ELD-01: sentence receipts present before AND after.
  if (!beforeReceipts || !afterReceipts) {
    results.push(unresolved("MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS", ["/before/sentenceReceipts", "/after/sentenceReceipts"], "before/after.sentenceReceipts missing on one or both sides."));
  } else {
    results.push(evaluated("MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS", ["/before/sentenceReceipts", "/after/sentenceReceipts"], []));
  }

  const changed = Array.isArray(raw.changed) ? (raw.changed as Array<Record<string, unknown>>) : null;

  // ELD-02: source-change affected sentences — changed[] must be present when before/after receipts exist.
  if (!changed) {
    results.push(unresolved("MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES", ["/changed"], "changed[] missing — cannot confirm which sentences were affected by a source change."));
  } else {
    results.push(evaluated("MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES", ["/changed"], []));
  }

  // ELD-03 stale draft marking
  {
    const sm = isObj(raw.staleMarking) ? raw.staleMarking : null;
    if (!sm) results.push(unresolved("MAA2-ELD-03-STALE-DRAFT-MARKING", ["/staleMarking"], "staleMarking absent."));
    else {
      const staleIds = Array.isArray(sm.staleIds) ? sm.staleIds : [];
      const hits: EssentialHit[] = [];
      if (staleIds.length > 0 && sm.marked !== true) {
        hits.push({
          findingCode: "MAA2-ELD-03-STALE-NOT-MARKED",
          occurrenceRef: "/staleMarking",
          exactWording: "",
          plainEnglish: `${staleIds.length} stale sentence id(s) present but staleMarking.marked is not true.`,
          evidenceRefs: ["/staleMarking"],
          candidateClass: "candidate_defect",
        });
      }
      results.push(evaluated("MAA2-ELD-03-STALE-DRAFT-MARKING", ["/staleMarking"], hits));
    }
  }

  // ELD-04 stale blocked across exits
  {
    const sa = isObj(raw.staleAcrossExits) ? raw.staleAcrossExits : null;
    if (!sa) results.push(unresolved("MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS", ["/staleAcrossExits"], "staleAcrossExits absent."));
    else {
      const staleIds = Array.isArray(sa.staleIds) ? sa.staleIds : [];
      const blockedExits = Array.isArray(sa.blockedExits) ? sa.blockedExits : [];
      const hits: EssentialHit[] = [];
      if (staleIds.length > 0 && blockedExits.length === 0) {
        hits.push({
          findingCode: "MAA2-ELD-04-STALE-NOT-BLOCKED",
          occurrenceRef: "/staleAcrossExits",
          exactWording: "",
          plainEnglish: "Stale sentence ids present but no exits are recorded as blocked — stale draft content could leak to an exit.",
          evidenceRefs: ["/staleAcrossExits"],
          candidateClass: "candidate_defect",
        });
      }
      results.push(evaluated("MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS", ["/staleAcrossExits"], hits));
    }
  }

  // ELD-05 no silent rewrite/delete — detect changed entries where evidenceChanged=true but the
  // corresponding after-sentence text is byte-identical to before (silent rewrite of meaning
  // without a visible text change), or an id disappears from `after` without appearing in `removed`.
  {
    if (!changed || !beforeReceipts || !afterReceipts) {
      results.push(unresolved("MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE", ["/changed"], "changed[]/before/after receipts unavailable to assess silent rewrite."));
    } else {
      const beforeById = new Map((beforeReceipts as Array<Record<string, unknown>>).map((r) => [r.id, r]));
      const afterById = new Map((afterReceipts as Array<Record<string, unknown>>).map((r) => [r.id, r]));
      const hits: EssentialHit[] = [];
      for (const c of changed) {
        const id = c.id;
        if (c.evidenceChanged === true) {
          const b = beforeById.get(id);
          const a = afterById.get(id);
          if (b && a && b.text === a.text) {
            hits.push({
              findingCode: "MAA2-ELD-05-SILENT-REWRITE",
              occurrenceRef: `/changed/${String(id)}`,
              exactWording: String(a.text ?? ""),
              plainEnglish: `Sentence ${String(id)} marked evidenceChanged=true but the after-text is byte-identical to before — silent rewrite of underlying meaning without a visible drafting change.`,
              evidenceRefs: [`/before/sentenceReceipts`, `/after/sentenceReceipts`],
              candidateClass: "candidate_defect",
            });
          }
        }
      }
      const removed = Array.isArray(raw.removed) ? (raw.removed as unknown[]) : [];
      for (const [id] of beforeById) {
        if (!afterById.has(id) && !removed.includes(id)) {
          hits.push({
            findingCode: "MAA2-ELD-05-SILENT-DELETE",
            occurrenceRef: `/before/sentenceReceipts/${String(id)}`,
            exactWording: "",
            plainEnglish: `Sentence ${String(id)} present in before.sentenceReceipts, absent from after.sentenceReceipts, but not listed in removed[] — silent delete.`,
            evidenceRefs: ["/before/sentenceReceipts", "/removed"],
            candidateClass: "candidate_defect",
          });
        }
      }
      results.push(evaluated("MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE", ["/changed", "/removed"], hits));
    }
  }

  // ELD-06 before/after change reason
  {
    if (!changed) {
      results.push(unresolved("MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON", ["/changed"], "changed[] absent."));
    } else {
      const hits: EssentialHit[] = changed
        .filter((c) => typeof c.changeReason !== "string" || (c.changeReason as string).trim() === "")
        .map((c) => ({
          findingCode: "MAA2-ELD-06-CHANGE-REASON-MISSING",
          occurrenceRef: `/changed/${String(c.id)}`,
          exactWording: "",
          plainEnglish: `Changed sentence ${String(c.id)} lacks a changeReason.`,
          evidenceRefs: [`/changed/${String(c.id)}`],
          candidateClass: "candidate_defect" as const,
        }));
      results.push(evaluated("MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON", ["/changed"], hits));
    }
  }

  // ELD-07 solicitor approval before external
  {
    const approval = isObj(raw.approval) ? raw.approval : null;
    if (!approval) results.push(unresolved("MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL", ["/approval"], "approval absent."));
    else {
      const hits: EssentialHit[] = [];
      if (approval.beforeExternalRelease !== true) {
        hits.push({
          findingCode: "MAA2-ELD-07-NO-APPROVAL-BEFORE-EXTERNAL",
          occurrenceRef: "/approval",
          exactWording: "",
          plainEnglish: "approval.beforeExternalRelease is not true — no recorded solicitor approval prior to external release.",
          evidenceRefs: ["/approval"],
          candidateClass: "candidate_defect",
        });
      }
      results.push(evaluated("MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL", ["/approval"], hits));
    }
  }

  // ELD-08 rejected/superseded revision history
  {
    const rh = Array.isArray(raw.revisionHistory) ? raw.revisionHistory : null;
    if (!rh) results.push(unresolved("MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY", ["/revisionHistory"], "revisionHistory absent."));
    else results.push(evaluated("MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY", ["/revisionHistory"], []));
  }

  // ELD-09 audience redraft unchanged truth
  {
    const v = raw.crossAudienceTruthUnchanged;
    if (typeof v !== "boolean") results.push(unresolved("MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH", ["/crossAudienceTruthUnchanged"], "crossAudienceTruthUnchanged absent."));
    else {
      const hits: EssentialHit[] = v
        ? []
        : [
            {
              findingCode: "MAA2-ELD-09-AUDIENCE-REDRAFT-CHANGED-TRUTH",
              occurrenceRef: "/crossAudienceTruthUnchanged",
              exactWording: "false",
              plainEnglish: "crossAudienceTruthUnchanged=false — an audience-specific redraft altered the underlying truth, not just presentation.",
              evidenceRefs: ["/crossAudienceTruthUnchanged"],
              candidateClass: "candidate_defect",
            },
          ];
      results.push(evaluated("MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH", ["/crossAudienceTruthUnchanged"], hits));
    }
  }

  // ELD-10 unaffected sentences byte-identical
  {
    const retained = Array.isArray(raw.retained) ? (raw.retained as unknown[]) : null;
    if (!retained || !beforeReceipts || !afterReceipts) {
      results.push(unresolved("MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL", ["/retained"], "retained[]/before/after receipts unavailable."));
    } else {
      const beforeById = new Map((beforeReceipts as Array<Record<string, unknown>>).map((r) => [r.id, r]));
      const afterById = new Map((afterReceipts as Array<Record<string, unknown>>).map((r) => [r.id, r]));
      const hits: EssentialHit[] = [];
      for (const id of retained) {
        const b = beforeById.get(id);
        const a = afterById.get(id);
        if (b && a && b.text !== a.text) {
          hits.push({
            findingCode: "MAA2-ELD-10-RETAINED-NOT-BYTE-IDENTICAL",
            occurrenceRef: `/retained/${String(id)}`,
            exactWording: String(a.text ?? ""),
            plainEnglish: `Sentence ${String(id)} is listed as retained (unaffected) but before/after text differs.`,
            evidenceRefs: ["/before/sentenceReceipts", "/after/sentenceReceipts"],
            candidateClass: "candidate_defect",
          });
        }
      }
      results.push(evaluated("MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL", ["/retained"], hits));
    }
  }

  // ELD-11 uncertain provenance qualified
  {
    const up = Array.isArray(raw.uncertainProvenance) ? (raw.uncertainProvenance as Array<Record<string, unknown>>) : null;
    if (!up) results.push(unresolved("MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED", ["/uncertainProvenance"], "uncertainProvenance absent."));
    else {
      const hits: EssentialHit[] = up
        .filter((u) => u.qualified !== true)
        .map((u) => ({
          findingCode: "MAA2-ELD-11-UNCERTAIN-PROVENANCE-NOT-QUALIFIED",
          occurrenceRef: `/uncertainProvenance/${String(u.id)}`,
          exactWording: "",
          plainEnglish: `Sentence ${String(u.id)} has uncertain provenance but is not qualified in the drafting.`,
          evidenceRefs: [`/uncertainProvenance/${String(u.id)}`],
          candidateClass: "candidate_defect" as const,
        }));
      results.push(evaluated("MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED", ["/uncertainProvenance"], hits));
    }
  }

  // ELD-12 cross-exit propagation complete
  {
    const cep = isObj(raw.crossExitPropagation) ? raw.crossExitPropagation : null;
    if (!cep) results.push(unresolved("MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE", ["/crossExitPropagation"], "crossExitPropagation absent."));
    else {
      const hits: EssentialHit[] = cep.complete === true ? [] : [
        {
          findingCode: "MAA2-ELD-12-PROPAGATION-INCOMPLETE",
          occurrenceRef: "/crossExitPropagation",
          exactWording: "",
          plainEnglish: "crossExitPropagation.complete is not true — the version change was not confirmed propagated to every exit.",
          evidenceRefs: ["/crossExitPropagation"],
          candidateClass: "candidate_defect",
        },
      ];
      results.push(evaluated("MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE", ["/crossExitPropagation"], hits));
    }
  }

  // ELD-13 rollback superseded source
  {
    const rb = isObj(raw.rollback) ? raw.rollback : null;
    if (!rb) results.push(unresolved("MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE", ["/rollback"], "rollback absent."));
    else if (rb.occurred !== true) {
      results.push(evaluated("MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE", ["/rollback"], []));
    } else {
      const hits: EssentialHit[] =
        typeof rb.supersededSourceRef === "string" && rb.supersededSourceRef.trim()
          ? []
          : [
              {
                findingCode: "MAA2-ELD-13-ROLLBACK-NO-SUPERSEDED-REF",
                occurrenceRef: "/rollback",
                exactWording: "",
                plainEnglish: "rollback.occurred=true but supersededSourceRef is missing.",
                evidenceRefs: ["/rollback"],
                candidateClass: "candidate_defect",
              },
            ];
      results.push(evaluated("MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE", ["/rollback"], hits));
    }
  }

  // ELD-14 actor/time/source/approval audit
  {
    const trail = Array.isArray(raw.auditTrail) ? (raw.auditTrail as Array<Record<string, unknown>>) : null;
    if (!trail || trail.length === 0) {
      results.push(unresolved("MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT", ["/auditTrail"], "auditTrail absent/empty."));
    } else {
      const hits: EssentialHit[] = trail
        .map((entry, i) => ({ entry, i }))
        .filter(({ entry }) => !entry.actor || !entry.time || !entry.source || !entry.approval)
        .map(({ entry, i }) => ({
          findingCode: "MAA2-ELD-14-AUDIT-ENTRY-INCOMPLETE",
          occurrenceRef: `/auditTrail/${i}`,
          exactWording: "",
          plainEnglish: `auditTrail[${i}] is missing one of actor/time/source/approval.`,
          evidenceRefs: [`/auditTrail/${i}`],
          candidateClass: "candidate_defect" as const,
        }));
      results.push(evaluated("MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT", ["/auditTrail"], hits));
    }
  }

  return results;
}
