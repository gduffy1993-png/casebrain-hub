/**
 * B. Independent semantic-diversity audit of V1.
 * Strips case IDs, names, dates, order indexes, salts; does not force a desired score.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const V1 = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1",
);
const OUT = path.join(V1, "semantic-diversity-audit");
const SOURCES = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs/sources",
);
const FIRST_LEDGER =
  process.env.FIRST3000_LEDGER_ROOT ||
  "C:/Users/gduff/casebrain-hub-wt-s3000-census/artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-existing-census-v1-final-corrections";

function sha(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(name: string, data: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Remove identity/salt noise for semantic clustering. */
function normalizeSemantic(input: unknown): string {
  let s = typeof input === "string" ? input : JSON.stringify(input);
  s = s.toLowerCase();
  // case ids
  s = s.replace(/div3000-\d{4}-[a-z0-9_]+/g, "<CASE>");
  s = s.replace(/messy-pdf-v\d+-\d+[a-z0-9-]*/g, "<CASE>");
  // dates
  s = s.replace(/\b20\d{2}-\d{2}-\d{2}\b/g, "<DATE>");
  s = s.replace(/\b\d{1,2}\/\d{1,2}\/20\d{2}\b/g, "<DATE>");
  // order / numeric salts
  s = s.replace(/\borderindex["\s:]*\d+/g, "orderindex:<N>");
  s = s.replace(/\bmatterlocalsalt["\s:]*"[^"]+"/g, 'matterlocalsalt:"<SALT>"');
  s = s.replace(/\bdocgraph-[a-z0-9_-]+/g, "docgraph-<SALT>");
  s = s.replace(/\btrapid["\s:]*"[^"]+"/g, 'trapid:"<TRAP>"');
  s = s.replace(/\br\d+-o\d+/g, "<REV>");
  s = s.replace(/\bpair-\d+/g, "pair-<N>");
  s = s.replace(/\bvariant\s+\d+/g, "variant <N>");
  s = s.replace(/\brevision["\s:]*\d+/g, "revision:<N>");
  s = s.replace(/\bindexversion["\s:]*"v\d+"/g, 'indexversion:"vN"');
  s = s.replace(/\bhistorydepth["\s:]*\d+/g, "historydepth:<N>");
  s = s.replace(/\bseq["\s:]*\d+/g, "seq:<N>");
  // fictional names (forenames/surnames lists used in generator)
  const names =
    /\b(asha|ben|cara|dev|elena|farid|grace|hassan|imogen|jay|keira|luis|maya|nia|omar|priya|quinn|rafi|sian|tomos|una|victor|wyn|yasmin|zane|aled|bethan|cai|delyth|eoin|ashworth|bedi|carlton|drummond|eastwood|farley|gupta|howells|ibrahim|jenkins|khatri|langley|moreau|nash|okoro|patel|quarry|redfern|singh|talbot|underwood|vaughan|walsh|yates|zhou)\b/g;
  s = s.replace(names, "<NAME>");
  // strip family labels that merely announce the answer when used as sole differentiator later
  s = s.replace(/\s+/g, " ").trim();
  // punctuation / digit collapse for near-dup
  const near = s.replace(/[^a-z<>_]+/g, " ").replace(/\s+/g, " ").trim();
  return near;
}

type ClusterMap = Map<string, string[]>;

function addCluster(map: ClusterMap, key: string, caseId: string): void {
  if (!map.has(key)) map.set(key, []);
  map.get(key)!.push(caseId);
}

function summarize(map: ClusterMap, label: string) {
  const clusters = [...map.entries()]
    .map(([key, cases]) => ({
      clusterKey: key.slice(0, 24),
      fullKeySha256: key.length === 64 && /^[a-f0-9]+$/.test(key) ? key : sha(key),
      size: cases.length,
      representativeCases: cases.slice(0, 5),
    }))
    .sort((a, b) => b.size - a.size);
  const sizes = clusters.map((c) => c.size);
  const singleton = sizes.filter((n) => n === 1).length;
  return {
    label,
    clusterCount: clusters.length,
    singletonClusters: singleton,
    largestCluster: sizes[0] || 0,
    top10: clusters.slice(0, 10),
    meanClusterSize: sizes.length ? sizes.reduce((a, b) => a + b, 0) / sizes.length : 0,
    casesInClustersGte5: sizes.filter((n) => n >= 5).reduce((a, b) => a + b, 0),
    casesInClustersGte20: sizes.filter((n) => n >= 20).reduce((a, b) => a + b, 0),
    casesInLargest: sizes[0] || 0,
  };
}

async function main(): Promise<void> {
  const frozen = JSON.parse(fs.readFileSync(path.join(V1, "frozen-membership-new3000.json"), "utf8")) as {
    orderedMembershipSha256: string;
    membership: Array<{ caseId: string; primaryFamily: string; orderIndex: number }>;
  };

  const narrative: ClusterMap = new Map();
  const charge: ClusterMap = new Map();
  const defence: ClusterMap = new Map();
  const evidence: ClusterMap = new Map();
  const chronology: ClusterMap = new Map();
  const docRel: ClusterMap = new Map();
  const missing: ClusterMap = new Map();
  const traps: ClusterMap = new Map();
  const sourceStruct: ClusterMap = new Map();
  const outputWording: ClusterMap = new Map();
  const combinedSemantic: ClusterMap = new Map();

  // Load surfaces for output wording clusters
  const surfPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/integrity-programme/diverse3000-solicitor-materialisation/run-v1/surfaces.jsonl",
  );
  const outputsByCase = new Map<string, string[]>();
  if (fs.existsSync(surfPath)) {
    const lines = fs.readFileSync(surfPath, "utf8").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const o = JSON.parse(line) as { caseId: string; text: string; surfaceId: string };
      if (!outputsByCase.has(o.caseId)) outputsByCase.set(o.caseId, []);
      outputsByCase.get(o.caseId)!.push(`${o.surfaceId}:${normalizeSemantic(o.text)}`);
    }
  }

  let fourDocSkeleton = 0;
  let structuralCharge = 0;
  let pendingPdf = 0;

  for (const m of frozen.membership) {
    const skel = JSON.parse(fs.readFileSync(path.join(SOURCES, m.caseId, "matter-skeleton.json"), "utf8"));
    const pack = JSON.parse(fs.readFileSync(path.join(SOURCES, m.caseId, "source-pack.json"), "utf8"));

    if (Array.isArray(pack.documents) && pack.documents.length === 4) fourDocSkeleton += 1;
    if (pack.pdfStatus === "pending_stratified_render" || pack.renderPdfRequested) pendingPdf += 1;
    if (String(skel.charge?.wording || "").includes("FICTIONAL TEST MATERIAL")) structuralCharge += 1;

    // Strip family label from narrative for one cluster variant
    const narrRaw = normalizeSemantic(skel.allegationNarrative || "");
    const narrNoFamily = narrRaw.replace(new RegExp(String(m.primaryFamily).replace(/_/g, "[ _]"), "g"), "<FAMILY>");
    addCluster(narrative, sha(narrNoFamily), m.caseId);

    addCluster(charge, sha(normalizeSemantic({ wording: skel.charge?.wording, counts: skel.countAllocation })), m.caseId);
    addCluster(defence, sha(normalizeSemantic(skel.defencePosition)), m.caseId);
    addCluster(
      evidence,
      sha(
        normalizeSemantic(
          (skel.evidenceStateGraph || []).map((e: { item: string; state: string }) => `${e.item}:${e.state}`).sort(),
        ),
      ),
      m.caseId,
    );
    addCluster(chronology, sha(normalizeSemantic(skel.chronology)), m.caseId);
    // doc graph without matterLocalSalt
    const doc = { ...(skel.documentRelationshipGraph || {}) };
    delete (doc as { matterLocalSalt?: string }).matterLocalSalt;
    addCluster(docRel, sha(normalizeSemantic(doc)), m.caseId);
    addCluster(missing, sha(normalizeSemantic(skel.missingMaterialGraph)), m.caseId);
    const trapNorm = (skel.contradictionTrapGraph || []).map((t: { description?: string; secondary?: string; evidenceFocus?: string }) => ({
      description: t.description,
      secondary: t.secondary,
      evidenceFocus: t.evidenceFocus,
    }));
    addCluster(traps, sha(normalizeSemantic(trapNorm)), m.caseId);

    const struct = {
      docIds: (pack.documents || []).map((d: { id: string }) => d.id).sort(),
      docCount: (pack.documents || []).length,
      completeness: pack.sourceCompleteness,
    };
    addCluster(sourceStruct, sha(normalizeSemantic(struct)), m.caseId);

    const outs = (outputsByCase.get(m.caseId) || []).slice().sort();
    addCluster(outputWording, sha(outs.join("|")), m.caseId);

    // Combined semantic signature (no case id / salt / names / dates)
    const combined = sha(
      [
        narrNoFamily,
        normalizeSemantic(skel.charge?.wording),
        normalizeSemantic(skel.defencePosition),
        normalizeSemantic(skel.proceduralLifecycle),
        normalizeSemantic((skel.evidenceStateGraph || []).map((e: { item: string; state: string }) => `${e.item}:${e.state}`).sort()),
        normalizeSemantic(doc),
        normalizeSemantic(skel.missingMaterialGraph),
        normalizeSemantic(trapNorm),
        normalizeSemantic(struct),
      ].join("||"),
    );
    addCluster(combinedSemantic, combined, m.caseId);
  }

  const summaries = [
    summarize(narrative, "factual_narratives"),
    summarize(charge, "charge_and_count_structures"),
    summarize(defence, "defence_positions"),
    summarize(evidence, "evidence_state_graphs"),
    summarize(chronology, "chronologies"),
    summarize(docRel, "document_relationship_graphs"),
    summarize(missing, "missing_material_patterns"),
    summarize(traps, "contradiction_traps"),
    summarize(sourceStruct, "source_document_structures"),
    summarize(outputWording, "solicitor_visible_output_wording"),
    summarize(combinedSemantic, "combined_semantic_signature"),
  ];

  // Cross-corpus overlap with first 3000 (content fingerprints / family+layout if available)
  let crossOverlap: unknown = {
    firstLedgerAvailable: false,
    note: "First census contentOutputFingerprint collapse ~70; V1 uses different identity scheme",
  };
  const firstFrozen = path.join(FIRST_LEDGER, "frozen-membership-3000.json");
  if (fs.existsSync(firstFrozen)) {
    const first = JSON.parse(fs.readFileSync(firstFrozen, "utf8")) as {
      orderedMembershipSha256: string;
      membership: Array<{ family: string; layout: string; contentOutputFingerprint: string }>;
    };
    const firstFamilies = new Set(first.membership.map((m) => m.family));
    const v1Families = new Set(frozen.membership.map((m) => m.primaryFamily));
    const familyOverlap = [...v1Families].filter((f) => firstFamilies.has(f));
    crossOverlap = {
      firstLedgerAvailable: true,
      firstMembershipSha256: first.orderedMembershipSha256,
      firstUniqueContentOutputFingerprints: new Set(first.membership.map((m) => m.contentOutputFingerprint)).size,
      v1FamilyCount: v1Families.size,
      firstFamilyCount: firstFamilies.size,
      sharedFamilyLabelStrings: familyOverlap.length,
      note: "Label overlap is not semantic case overlap; V1 narratives are synthetic thin-text, first census is messy-pdf v9 clones",
    };
  }

  const combined = summaries.find((s) => s.label === "combined_semantic_signature")!;
  const report = {
    schemaVersion: "diverse3000-v1-semantic-diversity-audit@1.0.0",
    generatedAt: new Date().toISOString(),
    orderedMembershipSha256: frozen.orderedMembershipSha256,
    populationCount: frozen.membership.length,
    normalisationMethod: [
      "lowercase",
      "strip case IDs (div3000/messy-pdf)",
      "strip dates",
      "strip orderIndex / matterLocalSalt / trapId salts / revision tokens",
      "replace generator forename/surname list with <NAME>",
      "replace primary family token in narrative with <FAMILY> for narrative cluster",
      "collapse punctuation/digits for near-dup key",
      "SHA-256 of normalised payload = cluster key",
    ],
    forcedUniquenessDisclaimer:
      "V1 generation forced unique cryptographic fingerprints including salts; this audit measures post-normalisation semantic collapse and does not force a desired score.",
    scaffoldObservations: {
      fourDocumentSkeletonCases: fourDocSkeleton,
      structuralFictionalChargeWordingCases: structuralCharge,
      pdfMarkedButPendingOrRequestedCases: pendingPdf,
      renderedPdfValidatedCases: 0,
    },
    clusterSummaries: summaries,
    headline: {
      combinedSemanticClusterCount: combined.clusterCount,
      combinedLargestCluster: combined.largestCluster,
      combinedSingletons: combined.singletonClusters,
      outputWordingLargestCluster: summaries.find((s) => s.label === "solicitor_visible_output_wording")!.largestCluster,
      sourceStructureLargestCluster: summaries.find((s) => s.label === "source_document_structures")!.largestCluster,
      narrativeLargestCluster: summaries.find((s) => s.label === "factual_narratives")!.largestCluster,
    },
    detectionNotes: [
      "exact duplicates: same normalised SHA",
      "parameter-substitution clones: large narrative/evidence clusters with family/name stripped",
      "repeated fixed templates: source_document_structures and output_wording large clusters",
      "largestCluster:1 from V1 uniqueness report is REJECTED as unsupported",
    ],
    crossCorpusOverlap: crossOverlap,
  };

  writeJson("v1-semantic-cluster-report.json", report);
  writeJson("NORMALISATION-METHOD.json", {
    schemaVersion: "diverse3000-v1-semantic-normalisation@1.0.0",
    method: report.normalisationMethod,
  });

  // Write top combined clusters detail
  const topCombined = [...combinedSemantic.entries()]
    .map(([k, cases]) => ({ key: k, size: cases.length, cases: cases.slice(0, 20) }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 30);
  writeJson("v1-top-combined-semantic-clusters.json", { top: topCombined });

  console.log(
    JSON.stringify(
      {
        ok: true,
        combinedClusters: combined.clusterCount,
        combinedLargest: combined.largestCluster,
        outputLargest: report.headline.outputWordingLargestCluster,
        sourceStructLargest: report.headline.sourceStructureLargestCluster,
        fourDoc: fourDocSkeleton,
        structuralCharge,
        pendingPdf,
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
