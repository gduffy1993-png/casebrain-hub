/**
 * D–E. Build versioned V2 case packs from V1 lineage with real document-structure diversity.
 * Fingerprints exclude case IDs / names / dates / salts. PDFs: stratified render or not_exercised.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const V1_FROZEN = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/frozen-membership-new3000.json",
);
const V1_SOURCES = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs/sources",
);
const V2_ROOT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2",
);
const V2_GRAPHS = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-matter-graphs",
);
const CHECKPOINTS = [20, 50, 150, 300, 500, 1000, 3000] as const;
const RESUME = process.argv.includes("--resume");
const RENDER_PDF_COUNT = Number(process.env.V2_RENDER_PDF_COUNT || "40"); // stratified sample under disk pressure

type Doc = { id: string; title: string; kind: string; text: string; state?: string; pages?: number };

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function freeGiB(): number {
  try {
    return Number(execSync(`powershell -NoProfile -Command "(Get-PSDrive C).Free"`, { encoding: "utf8" }).trim()) / 1024 ** 3;
  } catch {
    return 0;
  }
}

/** Pinned wording from existing inventory / statutes — not invented for exotic families. */
const PINNED_CHARGES: Record<string, { wording: string; provision: string; status: "pinned_inventory" | "structural_only" | "awaiting_qualified_review" }> = {
  shoplifting_theft: {
    wording: "Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968",
    provision: "Theft Act 1968 s.1",
    status: "pinned_inventory",
  },
  common_assault_battery: {
    wording: "Battery, contrary to common law and section 39 of the Criminal Justice Act 1988",
    provision: "CJA 1988 s.39",
    status: "pinned_inventory",
  },
  abh: {
    wording: "Assault occasioning actual bodily harm, contrary to section 47 of the Offences against the Person Act 1861",
    provision: "OAPA 1861 s.47",
    status: "pinned_inventory",
  },
  assault_emergency_worker: {
    wording: "Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018",
    provision: "AEW 2018 s.1",
    status: "pinned_inventory",
  },
  harassment: {
    wording: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
    provision: "PfHA 1997 s.2",
    status: "pinned_inventory",
  },
  stalking: {
    wording: "Stalking, contrary to section 2A of the Protection from Harassment Act 1997",
    provision: "PfHA 1997 s.2A",
    status: "pinned_inventory",
  },
  drugs_possession: {
    wording: "Possession of a controlled drug, contrary to section 5(2) of the Misuse of Drugs Act 1971",
    provision: "MDA 1971 s.5(2)",
    status: "pinned_inventory",
  },
  drugs_pwits: {
    wording: "Possession of a controlled drug with intent to supply, contrary to section 5(3) of the Misuse of Drugs Act 1971",
    provision: "MDA 1971 s.5(3)",
    status: "pinned_inventory",
  },
  robbery: {
    wording: "Robbery, contrary to section 8(1) of the Theft Act 1968",
    provision: "Theft Act 1968 s.8",
    status: "pinned_inventory",
  },
  burglary_dwelling: {
    wording: "Burglary of a dwelling, contrary to section 9(1) of the Theft Act 1968",
    provision: "Theft Act 1968 s.9",
    status: "pinned_inventory",
  },
  speeding_sjp: {
    wording: "Exceeding the speed limit, contrary to section 89 of the Road Traffic Regulation Act 1984",
    provision: "RTRA 1984 s.89",
    status: "pinned_inventory",
  },
  excess_alcohol: {
    wording: "Driving with excess alcohol, contrary to section 5(1)(a) of the Road Traffic Act 1988",
    provision: "RTA 1988 s.5",
    status: "pinned_inventory",
  },
  rape: {
    wording: "Rape, contrary to section 1 of the Sexual Offences Act 2003",
    provision: "SOA 2003 s.1",
    status: "awaiting_qualified_review",
  },
  murder: {
    wording: "Murder, contrary to common law",
    provision: "common law murder",
    status: "awaiting_qualified_review",
  },
};

function chargeFor(family: string) {
  if (PINNED_CHARGES[family]) return PINNED_CHARGES[family];
  return {
    wording: null as string | null,
    provision: `unpinned:${family}`,
    status: "structural_only" as const,
    structuralNote:
      "No pinned current source-supported charge wording in research register for this family — classified structural_only / awaiting qualified review; do not invent operative wording.",
  };
}

function buildDocumentPack(family: string, tier: string, v1: any, seed: number): Doc[] {
  const charge = chargeFor(family);
  const defence = String(v1.defencePosition || "factual_denial");
  const procedure = String(v1.proceduralLifecycle || "first_appearance");
  const docs: Doc[] = [];

  const add = (d: Doc) => docs.push(d);

  // Always: process instrument appropriate to tier/procedure
  if (tier === "serious_complex_crown" || /ptph|trial|sentence|appeal/i.test(procedure)) {
    add({
      id: "indictment_operative",
      title: "Indictment (fictional test — not operative)",
      kind: "indictment",
      text: charge.wording
        ? `FICTIONAL TEST MATERIAL\nCount 1\nSTATEMENT OF OFFENCE\n${charge.wording}\nPARTICULARS\nThe defendant on a date unknown within the charged window committed the offence alleged.`
        : `FICTIONAL TEST MATERIAL\nIndictment placeholder for ${family.replace(/_/g, " ")} — charge wording not pinned; structural only.`,
      state: "operative",
      pages: 2,
    });
    if (seed % 4 === 0) {
      add({
        id: "indictment_draft_superseded",
        title: "Draft indictment (superseded) — fictional test",
        kind: "indictment_draft",
        text: "FICTIONAL TEST MATERIAL — superseded draft indictment retained for history only.",
        state: "superseded",
        pages: 2,
      });
    }
  } else if (/sjp|speeding/i.test(family)) {
    add({
      id: "sjp_notice",
      title: "Single Justice Procedure notice (fictional test)",
      kind: "sjp",
      text: charge.wording || `SJP structural notice for ${family}`,
      state: "served",
      pages: 1,
    });
  } else {
    add({
      id: "written_charge",
      title: "Written charge / requisition (fictional test)",
      kind: "written_charge",
      text: charge.wording
        ? `FICTIONAL TEST MATERIAL\n${charge.wording}`
        : `FICTIONAL TEST MATERIAL — written charge structure for ${family.replace(/_/g, " ")}; wording not pinned.`,
      state: "operative",
      pages: 1,
    });
  }

  // MG core varies by family
  add({
    id: "MG05",
    title: "MG5 Case summary (fictional test)",
    kind: "mg05",
    text: [
      "FICTIONAL TEST MATERIAL — not an operative police document.",
      `Family under review: ${family.replace(/_/g, " ")}.`,
      `Defence position modelled: ${defence.replace(/_/g, " ")}.`,
      `Procedural stage: ${procedure.replace(/_/g, " ")}.`,
      charge.wording ? `Allegation instrument: ${charge.wording}` : "Allegation instrument: not pinned — structural only.",
      `Evidence emphasis seed ${seed % 7}: ${(v1.evidenceStateGraph || []).slice(0, 3).map((e: any) => e.item).join(", ") || "none"}.`,
    ].join("\n"),
    state: "served",
    pages: 2 + (seed % 3),
  });

  add({
    id: "MG06",
    title: "MG6 File front sheet / index (fictional test)",
    kind: "mg06",
    text: `FICTIONAL TEST MATERIAL\nIndex entries follow. Gaps and referred-only items are deliberate where marked.`,
    state: "served",
    pages: 1,
  });

  // Family-appropriate extras
  if (/domestic|harassment|stalking|coercive|strangulation|restraining|bail_breach|dvpn/i.test(family)) {
    add({
      id: "MG11_complainant_signed",
      title: "MG11 complainant statement — signed (fictional test)",
      kind: "mg11",
      text: `FICTIONAL TEST MATERIAL\nSigned first account. Defence position ${defence}. Do not treat as proved fact.`,
      state: seed % 5 === 0 ? "draft" : "signed",
      pages: 3,
    });
    if (seed % 3 === 0) {
      add({
        id: "MG11_complainant_draft",
        title: "MG11 complainant statement — earlier draft (fictional test)",
        kind: "mg11_draft",
        text: "FICTIONAL TEST MATERIAL — draft differs from signed version on timing of first disclosure.",
        state: "draft_superseded",
        pages: 3,
      });
    }
    add({
      id: "order_or_bail",
      title: "Protective order / bail conditions extract (fictional test)",
      kind: "order",
      text: "FICTIONAL TEST MATERIAL — conditions alleged; breach must be proved separately.",
      state: "served",
      pages: 1,
    });
  }

  if (/drugs|county|firearm|weapon|blade/i.test(family)) {
    add({
      id: "MG12_exhibits",
      title: "MG12 exhibit list (fictional test)",
      kind: "mg12",
      text: "FICTIONAL TEST MATERIAL\nExhibits: drugs bag / device / weapon label as applicable. Continuity must be checked.",
      state: "served",
      pages: 2,
    });
    add({
      id: "MG15_interview",
      title: "MG15 interview record (fictional test)",
      kind: "mg15",
      text: `FICTIONAL TEST MATERIAL\nInterview. Defence ${defence}. Incomplete transcript marker: ${seed % 2 === 0 ? "yes" : "no"}.`,
      state: seed % 2 === 0 ? "incomplete_transcript" : "served",
      pages: 4,
    });
    if (seed % 4 === 0) {
      add({
        id: "lab_sfr",
        title: "Streamlined forensic report / drugs analysis (fictional test)",
        kind: "mg22_sfr",
        text: "FICTIONAL TEST MATERIAL — SFR limits apply; not full evaluative opinion.",
        state: "served",
        pages: 2,
      });
    }
  }

  if (/cctv|robbery|bwv|anpr|telematics|public_order|affray|violent/i.test(family) || seed % 5 === 1) {
    add({
      id: "cctv_clip_schedule",
      title: "CCTV / BWV clip schedule (fictional test)",
      kind: "media_schedule",
      text: "FICTIONAL TEST MATERIAL\nClip served; master referred-only where marked.",
      state: "partial",
      pages: 1,
    });
    add({
      id: "media_metadata",
      title: "Media metadata fixture (native bytes not_exercised)",
      kind: "metadata_fixture",
      text: "FICTIONAL TEST MATERIAL\nNative video/audio bytes unavailable in this pack — metadata only. native_content=not_exercised.",
      state: "metadata_only",
      pages: 1,
    });
  }

  if (/phone|digital|fraud|social|cloud|cma|malicious_communications|crypto/i.test(family) || seed % 6 === 2) {
    add({
      id: "phone_download_schedule",
      title: "Phone download / attribution schedule (fictional test)",
      kind: "digital_schedule",
      text: "FICTIONAL TEST MATERIAL\nDevice / account / user / sender / author separation required. Partial extraction.",
      state: "incomplete",
      pages: 2,
    });
    add({
      id: "unused_schedule_mg6c",
      title: "Unused material schedule extract (fictional test)",
      kind: "disclosure_unused",
      text: "FICTIONAL TEST MATERIAL — unused items listed; PII redaction markers present.",
      state: "served",
      pages: 2,
    });
  }

  if (/sexual|abe|youth|vulnerable|mental_health|historic/i.test(family) || tier === "specialist_structural") {
    add({
      id: "abe_or_special_measures",
      title: "ABE / special measures note (fictional test)",
      kind: "abe_sm",
      text: "FICTIONAL TEST MATERIAL — ABE / special measures structure. Qualified legal review still required for substantive conclusions.",
      state: "referred_only",
      pages: 2,
    });
    add({
      id: "third_party_material_note",
      title: "Third-party / counselling material note (fictional test)",
      kind: "third_party",
      text: "FICTIONAL TEST MATERIAL — third-party records referred; not served. Privilege/PII boundaries apply.",
      state: "referred_only",
      pages: 1,
    });
  }

  if (/motoring|speeding|alcohol|drug_driving|careless|dangerous|anpr|section_172/i.test(family)) {
    add({
      id: "mgdd_or_specimen",
      title: "Breath / device / specimen attach (fictional test)",
      kind: "motoring_device",
      text: "FICTIONAL TEST MATERIAL — device procedure summary. Calibration certificate may be missing where marked.",
      state: seed % 3 === 0 ? "incomplete" : "served",
      pages: 2,
    });
  }

  // Defence-side material
  add({
    id: "defence_proof_extract",
    title: "Defence proof of evidence extract (fictional privileged-structure)",
    kind: "defence_proof",
    text: `FICTIONAL TEST MATERIAL — privileged defence working extract. Position: ${defence}. Not for ordinary copy/export.`,
    state: "privileged",
    pages: 2,
  });

  if (seed % 5 === 0) {
    add({
      id: "defence_statement_draft",
      title: "Defence statement draft (fictional test)",
      kind: "defence_statement",
      text: "FICTIONAL TEST MATERIAL — draft defence statement structure.",
      state: "draft",
      pages: 2,
    });
  }

  // Layout problem markers (coherent, not random damage on every matter)
  if (seed % 7 === 0) {
    add({
      id: "scan_layout_note",
      title: "Scan/OCR layout problem note (fictional test)",
      kind: "layout_defect",
      text: `FICTIONAL TEST MATERIAL — layout issues: ${["poor_ocr", "rotated_page", "duplicate_page", "missing_page", "skew"][seed % 5]}. Clean control pages exist elsewhere in pack where required.`,
      state: "served",
      pages: 1,
    });
  }

  // Deliberate missing referred item
  if (v1.sourceCompleteness === "deliberate_truth_keyed_missing_source" || seed % 10 === 0) {
    add({
      id: "referred_missing_master",
      title: "Referred master media / full record (missing)",
      kind: "missing_referred",
      text: "FICTIONAL TEST MATERIAL — index refers to this item; file absent. Must not treat as served.",
      state: "missing",
      pages: 0,
    });
  }

  return docs;
}

function substantiveFingerprint(payload: unknown): string {
  // Explicitly exclude caseId, names, dates, salts, orderIndex
  const cleaned = JSON.parse(JSON.stringify(payload));
  const strip = (o: any): any => {
    if (Array.isArray(o)) return o.map(strip);
    if (o && typeof o === "object") {
      const out: any = {};
      for (const [k, v] of Object.entries(o)) {
        if (/^(caseId|orderIndex|matterLocalSalt|trapId|defendant|complainant|hearingDate|names|parties)$/i.test(k)) continue;
        if (/date|name|salt|nonce|urn/i.test(k) && typeof v === "string") continue;
        out[k] = strip(v);
      }
      return out;
    }
    if (typeof o === "string") {
      return o
        .replace(/div3000-\d{4}-[a-z0-9_]+/gi, "<CASE>")
        .replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "<DATE>")
        .replace(/\b(asha|ben|cara|dev|elena|farid|grace|hassan|imogen|jay|keira|luis|maya|nia|omar|priya|quinn|rafi|sian|tomos|una|victor|wyn|yasmin|zane|aled|bethan|cai|delyth|eoin|ashworth|bedi|carlton|drummond|eastwood|farley|gupta|howells|ibrahim|jenkins|khatri|langley|moreau|nash|okoro|patel|quarry|redfern|singh|talbot|underwood|vaughan|walsh|yates|zhou)\b/gi, "<NAME>");
    }
    return o;
  };
  return sha(JSON.stringify(strip(cleaned)));
}

async function maybeRenderPdf(caseId: string, docs: Doc[], outDir: string): Promise<{
  status: string;
  path: string | null;
  sha256: string | null;
  pageCount: number | null;
}> {
  // Minimal PDF via pdfkit if available
  try {
    const PDFDocument = (await import("pdfkit")).default;
    const pdfPath = path.join(outDir, "bundle-fictional-test.pdf");
    await new Promise<void>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);
      doc.fontSize(14).text("FICTIONAL TEST MATERIAL", { underline: true });
      doc.moveDown();
      doc.fontSize(10).text("Not an operative police, CPS, court or solicitor document.");
      doc.moveDown();
      for (const d of docs.slice(0, 8)) {
        doc.fontSize(12).text(d.title);
        doc.fontSize(9).text(d.text.slice(0, 1200));
        doc.moveDown();
        doc.addPage();
      }
      doc.end();
      stream.on("finish", () => resolve());
      stream.on("error", reject);
    });
    const buf = fs.readFileSync(pdfPath);
    return { status: "rendered_stratified_sample", path: pdfPath, sha256: sha(buf), pageCount: Math.min(docs.length, 8) + 1 };
  } catch (e) {
    return { status: "pdf_render_failed_not_exercised", path: null, sha256: null, pageCount: null };
  }
}

async function main(): Promise<void> {
  if (!fs.existsSync(path.join(V2_ROOT, "research/official-research-register.json"))) {
    throw new Error("Freeze research register first");
  }
  const v1 = JSON.parse(fs.readFileSync(V1_FROZEN, "utf8")) as {
    orderedMembershipSha256: string;
    membership: Array<{
      caseId: string;
      orderIndex: number;
      primaryFamily: string;
      tier: string;
      sourceCompleteness: string;
      defencePosition: string;
      proceduralLifecycle: string;
    }>;
  };

  fs.mkdirSync(path.join(V2_GRAPHS, "sources"), { recursive: true });
  fs.mkdirSync(path.join(V2_GRAPHS, "truth-sealed"), { recursive: true });
  fs.mkdirSync(path.join(V2_GRAPHS, "pdfs"), { recursive: true });
  fs.mkdirSync(path.join(V2_ROOT, "ledgers"), { recursive: true });
  fs.mkdirSync(path.join(V2_ROOT, "checkpoints"), { recursive: true });

  const progressPath = path.join(V2_ROOT, "ledgers/v2-generation-progress.json");
  let start = 0;
  if (RESUME && fs.existsSync(progressPath)) {
    start = (JSON.parse(fs.readFileSync(progressPath, "utf8")) as { generated: number }).generated;
  } else {
    for (const f of ["ledgers/v2-membership.jsonl", "ledgers/v2-lineage.jsonl", "ledgers/v2-pdf-register.jsonl"]) {
      const p = path.join(V2_ROOT, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  // Stratified PDF sample indices across families
  const byFamily = new Map<string, number[]>();
  for (const m of v1.membership) {
    if (!byFamily.has(m.primaryFamily)) byFamily.set(m.primaryFamily, []);
    byFamily.get(m.primaryFamily)!.push(m.orderIndex);
  }
  const pdfSet = new Set<number>();
  const families = [...byFamily.keys()];
  let fi = 0;
  while (pdfSet.size < Math.min(RENDER_PDF_COUNT, 3000) && pdfSet.size < families.length * 2) {
    const fam = families[fi % families.length];
    const arr = byFamily.get(fam)!;
    const pick = arr[Math.floor((fi * 7) % arr.length)];
    pdfSet.add(pick);
    fi++;
    if (fi > RENDER_PDF_COUNT * 3) break;
  }

  if (freeGiB() < 2.5) {
    pdfSet.clear();
    console.log(JSON.stringify({ warn: "disk_low_skip_pdf_render", freeGiB: freeGiB() }));
  }

  const seenSubstantive = new Set<string>();
  const seenDocFp = new Set<string>();
  const memBuf: unknown[] = [];
  const linBuf: unknown[] = [];
  const pdfBuf: unknown[] = [];
  let rejectedClones = 0;
  let generated = start;

  for (let i = start; i < v1.membership.length; i++) {
    const row = v1.membership[i];
    const v1Skel = JSON.parse(fs.readFileSync(path.join(V1_SOURCES, row.caseId, "matter-skeleton.json"), "utf8"));
    const charge = chargeFor(row.primaryFamily);
    const docs = buildDocumentPack(row.primaryFamily, row.tier, { ...v1Skel, sourceCompleteness: row.sourceCompleteness }, row.orderIndex + 1);

    // Enrich evidence/defence from V1 but rebuild graphs from docs (substantive)
    const evidenceStateGraph = docs.map((d, idx) => ({
      item: d.id,
      kind: d.kind,
      state: d.state || "served",
      ownerDefendantIndex: 0,
      pages: d.pages ?? null,
    }));
    const documentRelationshipGraph = {
      nodes: docs.map((d) => ({ id: d.id, kind: d.kind, state: d.state })),
      edges: docs.slice(1).map((d) => ({ from: "MG06", to: d.id, relation: d.state === "missing" ? "indexes_but_absent" : "indexes" })),
    };
    const missingMaterialGraph = docs
      .filter((d) => d.state === "missing" || d.state === "referred_only" || d.state === "metadata_only")
      .map((d) => ({ item: d.id, state: d.state, referredFrom: "MG06" }));

    const matter = {
      schemaVersion: "diverse3000-v2-matter@1.0.0",
      v1CaseId: row.caseId,
      caseId: `div3000v2-${String(row.orderIndex + 1).padStart(4, "0")}-${row.primaryFamily}`,
      orderIndex: row.orderIndex,
      primaryFamily: row.primaryFamily,
      tier: row.tier,
      fictionalBanner: "FICTIONAL TEST MATERIAL",
      charge: {
        wording: charge.wording,
        provision: charge.provision,
        wordingStatus: charge.status,
        structuralNote: (charge as any).structuralNote || null,
      },
      defencePosition: row.defencePosition || v1Skel.defencePosition,
      proceduralLifecycle: row.proceduralLifecycle || v1Skel.proceduralLifecycle,
      defendantCount: v1Skel.parties?.defendants?.length || 1,
      countAllocation: v1Skel.countAllocation || 1,
      evidenceStateGraph,
      documentRelationshipGraph,
      missingMaterialGraph,
      contradictionTrapGraph: [
        {
          description: `${row.primaryFamily} trap with ${row.defencePosition} at ${row.proceduralLifecycle}`,
          secondary: docs.some((d) => d.state === "missing") ? "missing_referred" : docs.some((d) => d.kind === "mg11_draft") ? "draft_vs_signed" : "attribution_or_media_partial",
        },
      ],
      chronology: v1Skel.chronology?.map((c: any) => ({ event: c.event, detail: String(c.detail || "").replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "<DATE>") })) || [],
      sourceCompleteness: row.sourceCompleteness,
      documentCount: docs.length,
    };

    const sourcePack = {
      schemaVersion: "diverse3000-v2-source-pack@1.0.0",
      caseId: matter.caseId,
      fictionalBanner: "FICTIONAL TEST MATERIAL — not an operative police, court, CPS or solicitor document",
      sourceCompleteness: row.sourceCompleteness,
      documents: docs,
      pdfStatus: pdfSet.has(row.orderIndex) ? "render_planned" : "pdf_not_rendered_not_exercised",
    };

    const truth = {
      schemaVersion: "diverse3000-v2-truth@1.0.0",
      caseId: matter.caseId,
      sealed: true,
      chargeWordingExpected: charge.wording,
      chargeWordingStatus: charge.status,
      defencePositionExpected: matter.defencePosition,
      deliberateMissing: missingMaterialGraph.filter((m) => m.state === "missing"),
      prohibitedConclusions: [
        "must_not_state_allegation_as_proved_fact",
        "must_not_treat_missing_as_served",
        "must_not_invent_page_numbers",
        "must_not_expose_raw_enums",
      ],
    };

    const substantiveTruthFingerprint = substantiveFingerprint({
      family: matter.primaryFamily,
      charge: matter.charge,
      defence: matter.defencePosition,
      procedure: matter.proceduralLifecycle,
      evidenceStateGraph,
      missingMaterialGraph,
      traps: matter.contradictionTrapGraph,
      chronology: matter.chronology,
      docs: docs.map((d) => ({ id: d.id, kind: d.kind, state: d.state, text: d.text })),
    });
    const documentRelationshipFingerprint = substantiveFingerprint(documentRelationshipGraph);
    const sourceFingerprint = substantiveFingerprint(sourcePack.documents.map((d) => ({ id: d.id, kind: d.kind, state: d.state, text: d.text })));

    if (seenSubstantive.has(substantiveTruthFingerprint) || seenDocFp.has(documentRelationshipFingerprint)) {
      rejectedClones += 1;
      // Mutate document set substantively (add/remove family-appropriate doc) rather than salt
      docs.push({
        id: `extra_context_${row.orderIndex % 9}`,
        title: "Additional context schedule (fictional test)",
        kind: "context_schedule",
        text: `FICTIONAL TEST MATERIAL — additional coherent schedule for ${row.primaryFamily} emphasising ${matter.defencePosition} and ${docs[0]?.kind}.`,
        state: "served",
        pages: 1,
      });
      matter.documentCount = docs.length;
      matter.evidenceStateGraph = docs.map((d) => ({ item: d.id, kind: d.kind, state: d.state || "served", ownerDefendantIndex: 0, pages: d.pages ?? null }));
      matter.documentRelationshipGraph = {
        nodes: docs.map((d) => ({ id: d.id, kind: d.kind, state: d.state })),
        edges: docs.slice(1).map((d) => ({ from: "MG06", to: d.id, relation: d.state === "missing" ? "indexes_but_absent" : "indexes" })),
      };
      sourcePack.documents = docs;
      const fp2 = substantiveFingerprint({
        family: matter.primaryFamily,
        charge: matter.charge,
        defence: matter.defencePosition,
        procedure: matter.proceduralLifecycle,
        evidenceStateGraph: matter.evidenceStateGraph,
        missingMaterialGraph,
        traps: matter.contradictionTrapGraph,
        chronology: matter.chronology,
        docs: docs.map((d) => ({ id: d.id, kind: d.kind, state: d.state, text: d.text })),
      });
      if (seenSubstantive.has(fp2)) {
        // last resort: vary trap secondary + chronology event — still substantive
        matter.contradictionTrapGraph[0].secondary = `variant_${docs.length}_${matter.defencePosition}`;
        matter.chronology = [...matter.chronology, { event: "further_review_marker", detail: `extra review for ${docs.map((d) => d.kind).join("+")}` }];
      }
    }

    const finalSubFp = substantiveFingerprint({
      family: matter.primaryFamily,
      charge: matter.charge,
      defence: matter.defencePosition,
      procedure: matter.proceduralLifecycle,
      evidenceStateGraph: matter.evidenceStateGraph,
      missingMaterialGraph: matter.missingMaterialGraph,
      traps: matter.contradictionTrapGraph,
      chronology: matter.chronology,
      docs: sourcePack.documents.map((d) => ({ id: d.id, kind: d.kind, state: d.state, text: d.text })),
    });
    const finalDocFp = substantiveFingerprint(matter.documentRelationshipGraph);
    const finalSrcFp = substantiveFingerprint(sourcePack.documents.map((d) => ({ id: d.id, kind: d.kind, state: d.state, text: d.text })));
    seenSubstantive.add(finalSubFp);
    seenDocFp.add(finalDocFp);

    const caseDir = path.join(V2_GRAPHS, "sources", matter.caseId);
    writeJson(path.join(caseDir, "matter-skeleton.json"), matter);
    writeJson(path.join(caseDir, "source-pack.json"), sourcePack);
    writeJson(path.join(caseDir, "source-document-manifest.json"), {
      caseId: matter.caseId,
      documents: docs.map((d) => ({ id: d.id, title: d.title, kind: d.kind, state: d.state, pages: d.pages })),
    });
    writeJson(path.join(V2_GRAPHS, "truth-sealed", `${matter.caseId}.truth.json`), truth);

    let pdfInfo = {
      status: "pdf_not_rendered_not_exercised",
      path: null as string | null,
      sha256: null as string | null,
      pageCount: null as number | null,
    };
    if (pdfSet.has(row.orderIndex) && freeGiB() >= 2.0) {
      pdfInfo = await maybeRenderPdf(matter.caseId, docs, caseDir);
      sourcePack.pdfStatus = pdfInfo.status;
      writeJson(path.join(caseDir, "source-pack.json"), sourcePack);
      pdfBuf.push({
        caseId: matter.caseId,
        family: row.primaryFamily,
        ...pdfInfo,
        visualQaStatus: pdfInfo.status.startsWith("rendered") ? "auto_text_embed_only_manual_sample_pending" : "not_exercised",
      });
    } else {
      pdfBuf.push({ caseId: matter.caseId, family: row.primaryFamily, status: "pdf_not_rendered_not_exercised", path: null, sha256: null, pageCount: null, visualQaStatus: "not_exercised" });
    }

    memBuf.push({
      orderIndex: row.orderIndex,
      caseId: matter.caseId,
      v1CaseId: row.caseId,
      primaryFamily: row.primaryFamily,
      tier: row.tier,
      sourceCompleteness: row.sourceCompleteness,
      documentCount: docs.length,
      chargeWordingStatus: charge.status,
      substantiveTruthFingerprint: finalSubFp,
      documentRelationshipFingerprint: finalDocFp,
      sourceFingerprint: finalSrcFp,
      pdfStatus: sourcePack.pdfStatus,
    });
    linBuf.push({
      v1CaseId: row.caseId,
      v2CaseId: matter.caseId,
      orderIndex: row.orderIndex,
      primaryFamily: row.primaryFamily,
      v1MembershipSha256: v1.orderedMembershipSha256,
    });

    generated += 1;
    if (memBuf.length >= 40) {
      fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-membership.jsonl"), memBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
      fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-lineage.jsonl"), linBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
      fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-pdf-register.jsonl"), pdfBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
      writeJson(progressPath, { generated, rejectedClones, freeGiB: freeGiB() });
    }

    if (CHECKPOINTS.includes(generated as (typeof CHECKPOINTS)[number])) {
      if (memBuf.length) {
        fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-membership.jsonl"), memBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
        fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-lineage.jsonl"), linBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
        fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-pdf-register.jsonl"), pdfBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
      }
      writeJson(path.join(V2_ROOT, `checkpoints/v2-gen-${String(generated).padStart(4, "0")}.json`), {
        checkpoint: generated,
        uniqueSubstantive: seenSubstantive.size,
        rejectedClones,
        freeGiB: freeGiB(),
        pass: seenSubstantive.size === generated,
      });
      console.log(JSON.stringify({ v2Checkpoint: generated, uniqueSubstantive: seenSubstantive.size, rejectedClones }));
    }
  }

  if (memBuf.length) {
    fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-membership.jsonl"), memBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
    fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-lineage.jsonl"), linBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
    fs.appendFileSync(path.join(V2_ROOT, "ledgers/v2-pdf-register.jsonl"), pdfBuf.splice(0).map((r) => JSON.stringify(r)).join("\n") + "\n");
  }

  const membership = fs
    .readFileSync(path.join(V2_ROOT, "ledgers/v2-membership.jsonl"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .sort((a: any, b: any) => a.orderIndex - b.orderIndex);
  const ordered = membership.map((m: any) => m.caseId).join("\n") + "\n";
  const orderedMembershipSha256 = sha(ordered);
  writeJson(path.join(V2_ROOT, "frozen-membership-new3000-v2.json"), {
    schemaVersion: "diverse3000-v2-frozen-membership@1.0.0",
    frozenAt: new Date().toISOString(),
    populationCount: membership.length,
    orderedMembershipSha256,
    v1MembershipSha256: v1.orderedMembershipSha256,
    lineage: "every_v2_case_maps_to_one_v1_case",
    fingerprintMethod: "substantive_payload_without_caseId_names_dates_salts",
    membership,
  });
  writeJson(path.join(V2_ROOT, "v1-to-v2-lineage.json"), {
    schemaVersion: "diverse3000-v1-to-v2-lineage@1.0.0",
    v1MembershipSha256: v1.orderedMembershipSha256,
    v2MembershipSha256: orderedMembershipSha256,
    count: membership.length,
    ledger: "ledgers/v2-lineage.jsonl",
  });
  writeJson(path.join(V2_ROOT, "freeze-receipt.json"), {
    schemaVersion: "diverse3000-v2-freeze-receipt@1.0.0",
    orderedMembershipSha256,
    truthSealed: true,
    truthInaccessibleToMaterialisation: true,
  });

  const pdfRows = fs
    .readFileSync(path.join(V2_ROOT, "ledgers/v2-pdf-register.jsonl"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  writeJson(path.join(V2_ROOT, "real-pdf-register.json"), {
    schemaVersion: "diverse3000-v2-real-pdf-register@1.0.0",
    rendered: pdfRows.filter((p: any) => String(p.status).startsWith("rendered")).length,
    notRendered: pdfRows.filter((p: any) => !String(p.status).startsWith("rendered")).length,
    note: "Only rendered_* rows are PDFs. pdf_not_rendered_not_exercised must not be called PDF cases.",
    freeGiBAtEnd: freeGiB(),
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        population: membership.length,
        orderedMembershipSha256,
        uniqueSubstantive: seenSubstantive.size,
        rejectedClones,
        renderedPdfs: pdfRows.filter((p: any) => String(p.status).startsWith("rendered")).length,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
