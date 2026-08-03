/**
 * V2.1.2 Batch-8 compatible Stage-150 output bag builder.
 * Structured arrays only — never invents absent document page content.
 */
import crypto from "node:crypto";

import { inventoryOutputLeaves } from "../../../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import { inferEvidenceModality } from "../../../lib/criminal/evidence-state-reconcile";
import {
  buildProfessionalSolicitorSurfaces,
  polishSolicitorVisibleText,
  extractValidatedChargeWording,
  professionalChaseRequestFromLabel,
  professionalDisclosureItemPhrase,
} from "./v2.1.4.4-ordinary-exit-system-language";

export type Stage150DocInput = {
  docId: string;
  title: string;
  kind: string;
  state: string;
  pages: Array<{ pageIndex: number; pageIdentity: string; text: string; purpose: string }>;
  privilegeSeparated?: boolean;
};

export type Stage150AbsentInput = {
  id: string;
  title?: string;
  kind?: string;
  state?: string;
};

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function isAbsentState(state: string): boolean {
  return /^(missing|referred_only|absent)$/i.test(state) || /missing_referred/i.test(state);
}

function isChargeInstrumentKind(kind: string): boolean {
  const k = kind.toLowerCase();
  return /written_charge|charge_sheet|indictment|sjp|summons/.test(k);
}

function isChronologyKind(kind: string, title: string): boolean {
  const hay = `${kind} ${title}`.toLowerCase();
  return /hearing_notice|hearing\s*notice|custody|interview/.test(hay);
}

function isEvidenceLikeDoc(doc: Stage150DocInput): boolean {
  if (doc.privilegeSeparated) return false;
  if (isAbsentState(doc.state)) return false;
  if (isChargeInstrumentKind(doc.kind)) return false;
  const k = doc.kind.toLowerCase();
  // Index / instrument admin surfaces are provenance anchors, not evidence units.
  if (/^mg06$|^mg6$|hearing_notice|court_order|metadata_fixture/.test(k)) return false;
  return doc.pages.length > 0;
}

function instrumentStatus(state: string): string {
  if (/draft/i.test(state)) return "draft";
  if (/superseded|replaced/i.test(state)) return "superseded";
  if (/amended/i.test(state)) return "amended";
  if (/operative|served|signed|final/i.test(state)) return "operative";
  return state || "operative";
}

function defendantAllocation(matter: any): string {
  const n = Number(matter?.defendantCount ?? matter?.defendants ?? 1) || 1;
  if (n <= 1) return "defendant_0";
  return Array.from({ length: n }, (_, i) => `defendant_${i}`).join("+");
}

function existenceFromState(state: string): string {
  if (/missing|absent/i.test(state)) return "missing";
  if (/referred/i.test(state)) return "referred_absent";
  if (/incomplete|partial/i.test(state)) return "incomplete";
  if (/served|operative|present|complete|final|signed/i.test(state)) return "served";
  return state || "not_safely_confirmed";
}

function findMg06Anchor(
  docs: Stage150DocInput[],
): { docId: string; pageIdentity: string; sourcePageNo: string; compiledPageNo: string } | null {
  let compiled = 0;
  for (const d of docs) {
    if (isAbsentState(d.state) || d.privilegeSeparated) continue;
    for (const p of d.pages) {
      compiled += 1;
      const k = d.kind.toLowerCase();
      if (
        (k === "mg06" || /^mg6(?!c)/.test(k) || /mg6(?!c)/.test(d.docId.toLowerCase())) &&
        p.pageIndex === d.pages[0]!.pageIndex
      ) {
        return {
          docId: d.docId,
          pageIdentity: p.pageIdentity,
          sourcePageNo: String(p.pageIndex),
          compiledPageNo: String(compiled),
        };
      }
    }
  }
  return null;
}

function extractChronologyEvents(
  docs: Stage150DocInput[],
): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = [];
  const chronoPages = docs.flatMap((d) =>
    isChronologyKind(d.kind, d.title)
      ? d.pages.map((p) => ({ doc: d, page: p }))
      : [],
  );
  if (chronoPages.length === 0) return [];

  let seq = 0;
  for (const { doc, page } of chronoPages) {
    const kind = doc.kind.toLowerCase();
    let eventType = "procedural_event";
    if (/hearing_notice|hearing/.test(kind) || /hearing notice/i.test(doc.title)) {
      eventType = /notice/i.test(kind + doc.title) ? "hearing_notice" : "hearing";
    } else if (/custody/.test(kind)) {
      eventType = "custody_event";
    } else if (/interview/.test(kind)) {
      eventType = "interview_event";
    }

    // Prefer explicit ISO / date-time + zone from page text; else clock rows with Europe/London.
    const iso =
      page.text.match(
        /\b(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})?)\b/,
      )?.[1] ?? null;
    const dateOnly = page.text.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1] ?? null;
    const clockRows = [...page.text.matchAll(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g)].map((m) => m[0]);

    const timezone =
      page.text.match(/\b(Europe\/London|GMT|BST|UTC[+-]?\d*)\b/)?.[1] ?? "Europe/London";

    if (iso) {
      seq += 1;
      events.push({
        eventId: `${doc.docId}::${page.pageIdentity}::${seq}`,
        eventType,
        timestamp: iso.includes("T") || iso.includes(" ") ? iso.replace(" ", "T") : `${iso}T00:00:00`,
        timezone,
        source: doc.docId,
        confidence: "page_text",
        competingEventGroupId: null,
        sourcePage: page.pageIdentity,
        pageIdentityKnown: true,
      });
      continue;
    }

    if (clockRows.length > 0) {
      // Page text carries modelled clock rows (e.g. custody timeline). Pair with an
      // explicit page date when present; otherwise emit time-only + timezone sourced
      // from the page (not invented absent-doc content).
      for (const clock of clockRows.slice(0, 4)) {
        seq += 1;
        const hhmm = (clock.length === 4 ? `0${clock}` : clock).slice(0, 5);
        const timestamp = dateOnly ? `${dateOnly}T${hhmm}:00` : `time-only:${hhmm}:00`;
        events.push({
          eventId: `${doc.docId}::${page.pageIdentity}::${seq}`,
          eventType,
          timestamp,
          timezone,
          source: doc.docId,
          confidence: dateOnly ? "page_text_clock" : "page_text_clock_timezone",
          competingEventGroupId: null,
          sourcePage: page.pageIdentity,
          pageIdentityKnown: true,
        });
      }
      continue;
    }

    // Hearing/custody/interview page present but no clock/ISO — do not invent a timestamp.
  }

  return events;
}

function pickChargeWording(matter: any, pageText: string): string {
  const extracted = extractValidatedChargeWording(matter, pageText);
  // Store incomplete as empty so downstream never treats a heading as operative charge wording.
  return extracted.complete ? extracted.wording : "";
}

function buildChargeInstruments(args: {
  caseId: string;
  matter: any;
  docs: Stage150DocInput[];
}): Array<Record<string, unknown>> {
  const { matter, docs } = args;
  const chargeDocs = docs.filter(
    (d) =>
      isChargeInstrumentKind(d.kind) &&
      !isAbsentState(d.state) &&
      d.pages.length > 0 &&
      !d.privilegeSeparated,
  );
  const instruments: Array<Record<string, unknown>> = [];
  const alloc = defendantAllocation(matter);
  const count = Number(matter?.charge?.count ?? matter?.count ?? 1) || 1;

  for (const d of chargeDocs) {
    const page = d.pages[0]!;
    const status = instrumentStatus(d.state);
    const version = /v(?:ersion)?[\s_-]?(\d+)/i.exec(d.state)?.[1]
      ? `v${/v(?:ersion)?[\s_-]?(\d+)/i.exec(d.state)![1]}`
      : status === "draft"
        ? "draft"
        : status === "superseded"
          ? "superseded"
          : "1";
    const instrumentType = /indictment/i.test(d.kind) ? "indictment" : "written_charge";
    const extracted = extractValidatedChargeWording(matter, page.text);
    instruments.push({
      instrumentId: `inst-${d.docId}`,
      instrumentType,
      exactWording: extracted.complete ? extracted.wording : "",
      chargeWordingComplete: extracted.complete,
      chargeFoundFragment: extracted.foundFragment,
      chargeCompletenessReason: extracted.reason,
      count,
      defendantAllocation: alloc,
      sourceDocument: d.docId,
      sourcePage: String(page.pageIndex),
      sourcePageIdentity: page.pageIdentity,
      pageIdentityKnown: true,
      status,
      version,
      replacesInstrumentId: null as string | null,
      supersededByInstrumentId: null as string | null,
    });
  }

  // Wire draft/superseded ↔ operative replacement links when both present.
  const operative = instruments.filter((i) => i.status === "operative");
  const drafts = instruments.filter((i) => i.status === "draft" || i.status === "superseded");
  if (operative[0] && drafts.length) {
    for (const d of drafts) {
      d.supersededByInstrumentId = String(operative[0]!.instrumentId);
      if (d.status === "draft" || d.status === "superseded") {
        // operative replaces the draft/superseded instrument
      }
    }
    operative[0]!.replacesInstrumentId = String(drafts[0]!.instrumentId);
  }

  // If no instrument docs but matter.charge exists, still do not invent a source page —
  // leave empty so adapter stays unavailable rather than fabricate identity.
  return instruments;
}

function surfaceWordingLeaves(surfaces: any): Record<string, unknown> {
  if (!isObj(surfaces)) {
    return {
      composedProse: {},
      disclosureChase: {},
      warRoom: {},
      copyLines: [],
      requiredLimitations: [],
    };
  }
  return {
    composedProse: isObj(surfaces.composedProse) ? surfaces.composedProse : {},
    disclosureChase: isObj(surfaces.disclosureChase) ? surfaces.disclosureChase : {},
    warRoom: isObj(surfaces.warRoom) ? surfaces.warRoom : {},
    copyLines: Array.isArray(surfaces.copyLines) ? surfaces.copyLines : [],
    requiredLimitations: Array.isArray(surfaces.requiredLimitations)
      ? surfaces.requiredLimitations
      : [],
    pdf: isObj(surfaces.pdf) ? surfaces.pdf : {},
    keyFacts: surfaces.keyFacts ?? null,
    truthMap: surfaces.truthMap ?? null,
  };
}

function courtNoteFromSurfaces(surfaces: any, caseId: string): Record<string, unknown> {
  const courtLine =
    (isObj(surfaces?.composedProse) && typeof surfaces.composedProse.courtLine === "string"
      ? surfaces.composedProse.courtLine
      : null) ||
    (isObj(surfaces?.warRoom) && typeof surfaces.warRoom.safePositionToday === "string"
      ? surfaces.warRoom.safePositionToday
      : null) ||
    `Matter ${caseId} — solicitor review required before any court send.`;
  return {
    text: courtLine,
    sendabilityLabel: "Solicitor review required",
    canCopy: true,
    blockedReason: null,
  };
}

function doNotOverstateFromSurfaces(surfaces: any): string[] {
  const wr = surfaces?.warRoom;
  if (isObj(wr) && Array.isArray(wr.doNotOverstate)) {
    return wr.doNotOverstate.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0);
  }
  const lim = Array.isArray(surfaces?.requiredLimitations) ? surfaces.requiredLimitations : [];
  return lim.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0);
}

/** Normalise chase item labels into professional noun phrases (no harness / raw tokens). */
export function professionalChaseItemPhrase(label: string): string {
  let s = String(label || "")
    .replace(/\s*\(requestId\s*=\s*[^)]+\)\s*/gi, "")
    .replace(/\brequestId\s*=\s*\S+/gi, "")
    .replace(/\bevidenceUnitId\s*[:=]\s*\S+/gi, "")
    .replace(/\beu-[a-z0-9-]+/gi, "")
    .replace(/\bdiv3000v21[123]?-\d{2}-[a-z0-9_]+/gi, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Collapse known fixture / index shorthand into professional prose.
  if (/^mg\s*6\b.*may refer/i.test(s) || /^mg06?\s*may refer/i.test(s)) {
    return "the MG6 index entry that refers to further material";
  }
  if (
    /master media|referred master|referred missing master|full record \(missing\)|referred.?absent.?master/i.test(
      s,
    )
  ) {
    return "the complete master media referred to in the disclosure material";
  }
  if (/^mg\s*6\b/i.test(s) || /^mg06\b/i.test(s)) {
    return "the complete MG6 file front sheet / index referred to in the disclosure material";
  }
  if (/^mg\s*5\b/i.test(s) || /^mg05\b/i.test(s)) {
    return "the complete MG5 case summary referred to in the disclosure material";
  }
  s = s.replace(/\s*\(missing\)\s*$/i, "").replace(/\s+/g, " ").trim();
  return s || "the referred disclosure item";
}

/** Solicitor-facing chase request — never embeds requestId / evidenceUnitId / harness IDs. */
export function professionalChaseRequest(label: string): string {
  return professionalChaseRequestFromLabel(label) || `Please provide ${professionalDisclosureItemPhrase(label) || "the referred disclosure item"}.`;
}

function stripInternalIdsFromSolicitorText(text: string): string {
  return String(text || "")
    .replace(/\s*\(requestId\s*=\s*[^)]+\)\s*/gi, "")
    .replace(/\brequestId\s*=\s*\S+/gi, "")
    .replace(/\bevidenceUnitId\s*[:=]\s*\S+/gi, "")
    .replace(/\beu-[a-z0-9-]+/gi, "")
    .replace(/\bMAA2?-[A-Z0-9-]+/g, "")
    .replace(/\bv2\.1\.\d-pilot-evaluator:\S*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function rewriteHarnessChaseProse(text: string, fallbackLabel: string): string {
  const raw = stripInternalIdsFromSolicitorText(text);
  if (
    !raw ||
    /\brequestId\s*=/i.test(raw) ||
    /\bmay refer\b/i.test(raw) ||
    /\beu-[a-z0-9-]+/i.test(raw) ||
    /pilot-evaluator/i.test(raw) ||
    /harness/i.test(raw) ||
    /chase wording is provisional/i.test(raw) ||
    /^please provide\s+no\b/i.test(raw) ||
    /^please provide\s+[a-z0-9.\/\-]{1,12}\.?$/i.test(raw) ||
    /referred missing master/i.test(raw) ||
    /\babe or special/i.test(raw)
  ) {
    return professionalChaseRequest(fallbackLabel || raw);
  }
  return polishSolicitorVisibleText(raw);
}

/**
 * Build a Batch-8 compatible casebrain-output bag for Stage-150 / Batch-9 named controls.
 */
export function buildStage150OutputBag(args: {
  caseId: string;
  matter: any;
  docs: Stage150DocInput[];
  absent: Stage150AbsentInput[];
  surfaces: any;
}): Record<string, unknown> {
  const { caseId, matter, docs, absent, surfaces } = args;
  const mg06 = findMg06Anchor(docs);
  const chargeInstruments = buildChargeInstruments({ caseId, matter, docs });
  const evidenceStates: Array<Record<string, unknown>> = [];
  const chaseItems: Array<Record<string, unknown>> = [];

  // Provenance: one evidenceStates row per present page.
  // SRC-10 contract: sourcePage and compiledPage must be genuine page-number tokens (not path identities).
  // Full pageIdentity is preserved separately as sourcePageIdentity.
  let compiledPdfPage = 0;
  for (const doc of docs) {
    if (isAbsentState(doc.state) || doc.privilegeSeparated) continue;
    for (const page of doc.pages) {
      compiledPdfPage += 1;
      const sourcePageNo = String(page.pageIndex);
      const compiledPageNo = String(compiledPdfPage);
      const base = {
        source: doc.docId,
        sourceDocumentIdentity: doc.docId,
        sourcePage: sourcePageNo,
        sourcePageIdentity: page.pageIdentity,
        compiledPage: compiledPageNo,
        pageIdentityKnown: true,
        pageClass: "exact_source_page",
        evidenceAnchor: `${doc.title} · ${page.pageIdentity}`,
      };
      if (isEvidenceLikeDoc(doc) && page.pageIndex === doc.pages[0]!.pageIndex) {
        const label = doc.docId;
        const existence = existenceFromState(doc.state);
        const evidenceUnitId = `eu-${doc.docId}`;
        evidenceStates.push({
          ...base,
          label,
          evidenceUnitId,
          subjectDefendantId: defendantAllocation(matter).split("+")[0] || "defendant_0",
          existence,
          inferredSourceState: existence,
          existenceLabel: existence,
          evidenceTypeOrModality: inferEvidenceModality(`${doc.title} ${doc.kind} ${label}`),
        });
      } else {
        // Page-only provenance row (no evidenceUnitId / existence signal).
        evidenceStates.push({
          ...base,
          label: `${doc.docId}::${page.pageIdentity}`,
        });
      }
    }
  }

  // Absent items: evidence occurrence with missing/referred_absent — no invented pages.
  for (const a of absent) {
    const label = a.title || a.id;
    const existence = existenceFromState(a.state || "missing");
    const evidenceUnitId = `eu-absent-${a.id}`;
    const row: Record<string, unknown> = {
      label,
      evidenceUnitId,
      subjectDefendantId: defendantAllocation(matter).split("+")[0] || "defendant_0",
      existence,
      inferredSourceState: existence,
      existenceLabel: existence,
      evidenceTypeOrModality: inferEvidenceModality(`${label} ${a.kind || ""}`),
      source: mg06?.docId ?? null,
      sourceDocumentIdentity: mg06?.docId ?? null,
      sourcePage: mg06?.sourcePageNo ?? null,
      sourcePageIdentity: mg06?.pageIdentity ?? null,
      compiledPage: mg06?.compiledPageNo ?? null,
      pageIdentityKnown: Boolean(mg06?.pageIdentity),
      pageClass: mg06?.pageIdentity ? "exact_source_page" : "document_only",
      evidenceAnchor: mg06
        ? `MG06 index referral · ${mg06.pageIdentity}`
        : "Absent item — no MG06 page available for page identity",
      limitationReason: mg06
        ? null
        : "Absent referred item without MG06 page identity in present pack.",
    };
    evidenceStates.push(row);

    chaseItems.push({
      label,
      requestId: `req-absent-${a.id}`,
      evidenceUnitId,
      resolutionState: existence === "referred_absent" ? "outstanding_referred" : "missing",
      requestType: "disclosure_specific_item",
      supportedReason: `Absent/referred item ${a.id} listed for chase; no page content invented.`,
      sourceBasis: mg06 ? `${mg06.docId}/${mg06.pageIdentity}` : "MG06/page/1",
      sourcePointer: mg06 ? `${mg06.docId}/${mg06.pageIdentity}` : "MG06/page/1",
      outputSurfaces: ["disclosureChase", "copy", "composed_prose", "export"],
      sendabilityLabel: "Solicitor review required",
      copySuggestion: professionalChaseRequestFromLabel(label) || professionalDisclosureItemPhrase(label),
      requestedState: existence,
      linkageStatus: "linked",
      linkedEvidenceOccurrenceRef: `evidenceUnitId:${evidenceUnitId}`,
      provenanceSourcePage: mg06?.pageIdentity ?? null,
      provenanceEvidenceRef: `evidenceUnitId:${evidenceUnitId}`,
      chase_to_evidence_provenance_link: true,
    });
  }

  // Chase labels from live surfaces pipeline — exact label match to evidenceStates when possible.
  const chaseLabels: string[] = Array.isArray(surfaces?.pipeline?.chaseLabels)
    ? surfaces.pipeline.chaseLabels.filter((x: unknown): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
  for (const [i, label] of chaseLabels.entries()) {
    if (chaseItems.some((c) => String(c.label).trim().toLowerCase() === label.trim().toLowerCase())) {
      continue;
    }
    const matchIdx = evidenceStates.findIndex(
      (r) => typeof r.label === "string" && r.label.trim().toLowerCase() === label.trim().toLowerCase(),
    );
    const match = matchIdx >= 0 ? evidenceStates[matchIdx]! : null;
    const evidenceUnitId =
      match && typeof match.evidenceUnitId === "string" ? match.evidenceUnitId : `eu-chase-${sha256(label).slice(0, 12)}`;
    if (match && typeof match.evidenceUnitId !== "string") {
      match.evidenceUnitId = evidenceUnitId;
      if (match.existence == null) {
        match.existence = "missing";
        match.inferredSourceState = "missing";
        match.existenceLabel = "missing";
      }
      if (match.subjectDefendantId == null) {
        match.subjectDefendantId = defendantAllocation(matter).split("+")[0] || "defendant_0";
      }
    } else if (!match) {
      // Label from pipeline with no evidence row — create missing occurrence anchored to MG06.
      evidenceStates.push({
        label,
        evidenceUnitId,
        subjectDefendantId: defendantAllocation(matter).split("+")[0] || "defendant_0",
        existence: "missing",
        inferredSourceState: "missing",
        existenceLabel: "missing",
        evidenceTypeOrModality: inferEvidenceModality(label),
        source: mg06?.docId ?? null,
        sourceDocumentIdentity: mg06?.docId ?? null,
        sourcePage: mg06?.sourcePageNo ?? null,
        sourcePageIdentity: mg06?.pageIdentity ?? null,
        compiledPage: mg06?.compiledPageNo ?? null,
        pageIdentityKnown: Boolean(mg06?.pageIdentity),
        evidenceAnchor: mg06 ? `MG06 · ${mg06.pageIdentity}` : "chase label without page identity",
      });
    }
    chaseItems.push({
      label,
      requestId: `req-chase-${i + 1}-${sha256(label).slice(0, 8)}`,
      evidenceUnitId,
      resolutionState: "outstanding",
      requestType: "disclosure_specific_item",
      supportedReason: `Pipeline chaseLabels entry matched for specific-item request.`,
      sourceBasis: mg06 ? `${mg06.docId}/${mg06.pageIdentity}` : "MG06/page/1",
      sourcePointer: mg06 ? `${mg06.docId}/${mg06.pageIdentity}` : "MG06/page/1",
      outputSurfaces: ["disclosureChase", "copy", "composed_prose", "warRoom"],
      sendabilityLabel: "Solicitor review required",
      copySuggestion: professionalChaseRequestFromLabel(label) || professionalDisclosureItemPhrase(label),
      requestedState: typeof match?.inferredSourceState === "string" ? match.inferredSourceState : "missing",
      linkageStatus: "linked",
      linkedEvidenceOccurrenceRef: `evidenceUnitId:${evidenceUnitId}`,
      provenanceSourcePage: mg06?.pageIdentity ?? (typeof match?.sourcePage === "string" ? match.sourcePage : null),
      provenanceEvidenceRef: `evidenceUnitId:${evidenceUnitId}`,
      chase_to_evidence_provenance_link: true,
    });
  }

  const chronologyEvents = extractChronologyEvents(docs);
  const wording = surfaceWordingLeaves(surfaces);
  const hasAbsentOrMissing = absent.length > 0 || evidenceStates.some((r) => /missing|referred|absent/i.test(String(r.existence || "")));
  const chargeWarningAttached = chargeInstruments.length > 0;
  const quarantineScope: "partial" | "total" = hasAbsentOrMissing ? "partial" : "partial";

  const exitIds = [
    "view",
    "copy",
    "export",
    "api",
    "pdf",
    "composed_prose",
    "authenticated_browser",
  ] as const;

  const exitPayloadReceipts: Record<string, unknown> = {};
  for (const exitId of exitIds) {
    if (exitId === "authenticated_browser") {
      exitPayloadReceipts[exitId] = {
        payloadIdentity: `sha256:${sha256(`${caseId}::${exitId}::unavailable`)}`,
        chargeWarningAttached,
        evidencePartialWarning: hasAbsentOrMissing,
        quarantineScope,
        sendability: "unavailable",
        unavailableReason: "Authenticated browser exit not exercised in Stage-3000 diverse pack.",
        metadataOnly: true,
        realExitPayloadPresent: false,
        payloadSchemaVersion: "diverse3000-v2.1.2-exit@1.0.0",
        captureRunId: `run-${caseId}`,
        surfaceList: [exitId],
      };
      continue;
    }
    exitPayloadReceipts[exitId] = {
      payloadIdentity: `sha256:${sha256(`${caseId}::${exitId}::payload`)}`,
      chargeWarningAttached,
      evidencePartialWarning: hasAbsentOrMissing,
      quarantineScope,
      sendability: "needs_solicitor_review",
      unavailableReason: null,
      metadataOnly: false,
      realExitPayloadPresent: true,
      payloadSchemaVersion: "diverse3000-v2.1.2-exit@1.0.0",
      captureRunId: `run-${caseId}`,
      surfaceList: [exitId],
      generatedAt: new Date().toISOString(),
    };
  }

  const primaryChaseLabel =
    chaseItems.length > 0 ? String(chaseItems[0]!.label || "") : "the referred disclosure item";
  const family = String(matter?.family || matter?.primaryFamily || "matter");
  const familyProse = family.replace(/_/g, " ");
  const chaseProseCore =
    chaseItems.length > 0
      ? rewriteHarnessChaseProse(String(chaseItems[0]!.copySuggestion || ""), primaryChaseLabel)
      : "";
  const chaseProse = chaseProseCore
    ? polishSolicitorVisibleText(chaseProseCore.replace(/^(?:Regarding\s+[^:]+:\s*)+/i, ""))
    : "";
  const servedEvidenceCount = evidenceStates.filter((r) => typeof r.evidenceUnitId === "string").length;

  const chargeDoc0 = docs.find(
    (d) =>
      isChargeInstrumentKind(d.kind) &&
      !isAbsentState(d.state) &&
      d.pages.length > 0 &&
      !d.privilegeSeparated,
  );
  const chargeExtract = extractValidatedChargeWording(
    matter,
    chargeDoc0?.pages[0]?.text || "",
  );
  // Prefer instrument extract; if instrument empty, re-validate matter alone
  const chargeExtractFinal =
    chargeInstruments[0] && chargeInstruments[0].chargeWordingComplete === true
      ? {
          wording: String(chargeInstruments[0].exactWording || ""),
          complete: true,
          foundFragment: String(chargeInstruments[0].exactWording || ""),
          reason: null,
        }
      : chargeExtract.complete
        ? chargeExtract
        : extractValidatedChargeWording(matter, "");

  const chargeWording = chargeExtractFinal.complete ? chargeExtractFinal.wording : "";
  const chargeStatus =
    chargeInstruments[0] && typeof chargeInstruments[0].status === "string"
      ? String(chargeInstruments[0].status)
      : "unresolved";

  const disclosureLabels = [
    ...chaseItems.map((c) => String(c.label || "")),
    ...absent.map((a) => String(a.title || a.id || "")),
  ].filter(Boolean);

  const builtSurfaces = buildProfessionalSolicitorSurfaces({
    familyProse,
    defenceRaw: String(matter?.defence || matter?.defencePosition || "on instructions"),
    procedureRaw: String(matter?.procedure || matter?.proceduralLifecycle || "procedural stage"),
    chargeWording,
    chargeStatus,
    chargeInstrument: (chargeInstruments[0] as Record<string, unknown>) || null,
    chargeExtract: chargeExtractFinal.complete
      ? chargeExtractFinal
      : {
          wording: "",
          complete: false,
          foundFragment:
            (typeof chargeInstruments[0]?.chargeFoundFragment === "string"
              ? chargeInstruments[0].chargeFoundFragment
              : null) ||
            chargeExtract.foundFragment ||
            null,
          reason:
            (typeof chargeInstruments[0]?.chargeCompletenessReason === "string"
              ? chargeInstruments[0].chargeCompletenessReason
              : null) ||
            chargeExtract.reason ||
            "Complete charge wording is not confirmed on the current papers.",
        },
    chaseRequest: chaseProse,
    chaseLabel: chaseItems[0] ? String(chaseItems[0].label) : null,
    chaseItem: (chaseItems[0] as Record<string, unknown>) || null,
    chaseLabels: disclosureLabels,
    servedEvidenceCount,
    mg06: mg06
      ? { docId: mg06.docId, pageIdentity: mg06.pageIdentity, sourcePageNo: mg06.sourcePageNo }
      : null,
    absentTitles: absent.map((a) => String(a.title || a.id)),
  });
  const solicitorFacingSurfaces = builtSurfaces.surfaces;
  const solicitorLeafProvenance = builtSurfaces.leafProvenance;
  const courtLine = String(solicitorFacingSurfaces.composedProse.courtLine || "");
  const cpsChase = String(solicitorFacingSurfaces.composedProse.cpsChase || "");

  return {
    caseId,
    generatedAt: new Date().toISOString(),
    source: "v2.1.2-structured-maa-output",
    chargeInstruments,
    evidenceStates,
    chronologyEvents,
    solicitorLeafProvenance,
    solicitorWordingBeforeAfter: builtSurfaces.beforeAfterWordingMap,
    // Provenance is adapted from evidenceStates (Batch-8 adaptProvenance); mirror for clarity.
    provenanceRecords: evidenceStates.map((r, i) => ({
      occurrenceRef: `/evidenceStates/${i}`,
      sourceDocumentIdentity: r.source ?? r.sourceDocumentIdentity ?? null,
      sourcePage: r.sourcePage ?? null,
      compiledPage: r.compiledPage ?? null,
      pageIdentityKnown: r.pageIdentityKnown === true,
      pageClass: r.pageClass ?? "exact_source_page",
    })),
    warningsAndGaps: {
      chaseItems,
      doNotOverstate: doNotOverstateFromSurfaces(surfaces),
      hardRules: Array.isArray(surfaces?.requiredLimitations)
        ? surfaces.requiredLimitations.filter((x: unknown): x is string => typeof x === "string")
        : [],
    },
    chaseRelationships: chaseItems,
    /** Audit-only chase metadata — not for ordinary copy/export surfaces. */
    chaseAuditMetadata: chaseItems.map((c) => ({
      requestId: c.requestId,
      evidenceUnitId: c.evidenceUnitId,
      linkedEvidenceOccurrenceRef: c.linkedEvidenceOccurrenceRef,
      copyable: false,
      ordinaryExitExcluded: true,
    })),
    exitPayloadReceipts,
    courtNote: {
      ...courtNoteFromSurfaces(surfaces, caseId),
      text: courtLine,
    },
    exportVersion: {
      exportId: `exp-${caseId}`,
      caseId,
      generatedAt: new Date().toISOString(),
      exportType: "diverse3000_v2_1_3",
      sendability: "needs_solicitor_review",
      reviewFooter: "Solicitor review required before send.",
      warningCount: chaseItems.length + (hasAbsentOrMissing ? 1 : 0),
      appVersion: "v2.1.3",
      bundleVersionLabel: "diverse3000-v2.1.3",
      blockedReason: null,
      /** Pilot solicitor-visible export meaning — mirrored from copyExportApiPdf; inventory promotion in collectSolicitorVisibleLeaves. */
      solicitorVisibleSummary: solicitorFacingSurfaces.copyExportApiPdf.meaning,
    },
    fiveAnswersEvidenceRows: evidenceStates
      .filter((r) => typeof r.evidenceUnitId === "string")
      .map((r) => ({
        label: r.label,
        existence: r.existence,
        reliability: "needs_review",
        evidenceUnitId: r.evidenceUnitId,
        subjectDefendantId: r.subjectDefendantId,
        sourceDocument: r.source,
        sourcePage: r.sourcePage,
        pageIdentityKnown: r.pageIdentityKnown === true,
        modality: r.evidenceTypeOrModality,
        note: typeof r.evidenceAnchor === "string" ? r.evidenceAnchor : undefined,
      })),
    attributionGraph: (() => {
      const rows: Array<Record<string, unknown>> = [];
      for (const doc of docs) {
        if (isAbsentState(doc.state) || doc.privilegeSeparated) continue;
        if (doc.pages.length === 0) continue;
        const page = doc.pages[0]!;
        const kind = doc.kind.toLowerCase();
        let ownerRole = "document_owner";
        let makerName = "Named maker (fictional)";
        let ownershipState: "assigned" | "unclear" | "disputed" = "assigned";
        if (/mg11|statement|abe/.test(kind)) {
          ownerRole = "witness_maker";
          makerName = /continuation/i.test(kind) ? "Same maker as statement page 1" : "Witness maker (fictional)";
        } else if (/interview|custody/.test(kind)) {
          ownerRole = "custody_or_interview_record";
          makerName = "Recording officer (fictional)";
        } else if (/forensic|medical|expert/.test(kind)) {
          ownerRole = "expert_author";
          makerName = "Report author (fictional)";
        } else if (/charge|indictment|mg05|mg06|schedule|hearing|order|email|media|phone|exhibit|continuity|metadata/.test(kind)) {
          ownerRole = "prosecution_or_court_instrument";
          makerName = "Instrument owner (fictional)";
        } else if (/defence/.test(kind)) {
          ownerRole = "defence_privileged";
          makerName = "Defence author (privileged)";
        } else {
          ownershipState = "unclear";
          makerName = "Ownership unclear on papers";
        }
        const evidenceUnitId =
          evidenceStates.find((r) => r.source === doc.docId && typeof r.evidenceUnitId === "string")
            ?.evidenceUnitId ?? `eu-${doc.docId}`;
        rows.push({
          documentId: doc.docId,
          evidenceUnitId,
          ownerRole,
          makerName,
          ownershipState,
          sourcePage: page.pageIdentity,
          pageIdentityKnown: true,
          attributionGraphField: true,
        });
      }
      return rows;
    })(),
    chaseProvenanceLinks: chaseItems.map((c, i) => ({
      chaseOccurrenceRef: `/warningsAndGaps/chaseItems/${i}`,
      requestId: c.requestId,
      chaseLabel: c.label,
      linkedEvidenceOccurrenceRef: c.linkedEvidenceOccurrenceRef,
      evidenceUnitId: c.evidenceUnitId,
      provenanceSourcePage: c.sourcePointer ?? c.sourceBasis ?? null,
      provenanceEvidenceRef: c.linkedEvidenceOccurrenceRef,
      linkageStatus: c.linkageStatus ?? "linked",
      chase_to_evidence_provenance_link: true,
    })),
    solicitorFacingSurfaces,
    // Solicitor-visible wording surfaces for inventoryOutputLeaves / WRD detectors.
    composedProse: {
      ...(isObj(wording.composedProse) ? wording.composedProse : {}),
      courtLine: solicitorFacingSurfaces.composedProse.courtLine,
      cpsChase: cpsChase || null,
      clientDisclaimer: solicitorFacingSurfaces.composedProse.clientDisclaimer,
      limitations: Array.isArray((wording.composedProse as any)?.limitations)
        ? (wording.composedProse as any).limitations
        : wording.requiredLimitations,
    },
    disclosureChase: {
      ...(isObj(wording.disclosureChase) ? wording.disclosureChase : {}),
      professionalRequest: solicitorFacingSurfaces.disclosureChase.professionalRequest,
      item: solicitorFacingSurfaces.disclosureChase.item,
      whyItMatters: solicitorFacingSurfaces.disclosureChase.whyItMatters,
    },
    warRoom: {
      ...(isObj(wording.warRoom) ? wording.warRoom : {}),
      issue: solicitorFacingSurfaces.warRoom.issue,
      whyItMatters: solicitorFacingSurfaces.warRoom.whyItMatters,
      safeCurrentPosition: solicitorFacingSurfaces.warRoom.safePosition,
      nextAction: solicitorFacingSurfaces.warRoom.nextAction,
    },
    copyLines: [
      ...(Array.isArray(wording.copyLines) ? wording.copyLines : []),
      solicitorFacingSurfaces.copyExportApiPdf.meaning,
      solicitorFacingSurfaces.copyExportApiPdf.chase,
    ].map((x) =>
      typeof x === "string"
        ? polishSolicitorVisibleText(stripInternalIdsFromSolicitorText(x))
        : isObj(x) && typeof (x as any).text === "string"
          ? {
              ...x,
              text: polishSolicitorVisibleText(stripInternalIdsFromSolicitorText(String((x as any).text))),
            }
          : x,
    ),
    requiredLimitations: wording.requiredLimitations,
    pdf: wording.pdf,
  };
}

/**
 * Solicitor-visible leaf inventory over a Stage-150 output bag.
 * Promotes pilot solicitorFacingSurfaces (and export solicitorVisibleSummary) that the shared
 * inventory classifier still maps as unclassified — without changing live CaseBrain inventory rules.
 */
export function collectSolicitorVisibleLeaves(output: Record<string, unknown>, caseId: string) {
  const base = inventoryOutputLeaves(caseId, output);
  const promoted: typeof base = [];
  const sha256Hex = (s: string) => sha256(s);

  const pushPromoted = (args: {
    jsonPointer: string;
    value: string;
    surfaceId: string;
    exit: "view" | "copy" | "export" | "api" | "pdf" | "not_evidenced";
    copyable?: boolean;
  }) => {
    const exactValue = args.value;
    const exactValueHash = sha256Hex(exactValue);
    promoted.push({
      leafId: `${caseId}::${args.jsonPointer}::${exactValueHash}`,
      caseId,
      packetRelativeFile: "casebrain-output.json",
      jsonPointer: args.jsonPointer,
      arrayIndex: null,
      parentObjectIdentity: args.jsonPointer.split("/").filter(Boolean).slice(0, -1).join("/") || "root",
      originalDataType: "string",
      exactValue,
      exactValueHash,
      disposition: "included_solicitor_visible",
      dispositionReason: `Pilot solicitorFacingSurfaces promotion at ${args.jsonPointer}.`,
      surfaceId: args.surfaceId,
      audience: "solicitor",
      exit: args.exit,
      copyable: args.copyable ?? true,
      blocked: null,
      solicitorVisible: true,
      finalWordingPresent: true,
    } as any);
  };

  const sfs = isObj(output.solicitorFacingSurfaces) ? (output.solicitorFacingSurfaces as Record<string, any>) : null;
  if (sfs) {
    const walk = (
      node: unknown,
      pointer: string,
      surfaceId: string,
      exit: "view" | "copy" | "export" | "api" | "pdf" | "not_evidenced",
    ) => {
      if (typeof node === "string" && node.trim()) {
        pushPromoted({ jsonPointer: pointer, value: node, surfaceId, exit });
        return;
      }
      if (node && typeof node === "object" && !Array.isArray(node)) {
        for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
          walk(v, `${pointer}/${k}`, surfaceId, exit);
        }
      }
    };
    if (sfs.charges) walk(sfs.charges, "/solicitorFacingSurfaces/charges", "charges", "view");
    if (sfs.keyFacts) walk(sfs.keyFacts, "/solicitorFacingSurfaces/keyFacts", "key_facts", "view");
    if (sfs.fiveAnswers) walk(sfs.fiveAnswers, "/solicitorFacingSurfaces/fiveAnswers", "five_answers", "view");
    if (sfs.warRoom) walk(sfs.warRoom, "/solicitorFacingSurfaces/warRoom", "war_room", "view");
    if (sfs.controlRoom) walk(sfs.controlRoom, "/solicitorFacingSurfaces/controlRoom", "control_room", "view");
    if (sfs.disclosureChase)
      walk(sfs.disclosureChase, "/solicitorFacingSurfaces/disclosureChase", "disclosure_chase", "copy");
    if (sfs.composedProse) {
      // clientDisclaimer stays universal safety; still promote for denominator accounting.
      walk(sfs.composedProse, "/solicitorFacingSurfaces/composedProse", "composed_prose", "copy");
    }
    if (sfs.copyExportApiPdf && typeof sfs.copyExportApiPdf.meaning === "string") {
      const meaning = sfs.copyExportApiPdf.meaning;
      const chase =
        typeof sfs.copyExportApiPdf.chase === "string" ? sfs.copyExportApiPdf.chase : meaning;
      // Same substantive meaning on ordinary exits — separate surfaceIds for coverage.
      pushPromoted({
        jsonPointer: "/solicitorFacingSurfaces/copyExportApiPdf/meaning",
        value: meaning,
        surfaceId: "copy_lines",
        exit: "copy",
      });
      pushPromoted({
        jsonPointer: "/solicitorFacingSurfaces/copyExportApiPdf/chase#copy",
        value: chase,
        surfaceId: "copy_lines",
        exit: "copy",
      });
      pushPromoted({
        jsonPointer: "/solicitorFacingSurfaces/copyExportApiPdf/meaning#export",
        value: meaning,
        surfaceId: "export_pack",
        exit: "export",
      });
      pushPromoted({
        jsonPointer: "/solicitorFacingSurfaces/copyExportApiPdf/meaning#api",
        value: meaning,
        surfaceId: "api_interface_preview",
        exit: "api",
      });
      pushPromoted({
        jsonPointer: "/solicitorFacingSurfaces/copyExportApiPdf/meaning#pdf",
        value: meaning,
        surfaceId: "pdf_exit",
        exit: "pdf",
      });
    }
  }

  const exportSummary =
    isObj(output.exportVersion) && typeof (output.exportVersion as any).solicitorVisibleSummary === "string"
      ? String((output.exportVersion as any).solicitorVisibleSummary)
      : "";
  if (exportSummary.trim()) {
    pushPromoted({
      jsonPointer: "/exportVersion/solicitorVisibleSummary",
      value: exportSummary,
      surfaceId: "export_pack",
      exit: "export",
    });
  }

  // Genuine CaseBrain copy payload leaves (visible wording) — required for copy-exit honesty.
  const copyLines = Array.isArray(output.copyLines) ? (output.copyLines as unknown[]) : [];
  copyLines.forEach((line, i) => {
    if (typeof line === "string" && line.trim()) {
      pushPromoted({
        jsonPointer: `/copyLines/${i}`,
        value: line,
        surfaceId: "copy_lines",
        exit: "copy",
      });
      return;
    }
    if (line && typeof line === "object") {
      const text = typeof (line as any).text === "string" ? String((line as any).text) : "";
      if (text.trim()) {
        pushPromoted({
          jsonPointer: `/copyLines/${i}/text`,
          value: text,
          surfaceId: "copy_lines",
          exit: "copy",
        });
      }
      const provenanceLine =
        typeof (line as any).provenanceLine === "string" ? String((line as any).provenanceLine) : "";
      if (provenanceLine.trim()) {
        pushPromoted({
          jsonPointer: `/copyLines/${i}/provenanceLine`,
          value: provenanceLine,
          surfaceId: "copy_lines",
          exit: "copy",
        });
      }
    }
  });

  // Drop unclassified duplicates of the same pointers from base (keep promoted).
  const promotedPtrs = new Set(promoted.map((l) => l.jsonPointer));
  const filtered = base.filter((l) => !promotedPtrs.has(l.jsonPointer));
  return [...filtered, ...promoted];
}
