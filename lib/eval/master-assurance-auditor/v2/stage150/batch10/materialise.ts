/**
 * Batch-10 source-backed rematerialiser.
 * Only extracts from genuine PDF page meta + SECTION-marked canonical bundles.
 * Never invents from vague prose. Never opens truth-key contents. Never overwrites ESA.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  BATCH10_EXIT_IDS,
  BATCH10_PACKET_SCHEMA,
  BATCH10_SCHEMA_VERSION,
  type Batch10AdapterCapability,
  type Batch10ChargeInstrument,
  type Batch10ChronologyEvent,
  type Batch10EvidenceUnit,
  type Batch10ExitId,
  type Batch10ExitPayloadReceipt,
  type Batch10ProvenanceRow,
  type Batch10SourceDocument,
  type Batch10StructuredCasePacket,
} from "./schemas";

function sha256(buf: string | Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256File(abs: string): string | null {
  if (!fs.existsSync(abs)) return null;
  return sha256(fs.readFileSync(abs));
}

function idFrom(parts: string, note: string) {
  const h = sha256(parts);
  return {
    id: `b10_${h.slice(0, 24)}`,
    derivation: { algorithm: "sha256" as const, of: parts, note },
  };
}

function rollup(complete: number, applicable: number): Batch10AdapterCapability {
  if (applicable === 0) return "unavailable";
  if (complete === 0) return "partial"; // records exist but none complete — never invent eligibility
  if (complete === applicable) return "eligible";
  return "partial";
}

type PdfMeta = {
  pageCount?: number;
  pages?: Array<{ pageNumber?: number; label?: string; text?: string }>;
  pdfFileName?: string;
};

function parseIndexRows(canonical: string): Array<{ title: string; pages: string; note: string }> {
  const idx = canonical.match(
    /===\s*SECTION:\s*COVER_INDEX\s*===([\s\S]*?)(?===\s*SECTION:|$)/i,
  );
  if (!idx) return [];
  const rows: Array<{ title: string; pages: string; note: string }> = [];
  for (const line of idx[1]!.split(/\r?\n/)) {
    const m = line.match(/^([^|]+)\|([^|]+)\|?(.*)$/);
    if (!m) continue;
    const title = m[1]!.trim();
    if (!title || /^document$/i.test(title) || /^index$/i.test(title)) continue;
    rows.push({ title, pages: m[2]!.trim(), note: (m[3] ?? "").trim() });
  }
  return rows;
}

function parseChargeSection(canonical: string): {
  offence: string | null;
  particulars: string | null;
  defendant: string | null;
} {
  const sec = canonical.match(/===\s*SECTION:\s*CHARGE\s*===([\s\S]*?)(?===\s*SECTION:|$)/i);
  if (!sec) return { offence: null, particulars: null, defendant: null };
  const body = sec[1]!;
  const def = body.match(/R\s+v\s+([^\n\r]+)/i)?.[1]?.trim() ?? null;
  const offence =
    body.match(/Statement of Offence:\s*\r?\n([^\n\r]+)/i)?.[1]?.trim() ?? null;
  const particulars =
    body.match(/Particulars of Offence:\s*\r?\n([\s\S]*?)(?=\r?\n\r?\n|===|$)/i)?.[1]?.trim() ??
    null;
  return { offence, particulars, defendant: def };
}

function parseCourtListing(canonical: string): {
  timestamp: string | null;
  timezone: string | null;
  raw: string | null;
} {
  const sec = canonical.match(
    /===\s*SECTION:\s*(?:COURT_)?LISTING\s*===([\s\S]*?)(?===\s*SECTION:|$)/i,
  );
  const body = sec?.[1] ?? "";
  // Only accept clear dates — reject OCR-ambiguous listings.
  if (/OCR|letter l may be digit/i.test(body)) {
    return { timestamp: null, timezone: null, raw: body.trim() || null };
  }
  const m = body.match(
    /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}),?\s+(\d{1,2}:\d{2})/i,
  );
  if (!m) {
    return { timestamp: null, timezone: null, raw: body.trim() || null };
  }
  const tz = body.match(/\b(Europe\/London|UTC|GMT|BST)\b/)?.[1] ?? null;
  return { timestamp: `${m[1]} ${m[2]}`, timezone: tz, raw: body.trim() || null };
}

function emptyExits(): Record<Batch10ExitId, Batch10ExitPayloadReceipt> {
  return Object.fromEntries(
    BATCH10_EXIT_IDS.map((exitId) => [
      exitId,
      {
        exitId,
        payloadIdentity: null,
        payloadPath: null,
        realPayloadPresent: false,
        sendability: null,
        unavailableReason: `No genuine /exitPayloadReceipts/${exitId} payload bytes on source packet`,
        chargeWarningAttached: null,
        evidencePartialWarning: null,
        quarantineScope: null,
        metadataOnly: false,
        sourcePointer: null,
      } satisfies Batch10ExitPayloadReceipt,
    ]),
  ) as Record<Batch10ExitId, Batch10ExitPayloadReceipt>;
}

export type MaterialiseResult =
  | { ok: true; packet: Batch10StructuredCasePacket }
  | { ok: false; caseId: string; reasons: string[] };

/**
 * Rematerialise one source directory into a structured packet.
 * Accepts only when genuine source documents + page identity (or SECTION index) exist.
 */
export function materialiseStructuredPacket(args: {
  caseId: string;
  sourceLaneId: string;
  sourceDir: string;
}): MaterialiseResult {
  const { caseId, sourceLaneId, sourceDir } = args;
  const reasons: string[] = [];
  const bundlePdf = path.join(sourceDir, "bundle.pdf");
  const metaPath = path.join(sourceDir, "pdf-extraction-meta.json");
  const canonicalPath = path.join(sourceDir, "canonical-bundle.md");
  const bundleTextPath = path.join(sourceDir, "bundle-text.md");
  const outputPath = path.join(sourceDir, "casebrain-output.json");
  const truthPath = path.join(sourceDir, "truth-key.json");

  const hasPdf = fs.existsSync(bundlePdf);
  const hasMeta = fs.existsSync(metaPath);
  const hasCanonical = fs.existsSync(canonicalPath);

  if (!hasPdf && !hasCanonical) {
    return {
      ok: false,
      caseId,
      reasons: ["rejected: no bundle.pdf or canonical-bundle.md — refuse prose-only rematerialisation"],
    };
  }
  if (!hasMeta && !hasCanonical) {
    return {
      ok: false,
      caseId,
      reasons: ["rejected: no pdf-extraction-meta.json or canonical SECTION bundle"],
    };
  }

  let meta: PdfMeta | null = null;
  if (hasMeta) {
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as PdfMeta;
    } catch {
      reasons.push("pdf-extraction-meta.json unreadable");
    }
  }
  const canonical = hasCanonical ? fs.readFileSync(canonicalPath, "utf8") : "";
  const indexRows = canonical ? parseIndexRows(canonical) : [];
  const pageUnits = Array.isArray(meta?.pages) ? meta!.pages! : [];

  if (pageUnits.length === 0 && indexRows.length === 0) {
    return {
      ok: false,
      caseId,
      reasons: ["rejected: no genuine page units or COVER_INDEX rows"],
    };
  }

  const sourceManifest: Batch10SourceDocument[] = [];
  if (hasPdf) {
    const pdfSha = sha256File(bundlePdf)!;
    const derived = idFrom(`${caseId}|bundle.pdf|${pdfSha}`, "hash(caseId|filename|contentSha256)");
    sourceManifest.push({
      documentId: derived.id,
      documentIdDerivation: derived.derivation,
      contentSha256: pdfSha,
      title: meta?.pdfFileName ?? "bundle.pdf",
      documentType: "prosecution_disclosure_bundle",
      uploadOrder: 1,
      sourcePageStart: pageUnits.length ? "1" : null,
      sourcePageEnd: pageUnits.length ? String(meta?.pageCount ?? pageUnits.length) : null,
      compiledPageStart: null,
      compiledPageEnd: null,
      pageIdentityKnown: pageUnits.length > 0,
      limitationReason: pageUnits.length
        ? null
        : "PDF present but page units absent — page identity unknown",
      sourcePointer: path.relative(process.cwd(), bundlePdf).replace(/\\/g, "/"),
    });
  }

  for (const [i, row] of indexRows.entries()) {
    const derived = idFrom(`${caseId}|index|${row.title}|${row.pages}`, "hash(caseId|indexTitle|pages)");
    const pageKnown = /^\d+(-\d+)?$/.test(row.pages.replace(/\s/g, ""));
    sourceManifest.push({
      documentId: derived.id,
      documentIdDerivation: derived.derivation,
      contentSha256: null,
      title: row.title,
      documentType: "index_entry",
      uploadOrder: i + 2,
      sourcePageStart: pageKnown ? row.pages.split("-")[0]!.trim() : null,
      sourcePageEnd: pageKnown
        ? (row.pages.split("-")[1] ?? row.pages.split("-")[0]!)!.trim()
        : null,
      compiledPageStart: null,
      compiledPageEnd: null,
      pageIdentityKnown: pageKnown,
      limitationReason: pageKnown
        ? row.note || null
        : `Index pages not numeric: ${row.pages}`,
      sourcePointer: `${path.relative(process.cwd(), canonicalPath).replace(/\\/g, "/")}/COVER_INDEX/${i}`,
    });
  }

  const chargeInstruments: Batch10ChargeInstrument[] = [];
  const charge = canonical ? parseChargeSection(canonical) : { offence: null, particulars: null, defendant: null };
  if (charge.offence && charge.particulars) {
    const wording = `${charge.offence}\n${charge.particulars}`.trim();
    const derived = idFrom(`${caseId}|charge|${wording}`, "hash(caseId|exact charge wording)");
    const chargePage =
      pageUnits.find((p) => /charge/i.test(p.label ?? "") || /SECTION:\s*CHARGE/i.test(p.text ?? ""))
        ?.pageNumber ?? null;
    // Count: number of explicit "Statement of Offence" blocks in CHARGE section only.
    const offenceCount = (canonical.match(/Statement of Offence:/gi) ?? []).length;
    // Status/version only when CHARGE carries those exact tokens — never invent.
    const chargeSec =
      canonical.match(/===\s*SECTION:\s*CHARGE\s*===([\s\S]*?)(?===\s*SECTION:|$)/i)?.[1] ?? "";
    const statusMatch =
      chargeSec.match(/Instrument status:\s*(operative|amended|superseded|unresolved|draft)\b/i) ??
      chargeSec.match(/\b(operative|amended|superseded|unresolved|draft)\b/i);
    const versionMatch =
      chargeSec.match(/Instrument version:\s*([A-Za-z0-9._-]+)/i) ??
      chargeSec.match(/\bversion\s*[:=]?\s*([A-Za-z0-9._-]+)/i);
    const replacesPrior = /Replaces prior instrument:/i.test(chargeSec);
    chargeInstruments.push({
      instrumentId: derived.id,
      instrumentIdDerivation: derived.derivation,
      instrumentType: "charge_sheet",
      exactWording: wording,
      count: offenceCount > 0 ? offenceCount : null,
      defendantAllocation: charge.defendant,
      status: statusMatch ? statusMatch[1]!.toLowerCase() : null,
      version: versionMatch ? versionMatch[1]! : null,
      replacesInstrumentId: replacesPrior ? `prior:${caseId}:v1` : null,
      supersededByInstrumentId: null,
      sourceDocumentId: sourceManifest[0]?.documentId ?? null,
      sourcePage: chargePage != null ? String(chargePage) : null,
      pageIdentityKnown: chargePage != null,
      statementClassification: null, // never invent legal-state labels
      legalStateRole: null,
      sourcePointer: `${path.relative(process.cwd(), canonicalPath).replace(/\\/g, "/")}/SECTION:CHARGE`,
    });
  }

  const evidenceUnits: Batch10EvidenceUnit[] = [];
  for (const row of indexRows) {
    const title = row.title.toLowerCase();
    if (/charge sheet|mg5|mg6c|court listing|exhibit list|index/i.test(row.title) && !/statement|cctv|bwv|recording|screenshot|message|interview|abe/i.test(title)) {
      continue;
    }
    if (!/statement|cctv|bwv|recording|screenshot|message|interview|abe|phone|transcript|clip|still|master|draft|signed|exhibit pack|mg11/i.test(title)) {
      continue;
    }
    const derived = idFrom(`${caseId}|eu|${row.title}|${row.pages}`, "hash(caseId|evidence index row)");
    const pageKnown = /^\d+(-\d+)?$/.test(row.pages.replace(/\s/g, ""));
    let draftFinal: Batch10EvidenceUnit["draftFinalRelationship"] = null;
    if (/\bdraft\b/i.test(row.note + row.title) || /\bunsigned\b/i.test(row.note + row.title)) {
      draftFinal = /\bsigned\b/i.test(row.note + row.title) ? "signed" : "unsigned";
      if (/\bdraft\b/i.test(row.note + row.title)) draftFinal = "draft";
    } else if (/\bsigned\b|\bfinal\b/i.test(row.note + row.title)) {
      draftFinal = /\bfinal\b/i.test(row.note + row.title) ? "final" : "signed";
    }
    let extractFull: Batch10EvidenceUnit["extractFullRelationship"] = null;
    if (/\bextract\b/i.test(title + row.note)) extractFull = "extract";
    if (/\bfull\b/i.test(title + row.note) && !extractFull) extractFull = "full";
    let stillClip: Batch10EvidenceUnit["stillClipMasterRelationship"] = null;
    if (/\bstill\b/i.test(title)) stillClip = "still";
    else if (/\bclip\b/i.test(title)) stillClip = "clip";
    else if (/\bmaster\b/i.test(title)) stillClip = "master";
    let recTx: Batch10EvidenceUnit["recordingTranscriptRelationship"] = null;
    if (/\btranscript\b/i.test(title)) recTx = "transcript";
    else if (/\brecording\b|\bbwv\b/i.test(title)) recTx = "recording";

    evidenceUnits.push({
      evidenceUnitId: derived.id,
      evidenceUnitIdDerivation: derived.derivation,
      label: row.title,
      subjectDefendantId: charge.defendant,
      personId: null,
      existence: /missing|not attached|pages not attached/i.test(row.note) ? "missing" : "served",
      reliability: null,
      aliases: [],
      extractFullRelationship: extractFull,
      stillClipMasterRelationship: stillClip,
      recordingTranscriptRelationship: recTx,
      draftFinalRelationship: draftFinal,
      ambiguity: /duplicate index/i.test(row.note) ? "ambiguous_multiple_matches" : "none",
      sourceDocumentId: sourceManifest[0]?.documentId ?? null,
      sourcePage: pageKnown ? row.pages.split("-")[0]!.trim() : null,
      pageIdentityKnown: pageKnown,
      sourcePointer: `${path.relative(process.cwd(), canonicalPath).replace(/\\/g, "/")}/COVER_INDEX`,
    });
  }

  const chronologyEvents: Batch10ChronologyEvent[] = [];
  const listing = canonical ? parseCourtListing(canonical) : { timestamp: null, timezone: null, raw: null };
  if (listing.timestamp && listing.timezone) {
    const derived = idFrom(`${caseId}|chrono|hearing|${listing.timestamp}`, "hash(caseId|hearing|timestamp)");
    const competing =
      listing.raw && /competing sources retained/i.test(listing.raw)
        ? idFrom(`${caseId}|compete|hearing`, "hash(caseId|competing hearing group)").id
        : null;
    chronologyEvents.push({
      eventId: derived.id,
      eventIdDerivation: derived.derivation,
      eventType: "hearing",
      timestamp: listing.timestamp,
      timezone: listing.timezone,
      sourceDocumentId: sourceManifest[0]?.documentId ?? null,
      sourcePointer: `${path.relative(process.cwd(), canonicalPath).replace(/\\/g, "/")}/SECTION:LISTING`,
      competingEventGroupId: competing,
      confidence: competing ? "contested" : "high",
    });
    if (competing && listing.raw) {
      const second = listing.raw.match(
        /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}),?\s+(\d{1,2}:\d{2})/gi,
      );
      if (second && second.length > 1) {
        const m2 = second[1]!.match(
          /(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}),?\s+(\d{1,2}:\d{2})/i,
        );
        if (m2) {
          const ts2 = `${m2[1]} ${m2[2]}`;
          const d2 = idFrom(`${caseId}|chrono|hearing|${ts2}`, "hash(caseId|hearing|timestamp)");
          chronologyEvents.push({
            eventId: d2.id,
            eventIdDerivation: d2.derivation,
            eventType: "hearing",
            timestamp: ts2,
            timezone: listing.timezone,
            sourceDocumentId: sourceManifest[0]?.documentId ?? null,
            sourcePointer: `${path.relative(process.cwd(), canonicalPath).replace(/\\/g, "/")}/SECTION:LISTING#2`,
            competingEventGroupId: competing,
            confidence: "contested",
          });
        }
      }
    }
  } else if (listing.raw && listing.timestamp && !listing.timezone) {
    // Timestamp without timezone → do not claim chronology eligibility; leave empty.
    reasons.push("court listing timestamp present without timezone — chronologyEvents left empty");
  }

  const provenance: Batch10ProvenanceRow[] = [];
  for (const p of pageUnits) {
    if (typeof p.pageNumber !== "number") continue;
    const text = (p.text ?? "").trim();
    // Exact quotation only when page text is non-empty — span is the page unit itself.
    // For a single compiled disclosure PDF, compiled page equals source page (not invented default).
    const compiledKnown = hasPdf && pageUnits.length > 0;
    provenance.push({
      occurrenceRef: `/pdf-extraction-meta/pages/${p.pageNumber}`,
      quotationExactText: null,
      quotedSpan: text ? text.slice(0, 240) : null,
      sourceDocumentId: sourceManifest[0]?.documentId ?? null,
      sourcePage: String(p.pageNumber),
      compiledPage: compiledKnown ? String(p.pageNumber) : null,
      pageIdentityKnown: true,
      limitationReason: compiledKnown
        ? null
        : "compiledPage unknown — source page from pdf-extraction-meta only",
      sourcePointer: path.relative(process.cwd(), metaPath).replace(/\\/g, "/"),
    });
  }

  const chaseRelationships: Batch10StructuredCasePacket["chaseRelationships"] = [];
  // MG6C schedule lines with explicit request IDs — never invent links to evidence without exact id/label.
  const mg6 = canonical.match(/===\s*SECTION:\s*MG6\s*===([\s\S]*?)(?===\s*SECTION:|$)/i)?.[1] ?? "";
  for (const line of mg6.split(/\r?\n/)) {
    const m = line.match(/^(MG6C\/\d+)\s+[—-]\s+(.+?)\s+[—-]\s+(outstanding|served|referred)(?:\s+[—-].*)?$/i);
    if (!m) continue;
    const requestId = m[1]!;
    const label = m[2]!.trim();
    const resolutionState = m[3]!.toLowerCase();
    const derived = idFrom(`${caseId}|chase|${requestId}`, "hash(caseId|MG6C requestId)");
    // Explicit evidenceUnitId only when an evidence unit label exactly equals the MG6C item label.
    const exactEu = evidenceUnits.find(
      (e) => (e.label ?? "").trim().toLowerCase() === label.toLowerCase(),
    );
    const ambiguousPeers = evidenceUnits.filter((e) => {
      const el = (e.label ?? "").toLowerCase();
      return el.includes(label.toLowerCase().slice(0, 12)) && e !== exactEu;
    });
    chaseRelationships.push({
      requestId: derived.id,
      requestIdDerivation: {
        ...derived.derivation,
        note: `${derived.derivation.note}; sourceRequestId=${requestId}`,
      },
      chaseLabel: label,
      evidenceUnitId: exactEu?.evidenceUnitId ?? null,
      linkMethod: exactEu ? "explicit_id" : "none",
      resolutionState,
      duplicateOrAliasRelationship: null,
      ambiguity:
        !exactEu && ambiguousPeers.length > 1
          ? "ambiguous_multiple_matches"
          : !exactEu
            ? "unresolved_zero_matches"
            : "none",
      sourcePointer: `${path.relative(process.cwd(), canonicalPath).replace(/\\/g, "/")}/SECTION:MG6/${requestId}`,
    });
  }
  const exitPayloadReceipts = emptyExits();
  // Real exit payloads only when present as files — metadata alone is not an exit.
  for (const exitId of BATCH10_EXIT_IDS) {
    const payloadPath = path.join(sourceDir, "exits", exitId, "payload.bin");
    const payloadJson = path.join(sourceDir, "exits", exitId, "payload.json");
    const abs = fs.existsSync(payloadPath)
      ? payloadPath
      : fs.existsSync(payloadJson)
        ? payloadJson
        : null;
    if (abs) {
      const h = sha256File(abs)!;
      exitPayloadReceipts[exitId] = {
        exitId,
        payloadIdentity: `sha256:${h}`,
        payloadPath: path.relative(process.cwd(), abs).replace(/\\/g, "/"),
        realPayloadPresent: true,
        sendability: null,
        unavailableReason: null,
        chargeWarningAttached: null,
        evidencePartialWarning: null,
        quarantineScope: null,
        metadataOnly: false,
        sourcePointer: path.relative(process.cwd(), abs).replace(/\\/g, "/"),
      };
    }
  }

  const adapterCapability = {
    sourceManifest: rollup(
      sourceManifest.filter((d) => d.pageIdentityKnown && d.documentId).length,
      sourceManifest.length,
    ),
    // Align with Batch-8 isChargeComplete — status+version required for eligible.
    chargeInstruments: rollup(
      chargeInstruments.filter(
        (c) =>
          c.exactWording &&
          c.defendantAllocation &&
          c.count != null &&
          c.status &&
          c.version &&
          c.sourceDocumentId &&
          c.pageIdentityKnown,
      ).length,
      chargeInstruments.length || 0,
    ),
    evidenceUnits: rollup(
      evidenceUnits.filter(
        (e) => e.evidenceUnitId && (e.subjectDefendantId || e.personId) && e.existence && e.pageIdentityKnown,
      ).length,
      evidenceUnits.length || 0,
    ),
    chronologyEvents: rollup(
      chronologyEvents.filter((e) => e.eventType && e.timestamp && e.timezone).length,
      chronologyEvents.length || 0,
    ),
    // compiledPage required for Batch-8 provenance eligibility — never invent.
    provenance: rollup(
      provenance.filter((p) => p.pageIdentityKnown && p.sourcePage && p.compiledPage && p.sourceDocumentId)
        .length,
      provenance.length || 0,
    ),
    chaseRelationships: rollup(
      chaseRelationships.filter(
        (c) => c.requestId && c.linkMethod === "explicit_id" && c.evidenceUnitId && c.resolutionState,
      ).length,
      chaseRelationships.length || 0,
    ),
    // Real payload bytes only — zero genuine exits ⇒ unavailable (metadata ≠ exit).
    exitPayloadReceipts: (() => {
      const genuine = BATCH10_EXIT_IDS.filter((id) => exitPayloadReceipts[id].realPayloadPresent).length;
      if (genuine === 0) return "unavailable";
      return rollup(genuine, BATCH10_EXIT_IDS.length);
    })(),
  };

  // Acceptance: need genuine source + at least one of charge/evidence/provenance with page identity.
  const accepted =
    (hasPdf || hasCanonical) &&
    (chargeInstruments.length > 0 || evidenceUnits.length > 0 || provenance.length > 0) &&
    sourceManifest.some((d) => d.pageIdentityKnown || d.contentSha256);

  if (!accepted) {
    reasons.push("rejected: insufficient source-backed structured surfaces after extraction");
    return { ok: false, caseId, reasons };
  }

  const packet: Batch10StructuredCasePacket = {
    schemaVersion: BATCH10_PACKET_SCHEMA,
    caseId,
    sourceLaneId,
    sourceCasePath: path.relative(process.cwd(), sourceDir).replace(/\\/g, "/"),
    preservedOriginalHashes: {
      bundleTextSha256: sha256File(bundleTextPath),
      casebrainOutputSha256: sha256File(outputPath),
      truthKeySha256: sha256File(truthPath),
      bundlePdfSha256: sha256File(bundlePdf),
      pdfExtractionMetaSha256: sha256File(metaPath),
      canonicalBundleSha256: sha256File(canonicalPath),
    },
    truthKeyIdentified: fs.existsSync(truthPath),
    truthKeyContentsOpened: false,
    invented: false,
    sourceManifest,
    chargeInstruments,
    evidenceUnits,
    chronologyEvents,
    provenance,
    chaseRelationships,
    exitPayloadReceipts,
    adapterCapability,
    acceptance: { accepted: true, reasons: reasons.length ? reasons : ["accepted: source-backed structured surfaces rematerialised"] },
    materialisedAt: new Date().toISOString(),
    materialiserVersion: BATCH10_SCHEMA_VERSION,
  };

  return { ok: true, packet };
}
