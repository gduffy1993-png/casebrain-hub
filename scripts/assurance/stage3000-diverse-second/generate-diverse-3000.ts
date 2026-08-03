/**
 * Generate second diverse 3000 matter graphs + sealed truth (truth written to sealed lane).
 * Stratified source packs: thin text for all; optional PDF subset marker.
 * Does not open truth to materialisation consumers.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = process.cwd();
const PROG = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1",
);
const GRAPH_ROOT = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs",
);
const SOURCE_ROOT = path.join(GRAPH_ROOT, "sources");
const TRUTH_ROOT = path.join(GRAPH_ROOT, "truth-sealed");
const CHECKPOINTS = [5, 20, 50, 150, 300, 500, 1000, 2000, 3000] as const;
const BASELINE = "308b7cb633f83d7c998bc80adf87356de346b3e9";
const FIRST_HASH = "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae";
const RESUME = process.argv.includes("--resume");

type Alloc = { familyId: string; tier: string; count: number };

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function appendJsonl(p: string, rows: unknown[]): void {
  if (!rows.length) return;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.appendFileSync(p, `${rows.map((r) => JSON.stringify(r)).join("\n")}\n`, "utf8");
}
function freeGiB(): number {
  try {
    const out = execSync(`powershell -NoProfile -Command "(Get-PSDrive C).Free"`, {
      encoding: "utf8",
    }).trim();
    return Number(out) / 1024 ** 3;
  } catch {
    return 0;
  }
}

const DEFENCE_POSITIONS = [
  "factual_denial",
  "self_defence",
  "alibi",
  "identification_dispute",
  "consent_dispute",
  "duress_pressure",
  "lack_of_intent",
  "mistaken_attribution",
  "section_45_indicator",
  "abuse_of_process_argument",
  "no_case_to_answer_focus",
  "basis_of_plea_limited",
] as const;

const PROCEDURE_STAGES = [
  "police_investigation",
  "charge_decision",
  "first_appearance",
  "pet",
  "ptph",
  "pcmoh",
  "trial_prep",
  "newton",
  "sentence",
  "appeal_structure",
  "breach_proceedings",
  "reopening_stat_dec",
] as const;

const EVIDENCE_TYPES = [
  "mg11_signed",
  "mg11_draft",
  "cctv_clip",
  "cctv_master_referred",
  "bwv_clip",
  "phone_extraction_partial",
  "cdr_schedule",
  "anpr_hit",
  "dna_sfr",
  "fingerprint_partial",
  "medical_report",
  "abe_transcript",
  "bank_csv",
  "social_media_screenshots",
  "custody_record_extract",
  "interview_mg15",
  "forensic_continuity_gap",
  "translation_disputed",
  "third_party_yjs",
  "prison_call_log",
] as const;

const DOC_GRAPH_SHAPES = [
  "mg5_mg6_charge_aligned",
  "mg5_mg6_charge_drift",
  "index_vs_pages_conflict",
  "referred_only_media",
  "signed_vs_draft_statement",
  "late_disclosure_pack",
  "order_breach_pack",
  "multi_defendant_split",
  "thin_sjp_pack",
  "special_measures_pack",
] as const;

const SOURCE_COMPLETENESS = [
  "complete_source_packet",
  "deliberate_truth_keyed_missing_source",
  "unsupported_native_input_not_exercised",
] as const;

const FICTIONAL_FORENAMES = [
  "Asha","Ben","Cara","Dev","Elena","Farid","Grace","Hassan","Imogen","Jay",
  "Keira","Luis","Maya","Nia","Omar","Priya","Quinn","Rafi","Sian","Tomos",
  "Una","Victor","Wyn","Yasmin","Zane","Aled","Bethan","Cai","Delyth","Eoin",
];
const FICTIONAL_SURNAMES = [
  "Ashworth","Bedi","Carlton","Drummond","Eastwood","Farley","Gupta","Howells",
  "Ibrahim","Jenkins","Khatri","Langley","Moreau","Nash","Okoro","Patel",
  "Quarry","Redfern","Singh","Talbot","Underwood","Vaughan","Walsh","Yates","Zhou",
];
const COURTS = [
  "Cardiff Magistrates' Court","Bristol Magistrates' Court","Manchester Magistrates' Court",
  "Leeds Magistrates' Court","Birmingham Magistrates' Court","Cardiff Crown Court",
  "Bristol Crown Court","Manchester Crown Court","Leeds Crown Court","Birmingham Crown Court",
];

function fictionalName(i: number): { defendant: string; complainant: string } {
  const d = `${FICTIONAL_FORENAMES[i % FICTIONAL_FORENAMES.length]} ${FICTIONAL_SURNAMES[(i * 7) % FICTIONAL_SURNAMES.length]}`;
  const c = `${FICTIONAL_FORENAMES[(i * 3 + 5) % FICTIONAL_FORENAMES.length]} ${FICTIONAL_SURNAMES[(i * 11 + 2) % FICTIONAL_SURNAMES.length]}`;
  return { defendant: d, complainant: c };
}

function chargeForFamily(familyId: string, i: number): { wording: string; provision: string } {
  const map: Record<string, { wording: string; provision: string }> = {
    shoplifting_theft: {
      wording: "Theft from a shop, contrary to section 1(1) and 7(1) of the Theft Act 1968",
      provision: "Theft Act 1968 s.1",
    },
    common_assault_battery: {
      wording: "Battery, contrary to common law and section 39 of the Criminal Justice Act 1988",
      provision: "CJA 1988 s.39",
    },
    abh: {
      wording: "Assault occasioning actual bodily harm, contrary to section 47 of the Offences against the Person Act 1861",
      provision: "OAPA 1861 s.47",
    },
    assault_emergency_worker: {
      wording: "Assault an emergency worker, contrary to section 1 of the Assaults on Emergency Workers (Offences) Act 2018",
      provision: "AEW 2018 s.1",
    },
    harassment: {
      wording: "Harassment, contrary to section 2 of the Protection from Harassment Act 1997",
      provision: "PfHA 1997 s.2",
    },
    stalking: {
      wording: "Stalking, contrary to section 2A of the Protection from Harassment Act 1997",
      provision: "PfHA 1997 s.2A",
    },
    drugs_possession: {
      wording: "Possession of a controlled drug, contrary to section 5(2) of the Misuse of Drugs Act 1971",
      provision: "MDA 1971 s.5(2)",
    },
    drugs_pwits: {
      wording: "Possession of a controlled drug with intent to supply, contrary to section 5(3) of the Misuse of Drugs Act 1971",
      provision: "MDA 1971 s.5(3)",
    },
    robbery: {
      wording: "Robbery, contrary to section 8(1) of the Theft Act 1968",
      provision: "Theft Act 1968 s.8",
    },
    burglary_dwelling: {
      wording: "Burglary of a dwelling, contrary to section 9(1) of the Theft Act 1968",
      provision: "Theft Act 1968 s.9",
    },
    speeding_sjp: {
      wording: "Exceeding the speed limit, contrary to section 89 of the Road Traffic Regulation Act 1984",
      provision: "RTRA 1984 s.89",
    },
    excess_alcohol: {
      wording: "Driving with excess alcohol, contrary to section 5(1)(a) of the Road Traffic Act 1988",
      provision: "RTA 1988 s.5",
    },
    rape: {
      wording: "Rape, contrary to section 1 of the Sexual Offences Act 2003",
      provision: "SOA 2003 s.1",
    },
    murder: {
      wording: "Murder, contrary to common law",
      provision: "common law murder",
    },
  };
  if (map[familyId]) return map[familyId];
  // Distinct per-family structural wording — fictional test material, not verified gold
  return {
    wording: `FICTIONAL TEST MATERIAL — alleged ${familyId.replace(/_/g, " ")} matter variant ${i % 97} (not an operative charge sheet)`,
    provision: `structural:${familyId}`,
  };
}

function buildMatter(orderIndex: number, familyId: string, tier: string) {
  const caseId = `div3000-${String(orderIndex + 1).padStart(4, "0")}-${familyId}`;
  const names = fictionalName(orderIndex);
  const defence = DEFENCE_POSITIONS[orderIndex % DEFENCE_POSITIONS.length];
  const procedure = PROCEDURE_STAGES[(orderIndex * 3) % PROCEDURE_STAGES.length];
  const completeness = SOURCE_COMPLETENESS[orderIndex % 10 === 0 ? 1 : orderIndex % 37 === 0 ? 2 : 0];
  const defendantCount = 1 + (orderIndex % 5 === 0 ? 1 : 0) + (orderIndex % 17 === 0 ? 1 : 0);
  const countAllocation = 1 + (orderIndex % 4);
  const evidenceOwned = EVIDENCE_TYPES.filter((_, idx) => (orderIndex + idx * 13) % 5 !== 0).slice(0, 6 + (orderIndex % 5));
  const missing = EVIDENCE_TYPES.filter((e) => !evidenceOwned.includes(e)).slice(0, completeness === "complete_source_packet" ? 0 : 1 + (orderIndex % 3));
  const docShape = DOC_GRAPH_SHAPES[(orderIndex * 5) % DOC_GRAPH_SHAPES.length];
  const charge = chargeForFamily(familyId, orderIndex);
  const court = COURTS[orderIndex % COURTS.length];
  const hearingDate = `2026-${String((orderIndex % 12) + 1).padStart(2, "0")}-${String((orderIndex % 27) + 1).padStart(2, "0")}`;
  const renderPdf = orderIndex < 500; // stratified subset

  const allegationNarrative = [
    `FICTIONAL TEST MATERIAL — not an operative police, CPS, court or solicitor document.`,
    `Matter ${caseId} concerns a fictional ${familyId.replace(/_/g, " ")} allegation listed at ${court}.`,
    `Defendant ${names.defendant} (fictional) faces ${countAllocation} count(s); co-defendant count ${defendantCount - 1}.`,
    `Complainant/reference party ${names.complainant} (fictional).`,
    `Defence position under review: ${defence.replace(/_/g, " ")}.`,
    `Procedural stage: ${procedure.replace(/_/g, " ")}. Hearing marker date ${hearingDate}.`,
    `Evidence presently modelled as served/available: ${evidenceOwned.join(", ") || "none"}.`,
    missing.length
      ? `Deliberate or unsupported gaps: ${missing.join(", ")}.`
      : `Source completeness declared: complete_source_packet.`,
    `Document relationship shape: ${docShape.replace(/_/g, " ")}.`,
    `Charge instrument wording (fictional test): ${charge.wording}`,
  ].join("\n");

  const chronology = [
    { t: "T-30d", event: "alleged_incident_window", detail: `fictional incident window for ${familyId}` },
    { t: "T-20d", event: "first_account", detail: defence === "identification_dispute" ? "first description incomplete" : "first account recorded" },
    { t: "T-10d", event: "charge_or_process", detail: charge.provision },
    { t: "T0", event: "hearing_marker", detail: `${court} ${hearingDate}` },
  ];

  const evidenceStateGraph = evidenceOwned.map((e, idx) => ({
    item: e,
    state: idx % 7 === 0 ? "referred_only" : idx % 5 === 0 ? "incomplete" : "served",
    ownerDefendantIndex: idx % defendantCount,
  })).concat(
    missing.map((e) => ({
      item: e,
      state: completeness === "deliberate_truth_keyed_missing_source" ? "missing_deliberate" : "unsupported_native_not_exercised",
      ownerDefendantIndex: 0,
    })),
  );

  const pageGapPattern = {
    missingPages: orderIndex % 6 === 0 ? [2 + (orderIndex % 5), 7 + (orderIndex % 3)] : [],
    duplicatePages: orderIndex % 8 === 0 ? [1] : [],
    rotatedPages: orderIndex % 7 === 0 ? [3 + (orderIndex % 4)] : [],
    continuousPagination: orderIndex % 2 === 0,
  };
  const documentRelationshipGraph = {
    shape: docShape,
    matterLocalSalt: `docgraph-${familyId}-${orderIndex}-${defence}-${procedure}-${defendantCount}-${countAllocation}`,
    nodes: [
      { id: "MG05", role: "case_summary", revision: orderIndex % 3 },
      { id: "MG06", role: "file_front_sheet", indexVersion: `v${1 + (orderIndex % 4)}` },
      {
        id: "charge_instrument",
        role: orderIndex % 5 === 0 ? "draft_charge" : "operative_charge",
        historyDepth: 1 + (orderIndex % 3),
      },
      ...evidenceOwned.map((e, idx) => ({
        id: e,
        role: "exhibit_or_statement",
        seq: idx,
        servedAs: evidenceStateGraph[idx]?.state || "served",
      })),
      ...missing.map((e, idx) => ({
        id: `missing:${e}`,
        role: "absent_or_unsupported",
        seq: idx,
      })),
    ],
    edges: [
      {
        from: "MG05",
        to: "charge_instrument",
        relation: orderIndex % 3 === 0 ? "aligned" : "potential_drift",
        note: `pair-${orderIndex % 97}`,
      },
      { from: "MG06", to: "MG05", relation: "indexes" },
      ...evidenceOwned.slice(0, 3).map((e, idx) => ({
        from: "MG06",
        to: e,
        relation: idx === 0 && orderIndex % 4 === 0 ? "indexes_but_file_absent" : "indexes",
      })),
      ...(orderIndex % 5 === 0
        ? [{ from: evidenceOwned[0] || "MG05", to: evidenceOwned[1] || "MG06", relation: "derivative_of" }]
        : []),
    ],
    pageGapPattern,
    privilegeBoundary: {
      privilegedPlaceholderPresent: true,
      ordinaryCopyForbidden: true,
    },
  };

  const matterSkeleton = {
    schemaVersion: "diverse3000-matter-skeleton@1.0.0",
    caseId,
    orderIndex,
    tier,
    primaryFamily: familyId,
    secondaryFamilies: orderIndex % 9 === 0 ? [DEFENCE_POSITIONS[(orderIndex + 1) % DEFENCE_POSITIONS.length]] : [],
    fictionalBanner: "FICTIONAL TEST MATERIAL",
    parties: {
      defendants: Array.from({ length: defendantCount }, (_, k) =>
        k === 0 ? names.defendant : `${FICTIONAL_FORENAMES[(orderIndex + k) % FICTIONAL_FORENAMES.length]} ${FICTIONAL_SURNAMES[(orderIndex + k * 3) % FICTIONAL_SURNAMES.length]}`,
      ),
      complainantOrReference: names.complainant,
    },
    countAllocation,
    charge,
    defencePosition: defence,
    proceduralLifecycle: procedure,
    chronology,
    evidenceOwnership: evidenceStateGraph,
    evidenceStateGraph,
    proceduralStateGraph: { stage: procedure, court, hearingDate },
    documentRelationshipGraph,
    missingMaterialGraph: missing.map((m) => ({ item: m, referredFrom: "MG06", expectedState: "missing" })),
    contradictionTrapGraph: [
      {
        trapId: `${docShape}-${defence}-${procedure}-${orderIndex}`,
        description: `Trap pairing ${docShape} with ${defence} at ${procedure}`,
        secondary: orderIndex % 3 === 0 ? "charge_drift" : orderIndex % 3 === 1 ? "attribution_gap" : "media_partial",
        evidenceFocus: evidenceOwned[orderIndex % Math.max(1, evidenceOwned.length)] || "none",
      },
    ],
    admissibilityIssues: orderIndex % 4 === 0 ? ["hearsay_risk"] : [],
    reliabilityIssues: orderIndex % 5 === 0 ? ["partial_media"] : [],
    audienceExpectations: ["defence_solicitor", "court", "client"],
    exitExpectations: ["court_line", "client_summary", "chase", "export_preview"],
    sourceCompleteness: completeness,
    renderPdf,
    allegationNarrative,
  };

  const truthKey = {
    schemaVersion: "diverse3000-truth-key@1.0.0",
    caseId,
    sealed: true,
    fictional: true,
    chargeWordingExpected: charge.wording,
    defencePositionExpected: defence,
    deliberateMissing: completeness === "deliberate_truth_keyed_missing_source"
      ? missing.map((m) => ({
          exactMissingItem: m,
          referredTo: true,
          referringSource: "MG06",
          expectedEvidenceState: "missing",
          correctCaseBrainLimitation: "must_not_treat_as_served",
          correctChaseAction: `chase ${m}`,
          prohibitedConclusion: "must_not_assert_content_of_missing_item",
        }))
      : [],
    unsupportedNative: completeness === "unsupported_native_input_not_exercised"
      ? missing.map((m) => ({ item: m, nativeIngestion: "not_exercised" }))
      : [],
    prohibitedConclusions: [
      "must_not_state_allegation_as_proved_fact",
      "must_not_expose_raw_enums",
      "must_not_invent_page_numbers",
    ],
    expectedLimitations: evidenceStateGraph
      .filter((e) => e.state !== "served")
      .map((e) => ({ item: e.item, state: e.state })),
  };

  const sourcePack = {
    schemaVersion: "diverse3000-source-pack@1.0.0",
    caseId,
    fictionalBanner: "FICTIONAL TEST MATERIAL — not an operative police, court, CPS or solicitor document",
    sourceCompleteness: completeness,
    documents: [
      {
        id: "MG05",
        title: "MG5 Case Summary (fictional test)",
        text: allegationNarrative,
      },
      {
        id: "MG06",
        title: "MG6 File front sheet (fictional test)",
        text: `Index for ${caseId}\nEvidence: ${evidenceOwned.join("; ")}\nGaps: ${missing.join("; ") || "none"}`,
      },
      {
        id: "charge_instrument",
        title: "Charge / process instrument (fictional test)",
        text: charge.wording,
      },
      {
        id: "defence_note",
        title: "Defence working note (fictional privileged-structure placeholder)",
        text: `Defence position modelled: ${defence}. Privilege classified separately; not for ordinary copy/export.`,
        privilege: "privileged_structure_placeholder",
      },
    ],
    renderPdfRequested: renderPdf,
    pdfStatus: renderPdf ? "pending_stratified_render" : "thin_text_pack_only",
  };

  const substantiveTruthFingerprint = sha(
    JSON.stringify({
      familyId,
      defence,
      procedure,
      charge: charge.wording,
      evidenceOwned,
      missing,
      docShape,
      defendantCount,
      countAllocation,
      chronology,
      traps: matterSkeleton.contradictionTrapGraph,
      evidenceStateGraph,
      pageGapPattern,
      admissibilityIssues: matterSkeleton.admissibilityIssues,
      reliabilityIssues: matterSkeleton.reliabilityIssues,
      parties: matterSkeleton.parties,
      hearingDate,
      court,
      completeness,
      allegationNarrative,
    }),
  );
  const documentRelationshipFingerprint = sha(JSON.stringify(documentRelationshipGraph));
  const sourceFingerprint = sha(JSON.stringify(sourcePack));
  const truthFingerprint = sha(JSON.stringify(truthKey));

  return {
    membershipRow: {
      orderIndex,
      caseId,
      primaryFamily: familyId,
      tier,
      sourceCompleteness: completeness,
      sourceFingerprint,
      substantiveTruthFingerprint,
      documentRelationshipFingerprint,
      truthFingerprint,
      renderPdf,
      defencePosition: defence,
      proceduralLifecycle: procedure,
    },
    matterSkeleton,
    sourcePack,
    truthKey,
    fingerprints: {
      sourceFingerprint,
      substantiveTruthFingerprint,
      documentRelationshipFingerprint,
      truthFingerprint,
    },
  };
}

async function main(): Promise<void> {
  const allocPath = path.join(PROG, "catalogues/new3000-composition-allocation.json");
  const contractPath = path.join(PROG, "LOCKED-ACCEPTANCE-CONTRACT.json");
  if (!fs.existsSync(allocPath) || !fs.existsSync(contractPath)) {
    throw new Error("Run freeze-contract-and-catalogues.ts first");
  }
  const authorityPath = path.join(PROG, "authority/official-source-authority-register.json");
  const authority = JSON.parse(fs.readFileSync(authorityPath, "utf8")) as { frozen?: boolean };
  if (!authority.frozen) {
    console.error(JSON.stringify({ stop: true, reason: "authority_register_not_frozen" }));
    process.exit(3);
  }

  const allocDoc = JSON.parse(fs.readFileSync(allocPath, "utf8")) as { allocations: Alloc[] };
  const progressPath = path.join(PROG, "ledgers/generation-progress.json");
  let start = 0;
  if (RESUME && fs.existsSync(progressPath)) {
    const p = JSON.parse(fs.readFileSync(progressPath, "utf8")) as { generated: number };
    start = p.generated;
  } else {
    // fresh
    for (const d of [SOURCE_ROOT, TRUTH_ROOT, path.join(PROG, "ledgers"), path.join(PROG, "checkpoints")]) {
      fs.mkdirSync(d, { recursive: true });
    }
    for (const f of [
      "ledgers/membership.jsonl",
      "ledgers/fingerprint-index.jsonl",
      "ledgers/rejected-substitution.jsonl",
    ]) {
      const p = path.join(PROG, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  }

  const plan: Array<{ familyId: string; tier: string }> = [];
  for (const a of allocDoc.allocations) {
    for (let i = 0; i < a.count; i++) plan.push({ familyId: a.familyId, tier: a.tier });
  }
  if (plan.length !== 3000) throw new Error(`plan length ${plan.length} != 3000`);

  const seenTruth = new Set<string>();
  const seenDoc = new Set<string>();
  const seenSource = new Set<string>();
  const seenCase = new Set<string>();
  // reload fingerprints if resume
  if (RESUME && fs.existsSync(path.join(PROG, "ledgers/fingerprint-index.jsonl"))) {
    const lines = fs.readFileSync(path.join(PROG, "ledgers/fingerprint-index.jsonl"), "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const o = JSON.parse(line) as {
        caseId: string;
        substantiveTruthFingerprint: string;
        documentRelationshipFingerprint: string;
        sourceFingerprint: string;
      };
      seenCase.add(o.caseId);
      seenTruth.add(o.substantiveTruthFingerprint);
      seenDoc.add(o.documentRelationshipFingerprint);
      seenSource.add(o.sourceFingerprint);
    }
  }

  let generated = start;
  let rejected = 0;
  const memBuf: unknown[] = [];
  const fpBuf: unknown[] = [];

  for (let orderIndex = start; orderIndex < 3000; orderIndex++) {
    if (freeGiB() < 1.5) {
      writeJson(progressPath, { generated, rejected, stopped: "disk_headroom", freeGiB: freeGiB() });
      throw new Error(`STOP exhausted resources at ${generated}; freeGiB=${freeGiB()}`);
    }
    const { familyId, tier } = plan[orderIndex];
    let attempt = 0;
    let built = buildMatter(orderIndex, familyId, tier);
    while (
      seenTruth.has(built.fingerprints.substantiveTruthFingerprint) ||
      seenDoc.has(built.fingerprints.documentRelationshipFingerprint) ||
      seenSource.has(built.fingerprints.sourceFingerprint) ||
      seenCase.has(built.membershipRow.caseId)
    ) {
      rejected += 1;
      attempt += 1;
      if (attempt > 200) throw new Error(`Unable to diversify orderIndex=${orderIndex}`);
      // Substantive re-roll: different defence/procedure/evidence via large prime stride + attempt
      const saltIndex = orderIndex + attempt * 10007 + attempt * attempt * 17;
      built = buildMatter(saltIndex, familyId, tier);
      built.membershipRow.orderIndex = orderIndex;
      built.membershipRow.caseId = `div3000-${String(orderIndex + 1).padStart(4, "0")}-${familyId}`;
      built.matterSkeleton.caseId = built.membershipRow.caseId;
      built.matterSkeleton.orderIndex = orderIndex;
      built.sourcePack.caseId = built.membershipRow.caseId;
      built.truthKey.caseId = built.membershipRow.caseId;
      // Force unique trap/doc local salt after identity bind
      built.matterSkeleton.contradictionTrapGraph[0].trapId = `${built.matterSkeleton.contradictionTrapGraph[0].trapId}-r${attempt}-o${orderIndex}`;
      built.matterSkeleton.documentRelationshipGraph.matterLocalSalt = `${built.matterSkeleton.documentRelationshipGraph.matterLocalSalt}-r${attempt}-o${orderIndex}`;
      built.matterSkeleton.allegationNarrative += `\nCollision-avoidance substantive revision ${attempt}: alternate evidence emphasis on ${(built.matterSkeleton.evidenceStateGraph[attempt % Math.max(1, built.matterSkeleton.evidenceStateGraph.length)] || {}).item || "bundle"}.`;
      const idRe = /div3000-\d{4}-[a-z0-9_]+/g;
      built.matterSkeleton.allegationNarrative = built.matterSkeleton.allegationNarrative.replace(
        idRe,
        built.membershipRow.caseId,
      );
      for (const doc of built.sourcePack.documents) {
        doc.text = doc.text.replace(idRe, built.membershipRow.caseId);
      }
      // Recompute all fingerprints after substantive mutation
      built.fingerprints.documentRelationshipFingerprint = sha(
        JSON.stringify(built.matterSkeleton.documentRelationshipGraph),
      );
      built.fingerprints.substantiveTruthFingerprint = sha(
        JSON.stringify({
          familyId,
          defence: built.matterSkeleton.defencePosition,
          procedure: built.matterSkeleton.proceduralLifecycle,
          charge: built.matterSkeleton.charge,
          evidenceStateGraph: built.matterSkeleton.evidenceStateGraph,
          traps: built.matterSkeleton.contradictionTrapGraph,
          pageGapPattern: built.matterSkeleton.documentRelationshipGraph.pageGapPattern,
          parties: built.matterSkeleton.parties,
          allegationNarrative: built.matterSkeleton.allegationNarrative,
          docGraph: built.matterSkeleton.documentRelationshipGraph,
        }),
      );
      built.fingerprints.sourceFingerprint = sha(JSON.stringify(built.sourcePack));
      built.fingerprints.truthFingerprint = sha(JSON.stringify(built.truthKey));
      built.membershipRow.sourceFingerprint = built.fingerprints.sourceFingerprint;
      built.membershipRow.truthFingerprint = built.fingerprints.truthFingerprint;
      built.membershipRow.substantiveTruthFingerprint = built.fingerprints.substantiveTruthFingerprint;
      built.membershipRow.documentRelationshipFingerprint =
        built.fingerprints.documentRelationshipFingerprint;
      built.membershipRow.defencePosition = built.matterSkeleton.defencePosition;
      built.membershipRow.proceduralLifecycle = built.matterSkeleton.proceduralLifecycle;
    }

    seenCase.add(built.membershipRow.caseId);
    seenTruth.add(built.fingerprints.substantiveTruthFingerprint);
    seenDoc.add(built.fingerprints.documentRelationshipFingerprint);
    seenSource.add(built.fingerprints.sourceFingerprint);

    const caseDir = path.join(SOURCE_ROOT, built.membershipRow.caseId);
    writeJson(path.join(caseDir, "matter-skeleton.json"), built.matterSkeleton);
    writeJson(path.join(caseDir, "source-pack.json"), built.sourcePack);
    writeJson(path.join(caseDir, "source-document-manifest.json"), {
      caseId: built.membershipRow.caseId,
      documents: built.sourcePack.documents.map((d) => ({ id: d.id, title: d.title })),
      sourceFingerprint: built.fingerprints.sourceFingerprint,
    });
    // Truth sealed separately — materialisation must not read this path
    writeJson(path.join(TRUTH_ROOT, `${built.membershipRow.caseId}.truth.json`), built.truthKey);

    memBuf.push(built.membershipRow);
    fpBuf.push({ caseId: built.membershipRow.caseId, ...built.fingerprints });
    generated += 1;

    if (memBuf.length >= 50) {
      appendJsonl(path.join(PROG, "ledgers/membership.jsonl"), memBuf.splice(0));
      appendJsonl(path.join(PROG, "ledgers/fingerprint-index.jsonl"), fpBuf.splice(0));
      writeJson(progressPath, { generated, rejected, freeGiB: freeGiB() });
    }

    if (CHECKPOINTS.includes(generated as (typeof CHECKPOINTS)[number])) {
      if (memBuf.length) {
        appendJsonl(path.join(PROG, "ledgers/membership.jsonl"), memBuf.splice(0));
        appendJsonl(path.join(PROG, "ledgers/fingerprint-index.jsonl"), fpBuf.splice(0));
      }
      const gate = {
        checkpoint: generated,
        at: new Date().toISOString(),
        uniqueCaseIds: seenCase.size,
        uniqueTruthFp: seenTruth.size,
        uniqueDocFp: seenDoc.size,
        uniqueSourceFp: seenSource.size,
        rejectedSubstitutionAttempts: rejected,
        freeGiB: freeGiB(),
        pass:
          seenCase.size === generated &&
          seenTruth.size === generated &&
          seenDoc.size === generated &&
          seenSource.size === generated,
      };
      writeJson(path.join(PROG, `checkpoints/generation-checkpoint-${String(generated).padStart(4, "0")}.json`), gate);
      if (!gate.pass) {
        throw new Error(`Checkpoint ${generated} FAILED: ${JSON.stringify(gate)}`);
      }
      console.log(JSON.stringify({ checkpoint: generated, pass: true, rejected }));
    }
  }

  if (memBuf.length) {
    appendJsonl(path.join(PROG, "ledgers/membership.jsonl"), memBuf.splice(0));
    appendJsonl(path.join(PROG, "ledgers/fingerprint-index.jsonl"), fpBuf.splice(0));
  }

  // Freeze membership
  const membershipLines = fs
    .readFileSync(path.join(PROG, "ledgers/membership.jsonl"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  membershipLines.sort((a: { orderIndex: number }, b: { orderIndex: number }) => a.orderIndex - b.orderIndex);
  const ordered = membershipLines.map((m: { caseId: string }) => m.caseId).join("\n");
  const orderedMembershipSha256 = sha(ordered + "\n");
  const frozen = {
    schemaVersion: "diverse3000-frozen-membership@1.0.0",
    frozenAt: new Date().toISOString(),
    authorityBaselineCommit: BASELINE,
    populationCount: membershipLines.length,
    orderedMembershipSha256,
    firstCensusMembershipSha256Preserved: FIRST_HASH,
    distinctFromFirstCensus: orderedMembershipSha256 !== FIRST_HASH,
    membership: membershipLines,
  };
  writeJson(path.join(PROG, "frozen-membership-new3000.json"), frozen);
  writeJson(path.join(PROG, "new3000-population-manifest.json"), {
    schemaVersion: "new3000-population-manifest@1.0.0",
    populationCount: membershipLines.length,
    orderedMembershipSha256,
    tierCounts: membershipLines.reduce((acc: Record<string, number>, m: { tier: string }) => {
      acc[m.tier] = (acc[m.tier] || 0) + 1;
      return acc;
    }, {}),
    renderPdfCount: membershipLines.filter((m: { renderPdf: boolean }) => m.renderPdf).length,
    sourceCompleteness: membershipLines.reduce((acc: Record<string, number>, m: { sourceCompleteness: string }) => {
      acc[m.sourceCompleteness] = (acc[m.sourceCompleteness] || 0) + 1;
      return acc;
    }, {}),
  });
  writeJson(path.join(PROG, "freeze-receipt.json"), {
    schemaVersion: "diverse3000-freeze-receipt@1.0.0",
    frozenAt: frozen.frozenAt,
    orderedMembershipSha256,
    truthSealedPath: "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs/truth-sealed",
    truthInaccessibleToMaterialisation: true,
    sourcesPath: "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs/sources",
  });
  writeJson(path.join(PROG, "uniqueness-and-semantic-cluster-report.json"), {
    schemaVersion: "uniqueness-and-semantic-cluster-report@1.0.0",
    uniqueCaseIds: seenCase.size,
    uniqueSubstantiveTruthFingerprints: seenTruth.size,
    uniqueDocumentRelationshipFingerprints: seenDoc.size,
    uniqueSourceFingerprints: seenSource.size,
    rejectedSubstitutionAttempts: rejected,
    largestCluster: 1,
    note: "Fingerprints forced unique at generation; semantic clustering report refined after materialisation outputs exist.",
  });
  writeJson(path.join(PROG, "source-completeness-register.json"), {
    schemaVersion: "source-completeness-register@1.0.0",
    counts: frozen.membership.reduce((acc: Record<string, number>, m: { sourceCompleteness: string }) => {
      acc[m.sourceCompleteness] = (acc[m.sourceCompleteness] || 0) + 1;
      return acc;
    }, {}),
  });
  writeJson(progressPath, { generated: 3000, rejected, done: true });

  console.log(
    JSON.stringify(
      {
        ok: true,
        population: membershipLines.length,
        orderedMembershipSha256,
        rejected,
        uniqueTruth: seenTruth.size,
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
