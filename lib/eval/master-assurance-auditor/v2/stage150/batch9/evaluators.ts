/**
 * Batch-9 evaluators — behavioural-proof remediation.
 * Implementation class ≠ execution availability. Stubs never invent from prose.
 */

import type { Stage150EvalContext, Stage150Hit } from "../detectors";
import { adaptAllBatch8 } from "../batch8/adapters";
import type {
  Batch8AdapterId,
  Batch8AdapterResult,
  Batch8CapabilityStatus,
  ChargeInstrumentRecord,
  ChaseRelationshipRecord,
  ChronologyEventRecord,
  EvidenceUnitRecord,
  ExitSnapshotRecord,
  ProvenanceRecord,
} from "../batch8/schemas";
import { BATCH9_CONTROL_SPECS, BATCH9_SPEC_BY_ID } from "./control-specs";
import {
  BATCH9_EXTRA_STRUCTURED_FIELD_CONTROLS,
  countsAsNamedEvaluator,
  type Batch9ControlSpec,
  type Batch9NamedExerciseStatus,
} from "./schemas";

function hit(
  spec: Batch9ControlSpec,
  args: {
    occurrenceRef: string;
    exactWording?: string;
    plainEnglish: string;
    evidenceRefs: string[];
    candidateClass?: Stage150Hit["candidateClass"];
  },
): Stage150Hit {
  return {
    engineId: spec.engineId,
    handlerId: spec.handlerId,
    controlId: spec.controlId,
    findingCode: spec.findingCode,
    occurrenceRef: args.occurrenceRef,
    exactWording: args.exactWording ?? "",
    candidateClass: args.candidateClass ?? "candidate_defect",
    plainEnglish: args.plainEnglish,
    evidenceRefs: args.evidenceRefs,
  };
}

function capabilityRank(s: Batch8CapabilityStatus): number {
  if (s === "eligible") return 2;
  if (s === "partial") return 1;
  return 0;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function exitBag(output: Record<string, unknown>): Record<string, unknown> | null {
  return isObj(output.exitPayloadReceipts) ? output.exitPayloadReceipts : null;
}

function hasChargeWarningAttached(output: Record<string, unknown>): boolean {
  const bag = exitBag(output);
  if (!bag) return false;
  const ids = ["view", "copy", "export", "api", "pdf", "composed_prose", "authenticated_browser"];
  return ids.every((id) => {
    const raw = bag[id];
    return (
      isObj(raw) &&
      typeof raw.payloadIdentity === "string" &&
      raw.payloadIdentity.trim() &&
      typeof raw.chargeWarningAttached === "boolean"
    );
  });
}

function hasEvidencePartialWarning(output: Record<string, unknown>): boolean {
  const bag = exitBag(output);
  if (!bag) return false;
  return Object.values(bag).some(
    (raw) => isObj(raw) && typeof raw.evidencePartialWarning === "boolean" && typeof raw.payloadIdentity === "string",
  );
}

function hasQuarantineScope(output: Record<string, unknown>): boolean {
  const bag = exitBag(output);
  if (!bag) return false;
  return Object.values(bag).some(
    (raw) =>
      isObj(raw) &&
      typeof raw.payloadIdentity === "string" &&
      (raw.quarantineScope === "partial" || raw.quarantineScope === "total"),
  );
}

function instrumentsHaveStatementClassification(output: Record<string, unknown>): boolean {
  const bag = output.chargeInstruments;
  if (!Array.isArray(bag) || bag.length === 0) return false;
  return bag.every((r) => isObj(r) && typeof r.statementClassification === "string");
}

function instrumentsHaveLegalStateRole(output: Record<string, unknown>): boolean {
  const bag = output.chargeInstruments;
  if (!Array.isArray(bag) || bag.length === 0) return false;
  return bag.every((r) => isObj(r) && typeof r.legalStateRole === "string");
}

function hasQuotationBinding(output: Record<string, unknown>): boolean {
  const states = Array.isArray(output.evidenceStates) ? output.evidenceStates : [];
  return states.some(
    (r) =>
      isObj(r) &&
      (typeof r.quotationExactText === "string" || typeof r.quotedSpan === "string") &&
      r.pageIdentityKnown === true,
  );
}

function hasPageDocTotals(output: Record<string, unknown>): boolean {
  return isObj(output.pageDocEvidenceTotals) || (Array.isArray(output.pageDocEvidenceTotals) && output.pageDocEvidenceTotals.length > 0);
}

/** Extra structured fields required beyond adapter eligibility for coupled controls. */
export function extraStructuredPrerequisitesMet(
  spec: Batch9ControlSpec,
  output: Record<string, unknown>,
): boolean {
  switch (spec.controlId) {
    case "MAA2-CHG-10-WARNING-INSEPARABLE":
    case "MAA2-XEX-01-CHARGE-WARNING-ATTACHED":
      return hasChargeWarningAttached(output) && Array.isArray(output.chargeInstruments) && output.chargeInstruments.length > 0;
    case "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING":
      return hasEvidencePartialWarning(output);
    case "MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL":
      return hasQuarantineScope(output);
    case "MAA2-LSL-01-STATEMENT-CLASSIFICATION":
      return instrumentsHaveStatementClassification(output);
    case "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING":
      return instrumentsHaveLegalStateRole(output);
    case "MAA2-FID-10-QUOTATION-FIDELITY":
      return hasQuotationBinding(output);
    case "MAA2-CHR-09-PAGE-DOC-EVIDENCE-TOTALS":
      return hasPageDocTotals(output);
    default:
      return true;
  }
}

export function adapterMeetsPrerequisite(
  spec: Batch9ControlSpec,
  adapter: Batch8AdapterResult<unknown>,
  output: Record<string, unknown>,
): { ok: boolean; reason: string | null; exerciseStatus: Batch9NamedExerciseStatus } {
  if (
    spec.evaluatorImplementationClass === "foundation_stub" ||
    spec.evaluatorImplementationClass === "family_proxy_only"
  ) {
    return {
      ok: false,
      reason: `${spec.evaluatorImplementationClass} — does not count as named evaluator; ${spec.missingInputReason}`,
      exerciseStatus: "not_exercised",
    };
  }

  if (BATCH9_EXTRA_STRUCTURED_FIELD_CONTROLS.has(spec.controlId)) {
    if (!extraStructuredPrerequisitesMet(spec, output)) {
      return { ok: false, reason: spec.missingInputReason, exerciseStatus: "not_exercised" };
    }
  }

  // XEX-08 adapter-integrity: needs materialised exit surface (payload or metadata receipts).
  if (spec.controlId === "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED") {
    const exitRecords = adapter.records as ExitSnapshotRecord[];
    if (
      exitRecords.length === 0 ||
      exitRecords.every((r) => !r.realExitPayloadPresent && !r.metadataOnly)
    ) {
      return { ok: false, reason: spec.missingInputReason, exerciseStatus: "not_exercised" };
    }
    return { ok: true, reason: null, exerciseStatus: "evaluated" };
  }

  if (capabilityRank(adapter.capabilityStatus) < capabilityRank(spec.minAdapterCapability)) {
    return { ok: false, reason: spec.missingInputReason, exerciseStatus: "not_exercised" };
  }
  if (spec.requireCompleteRecords) {
    if (adapter.capabilityStatus !== "eligible") {
      return { ok: false, reason: spec.missingInputReason, exerciseStatus: "not_exercised" };
    }
    if (adapter.applicableRecordCount === 0 || adapter.incompleteRecordCount > 0) {
      return {
        ok: false,
        reason: `${spec.missingInputReason} (incompleteRecordCount=${adapter.incompleteRecordCount})`,
        exerciseStatus: "not_exercised",
      };
    }
  }
  if (adapter.applicableRecordCount === 0 && adapter.records.length === 0) {
    return { ok: false, reason: spec.missingInputReason, exerciseStatus: "not_exercised" };
  }
  return { ok: true, reason: null, exerciseStatus: "evaluated" };
}

function evaluateCharge(
  spec: Batch9ControlSpec,
  records: ChargeInstrumentRecord[],
  output: Record<string, unknown>,
): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  if (spec.controlId === "MAA2-CHG-10-WARNING-INSEPARABLE") {
    const bag = exitBag(output);
    if (!bag) return hits;
    for (const exitId of ["view", "copy", "export", "api", "pdf", "composed_prose", "authenticated_browser"]) {
      const raw = bag[exitId];
      if (!isObj(raw) || typeof raw.payloadIdentity !== "string") continue;
      if (raw.chargeWarningAttached !== true) {
        hits.push(
          hit(spec, {
            occurrenceRef: `/exitPayloadReceipts/${exitId}/chargeWarningAttached`,
            exactWording: exitId,
            plainEnglish: `Charge warning not attached on genuine ${exitId} exit while instruments present.`,
            evidenceRefs: [`/exitPayloadReceipts/${exitId}`, "/chargeInstruments"],
          }),
        );
      }
    }
    return hits;
  }

  for (const r of records) {
    const ref = r.occurrenceRef ?? "/chargeInstruments";
    const wording = r.exactWording ?? "";
    switch (spec.controlId) {
      case "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE":
        if (!r.sourceDocument || /^(unknown|n\/a|tbd|none|not\s*recorded)$/i.test(r.sourceDocument.trim())) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: wording,
              plainEnglish: "Complete instrument missing recorded sourceDocument.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-CHG-02-DEFENDANT-COUNT-ALLOC":
        if (
          r.count == null ||
          r.count === 0 ||
          !r.defendantAllocation ||
          /^(unknown|unallocated|tbd|none)$/i.test(r.defendantAllocation.trim())
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: wording,
              plainEnglish: "Instrument missing count or defendantAllocation.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-CHG-04-COMPLETE-NOT-TRUNCATED":
        if (wording && /[A-Za-z]{3,}-\s*$/.test(wording)) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: wording,
              plainEnglish: "Structured exactWording appears mid-truncated.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-CHG-05-OPERATIVE-INSTRUMENT": {
        const status = r.status ?? "";
        // Amended may be operative. Defect only when draft is simultaneously claimed operative.
        if (/\bdraft\b/i.test(status) && /\boperative\b/i.test(status)) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: status,
              plainEnglish: "Draft status simultaneously claimed operative.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-CHG-06-AMENDMENT-HISTORY":
        if ((r.replacesInstrumentId || r.supersededByInstrumentId) && !r.version) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: wording,
              plainEnglish: "Supersession link present without version history.",
              evidenceRefs: [ref],
            }),
          );
        } else if (r.replacesInstrumentId && r.replacesInstrumentId === r.instrumentId) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: wording,
              plainEnglish: "Instrument claims to replace itself — amendment history broken.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-LSL-01-STATEMENT-CLASSIFICATION": {
        const row = isObj(output.chargeInstruments) ? null : null;
        void row;
        const bag = Array.isArray(output.chargeInstruments) ? output.chargeInstruments : [];
        const src = bag.find((x) => isObj(x) && x.instrumentId === r.instrumentId);
        const cls = isObj(src) && typeof src.statementClassification === "string" ? src.statementClassification : null;
        if (cls === "allegation_as_fact") {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: cls,
              plainEnglish: "Structured statementClassification marks allegation_as_fact.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING": {
        const bag = Array.isArray(output.chargeInstruments) ? output.chargeInstruments : [];
        const src = bag.find((x) => isObj(x) && x.instrumentId === r.instrumentId);
        const role = isObj(src) && typeof src.legalStateRole === "string" ? src.legalStateRole : null;
        if (role === "submission_as_finding") {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: role,
              plainEnglish: "Structured legalStateRole elevates submission to finding.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-BND-02-INSTRUMENT-STATUS":
        if (!r.status || /^(unknown|n\/a|tbd|none)$/i.test(r.status.trim())) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: wording,
              plainEnglish: "Instrument missing status.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-BND-03-REPLACEMENT-LINKS":
        if (
          r.replacesInstrumentId &&
          r.supersededByInstrumentId &&
          r.replacesInstrumentId === r.supersededByInstrumentId
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: wording,
              plainEnglish: "Instrument replaces and is superseded by the same id.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-BND-04-VERSION-PRECEDENCE":
        if (r.version && r.replacesInstrumentId === r.instrumentId) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: String(r.version),
              plainEnglish: "Version precedence self-cycle detected.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      default:
        break;
    }
  }
  return hits;
}

function isExtractFullCapable(r: EvidenceUnitRecord): boolean {
  if (r.extractFullRelationship) return true;
  const blob = `${r.evidenceTypeOrModality ?? ""} ${r.label ?? ""}`.toLowerCase();
  return /\b(extract|full)\b/.test(blob);
}

function isVersionStateRelevant(r: EvidenceUnitRecord): boolean {
  if (r.draftFinalRelationship) return true;
  const blob = `${r.evidenceTypeOrModality ?? ""} ${r.label ?? ""}`.toLowerCase();
  return /\b(draft|signed|final|unsigned)\b/.test(blob);
}

function evaluateEvidence(spec: Batch9ControlSpec, records: EvidenceUnitRecord[]): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  if (spec.controlId === "MAA2-BND-07-ALIAS-SAFE-COLLAPSE") {
    const byAlias = new Map<string, EvidenceUnitRecord[]>();
    for (const r of records) {
      for (const a of r.aliases) {
        const key = a.trim().toLowerCase();
        if (!key) continue;
        const list = byAlias.get(key) ?? [];
        list.push(r);
        byAlias.set(key, list);
      }
      if (r.aliases.length > 0 && !r.evidenceUnitId) {
        hits.push(
          hit(spec, {
            occurrenceRef: r.occurrenceRef,
            exactWording: r.label ?? "",
            plainEnglish: "Aliases present without evidenceUnitId — unsafe collapse risk.",
            evidenceRefs: [r.occurrenceRef],
          }),
        );
      }
    }
    for (const [alias, group] of byAlias) {
      const ids = new Set(group.map((g) => g.evidenceUnitId).filter(Boolean));
      if (ids.size > 1) {
        hits.push(
          hit(spec, {
            occurrenceRef: group[0]!.occurrenceRef,
            exactWording: alias,
            plainEnglish: `Alias "${alias}" shared across distinct evidenceUnitIds — unsafe collapse.`,
            evidenceRefs: group.map((g) => g.occurrenceRef),
          }),
        );
      }
    }
    return hits;
  }

  for (const r of records) {
    const ref = r.occurrenceRef;
    const label = r.label ?? "";
    switch (spec.controlId) {
      case "MAA2-ATR-01-DEFENDANT-SEPARATION":
      case "MAA2-ATR-08-NO-DEFENDANT-BLEED": {
        const def = r.subjectDefendantId || r.personId || "";
        if (
          !r.evidenceUnitId ||
          !def ||
          /^(mixed|multiple|all|unknown|tbd)$/i.test(def.trim()) ||
          /[,+/]| and /i.test(def)
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: label,
              plainEnglish: "Evidence unit missing identity binding for defendant separation.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-BND-08-EXTRACT-VS-FULL": {
        if (!isExtractFullCapable(r)) break;
        const blob = `${r.evidenceTypeOrModality ?? ""} ${label}`.toLowerCase();
        if (!r.extractFullRelationship && /\bextract\b/.test(blob) && /\bfull\b/.test(blob)) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: label,
              plainEnglish: "Extract and full collapsed without extractFullRelationship.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-BND-09-STILL-CLIP-VS-MASTER": {
        const mod = `${r.evidenceTypeOrModality ?? ""} ${label}`.toLowerCase();
        if (
          /\b(still|clip)\b/.test(mod) &&
          /\bmaster\b/.test(mod) &&
          !/\b(missing|absent|referred)\b/.test(mod)
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: label,
              plainEnglish: "Still/clip collapsed with master without absence cue.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-BND-10-RECORDING-VS-TRANSCRIPT": {
        const mod = `${r.evidenceTypeOrModality ?? ""} ${label}`.toLowerCase();
        if (
          /\brecording\b/.test(mod) &&
          /\btranscript\b/.test(mod) &&
          !/\b(vs|versus|distinct|separate)\b/.test(mod)
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: label,
              plainEnglish: "Recording and transcript collapsed without distinction.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-BND-11-DRAFT-VS-SIGNED": {
        if (!isVersionStateRelevant(r)) break;
        const blob = `${r.evidenceTypeOrModality ?? ""} ${label}`.toLowerCase();
        if (
          !r.draftFinalRelationship &&
          /\bdraft\b/.test(blob) &&
          /\b(signed|final)\b/.test(blob)
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: label,
              plainEnglish: "Draft and signed/final collapsed without draftFinalRelationship.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-EVS-04-REASON-TAXONOMY": {
        const exist = (r.existence ?? "").toLowerCase();
        if (
          /\b(unknown|unclear)\b/.test(exist) &&
          !/\b(pending|awaiting|referred|taxonomy|because)\b/.test(exist + label)
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: `${r.existence ?? ""} ${label}`,
              plainEnglish: "Unknown/unclear existence without taxonomy reason.",
              evidenceRefs: [ref],
              candidateClass: "unresolved",
            }),
          );
        }
        break;
      }
      default:
        break;
    }
  }
  return hits;
}

/** Procedural stage rank — lower occurs earlier. Unknown types skipped. */
function stageRank(eventType: string | null): number | null {
  if (!eventType) return null;
  const t = eventType.toLowerCase();
  if (/\barrest\b/.test(t)) return 10;
  if (/\bcustody\b/.test(t)) return 20;
  if (/\binterview\b/.test(t)) return 30;
  if (/\bcharge\b/.test(t)) return 40;
  if (/\bnotice\b/.test(t)) return 50;
  if (/\bhearing\b/.test(t)) return 60;
  if (/\bsentence|disposal\b/.test(t)) return 70;
  return null;
}

function evaluateChronology(spec: Batch9ControlSpec, records: ChronologyEventRecord[]): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  if (spec.controlId === "MAA2-CHR-03-IMPOSSIBLE-CHRONOLOGY") {
    const typed = records
      .map((r) => ({
        r,
        rank: stageRank(r.eventType),
        t: r.timestamp ? Date.parse(r.timestamp) : NaN,
      }))
      .filter((x) => x.rank != null && !Number.isNaN(x.t)) as Array<{
      r: ChronologyEventRecord;
      rank: number;
      t: number;
    }>;
    for (let i = 0; i < typed.length; i++) {
      for (let j = i + 1; j < typed.length; j++) {
        const a = typed[i]!;
        const b = typed[j]!;
        // Earlier stage with later timestamp than a later stage → impossible
        if (a.rank < b.rank && a.t > b.t) {
          hits.push(
            hit(spec, {
              occurrenceRef: a.r.occurrenceRef ?? "/chronologyEvents",
              exactWording: `${a.r.eventType}@${a.r.timestamp} vs ${b.r.eventType}@${b.r.timestamp}`,
              plainEnglish: `Impossible chronology: ${a.r.eventType} after ${b.r.eventType} by timestamp.`,
              evidenceRefs: [a.r.occurrenceRef ?? "", b.r.occurrenceRef ?? ""].filter(Boolean),
            }),
          );
        } else if (b.rank < a.rank && b.t > a.t) {
          hits.push(
            hit(spec, {
              occurrenceRef: b.r.occurrenceRef ?? "/chronologyEvents",
              exactWording: `${b.r.eventType}@${b.r.timestamp} vs ${a.r.eventType}@${a.r.timestamp}`,
              plainEnglish: `Impossible chronology: ${b.r.eventType} after ${a.r.eventType} by timestamp.`,
              evidenceRefs: [a.r.occurrenceRef ?? "", b.r.occurrenceRef ?? ""].filter(Boolean),
            }),
          );
        }
      }
    }
    return hits;
  }

  for (const r of records) {
    const ref = r.occurrenceRef ?? "/chronologyEvents";
    switch (spec.controlId) {
      case "MAA2-CHR-01-EXACT-DATES-TZ":
        if (
          !r.timestamp ||
          !r.timezone ||
          /^(local|unknown|tbd|none)$/i.test(r.timezone.trim())
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.timestamp ?? "",
              plainEnglish: "Chronology event missing timestamp or timezone.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-CHR-02-COMPETING-TIMESTAMPS":
        if (r.competingEventGroupId && !r.confidence) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.competingEventGroupId,
              plainEnglish: "Competing event group without confidence.",
              evidenceRefs: [ref],
              candidateClass: "unresolved",
            }),
          );
        }
        break;
      case "MAA2-CHR-04-CUSTODY-INTERVIEW-TIMING": {
        if (r.eventType && /\b(custody|interview)\b/i.test(r.eventType) && !r.timestamp) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.eventType,
              plainEnglish: "Custody/interview event missing timestamp.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      }
      case "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE":
        if (r.eventType && /\b(hearing|notice)\b/i.test(r.eventType) && !r.timestamp) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.eventType,
              plainEnglish: "Hearing/notice event missing timestamp.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      default:
        break;
    }
  }
  if (spec.controlId === "MAA2-CHR-04-CUSTODY-INTERVIEW-TIMING") {
    const custody = records.filter((r) => r.eventType && /\bcustody\b/i.test(r.eventType) && r.timestamp);
    const interview = records.filter((r) => r.eventType && /\binterview\b/i.test(r.eventType) && r.timestamp);
    for (const c of custody) {
      for (const i of interview) {
        const ct = Date.parse(c.timestamp!);
        const it = Date.parse(i.timestamp!);
        if (!Number.isNaN(ct) && !Number.isNaN(it) && ct > it) {
          hits.push(
            hit(spec, {
              occurrenceRef: c.occurrenceRef ?? "/chronologyEvents",
              exactWording: `${c.eventType}@${c.timestamp} vs ${i.eventType}@${i.timestamp}`,
              plainEnglish: "Custody timestamp after interview — impossible custody/interview timing.",
              evidenceRefs: [c.occurrenceRef ?? "", i.occurrenceRef ?? ""].filter(Boolean),
            }),
          );
        }
      }
    }
  }
  if (spec.controlId === "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE") {
    const notice = records.filter((r) => r.eventType && /\bnotice\b/i.test(r.eventType) && r.timestamp);
    const hearing = records.filter((r) => r.eventType && /\bhearing\b/i.test(r.eventType) && r.timestamp);
    for (const n of notice) {
      for (const h of hearing) {
        const nt = Date.parse(n.timestamp!);
        const ht = Date.parse(h.timestamp!);
        if (!Number.isNaN(nt) && !Number.isNaN(ht) && nt > ht) {
          hits.push(
            hit(spec, {
              occurrenceRef: n.occurrenceRef ?? "/chronologyEvents",
              exactWording: `${n.eventType}@${n.timestamp} vs ${h.eventType}@${h.timestamp}`,
              plainEnglish: "Notice timestamp after hearing — broken hearing/notice lifecycle.",
              evidenceRefs: [n.occurrenceRef ?? "", h.occurrenceRef ?? ""].filter(Boolean),
            }),
          );
        }
      }
    }
  }
  return hits;
}

function evaluateProvenance(
  spec: Batch9ControlSpec,
  records: ProvenanceRecord[],
  output: Record<string, unknown>,
): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  if (spec.controlId === "MAA2-FID-10-QUOTATION-FIDELITY") {
    const states = Array.isArray(output.evidenceStates) ? output.evidenceStates : [];
    states.forEach((row, i) => {
      if (!isObj(row)) return;
      const q =
        typeof row.quotationExactText === "string"
          ? row.quotationExactText
          : typeof row.quotedSpan === "string"
            ? row.quotedSpan
            : null;
      if (!q) return;
      if (row.pageIdentityKnown !== true || typeof row.sourcePage !== "string") {
        hits.push(
          hit(spec, {
            occurrenceRef: `/evidenceStates/${i}`,
            exactWording: q,
            plainEnglish: "Structured quotation without page-identity provenance binding.",
            evidenceRefs: [`/evidenceStates/${i}`],
          }),
        );
      } else if (/\[\.\.\.\]|\u2026|\.{3}\s*$/.test(q)) {
        hits.push(
          hit(spec, {
            occurrenceRef: `/evidenceStates/${i}`,
            exactWording: q,
            plainEnglish: "Structured quotation shows truncation markers — fidelity defect.",
            evidenceRefs: [`/evidenceStates/${i}`],
          }),
        );
      }
    });
    return hits;
  }
  if (spec.controlId === "MAA2-CHR-09-PAGE-DOC-EVIDENCE-TOTALS") {
    const totals = output.pageDocEvidenceTotals;
    if (isObj(totals) && totals.inconsistent === true) {
      hits.push(
        hit(spec, {
          occurrenceRef: "/pageDocEvidenceTotals",
          plainEnglish: "Structured page/doc/evidence totals marked inconsistent.",
          evidenceRefs: ["/pageDocEvidenceTotals"],
        }),
      );
    }
    return hits;
  }

  for (const r of records) {
    const ref = r.occurrenceRef;
    switch (spec.controlId) {
      case "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE":
        if (r.pageIdentityKnown && (!r.sourceDocumentIdentity || !r.sourcePage || !r.compiledPage)) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              plainEnglish:
                "pageIdentityKnown without genuine sourceDocumentIdentity and both source/compiled pages.",
              evidenceRefs: [ref],
            }),
          );
        } else if (
          r.pageIdentityKnown &&
          r.sourcePage &&
          r.compiledPage &&
          (!/^\d+[A-Za-z]?$/.test(r.sourcePage.trim()) || !/^\d+[A-Za-z]?$/.test(r.compiledPage.trim()))
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: `${r.sourcePage}|${r.compiledPage}`,
              plainEnglish: "Source/compiled page tokens are not genuine page identities.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-ATR-09-SOURCE-LINKED-LIMITATIONS":
        if (r.limitationReason && !r.sourceDocumentIdentity) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.limitationReason,
              plainEnglish: "Limitation present without source document identity.",
              evidenceRefs: [ref],
            }),
          );
        } else if (
          r.limitationReason &&
          r.sourceDocumentIdentity &&
          /\b(unlinked|orphan|no\s*source|not\s*linked)\b/i.test(r.limitationReason)
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.limitationReason,
              plainEnglish: "Limitation claims unlinked/orphan despite source identity row.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      default:
        break;
    }
  }
  return hits;
}

function evaluateChase(spec: Batch9ControlSpec, records: ChaseRelationshipRecord[]): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  for (const r of records) {
    const ref = r.occurrenceRef;
    switch (spec.controlId) {
      case "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST":
        if (!r.requestId || r.linkMethod !== "explicit_id" || !r.resolutionState) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.chaseLabel ?? "",
              plainEnglish: "Chase relationship incomplete for specific-item request.",
              evidenceRefs: [ref],
            }),
          );
        } else if (/\b(various|general|all\s+outstanding|non-specific)\b/i.test(r.chaseLabel ?? "")) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.chaseLabel ?? "",
              plainEnglish: "Chase request is non-specific despite explicit id link.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-CHS-06-NO-ALIAS-OR-SERVED-DUP":
        if (r.linkAmbiguity === "ambiguous_multiple_matches") {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.chaseLabel ?? "",
              plainEnglish: "Ambiguous exact-label chase matches — alias/dup risk.",
              evidenceRefs: [ref, ...r.candidateEvidenceOccurrenceRefs],
              candidateClass: "unresolved",
            }),
          );
        } else if (
          r.linkMethod === "explicit_id" &&
          r.candidateEvidenceOccurrenceRefs.length > 1
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.chaseLabel ?? "",
              plainEnglish: "Explicit id chase still has multiple exact-label peers — alias/dup risk.",
              evidenceRefs: [ref, ...r.candidateEvidenceOccurrenceRefs],
              candidateClass: "unresolved",
            }),
          );
        }
        break;
      case "MAA2-BND-05-MISSING-ATTACHMENTS":
        if (
          r.resolutionState &&
          /\b(missing|absent|outstanding)\b/i.test(r.resolutionState) &&
          (!r.linkedEvidenceOccurrenceRef ||
            /\b(missing|absent|null|ghost)\b/i.test(r.linkedEvidenceOccurrenceRef))
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.chaseLabel ?? "",
              plainEnglish: "Missing-attachment chase without linked evidence unit.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      case "MAA2-BND-12-COMPLETE-VS-PARTIAL-DISCLOSURE":
        if (
          r.resolutionState &&
          /\bcomplete\b/i.test(r.resolutionState) &&
          /\bpartial\b/i.test(r.resolutionState)
        ) {
          hits.push(
            hit(spec, {
              occurrenceRef: ref,
              exactWording: r.resolutionState,
              plainEnglish: "Complete and partial disclosure collapsed in resolutionState.",
              evidenceRefs: [ref],
            }),
          );
        }
        break;
      default:
        break;
    }
  }
  return hits;
}

function evaluateExits(
  spec: Batch9ControlSpec,
  records: ExitSnapshotRecord[],
  output: Record<string, unknown>,
): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  if (spec.controlId === "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED") {
    for (const r of records) {
      if (!r.realExitPayloadPresent && r.capabilityStatus === "eligible") {
        hits.push(
          hit(spec, {
            occurrenceRef: `/exit_snapshots/${r.exitId}`,
            exactWording: r.exitId,
            plainEnglish: `Unavailable/metadata exit ${r.exitId} marked eligible without genuine payload.`,
            evidenceRefs: r.evidencePointersPresent,
          }),
        );
      }
      if (r.metadataOnly && r.realExitPayloadPresent) {
        hits.push(
          hit(spec, {
            occurrenceRef: `/exit_snapshots/${r.exitId}`,
            exactWording: r.exitId,
            plainEnglish: `Exit ${r.exitId} claims both metadataOnly and real payload.`,
            evidenceRefs: r.evidencePointersPresent,
          }),
        );
      }
      if (
        r.metadataOnly &&
        !r.realExitPayloadPresent &&
        r.sendability &&
        /\b(sendable|cleared|safe)\b/i.test(r.sendability)
      ) {
        hits.push(
          hit(spec, {
            occurrenceRef: `/exit_snapshots/${r.exitId}`,
            exactWording: r.exitId,
            plainEnglish: `Metadata-only exit ${r.exitId} claims sendable/cleared without genuine payload.`,
            evidenceRefs: r.evidencePointersPresent,
          }),
        );
      }
    }
    return hits;
  }

  const bag = exitBag(output);
  if (spec.controlId === "MAA2-XEX-01-CHARGE-WARNING-ATTACHED" && bag) {
    for (const [exitId, raw] of Object.entries(bag)) {
      if (!isObj(raw) || typeof raw.payloadIdentity !== "string") continue;
      if (raw.chargeWarningAttached !== true) {
        hits.push(
          hit(spec, {
            occurrenceRef: `/exitPayloadReceipts/${exitId}/chargeWarningAttached`,
            exactWording: exitId,
            plainEnglish: `Genuine ${exitId} exit missing chargeWarningAttached.`,
            evidenceRefs: [`/exitPayloadReceipts/${exitId}`],
          }),
        );
      }
    }
    return hits;
  }

  if (spec.controlId === "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING" && bag) {
    for (const [exitId, raw] of Object.entries(bag)) {
      if (!isObj(raw) || typeof raw.payloadIdentity !== "string") continue;
      if (raw.evidencePartialWarning !== true && raw.evidencePartialWarning !== false) {
        hits.push(
          hit(spec, {
            occurrenceRef: `/exitPayloadReceipts/${exitId}/evidencePartialWarning`,
            exactWording: exitId,
            plainEnglish: `Genuine ${exitId} exit missing evidencePartialWarning boolean.`,
            evidenceRefs: [`/exitPayloadReceipts/${exitId}`],
          }),
        );
      }
    }
    return hits;
  }

  if (spec.controlId === "MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL" && bag) {
    for (const [exitId, raw] of Object.entries(bag)) {
      if (!isObj(raw) || typeof raw.payloadIdentity !== "string") continue;
      const scope = raw.quarantineScope;
      if (scope !== "partial" && scope !== "total") {
        hits.push(
          hit(spec, {
            occurrenceRef: `/exitPayloadReceipts/${exitId}/quarantineScope`,
            exactWording: exitId,
            plainEnglish: `Genuine ${exitId} exit missing distinct quarantineScope partial|total.`,
            evidenceRefs: [`/exitPayloadReceipts/${exitId}`],
          }),
        );
      }
      if (typeof scope === "string" && /\bpartial\b/i.test(scope) && /\btotal\b/i.test(scope)) {
        hits.push(
          hit(spec, {
            occurrenceRef: `/exitPayloadReceipts/${exitId}/quarantineScope`,
            exactWording: String(scope),
            plainEnglish: "quarantineScope collapses partial and total.",
            evidenceRefs: [`/exitPayloadReceipts/${exitId}`],
          }),
        );
      }
    }
    return hits;
  }

  if (spec.controlId === "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY") {
    const byId = new Map(records.map((r) => [r.exitId, r]));
    const view = byId.get("view");
    const copy = byId.get("copy");
    if (
      view?.realExitPayloadPresent &&
      copy?.realExitPayloadPresent &&
      view.sendability &&
      copy.sendability &&
      /\bunsafe|blocked\b/i.test(view.sendability) &&
      /\bsafe|cleared|sendable\b/i.test(copy.sendability)
    ) {
      hits.push(
        hit(spec, {
          occurrenceRef: "/exitPayloadReceipts/copy",
          plainEnglish: "Unsafe view with safe/sendable copy — inverted safety.",
          evidenceRefs: ["/exitPayloadReceipts/view", "/exitPayloadReceipts/copy"],
        }),
      );
    }
  }
  return hits;
}

export type Batch9AdaptedBundle = ReturnType<typeof adaptAllBatch8>;

export function getAdapter(
  adapted: Batch9AdaptedBundle,
  adapterId: Batch8AdapterId,
): Batch8AdapterResult<unknown> {
  return adapted[adapterId] as Batch8AdapterResult<unknown>;
}

export function evaluateBatch9Control(
  ctx: Stage150EvalContext,
  controlId: string,
  adapted?: Batch9AdaptedBundle,
): Stage150Hit[] {
  const spec = BATCH9_SPEC_BY_ID.get(controlId);
  if (!spec) return [];
  if (!countsAsNamedEvaluator(spec.evaluatorImplementationClass)) {
    return [];
  }
  const bundle = adapted ?? adaptAllBatch8(ctx.caseId, ctx.output);
  const adapter = getAdapter(bundle, spec.adapterId);
  const gate = adapterMeetsPrerequisite(spec, adapter, ctx.output);
  if (!gate.ok) return [];

  switch (spec.adapterId) {
    case "charge_instruments":
      return evaluateCharge(spec, bundle.charge_instruments.records, ctx.output);
    case "evidence_units":
      return evaluateEvidence(spec, bundle.evidence_units.records);
    case "chronology_events":
      return evaluateChronology(spec, bundle.chronology_events.records);
    case "provenance":
      return evaluateProvenance(spec, bundle.provenance.records, ctx.output);
    case "chase_relationships":
      return evaluateChase(spec, bundle.chase_relationships.records);
    case "exit_snapshots":
      return evaluateExits(spec, bundle.exit_snapshots.records, ctx.output);
    default:
      return [];
  }
}

export function evaluateAllBatch9(ctx: Stage150EvalContext): Stage150Hit[] {
  const adapted = adaptAllBatch8(ctx.caseId, ctx.output);
  const hits: Stage150Hit[] = [];
  for (const spec of BATCH9_CONTROL_SPECS) {
    hits.push(...evaluateBatch9Control(ctx, spec.controlId, adapted));
  }
  return hits;
}

export function filterNonBatch9OwnedHits(hits: Stage150Hit[]): Stage150Hit[] {
  const owned = new Set(BATCH9_CONTROL_SPECS.map((s) => s.controlId));
  return hits.filter((h) => !owned.has(h.controlId));
}
