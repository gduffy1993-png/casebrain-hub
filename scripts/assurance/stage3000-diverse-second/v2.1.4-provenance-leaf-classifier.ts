/**
 * V2.1.4.1 exact provenance-bound solicitor-visible leaf classification.
 * Length alone never proves substantive_source_backed.
 * Evidence-row match NEVER uses non-empty label length as a wildcard.
 */
import crypto from "node:crypto";

export type LeafClassification =
  | "substantive_source_backed"
  | "substantive_derived_conclusion"
  | "substantive_explicitly_unresolved"
  | "universal_safety"
  | "label_or_heading"
  | "machine_metadata"
  | "protected_audit_only"
  | "fail_closed_unresolved_reference"
  | "not_exercised";

export type SupportingReference = {
  documentId: string;
  sourcePage: string | null;
  pageIdentityKnown: boolean;
  fieldRef: string;
  factId: string;
  title: string | null;
};

export type ProvenanceBoundLeaf = {
  caseId: string;
  surface: string;
  jsonPointer: string;
  exactWording: string;
  wordingHash: string;
  classification: LeafClassification;
  supportingCanonicalFactOrFindingId: string | null;
  supportingDocumentId: string | null;
  sourceDocumentTypeOrTitle: string | null;
  exactSourcePage: string | null;
  pageIdentityKnown: boolean;
  sourceTextHashOrStructuredFieldRef: string | null;
  derivationHandlerId: string;
  limitation: string | null;
  supportingReferences?: SupportingReference[];
};

const UNIVERSAL_SAFETY_RE =
  /do not overstate|fictional test|solicitor review required|do not import .{0,40} unless the papers support it|exact document title, page, evidence state|filename alone as source proof|not safely confirmed on the current|could not be safely completed from the available papers|assumed position may conflict|do not say (bwv|cctv)|identification remains conditional|unless the clip is served|do not treat filename alone|exact page is unavailable|unsplit whole-document text|cite the document rather than a page|native bytes not_exercised|allegation recorded on the instrument is not proof|existence labels on the evidence schedule must not be read as reliability|authenticated browser remains not exercised|not legal advice/i;

const INTERNAL_ID_RE =
  /\b(requestId|evidenceUnitId|eu-[a-z0-9-]+|MAA2?-[A-Z0-9-]+|div3000v21[0-9]-|pilot-evaluator|pageIdentity\s*=)/i;

const PAGE_IDENTITY_RE = /\b([A-Za-z][A-Za-z0-9_-]*)\/page\/(\d+)\b/g;

function sha(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export type ProvenanceIndex = {
  byDocId: Map<string, { title: string; kind: string; pages: Map<string, { pageIdentity: string; textHash: string }> }>;
  evidenceRows: Array<Record<string, unknown>>;
  chargeInstruments: Array<Record<string, unknown>>;
  chaseItems: Array<Record<string, unknown>>;
};

export function buildProvenanceIndex(args: {
  docs: Array<{
    docId: string;
    title: string;
    kind: string;
    pages: Array<{ pageIndex: number; pageIdentity: string; text: string }>;
  }>;
  output: Record<string, unknown>;
}): ProvenanceIndex {
  const byDocId = new Map<
    string,
    { title: string; kind: string; pages: Map<string, { pageIdentity: string; textHash: string }> }
  >();
  for (const d of args.docs) {
    const pages = new Map<string, { pageIdentity: string; textHash: string }>();
    for (const p of d.pages) {
      pages.set(String(p.pageIndex), { pageIdentity: p.pageIdentity, textHash: sha(p.text) });
      pages.set(p.pageIdentity, { pageIdentity: p.pageIdentity, textHash: sha(p.text) });
    }
    byDocId.set(d.docId, { title: d.title, kind: d.kind, pages });
  }
  return {
    byDocId,
    evidenceRows: Array.isArray(args.output.evidenceStates)
      ? (args.output.evidenceStates as Array<Record<string, unknown>>)
      : [],
    chargeInstruments: Array.isArray(args.output.chargeInstruments)
      ? (args.output.chargeInstruments as Array<Record<string, unknown>>)
      : [],
    chaseItems: Array.isArray((args.output as any)?.warningsAndGaps?.chaseItems)
      ? ((args.output as any).warningsAndGaps.chaseItems as Array<Record<string, unknown>>)
      : [],
  };
}

type ResolvedRef = {
  ok: boolean;
  documentId: string | null;
  title: string | null;
  sourcePage: string | null;
  pageIdentityKnown: boolean;
  fieldRef: string | null;
  factId: string | null;
  limitation: string | null;
  unresolved: boolean;
  supportingReferences: SupportingReference[];
  mixedClaimIncomplete: boolean;
};

function emptyFail(limitation: string, mixed = false): ResolvedRef {
  return {
    ok: false,
    documentId: null,
    title: null,
    sourcePage: null,
    pageIdentityKnown: false,
    fieldRef: null,
    factId: null,
    limitation,
    unresolved: true,
    supportingReferences: [],
    mixedClaimIncomplete: mixed,
  };
}

function pageHashFor(index: ProvenanceIndex, docId: string, page: string | null): string | null {
  if (!page) return null;
  const meta = index.byDocId.get(docId);
  if (!meta) return null;
  const hit = meta.pages.get(page) || meta.pages.get(String(page));
  return hit?.textHash ?? null;
}

function bindEvidenceRow(row: Record<string, unknown>, index: ProvenanceIndex): ResolvedRef {
  const docId =
    typeof row.sourceDocumentIdentity === "string"
      ? row.sourceDocumentIdentity
      : typeof row.source === "string"
        ? row.source
        : null;
  if (!docId) {
    return emptyFail("Fail closed: evidence row lacks sourceDocumentIdentity/source.");
  }
  const pageIdentity =
    typeof row.sourcePageIdentity === "string"
      ? row.sourcePageIdentity
      : typeof row.sourcePage === "string" && String(row.sourcePage).includes("/page/")
        ? String(row.sourcePage)
        : docId && row.sourcePage != null
          ? `${docId}/page/${row.sourcePage}`
          : null;
  const known = row.pageIdentityKnown === true || Boolean(pageIdentity && String(pageIdentity).includes("/page/"));
  const existence = String(row.existence || "");
  const unresolved = /missing|referred|absent|unknown|unclear/i.test(existence);
  const eu = typeof row.evidenceUnitId === "string" ? row.evidenceUnitId : null;
  const textHash = pageHashFor(index, docId, pageIdentity);
  const fieldRef = eu
    ? `evidenceUnitId:${eu}`
    : textHash
      ? `sourceTextHash:${textHash}`
      : pageIdentity
        ? `pageIdentity:${pageIdentity}`
        : null;
  if (!fieldRef || !known || !pageIdentity) {
    return {
      ok: false,
      documentId: docId,
      title: index.byDocId.get(docId)?.title ?? String(row.label || docId),
      sourcePage: pageIdentity,
      pageIdentityKnown: known,
      fieldRef,
      factId: eu || docId,
      limitation:
        "Fail closed: evidence row missing exact page identity and/or source-text hash / structured-field reference.",
      unresolved: true,
      supportingReferences: [],
      mixedClaimIncomplete: false,
    };
  }
  const ref: SupportingReference = {
    documentId: docId,
    sourcePage: pageIdentity,
    pageIdentityKnown: true,
    fieldRef,
    factId: eu || docId,
    title: index.byDocId.get(docId)?.title ?? String(row.label || docId),
  };
  return {
    ok: true,
    documentId: docId,
    title: ref.title,
    sourcePage: pageIdentity,
    pageIdentityKnown: true,
    fieldRef,
    factId: ref.factId,
    limitation: unresolved
      ? String(row.limitationReason || `Evidence state ${existence} — not treated as served content.`)
      : null,
    unresolved,
    supportingReferences: [ref],
    mixedClaimIncomplete: false,
  };
}

function bindChargeInstrument(inst: Record<string, unknown>, index: ProvenanceIndex): ResolvedRef {
  const docId = typeof inst.sourceDocument === "string" ? inst.sourceDocument : null;
  const page =
    typeof inst.sourcePageIdentity === "string"
      ? inst.sourcePageIdentity
      : typeof inst.sourcePage === "string"
        ? String(inst.sourcePage).includes("/page/")
          ? String(inst.sourcePage)
          : docId
            ? `${docId}/page/${inst.sourcePage}`
            : null
        : null;
  const known = inst.pageIdentityKnown === true || Boolean(page);
  const instrumentId = typeof inst.instrumentId === "string" ? inst.instrumentId : null;
  if (!docId || !page || !known || !instrumentId) {
    return emptyFail("Fail closed: charge instrument lacks exact document/page/instrument identity.");
  }
  const textHash = pageHashFor(index, docId, page);
  const fieldRef = `chargeInstrumentId:${instrumentId}${textHash ? `|sourceTextHash:${textHash}` : ""}`;
  const ref: SupportingReference = {
    documentId: docId,
    sourcePage: page,
    pageIdentityKnown: true,
    fieldRef,
    factId: instrumentId,
    title: index.byDocId.get(docId)?.title ?? docId,
  };
  return {
    ok: true,
    documentId: docId,
    title: ref.title,
    sourcePage: page,
    pageIdentityKnown: true,
    fieldRef,
    factId: instrumentId,
    limitation: null,
    unresolved: false,
    supportingReferences: [ref],
    mixedClaimIncomplete: false,
  };
}

function bindChaseItem(hit: Record<string, unknown>, index: ProvenanceIndex): ResolvedRef {
  const page =
    (typeof hit.provenanceSourcePage === "string" && hit.provenanceSourcePage) ||
    (typeof hit.sourcePointer === "string" && hit.sourcePointer) ||
    null;
  const docId =
    typeof hit.sourceBasis === "string"
      ? String(hit.sourceBasis).split("/")[0]!
      : page
        ? String(page).split("/")[0]!
        : null;
  const unresolved = /missing|referred|absent|outstanding/i.test(
    String(hit.resolutionState || hit.requestedState || ""),
  );
  const eu =
    typeof hit.evidenceUnitId === "string"
      ? hit.evidenceUnitId
      : typeof hit.linkedEvidenceOccurrenceRef === "string"
        ? hit.linkedEvidenceOccurrenceRef
        : null;
  const req = typeof hit.requestId === "string" ? hit.requestId : null;
  if (!docId || !page || !eu) {
    return emptyFail("Fail closed: chase item lacks exact document/page/evidence-unit binding.");
  }
  const textHash = pageHashFor(index, docId, page);
  const fieldRef = eu.startsWith("evidenceUnitId:")
    ? eu
    : `evidenceUnitId:${eu}${textHash ? `|sourceTextHash:${textHash}` : ""}`;
  const ref: SupportingReference = {
    documentId: docId,
    sourcePage: page,
    pageIdentityKnown: true,
    fieldRef,
    factId: req || eu,
    title: String(hit.label || index.byDocId.get(docId)?.title || docId),
  };
  return {
    ok: true,
    documentId: docId,
    title: ref.title,
    sourcePage: page,
    pageIdentityKnown: true,
    fieldRef,
    factId: ref.factId,
    limitation: unresolved
      ? `Explicit limitation: item ${String(hit.label || "")} is ${String(hit.resolutionState || "unresolved")} — content not invented.`
      : null,
    unresolved,
    supportingReferences: [ref],
    mixedClaimIncomplete: false,
  };
}

function mentionedDocIds(text: string, index: ProvenanceIndex): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(PAGE_IDENTITY_RE)) {
    const docId = m[1]!;
    if (index.byDocId.has(docId)) found.add(docId);
  }
  for (const docId of index.byDocId.keys()) {
    if (text.includes(docId)) found.add(docId);
    // Accept MG5 ↔ MG05 alias only when the pack contains that canonical id
    const mgLoose = docId.match(/^MG0?(\d+)$/i);
    if (mgLoose) {
      const n = mgLoose[1]!;
      if (new RegExp(`\\bMG0?${n}\\b`, "i").test(text)) found.add(docId);
    }
  }
  return [...found];
}

function mentionedPageIdentities(text: string, index: ProvenanceIndex): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(PAGE_IDENTITY_RE)) {
    const pageId = `${m[1]}/page/${m[2]}`;
    const docId = m[1]!;
    if (index.byDocId.has(docId)) out.push(pageId);
  }
  return out;
}

/**
 * Exact provenance binding only:
 * - document ID;
 * - page identity;
 * - evidence-unit ID;
 * - canonical finding/fact reference;
 * - or explicit structured-field reference (pointer into chargeInstruments / evidenceStates / chaseItems).
 * NEVER: non-empty evidence-row label length wildcard.
 */
function resolveEvidenceRef(text: string, pointer: string, index: ProvenanceIndex): ResolvedRef {
  // 1) Exact structured-field pointer binding
  const es = pointer.match(/\/evidenceStates\/(\d+)/);
  if (es) {
    const row = index.evidenceRows[Number(es[1])];
    if (row) return bindEvidenceRow(row, index);
    return emptyFail(`Fail closed: evidenceStates index ${es[1]} missing.`);
  }
  const ci = pointer.match(/\/chargeInstruments\/(\d+)/);
  if (ci) {
    const inst = index.chargeInstruments[Number(ci[1])];
    if (inst) return bindChargeInstrument(inst, index);
    return emptyFail(`Fail closed: chargeInstruments index ${ci[1]} missing.`);
  }
  const ch = pointer.match(/\/(?:warningsAndGaps\/)?chaseItems\/(\d+)/);
  if (ch) {
    const hit = index.chaseItems[Number(ch[1])];
    if (hit) return bindChaseItem(hit, index);
    return emptyFail(`Fail closed: chaseItems index ${ch[1]} missing.`);
  }
  const euPtr = pointer.match(/evidenceUnitId:([A-Za-z0-9:_-]+)/);
  if (euPtr) {
    const eu = euPtr[1]!;
    const row = index.evidenceRows.find(
      (r) => r.evidenceUnitId === eu || r.evidenceUnitId === `eu-${eu}` || String(r.evidenceUnitId || "").endsWith(eu),
    );
    if (row) return bindEvidenceRow(row, index);
  }

  // 2) Exact page identities in text
  const pages = mentionedPageIdentities(text, index);
  if (pages.length === 1) {
    const page = pages[0]!;
    const docId = page.split("/")[0]!;
    const row =
      index.evidenceRows.find(
        (r) =>
          (r.sourceDocumentIdentity === docId || r.source === docId) &&
          (r.sourcePageIdentity === page ||
            r.sourcePage === page ||
            `${docId}/page/${r.sourcePage}` === page),
      ) || null;
    if (row) return bindEvidenceRow(row, index);
    const textHash = pageHashFor(index, docId, page);
    if (textHash) {
      const ref: SupportingReference = {
        documentId: docId,
        sourcePage: page,
        pageIdentityKnown: true,
        fieldRef: `pageIdentity:${page}|sourceTextHash:${textHash}`,
        factId: docId,
        title: index.byDocId.get(docId)?.title ?? docId,
      };
      return {
        ok: true,
        documentId: docId,
        title: ref.title,
        sourcePage: page,
        pageIdentityKnown: true,
        fieldRef: ref.fieldRef,
        factId: docId,
        limitation: null,
        unresolved: false,
        supportingReferences: [ref],
        mixedClaimIncomplete: false,
      };
    }
  }
  if (pages.length > 1) {
    const refs: SupportingReference[] = [];
    for (const page of pages) {
      const docId = page.split("/")[0]!;
      const textHash = pageHashFor(index, docId, page);
      if (!textHash) {
        return emptyFail(
          "Fail closed: mixed page-identity claims lack complete source-text hashes for every referenced page.",
          true,
        );
      }
      refs.push({
        documentId: docId,
        sourcePage: page,
        pageIdentityKnown: true,
        fieldRef: `pageIdentity:${page}|sourceTextHash:${textHash}`,
        factId: docId,
        title: index.byDocId.get(docId)?.title ?? docId,
      });
    }
    const primary = refs[0]!;
    return {
      ok: true,
      documentId: primary.documentId,
      title: primary.title,
      sourcePage: primary.sourcePage,
      pageIdentityKnown: true,
      fieldRef: refs.map((r) => r.fieldRef).join("||"),
      factId: refs.map((r) => r.factId).join("+"),
      limitation: null,
      unresolved: false,
      supportingReferences: refs,
      mixedClaimIncomplete: false,
    };
  }

  // 3) Exact charge wording → that instrument only (not first instrument by keyword)
  const tNorm = norm(text);
  for (let i = 0; i < index.chargeInstruments.length; i++) {
    const inst = index.chargeInstruments[i]!;
    const wording = typeof inst.exactWording === "string" ? norm(inst.exactWording) : "";
    if (wording && wording.length >= 24 && tNorm.includes(wording)) {
      return bindChargeInstrument(inst, index);
    }
  }

  // 4) Exact evidenceUnitId token in text
  const euText = text.match(/\b(eu-[A-Za-z0-9_-]+)\b/);
  if (euText) {
    const eu = euText[1]!;
    const row = index.evidenceRows.find((r) => r.evidenceUnitId === eu);
    if (row) return bindEvidenceRow(row, index);
  }

  // 5) Exact document ID mentions — require a resolvable page + hash; multi-doc ⇒ all refs or fail
  const docs = mentionedDocIds(text, index);
  if (docs.length === 1) {
    const docId = docs[0]!;
    const row = index.evidenceRows.find((r) => r.sourceDocumentIdentity === docId || r.source === docId);
    if (row) {
      const bound = bindEvidenceRow(row, index);
      // Guard: bound document must equal mentioned document (never first-label wildcard)
      if (bound.documentId === docId) return bound;
      return emptyFail(`Fail closed: mention of ${docId} resolved to unrelated ${bound.documentId}.`);
    }
    const meta = index.byDocId.get(docId);
    const firstPage = meta ? [...meta.pages.values()][0] : null;
    if (firstPage) {
      return {
        ok: true,
        documentId: docId,
        title: meta!.title,
        sourcePage: firstPage.pageIdentity,
        pageIdentityKnown: true,
        fieldRef: `pageIdentity:${firstPage.pageIdentity}|sourceTextHash:${firstPage.textHash}`,
        factId: docId,
        limitation: null,
        unresolved: false,
        supportingReferences: [
          {
            documentId: docId,
            sourcePage: firstPage.pageIdentity,
            pageIdentityKnown: true,
            fieldRef: `pageIdentity:${firstPage.pageIdentity}|sourceTextHash:${firstPage.textHash}`,
            factId: docId,
            title: meta!.title,
          },
        ],
        mixedClaimIncomplete: false,
      };
    }
  }
  if (docs.length > 1) {
    return emptyFail(
      `Fail closed: mixed claims reference documents [${docs.join(", ")}] without exact page identities for every claim — split leaves or supply all supporting references.`,
      true,
    );
  }

  // 6) Chase label exact inclusion (no chaseItems[0] fallback)
  if (/chase|provide|referred|missing|absent|master/i.test(pointer + text)) {
    const matches = index.chaseItems.filter((c) => {
      const label = String(c.label || "");
      return label.length >= 8 && text.toLowerCase().includes(label.toLowerCase().slice(0, 24));
    });
    if (matches.length === 1) return bindChaseItem(matches[0]!, index);
    if (matches.length > 1) {
      return emptyFail("Fail closed: multiple chase items match text — ambiguous provenance.");
    }
  }

  return emptyFail(
    "Fail closed: no resolvable document ID, page identity, evidence-unit ID, canonical fact/finding reference, or explicit structured-field reference.",
  );
}

/**
 * Classify one solicitor-visible leaf. Length >= 40 alone never yields substantive_source_backed.
 * Attached solicitorLeafProvenance (V2.1.4.2) is authoritative when present and complete.
 */
export function classifyProvenanceBoundLeaf(args: {
  caseId: string;
  surface: string;
  jsonPointer: string;
  text: string;
  index: ProvenanceIndex;
  derivationHandlerId?: string;
  attachedProvenance?: {
    classificationHint:
      | "substantive_source_backed"
      | "substantive_derived_conclusion"
      | "substantive_explicitly_unresolved"
      | "universal_safety"
      | "protected_audit_only";
    supportingCanonicalFactOrFindingIds: string[];
    supportingReferences: Array<{
      documentId: string | null;
      sourcePage: string | null;
      pageIdentityKnown: boolean;
      fieldRef: string;
      factId: string;
      title?: string | null;
    }>;
    derivationHandlerId: string;
    limitation?: string | null;
    nextAction?: string | null;
    copyable: boolean;
    ordinaryExit: boolean;
  } | null;
}): ProvenanceBoundLeaf {
  const text = (args.text || "").trim();
  const wordingHash = sha(text);
  const base = {
    caseId: args.caseId,
    surface: args.surface,
    jsonPointer: args.jsonPointer,
    exactWording: text,
    wordingHash,
    derivationHandlerId: args.derivationHandlerId || "v2.1.4.2-exact-provenance-leaf-classifier",
  };

  if (!text) {
    return {
      ...base,
      classification: "not_exercised",
      supportingCanonicalFactOrFindingId: null,
      supportingDocumentId: null,
      sourceDocumentTypeOrTitle: null,
      exactSourcePage: null,
      pageIdentityKnown: false,
      sourceTextHashOrStructuredFieldRef: null,
      limitation: "Empty leaf",
    };
  }

  // Protected audit / inventory labels — never ordinary copyable exits
  if (
    /\/chaseAuditMetadata\//.test(args.jsonPointer) ||
    /\/(requestId|evidenceUnitId)\b/.test(args.jsonPointer) ||
    /\/(attributionGraph|chronologyEvents|provenanceRecords|exitPayloadReceipts|warningsAndGaps|chargeCompleteness|fiveAnswersEvidenceRows|chaseRelationships|chaseProvenanceLinks)\//.test(
      args.jsonPointer,
    ) ||
    /\/evidenceStates\/\d+\/(label|evidenceUnitId|subjectDefendantId|source|sourceDocumentIdentity|sourcePage|compiledPage|pageIdentityKnown|pageClass|existence|inferredSourceState|evidenceTypeOrModality)\b/.test(
      args.jsonPointer,
    ) ||
    (/\/evidenceStates\/\d+\/evidenceAnchor\b/.test(args.jsonPointer) &&
      /index referral|Absent item — no MG06|without inventing/i.test(text)) ||
    /\/chargeInstruments\/\d+\/(instrumentId|sourceDocument|sourcePage|compiledPage|pageIdentityKnown|status|version|count|defendantAllocation)\b/.test(
      args.jsonPointer,
    ) ||
    /\/(courtNote|exportVersion)\/(canCopy|blockedReason|sendability|exportId|caseId|generatedAt|exportType|warningCount|appVersion|bundleVersionLabel)\b/.test(
      args.jsonPointer,
    ) ||
    /^(true|false|needs_solicitor_review|unavailable|partial|total)$/i.test(text)
  ) {
    return {
      ...base,
      classification: "protected_audit_only",
      supportingCanonicalFactOrFindingId: null,
      supportingDocumentId: null,
      sourceDocumentTypeOrTitle: null,
      exactSourcePage: null,
      pageIdentityKnown: false,
      sourceTextHashOrStructuredFieldRef: null,
      limitation: "Protected audit / inventory field — not ordinary solicitor wording",
    };
  }

  if (INTERNAL_ID_RE.test(text)) {
    return {
      ...base,
      classification: "machine_metadata",
      supportingCanonicalFactOrFindingId: null,
      supportingDocumentId: null,
      sourceDocumentTypeOrTitle: null,
      exactSourcePage: null,
      pageIdentityKnown: false,
      sourceTextHashOrStructuredFieldRef: null,
      limitation: "Internal / harness identifier language",
    };
  }

  const att = args.attachedProvenance;
  if (att && att.classificationHint === "protected_audit_only") {
    return {
      ...base,
      derivationHandlerId: att.derivationHandlerId,
      classification: "protected_audit_only",
      supportingCanonicalFactOrFindingId: att.supportingCanonicalFactOrFindingIds[0] || null,
      supportingDocumentId: att.supportingReferences[0]?.documentId ?? null,
      sourceDocumentTypeOrTitle: att.supportingReferences[0]?.title ?? null,
      exactSourcePage: att.supportingReferences[0]?.sourcePage ?? null,
      pageIdentityKnown: att.supportingReferences[0]?.pageIdentityKnown ?? false,
      sourceTextHashOrStructuredFieldRef: att.supportingReferences[0]?.fieldRef ?? null,
      limitation: att.limitation || "Protected audit only",
      supportingReferences: att.supportingReferences.map((r) => ({
        documentId: r.documentId || "structured",
        sourcePage: r.sourcePage,
        pageIdentityKnown: r.pageIdentityKnown,
        fieldRef: r.fieldRef,
        factId: r.factId,
        title: r.title ?? null,
      })),
    };
  }

  if (att && att.classificationHint === "universal_safety") {
    return {
      ...base,
      derivationHandlerId: att.derivationHandlerId,
      classification: "universal_safety",
      supportingCanonicalFactOrFindingId: null,
      supportingDocumentId: null,
      sourceDocumentTypeOrTitle: null,
      exactSourcePage: null,
      pageIdentityKnown: false,
      sourceTextHashOrStructuredFieldRef: null,
      limitation: null,
    };
  }

  if (att && att.classificationHint === "substantive_derived_conclusion") {
    const refs = att.supportingReferences;
    const ids = att.supportingCanonicalFactOrFindingIds;
    if (!refs.length || !ids.length || !att.derivationHandlerId) {
      return {
        ...base,
        classification: "fail_closed_unresolved_reference",
        supportingCanonicalFactOrFindingId: null,
        supportingDocumentId: null,
        sourceDocumentTypeOrTitle: null,
        exactSourcePage: null,
        pageIdentityKnown: false,
        sourceTextHashOrStructuredFieldRef: null,
        limitation: "Derived conclusion missing dependency references or derivation handler.",
      };
    }
    const primary = refs.find((r) => r.documentId) || refs[0]!;
    return {
      ...base,
      derivationHandlerId: att.derivationHandlerId,
      classification: "substantive_derived_conclusion",
      supportingCanonicalFactOrFindingId: ids.join("+"),
      supportingDocumentId: primary.documentId,
      sourceDocumentTypeOrTitle: primary.title ?? null,
      exactSourcePage: primary.sourcePage,
      pageIdentityKnown: primary.pageIdentityKnown,
      sourceTextHashOrStructuredFieldRef: refs.map((r) => r.fieldRef).join("||"),
      limitation: att.limitation || null,
      supportingReferences: refs.map((r) => ({
        documentId: r.documentId || "structured",
        sourcePage: r.sourcePage,
        pageIdentityKnown: r.pageIdentityKnown,
        fieldRef: r.fieldRef,
        factId: r.factId,
        title: r.title ?? null,
      })),
    };
  }

  if (att && att.classificationHint === "substantive_explicitly_unresolved") {
    const refs = att.supportingReferences;
    const primary = refs[0];
    return {
      ...base,
      derivationHandlerId: att.derivationHandlerId,
      classification: "substantive_explicitly_unresolved",
      supportingCanonicalFactOrFindingId: att.supportingCanonicalFactOrFindingIds.join("+") || null,
      supportingDocumentId: primary?.documentId ?? null,
      sourceDocumentTypeOrTitle: primary?.title ?? null,
      exactSourcePage: primary?.sourcePage ?? null,
      pageIdentityKnown: primary?.pageIdentityKnown ?? false,
      sourceTextHashOrStructuredFieldRef:
        refs.map((r) => r.fieldRef).join("||") || "structuredField:explicit_unresolved",
      limitation: att.limitation || "Explicit unresolved wording.",
      supportingReferences: refs.map((r) => ({
        documentId: r.documentId || "structured",
        sourcePage: r.sourcePage,
        pageIdentityKnown: r.pageIdentityKnown,
        fieldRef: r.fieldRef,
        factId: r.factId,
        title: r.title ?? null,
      })),
    };
  }

  if (att && att.classificationHint === "substantive_source_backed") {
    const refs = att.supportingReferences.filter((r) => r.documentId && r.fieldRef);
    if (!refs.length) {
      return {
        ...base,
        classification: "fail_closed_unresolved_reference",
        supportingCanonicalFactOrFindingId: null,
        supportingDocumentId: null,
        sourceDocumentTypeOrTitle: null,
        exactSourcePage: null,
        pageIdentityKnown: false,
        sourceTextHashOrStructuredFieldRef: null,
        limitation: "Source-backed hint without exact document/field references.",
      };
    }
    const primary = refs[0]!;
    return {
      ...base,
      derivationHandlerId: att.derivationHandlerId,
      classification: "substantive_source_backed",
      supportingCanonicalFactOrFindingId: att.supportingCanonicalFactOrFindingIds.join("+") || primary.factId,
      supportingDocumentId: primary.documentId,
      sourceDocumentTypeOrTitle: primary.title ?? null,
      exactSourcePage: primary.sourcePage,
      pageIdentityKnown: primary.pageIdentityKnown || Boolean(primary.sourcePage),
      sourceTextHashOrStructuredFieldRef: refs.map((r) => r.fieldRef).join("||"),
      limitation: null,
      supportingReferences: refs.map((r) => ({
        documentId: r.documentId!,
        sourcePage: r.sourcePage,
        pageIdentityKnown: r.pageIdentityKnown,
        fieldRef: r.fieldRef,
        factId: r.factId,
        title: r.title ?? null,
      })),
    };
  }

  if (
    text.length < 40 &&
    /^(charges?|key facts?|war room|disclosure chase|control room|five answers|issue|limitation|next action)$/i.test(
      text,
    )
  ) {
    return {
      ...base,
      classification: "label_or_heading",
      supportingCanonicalFactOrFindingId: null,
      supportingDocumentId: null,
      sourceDocumentTypeOrTitle: null,
      exactSourcePage: null,
      pageIdentityKnown: false,
      sourceTextHashOrStructuredFieldRef: null,
      limitation: null,
    };
  }
  if (UNIVERSAL_SAFETY_RE.test(text) && text.length < 280 && !/\b(MG\d{2}|count \d|section \d)/i.test(text)) {
    return {
      ...base,
      classification: "universal_safety",
      supportingCanonicalFactOrFindingId: null,
      supportingDocumentId: null,
      sourceDocumentTypeOrTitle: null,
      exactSourcePage: null,
      pageIdentityKnown: false,
      sourceTextHashOrStructuredFieldRef: null,
      limitation: null,
    };
  }

  const resolved = resolveEvidenceRef(text, args.jsonPointer, args.index);

  if (resolved.mixedClaimIncomplete) {
    return {
      ...base,
      classification: "fail_closed_unresolved_reference",
      supportingCanonicalFactOrFindingId: null,
      supportingDocumentId: null,
      sourceDocumentTypeOrTitle: null,
      exactSourcePage: null,
      pageIdentityKnown: false,
      sourceTextHashOrStructuredFieldRef: null,
      limitation: resolved.limitation,
      supportingReferences: [],
    };
  }

  if (
    resolved.unresolved &&
    resolved.ok &&
    resolved.fieldRef &&
    resolved.limitation &&
    /\b(unresolved|not pinned|not available|not served|referred|missing|absent|does not establish|remains without|limitation)\b/i.test(
      text + " " + resolved.limitation,
    )
  ) {
    return {
      ...base,
      classification: "substantive_explicitly_unresolved",
      supportingCanonicalFactOrFindingId: resolved.factId,
      supportingDocumentId: resolved.documentId,
      sourceDocumentTypeOrTitle: resolved.title,
      exactSourcePage: resolved.sourcePage,
      pageIdentityKnown: resolved.pageIdentityKnown,
      sourceTextHashOrStructuredFieldRef: resolved.fieldRef,
      limitation: resolved.limitation,
      supportingReferences: resolved.supportingReferences,
    };
  }

  if (
    resolved.ok &&
    resolved.documentId &&
    resolved.pageIdentityKnown &&
    resolved.sourcePage &&
    resolved.fieldRef &&
    resolved.factId &&
    !resolved.unresolved
  ) {
    return {
      ...base,
      classification: "substantive_source_backed",
      supportingCanonicalFactOrFindingId: resolved.factId,
      supportingDocumentId: resolved.documentId,
      sourceDocumentTypeOrTitle: resolved.title,
      exactSourcePage: resolved.sourcePage,
      pageIdentityKnown: true,
      sourceTextHashOrStructuredFieldRef: resolved.fieldRef,
      limitation: null,
      supportingReferences: resolved.supportingReferences,
    };
  }

  if (/\b(unresolved|not pinned|not available|not served|referred.absent|does not establish)\b/i.test(text)) {
    if (resolved.limitation || (resolved.ok && resolved.fieldRef)) {
      return {
        ...base,
        classification: "substantive_explicitly_unresolved",
        supportingCanonicalFactOrFindingId: resolved.factId,
        supportingDocumentId: resolved.documentId,
        sourceDocumentTypeOrTitle: resolved.title,
        exactSourcePage: resolved.sourcePage,
        pageIdentityKnown: resolved.pageIdentityKnown,
        sourceTextHashOrStructuredFieldRef: resolved.fieldRef,
        limitation: resolved.limitation || "Explicit unresolved wording with missing/unknown evidence reason.",
        supportingReferences: resolved.supportingReferences,
      };
    }
  }

  return {
    ...base,
    classification: "fail_closed_unresolved_reference",
    supportingCanonicalFactOrFindingId: null,
    supportingDocumentId: null,
    sourceDocumentTypeOrTitle: null,
    exactSourcePage: null,
    pageIdentityKnown: false,
    sourceTextHashOrStructuredFieldRef: null,
    limitation: resolved.limitation,
    supportingReferences: [],
  };
}

function fixtureIndex(): ProvenanceIndex {
  return {
    byDocId: new Map([
      [
        "written_charge",
        {
          title: "Written charge",
          kind: "written_charge",
          pages: new Map([
            ["1", { pageIdentity: "written_charge/page/1", textHash: sha("Battery contrary to s.39") }],
            [
              "written_charge/page/1",
              { pageIdentity: "written_charge/page/1", textHash: sha("Battery contrary to s.39") },
            ],
          ]),
        },
      ],
      [
        "MG05",
        {
          title: "MG5 Case summary",
          kind: "MG05",
          pages: new Map([
            ["1", { pageIdentity: "MG05/page/1", textHash: sha("MG5 summary text") }],
            ["MG05/page/1", { pageIdentity: "MG05/page/1", textHash: sha("MG5 summary text") }],
          ]),
        },
      ],
      [
        "MG06",
        {
          title: "MG6",
          kind: "MG06",
          pages: new Map([
            ["1", { pageIdentity: "MG06/page/1", textHash: sha("MG6 disclosure") }],
            ["MG06/page/1", { pageIdentity: "MG06/page/1", textHash: sha("MG6 disclosure") }],
          ]),
        },
      ],
      [
        "indictment",
        {
          title: "Indictment",
          kind: "indictment",
          pages: new Map([
            ["1", { pageIdentity: "indictment/page/1", textHash: sha("Count 1 indictment") }],
            ["indictment/page/1", { pageIdentity: "indictment/page/1", textHash: sha("Count 1 indictment") }],
          ]),
        },
      ],
    ]),
    evidenceRows: [
      {
        sourceDocumentIdentity: "written_charge",
        sourcePage: "1",
        sourcePageIdentity: "written_charge/page/1",
        compiledPage: "1",
        pageIdentityKnown: true,
        evidenceUnitId: "eu-written_charge",
        label: "written_charge",
        existence: "served",
      },
      {
        sourceDocumentIdentity: "MG05",
        sourcePage: "1",
        sourcePageIdentity: "MG05/page/1",
        compiledPage: "2",
        pageIdentityKnown: true,
        evidenceUnitId: "eu-MG05",
        label: "MG05",
        existence: "served",
      },
      {
        sourceDocumentIdentity: "MG06",
        sourcePage: "1",
        sourcePageIdentity: "MG06/page/1",
        compiledPage: "3",
        pageIdentityKnown: true,
        evidenceUnitId: "eu-MG06",
        label: "MG06",
        existence: "served",
      },
      {
        sourceDocumentIdentity: "indictment",
        sourcePage: "1",
        sourcePageIdentity: "indictment/page/1",
        compiledPage: "4",
        pageIdentityKnown: true,
        evidenceUnitId: "eu-indictment",
        label: "indictment",
        existence: "served",
      },
    ],
    chargeInstruments: [
      {
        instrumentId: "inst-written_charge",
        sourceDocument: "written_charge",
        sourcePage: "1",
        sourcePageIdentity: "written_charge/page/1",
        pageIdentityKnown: true,
        exactWording: "Battery, contrary to common law and section 39 of the Criminal Justice Act 1988.",
        status: "operative",
      },
    ],
    chaseItems: [
      {
        label: "Referred master media / full record (missing)",
        requestId: "req-absent-1",
        evidenceUnitId: "eu-absent-1",
        resolutionState: "outstanding_referred",
        linkedEvidenceOccurrenceRef: "evidenceUnitId:eu-absent-1",
        provenanceSourcePage: "MG06/page/1",
        sourceBasis: "MG06/MG06/page/1",
      },
    ],
  };
}

/** Contract fixtures for provenance classifier behavioural proof. */
export function proveProvenanceClassifierContracts(): {
  positiveAlters: boolean;
  negativeAlters: boolean;
  unavailableAlters: boolean;
  mutationAlters: boolean;
  detail: string;
} {
  const index = fixtureIndex();

  const positive = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "charges",
    jsonPointer: "/chargeInstruments/0/exactWording",
    text: "Battery, contrary to common law and section 39 of the Criminal Justice Act 1988.",
    index,
  });
  const negative = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "war_room",
    jsonPointer: "/warRoom/note",
    text: "Generic issue identified across the family under review without any document anchor at all.",
    index: { ...index, evidenceRows: [], chargeInstruments: [], chaseItems: [], byDocId: new Map() },
  });
  const unavailable = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "chase",
    jsonPointer: "/disclosureChase/item",
    text: "Please provide the complete master media referred to in the disclosure material — Referred master media / full record (missing) — referred-absent and not served.",
    index,
  });
  const mut = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "charges",
    jsonPointer: "/chargeInstruments/0/exactWording",
    text: "Battery, contrary to common law and section 39 of the Criminal Justice Act 1988.",
    index: {
      byDocId: new Map(),
      evidenceRows: [],
      chargeInstruments: [],
      chaseItems: index.chaseItems,
    },
  });

  const positiveAlters =
    positive.classification === "substantive_source_backed" &&
    Boolean(positive.sourceTextHashOrStructuredFieldRef) &&
    positive.supportingDocumentId === "written_charge";
  const negativeAlters = negative.classification === "fail_closed_unresolved_reference";
  const unavailableAlters = unavailable.classification === "substantive_explicitly_unresolved";
  const mutationAlters = mut.classification !== positive.classification;

  return {
    positiveAlters,
    negativeAlters,
    unavailableAlters,
    mutationAlters,
    detail: `pos=${positive.classification}/${positive.supportingDocumentId} neg=${negative.classification} una=${unavailable.classification} mut=${mut.classification}`,
  };
}

/** Adversarial exact-binding contracts required by V2.1.4.1. */
export function proveExactProvenanceAdversarialContracts(): {
  mg5NotWrittenCharge: boolean;
  mg6NotIndictment: boolean;
  labelLengthNotWildcard: boolean;
  removingExactDocChangesResult: boolean;
  mixedClaimsRequireAllRefs: boolean;
  detail: string;
} {
  const index = fixtureIndex();

  const mg5 = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "other",
    jsonPointer: "/evidenceStates/1/evidenceAnchor",
    text: "MG5 Case summary (fictional test) — MG05/page/1",
    index,
  });
  const mg5NotWrittenCharge =
    mg5.supportingDocumentId === "MG05" &&
    mg5.classification === "substantive_source_backed" &&
    Boolean(mg5.sourceTextHashOrStructuredFieldRef);

  const mg6 = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "other",
    jsonPointer: "/evidenceStates/2/evidenceAnchor",
    text: "MG6 disclosure schedule — MG06/page/1",
    index,
  });
  const mg6NotIndictment =
    mg6.supportingDocumentId === "MG06" && String(mg6.supportingDocumentId) !== "indictment";

  // Simulate the old wildcard: a leaf that only has a non-empty unrelated label context must NOT bind to written_charge
  const wildcard = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "other",
    jsonPointer: "/some/unrelated/field",
    text: "A long enough solicitor-facing note that mentions neither a document identity nor a page identity nor an evidence unit.",
    index,
  });
  const labelLengthNotWildcard =
    wildcard.classification === "fail_closed_unresolved_reference" &&
    wildcard.supportingDocumentId == null;

  const withDoc = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "other",
    jsonPointer: "/note",
    text: "See MG05/page/1 for the case summary narrative.",
    index,
  });
  const withoutDoc = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "other",
    jsonPointer: "/note",
    text: "See MG05/page/1 for the case summary narrative.",
    index: {
      ...index,
      byDocId: new Map([...index.byDocId.entries()].filter(([k]) => k !== "MG05")),
      evidenceRows: index.evidenceRows.filter((r) => r.sourceDocumentIdentity !== "MG05"),
    },
  });
  const removingExactDocChangesResult =
    withDoc.classification === "substantive_source_backed" &&
    withoutDoc.classification !== withDoc.classification;

  const mixed = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "composed_prose",
    jsonPointer: "/composedProse/courtLine",
    text: "The MG05 case summary and the indictment together frame the allegation for court.",
    index,
  });
  const mixedWithPages = classifyProvenanceBoundLeaf({
    caseId: "c",
    surface: "composed_prose",
    jsonPointer: "/composedProse/courtLine",
    text: "Rely on MG05/page/1 and indictment/page/1 together for the court framing.",
    index,
  });
  const mixedClaimsRequireAllRefs =
    mixed.classification === "fail_closed_unresolved_reference" &&
    mixedWithPages.classification === "substantive_source_backed" &&
    (mixedWithPages.supportingReferences?.length || 0) >= 2;

  return {
    mg5NotWrittenCharge,
    mg6NotIndictment,
    labelLengthNotWildcard,
    removingExactDocChangesResult,
    mixedClaimsRequireAllRefs,
    detail: JSON.stringify({
      mg5: { doc: mg5.supportingDocumentId, class: mg5.classification },
      mg6: { doc: mg6.supportingDocumentId, class: mg6.classification },
      wildcard: wildcard.classification,
      withDoc: withDoc.classification,
      withoutDoc: withoutDoc.classification,
      mixed: mixed.classification,
      mixedWithPages: {
        class: mixedWithPages.classification,
        refs: mixedWithPages.supportingReferences?.length || 0,
      },
    }),
  };
}

function normalizeDocToken(s: string): string {
  return s.toUpperCase().replace(/^MG0+(\d)/i, "MG$1");
}

function docsCompatible(mentioned: string, bound: string): boolean {
  const a = normalizeDocToken(mentioned);
  const b = normalizeDocToken(bound);
  if (a === b) return true;
  // MG12 ↔ MG12_exhibits; MG15 ↔ MG15_interview; MG11 ↔ MG11_complainant_signed
  if (b.startsWith(a + "_") || a.startsWith(b + "_")) return true;
  if (a.startsWith("MG") && b.startsWith(a)) return true;
  if (b.startsWith("MG") && a.startsWith(b)) return true;
  return false;
}

/** Scan helpers for gate metrics — true wrong-document only (not MG12 vs MG12_exhibits alias). */
export function isWrongDocumentBinding(leaf: ProvenanceBoundLeaf): boolean {
  if (leaf.classification !== "substantive_source_backed") return false;
  const text = leaf.exactWording || "";
  const doc = leaf.supportingDocumentId || "";
  if (!doc) return true;

  // Explicit page identity in wording must agree with bound document
  const pageHit = [...text.matchAll(/\b([A-Za-z][A-Za-z0-9_-]*)\/page\/\d+\b/g)].map((m) => m[1]!);
  if (pageHit.length === 1 && !docsCompatible(pageHit[0]!, doc)) return true;

  // MG5/MG05 must never bind to written_charge
  if (/\bMG0?5\b/i.test(text) && doc === "written_charge") return true;
  // MG6/MG06 must never bind to indictment
  if (/\bMG0?6\b/i.test(text) && doc === "indictment") return true;

  // Pointer-bound evidenceStates leaf: if wording names a clear MG form incompatible with bound doc
  const es = leaf.jsonPointer.match(/\/evidenceStates\/(\d+)/);
  if (es) {
    const named = [...text.matchAll(/\b(MG0?\d+|written_charge|indictment|defence_proof)\b/gi)].map((m) => m[1]!);
    if (named.length >= 1 && !named.some((n) => docsCompatible(n, doc))) {
      // Only fail when none of the named tokens are compatible with the bound document
      // and at least one named token is a different instrument class
      if (named.some((n) => /^(written_charge|indictment)$/i.test(n)) && /^MG/i.test(doc)) return true;
      if (named.some((n) => /^MG/i.test(n)) && /^(written_charge|indictment)$/i.test(doc)) return true;
    }
  }
  return false;
}

export function sourceBackedMissingExactRef(leaf: ProvenanceBoundLeaf): boolean {
  return (
    leaf.classification === "substantive_source_backed" &&
    (!leaf.sourceTextHashOrStructuredFieldRef ||
      !leaf.supportingDocumentId ||
      !leaf.exactSourcePage ||
      !leaf.pageIdentityKnown ||
      !leaf.supportingCanonicalFactOrFindingId ||
      !leaf.derivationHandlerId)
  );
}
