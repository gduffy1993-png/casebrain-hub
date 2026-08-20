/**
 * READ-ONLY legal-domain classification over the global corpus (local + cloud).
 * Consumes global/local/cloud artefacts; samples PDF text (bounded) + case metadata.
 * Does NOT mutate DB/storage. Does NOT run assurance.
 *
 *   npx tsx scripts/assurance/classify-corpus-legal-domain-readonly.ts
 *   npx tsx scripts/assurance/classify-corpus-legal-domain-readonly.ts --resume
 */
import { createClient } from "@supabase/supabase-js";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/master-3000-release-assurance",
);
const LEGACY_ORG = "11f3d373-a6d0-4a58-ac72-59b5365dc367";
const LEGACY_ORG_2 = "1aae6bb0-0324-4ab5-8904-eb44ee1fe829";
const RESUME = process.argv.includes("--resume");
const TEXT_SAMPLE_CHARS = 12000;
const PDF_PARSE_MAX_PAGES = 4;
const LOCAL_EXTRACT_CONCURRENCY = 6;

type Domain =
  | "CRIMINAL_DEFENCE"
  | "HOUSING"
  | "OTHER_LEGAL"
  | "NON_LEGAL"
  | "UNKNOWN_REQUIRES_REVIEW";

type PdfClass = {
  sha256: string;
  domain: Domain;
  criminalScore: number;
  housingScore: number;
  otherLegalScore: number;
  nonLegalScore: number;
  confidence: "high" | "medium" | "low";
  signals: string[];
  sourcesUsed: string[];
  sampleChars: number;
  titleHint: string | null;
  practiceAreaHint: string | null;
  classifiedAt: string;
};

type BundleClass = {
  bundleKey: string;
  domain: Domain;
  backendCaseId: string | null;
  title: string | null;
  uniquePdfHashes: string[];
  pdfDomains: Record<Domain, number>;
  criminalScoreMax: number;
  housingScoreMax: number;
  sourceAuditEligible: boolean;
  syntheticOrTemplateLikely: boolean;
  physicallyAccessible: boolean;
  reason: string;
};

function loadEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const i = t.indexOf("=");
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function readNdjson<T>(p: string): T[] {
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as T);
}

function scorePatterns(text: string, patterns: RegExp[]): { score: number; hits: string[] } {
  let score = 0;
  const hits: string[] = [];
  for (const re of patterns) {
    if (re.test(text)) {
      score += 1;
      hits.push(re.source.slice(0, 80));
    }
  }
  return { score, hits };
}

const CRIMINAL_PATTERNS: RegExp[] = [
  /\b(crown\s+prosecution\s+service|\bCPS\b)\b/i,
  /\b(magistrates['’]?\s+court|crown\s+court)\b/i,
  /\b(indictment|count\s+[0-9]+|counts?\s+of)\b/i,
  /\b(MG\s*[0-9]{1,2}|MG11|MG5|MG4|MG6[A-D]?|MG3)\b/i,
  /\b(PACE|police\s+and\s+criminal\s+evidence)\b/i,
  /\b(custody\s+(record|suite|officer)|detention\s+clock)\b/i,
  /\b(caution(?:ed)?\s+(?:and\s+)?(?:interview|question)|interview\s+under\s+caution)\b/i,
  /\b(witness\s+statement|MG11)\b/i,
  /\b(disclosure\s+schedule|unused\s+material|CPIA)\b/i,
  /\b(defendant|co-?defendant|prosecution\s+case)\b/i,
  /\b(offence|charge[sd]?|allegation)\b/i,
  /\b(bail\s+conditions|remanded\s+in\s+custody)\b/i,
  /\b(ABH|GBH|s\.?\s*18|s\.?\s*20|s\.?\s*47|theft|robbery|burglary|public\s+order|possession\s+with\s+intent)\b/i,
  /\b(body[- ]?worn\s+video|\bBWV\b|CCTV\s+exhibit)\b/i,
  /\b(exhibit\s+[A-Z]?[0-9]+|continuity\s+of\s+exhibits?)\b/i,
  /\b(not\s+guilty\s+plea|plea\s+and\s+trial\s+preparation|PTPH|PCMH)\b/i,
  /\b(criminal\s+procedure|criminal\s+defence|defence\s+statement)\b/i,
  /\b(arrest(?:ed)?|officer\s+in\s+the\s+case|\bOIC\b)\b/i,
];

const HOUSING_PATTERNS: RegExp[] = [
  /\b(housing\s+disrepair|disrepair\s+claim)\b/i,
  /\b(landlord|tenant|tenancy\s+agreement|assured\s+shorthold)\b/i,
  /\b(possession\s+order|section\s+21|section\s+8|eviction)\b/i,
  /\b(housing\s+benefit|universal\s+credit\s+housing)\b/i,
  /\b(homeless(?:ness)?|housing\s+act\s+1996|priority\s+need)\b/i,
  /\b(HHSRS|category\s+[12]\s+hazard|damp\s+and\s+mould|awaab)\b/i,
  /\b(rent\s+arrears|notice\s+seeking\s+possession)\b/i,
  /\b(social\s+housing|local\s+authority\s+housing|housing\s+association)\b/i,
  /\b(pre[- ]action\s+protocol\s+for\s+housing)\b/i,
  /\b(repair(?:s)?\s+obligation|fitness\s+for\s+human\s+habitation)\b/i,
];

const OTHER_LEGAL_PATTERNS: RegExp[] = [
  /\b(personal\s+injury|clinical\s+negligence|medical\s+negligence)\b/i,
  /\b(family\s+proceedings|care\s+order|financial\s+remedy|divorce)\b/i,
  /\b(employment\s+tribunal|unfair\s+dismissal)\b/i,
  /\b(judicial\s+review|immigration|asylum)\b/i,
  /\b(conveyancing|probate|wills?\s+and\s+estates)\b/i,
  /\b(commercial\s+contract|insolvency|company\s+law)\b/i,
];

const NON_LEGAL_PATTERNS: RegExp[] = [
  /\b(lorem\s+ipsum|sample\s+invoice|marketing\s+brochure)\b/i,
  /\b(readme|changelog|package\.json)\b/i,
  /\b(this\s+is\s+a\s+test\s+document\s+only)\b/i,
];

function classifyText(input: {
  text: string;
  titleHint?: string | null;
  practiceAreaHint?: string | null;
  sourcesUsed: string[];
}): Omit<PdfClass, "sha256" | "classifiedAt"> {
  const blob = `${input.titleHint ?? ""}\n${input.practiceAreaHint ?? ""}\n${input.text}`.slice(
    0,
    TEXT_SAMPLE_CHARS * 2,
  );
  const criminal = scorePatterns(blob, CRIMINAL_PATTERNS);
  const housing = scorePatterns(blob, HOUSING_PATTERNS);
  const other = scorePatterns(blob, OTHER_LEGAL_PATTERNS);
  const nonLegal = scorePatterns(blob, NON_LEGAL_PATTERNS);

  // Soft practice_area boost only — never sole decider (legacy cloud labels are all "criminal").
  let practiceBoostCriminal = 0;
  let practiceBoostHousing = 0;
  const pa = (input.practiceAreaHint ?? "").toLowerCase();
  if (pa.includes("housing")) practiceBoostHousing = 1;
  else if (pa === "criminal" && criminal.score >= 2) practiceBoostCriminal = 1;

  const cScore = criminal.score + practiceBoostCriminal;
  const hScore = housing.score + practiceBoostHousing;
  const oScore = other.score;
  const nScore = nonLegal.score;

  const signals = [
    ...criminal.hits.map((h) => `criminal:${h}`),
    ...housing.hits.map((h) => `housing:${h}`),
    ...other.hits.map((h) => `other:${h}`),
    ...nonLegal.hits.map((h) => `nonlegal:${h}`),
  ].slice(0, 24);

  const strongC = cScore >= 3 && cScore >= hScore + 2 && cScore >= oScore + 2;
  const strongH = hScore >= 3 && hScore >= cScore + 2;
  const strongO = oScore >= 3 && oScore >= cScore + 2 && oScore >= hScore + 2;
  const strongN = nScore >= 2 && cScore === 0 && hScore === 0 && oScore === 0;
  const conflict = cScore >= 2 && hScore >= 2;
  const weak = Math.max(cScore, hScore, oScore, nScore) < 2;

  let domain: Domain = "UNKNOWN_REQUIRES_REVIEW";
  let confidence: "high" | "medium" | "low" = "low";

  if (conflict) {
    domain = "UNKNOWN_REQUIRES_REVIEW";
    confidence = "low";
    signals.push("rule:criminal_housing_conflict");
  } else if (strongH) {
    domain = "HOUSING";
    confidence = hScore >= 5 ? "high" : "medium";
  } else if (strongC) {
    domain = "CRIMINAL_DEFENCE";
    confidence = cScore >= 5 ? "high" : "medium";
  } else if (strongO) {
    domain = "OTHER_LEGAL";
    confidence = oScore >= 5 ? "high" : "medium";
  } else if (strongN) {
    domain = "NON_LEGAL";
    confidence = "medium";
  } else if (weak) {
    domain = "UNKNOWN_REQUIRES_REVIEW";
    confidence = "low";
    signals.push("rule:weak_signal");
  } else if (cScore > hScore && cScore > oScore && cScore >= 2) {
    // Medium criminal — still prefer UNKNOWN if housing present at all
    if (hScore >= 1) {
      domain = "UNKNOWN_REQUIRES_REVIEW";
      signals.push("rule:housing_present_blocks_criminal");
    } else {
      domain = "CRIMINAL_DEFENCE";
      confidence = "medium";
    }
  } else if (hScore > cScore && hScore >= 2) {
    domain = "HOUSING";
    confidence = "medium";
  } else if (oScore >= 2 && oScore >= cScore && oScore >= hScore) {
    domain = "OTHER_LEGAL";
    confidence = "medium";
  } else {
    domain = "UNKNOWN_REQUIRES_REVIEW";
    signals.push("rule:ambiguous");
  }

  return {
    domain,
    criminalScore: cScore,
    housingScore: hScore,
    otherLegalScore: oScore,
    nonLegalScore: nScore,
    confidence,
    signals,
    sourcesUsed: input.sourcesUsed,
    sampleChars: blob.length,
    titleHint: input.titleHint ?? null,
    practiceAreaHint: input.practiceAreaHint ?? null,
  };
}

async function samplePdfText(filePath: string): Promise<string> {
  try {
    const buf = readFileSync(filePath);
    // Prefer cheap latin1 scrape of first bytes for speed; fall back to pdf-parse briefly.
    const cheap = buf.subarray(0, Math.min(buf.length, 400_000)).toString("latin1");
    const streamText = (cheap.match(/\((?:\\.|[^\\)]){4,}\)/g) || [])
      .map((s) => s.slice(1, -1))
      .join(" ")
      .replace(/\\[nrt]/g, " ")
      .slice(0, TEXT_SAMPLE_CHARS);
    if (streamText.length >= 400) return streamText;

    const pdfParse = (await import("pdf-parse")).default as (
      b: Buffer,
      opts?: { max?: number },
    ) => Promise<{ text?: string }>;
    const parsed = await pdfParse(buf, { max: PDF_PARSE_MAX_PAGES });
    return String(parsed.text ?? "").slice(0, TEXT_SAMPLE_CHARS);
  } catch {
    return "";
  }
}

async function main(): Promise<void> {
  loadEnv();
  mkdirSync(OUT, { recursive: true });

  const globalSummaryPath = path.join(OUT, "global-corpus-summary.json");
  const globalPdfsPath = path.join(OUT, "global-corpus-unique-pdfs.ndjson");
  const globalBundlesPath = path.join(OUT, "global-corpus-bundles.ndjson");
  if (!existsSync(globalSummaryPath) || !existsSync(globalPdfsPath) || !existsSync(globalBundlesPath)) {
    throw new Error(
      "Missing global corpus artefacts. Run build-global-corpus-manifest-readonly.ts first.",
    );
  }

  const globalSummary = JSON.parse(readFileSync(globalSummaryPath, "utf8")) as {
    totals: Record<string, number>;
  };

  type GlobalPdf = {
    sha256: string;
    sizeBytes: number | null;
    pageCount: number | null;
    sources: Array<{
      kind: "local" | "cloud" | "git";
      path?: string;
      documentId?: string;
      caseId?: string | null;
      orgId?: string | null;
    }>;
    locations: Array<"local" | "cloud" | "git">;
  };
  type GlobalBundle = {
    bundleKey: string;
    backendCaseId: string | null;
    organisationId: string | null;
    title: string | null;
    uniquePdfHashes: string[];
    syntheticOrTemplateLikely: boolean;
    extractionAvailability: string;
    truthKeyAvailability: string;
    documentIds: string[];
    localPaths: string[];
    cloudStoragePaths: string[];
    duplicateOfBundleKey?: string | null;
  };

  const globalPdfs = readNdjson<GlobalPdf>(globalPdfsPath);
  const globalBundles = readNdjson<GlobalBundle>(globalBundlesPath);

  const pdfClassPath = path.join(OUT, "domain-classification-pdfs.ndjson");
  const classified = new Map<string, PdfClass>();
  if (RESUME && existsSync(pdfClassPath)) {
    for (const row of readNdjson<PdfClass>(pdfClassPath)) {
      if (row.sha256) classified.set(row.sha256, row);
    }
    console.log(`resume: ${classified.size} pdfs already classified`);
  } else {
    writeFileSync(pdfClassPath, "", "utf8");
  }

  // Optional cloud metadata (title / practice_area / extracted_text) — best effort.
  const caseMeta = new Map<
    string,
    { title: string | null; practice_area: string | null }
  >();
  const docText = new Map<string, string>();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && service) {
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    try {
      for (const orgId of [LEGACY_ORG, LEGACY_ORG_2]) {
        let from = 0;
        for (;;) {
          const { data, error } = await admin
            .from("cases")
            .select("id, title, practice_area")
            .eq("org_id", orgId)
            .range(from, from + 999);
          if (error) throw error;
          for (const c of data ?? []) {
            caseMeta.set(c.id, { title: c.title, practice_area: c.practice_area });
          }
          if (!data || data.length < 1000) break;
          from += 1000;
        }
      }
      console.log(`case meta loaded: ${caseMeta.size}`);
    } catch (e) {
      console.warn(`case meta unavailable: ${(e as Error).message}`);
    }
    try {
      for (const orgId of [LEGACY_ORG, LEGACY_ORG_2]) {
        let from = 0;
        for (;;) {
          const { data, error } = await admin
            .from("documents")
            .select("id, extracted_text, raw_text, full_text_extracted")
            .eq("org_id", orgId)
            .range(from, from + 199);
          if (error) throw error;
          for (const d of data ?? []) {
            const t =
              (typeof d.raw_text === "string" && d.raw_text) ||
              (typeof d.extracted_text === "string" && d.extracted_text) ||
              (typeof d.full_text_extracted === "string" && d.full_text_extracted) ||
              "";
            if (t && t.length > 40) docText.set(d.id, t.slice(0, TEXT_SAMPLE_CHARS));
          }
          if (!data || data.length < 200) break;
          from += 200;
        }
      }
      console.log(`document text rows: ${docText.size}`);
    } catch (e) {
      console.warn(`document text unavailable: ${(e as Error).message}`);
    }
  }

  // Local path index by hash from physical discovery
  const localByHash = new Map<string, string[]>();
  for (const row of readNdjson<{ absolutePath: string; sha256: string }>(
    path.join(OUT, "pdf-discovery-physical.ndjson"),
  )) {
    if (!localByHash.has(row.sha256)) localByHash.set(row.sha256, []);
    localByHash.get(row.sha256)!.push(row.absolutePath);
  }

  const pending = globalPdfs.filter((p) => !classified.has(p.sha256));
  console.log(`pdfs to classify: ${pending.length} / ${globalPdfs.length}`);

  let i = 0;
  const queue = [...pending];
  const workers = Array.from({ length: LOCAL_EXTRACT_CONCURRENCY }, async () => {
    while (queue.length) {
      const pdf = queue.shift();
      if (!pdf) break;
      i += 1;

      const sourcesUsed: string[] = [];
      let text = "";
      let titleHint: string | null = null;
      let practiceAreaHint: string | null = null;

      for (const s of pdf.sources) {
        if (s.caseId && caseMeta.has(s.caseId)) {
          const m = caseMeta.get(s.caseId)!;
          titleHint = titleHint ?? m.title;
          practiceAreaHint = practiceAreaHint ?? m.practice_area;
          sourcesUsed.push("case_metadata");
        }
        if (s.documentId && docText.has(s.documentId) && text.length < 200) {
          text = docText.get(s.documentId)!;
          sourcesUsed.push("cloud_extracted_text");
        }
      }

      // Local bundle-text near a path if available
      if (text.length < 200) {
        for (const p of localByHash.get(pdf.sha256) ?? []) {
          const idx = p.toLowerCase().lastIndexOf(`${path.sep}cases${path.sep}`);
          if (idx >= 0) {
            const end = p.indexOf(path.sep, idx + (`${path.sep}cases${path.sep}`).length);
            const caseDir = end > 0 ? p.slice(0, end) : null;
            if (caseDir) {
              const bt = path.join(caseDir, "bundle-text.md");
              if (existsSync(bt)) {
                text = readFileSync(bt, "utf8").slice(0, TEXT_SAMPLE_CHARS);
                sourcesUsed.push("local_bundle_text");
                break;
              }
            }
          }
        }
      }

      if (text.length < 200) {
        const localPath = (localByHash.get(pdf.sha256) ?? [])[0];
        if (localPath && existsSync(localPath)) {
          text = await samplePdfText(localPath);
          if (text) sourcesUsed.push("local_pdf_sample");
        }
      }

      // Title from filename path segments only as weak hint (never sole classifier)
      if (!titleHint) {
        const anyPath =
          pdf.sources.find((s) => s.path)?.path ??
          (localByHash.get(pdf.sha256) ?? [])[0] ??
          null;
        if (anyPath) titleHint = path.basename(anyPath);
      }

      const scored = classifyText({
        text,
        titleHint,
        practiceAreaHint,
        sourcesUsed: [...new Set(sourcesUsed)],
      });
      const row: PdfClass = {
        sha256: pdf.sha256,
        ...scored,
        classifiedAt: new Date().toISOString(),
      };
      classified.set(pdf.sha256, row);
      appendFileSync(pdfClassPath, `${JSON.stringify(row)}\n`);

      if (i % 100 === 0 || i === pending.length) {
        console.log(`classify progress ${i}/${pending.length}`);
      }
    }
  });
  await Promise.all(workers);

  // Rewrite canonical pdf classification file
  writeFileSync(
    pdfClassPath,
    [...classified.values()].map((r) => JSON.stringify(r)).join("\n") + "\n",
  );

  // Bundle classification
  const bundleRows: BundleClass[] = [];
  for (const b of globalBundles) {
    const domains: Record<Domain, number> = {
      CRIMINAL_DEFENCE: 0,
      HOUSING: 0,
      OTHER_LEGAL: 0,
      NON_LEGAL: 0,
      UNKNOWN_REQUIRES_REVIEW: 0,
    };
    let cMax = 0;
    let hMax = 0;
    for (const h of b.uniquePdfHashes) {
      const c = classified.get(h);
      if (!c) {
        domains.UNKNOWN_REQUIRES_REVIEW += 1;
        continue;
      }
      domains[c.domain] += 1;
      cMax = Math.max(cMax, c.criminalScore);
      hMax = Math.max(hMax, c.housingScore);
    }
    const total = b.uniquePdfHashes.length || 1;
    const criminalN = domains.CRIMINAL_DEFENCE;
    const housingN = domains.HOUSING;
    const otherN = domains.OTHER_LEGAL;
    const nonN = domains.NON_LEGAL;
    const unkN = domains.UNKNOWN_REQUIRES_REVIEW;

    let domain: Domain = "UNKNOWN_REQUIRES_REVIEW";
    let reason = "default_unknown";

    // Never mark CRIMINAL if strong housing signal without criminal signal
    if (hMax >= 3 && cMax < 2) {
      domain = "HOUSING";
      reason = "strong_housing_without_criminal";
    } else if (housingN > 0 && criminalN === 0 && housingN >= Math.ceil(total / 2)) {
      domain = "HOUSING";
      reason = "majority_housing_pdfs";
    } else if (criminalN > 0 && housingN > 0) {
      domain = "UNKNOWN_REQUIRES_REVIEW";
      reason = "mixed_criminal_housing";
    } else if (criminalN >= Math.ceil(total * 0.6) && cMax >= 3 && housingN === 0) {
      domain = "CRIMINAL_DEFENCE";
      reason = "majority_strong_criminal";
    } else if (criminalN === total && cMax >= 2 && housingN === 0) {
      domain = "CRIMINAL_DEFENCE";
      reason = "all_pdfs_criminal";
    } else if (otherN >= Math.ceil(total * 0.6) && criminalN === 0 && housingN === 0) {
      domain = "OTHER_LEGAL";
      reason = "majority_other_legal";
    } else if (nonN === total) {
      domain = "NON_LEGAL";
      reason = "all_non_legal";
    } else if (unkN === total) {
      domain = "UNKNOWN_REQUIRES_REVIEW";
      reason = "all_unknown";
    } else {
      domain = "UNKNOWN_REQUIRES_REVIEW";
      reason = "mixed_or_weak";
    }

    const physicallyAccessible =
      (b.localPaths?.length ?? 0) > 0 || (b.cloudStoragePaths?.length ?? 0) > 0;
    const sourceAuditEligible =
      physicallyAccessible &&
      b.uniquePdfHashes.length > 0 &&
      (Boolean(b.backendCaseId) ||
        b.truthKeyAvailability === "local_truth_key_possible" ||
        b.extractionAvailability === "local_bundle_text" ||
        b.extractionAvailability === "cloud_extracted_text_possible");

    bundleRows.push({
      bundleKey: b.bundleKey,
      domain,
      backendCaseId: b.backendCaseId,
      title: b.title,
      uniquePdfHashes: b.uniquePdfHashes,
      pdfDomains: domains,
      criminalScoreMax: cMax,
      housingScoreMax: hMax,
      sourceAuditEligible,
      syntheticOrTemplateLikely: b.syntheticOrTemplateLikely,
      physicallyAccessible,
      reason,
    });
  }

  writeFileSync(
    path.join(OUT, "domain-classification-bundles.ndjson"),
    bundleRows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );

  const countBy = <T extends string>(rows: { domain: T }[]) => {
    const out: Record<string, number> = {};
    for (const r of rows) out[r.domain] = (out[r.domain] ?? 0) + 1;
    return out;
  };

  const pdfDomainCounts = countBy([...classified.values()]);
  const bundleDomainCounts = countBy(bundleRows);

  const criminalBundles = bundleRows.filter((b) => b.domain === "CRIMINAL_DEFENCE");
  const criminalEligible = criminalBundles.filter(
    (b) => b.sourceAuditEligible && b.physicallyAccessible && !b.syntheticOrTemplateLikely,
  );
  // Deduplicate criminal bundles that share identical hash sets
  const seenHashSets = new Map<string, string>();
  const uniqueCriminalBundles: BundleClass[] = [];
  for (const b of criminalBundles) {
    const key = [...b.uniquePdfHashes].sort().join(",");
    if (!key) continue;
    if (seenHashSets.has(key)) continue;
    seenHashSets.set(key, b.bundleKey);
    uniqueCriminalBundles.push(b);
  }
  const uniqueCriminalEligible = uniqueCriminalBundles.filter(
    (b) => b.sourceAuditEligible && b.physicallyAccessible,
  );

  const criminalManifest = {
    programme: "criminal-physical-corpus-manifest",
    mode: "READ_ONLY_CLASSIFICATION",
    recordedAt: new Date().toISOString(),
    note: "Only CRIMINAL_DEFENCE bundles should feed Master criminal assurance. Housing/other/unknown excluded.",
    globalCorpusTotalsPreserved: globalSummary.totals,
    domainPdfCounts: pdfDomainCounts,
    domainBundleCounts: bundleDomainCounts,
    duplicateOverlap: {
      pdfsClassified: classified.size,
      bundlesClassified: bundleRows.length,
      criminalBundlesBeforeHashSetDedupe: criminalBundles.length,
      uniqueCriminalBundlesByContentHashSet: uniqueCriminalBundles.length,
      uniqueCriminalSourceAuditEligible: uniqueCriminalEligible.length,
    },
    finalUniqueCriminalCaseBundleCount: uniqueCriminalBundles.length,
    finalUniqueCriminalSourceAuditEligibleCount: uniqueCriminalEligible.length,
    criminalBundleKeys: uniqueCriminalBundles.map((b) => b.bundleKey),
    criminalEligibleBundleKeys: uniqueCriminalEligible.map((b) => b.bundleKey),
  };
  writeFileSync(path.join(OUT, "criminal-corpus-manifest.json"), JSON.stringify(criminalManifest, null, 2));
  writeFileSync(
    path.join(OUT, "criminal-corpus-bundles.ndjson"),
    uniqueCriminalBundles.map((b) => JSON.stringify(b)).join("\n") + "\n",
  );
  writeFileSync(
    path.join(OUT, "criminal-corpus-eligible-bundles.ndjson"),
    uniqueCriminalEligible.map((b) => JSON.stringify(b)).join("\n") + "\n",
  );

  const summary = {
    programme: "legal-domain-classification",
    mode: "READ_ONLY",
    recordedAt: new Date().toISOString(),
    pdfs: {
      total: classified.size,
      byDomain: pdfDomainCounts,
    },
    bundles: {
      total: bundleRows.length,
      byDomain: bundleDomainCounts,
      criminalUniqueByHashSet: uniqueCriminalBundles.length,
      criminalSourceAuditEligibleUnique: uniqueCriminalEligible.length,
      housingExcluded: bundleDomainCounts.HOUSING ?? 0,
      otherLegalExcluded: bundleDomainCounts.OTHER_LEGAL ?? 0,
      nonLegalExcluded: bundleDomainCounts.NON_LEGAL ?? 0,
      unknownExcluded: bundleDomainCounts.UNKNOWN_REQUIRES_REVIEW ?? 0,
    },
    globalCorpusTotalsPreserved: globalSummary.totals,
    finalUniqueCriminalCaseBundleCount: uniqueCriminalBundles.length,
    assuranceNotRun: true,
  };
  writeFileSync(path.join(OUT, "domain-classification-summary.json"), JSON.stringify(summary, null, 2));

  const md = `# Legal domain classification (READ-ONLY)

Generated: ${summary.recordedAt}

## Per-PDF domains

| Domain | Unique PDFs |
|--------|------------:|
| CRIMINAL_DEFENCE | ${pdfDomainCounts.CRIMINAL_DEFENCE ?? 0} |
| HOUSING | ${pdfDomainCounts.HOUSING ?? 0} |
| OTHER_LEGAL | ${pdfDomainCounts.OTHER_LEGAL ?? 0} |
| NON_LEGAL | ${pdfDomainCounts.NON_LEGAL ?? 0} |
| UNKNOWN_REQUIRES_REVIEW | ${pdfDomainCounts.UNKNOWN_REQUIRES_REVIEW ?? 0} |
| **Total** | **${classified.size}** |

## Per-bundle domains

| Domain | Bundles |
|--------|--------:|
| CRIMINAL_DEFENCE | ${bundleDomainCounts.CRIMINAL_DEFENCE ?? 0} |
| HOUSING | ${bundleDomainCounts.HOUSING ?? 0} |
| OTHER_LEGAL | ${bundleDomainCounts.OTHER_LEGAL ?? 0} |
| NON_LEGAL | ${bundleDomainCounts.NON_LEGAL ?? 0} |
| UNKNOWN_REQUIRES_REVIEW | ${bundleDomainCounts.UNKNOWN_REQUIRES_REVIEW ?? 0} |

## Criminal assurance feed (deduped)

| Metric | Count |
|--------|------:|
| Criminal bundles (raw) | ${criminalBundles.length} |
| **Unique criminal case/bundle count (hash-set deduped)** | **${uniqueCriminalBundles.length}** |
| Unique criminal + source-audit-eligible | ${uniqueCriminalEligible.length} |

## Global corpus (preserved)

| Metric | Count |
|--------|------:|
| Local PDF copies | ${globalSummary.totals.totalLocalPdfCopies ?? ""} |
| Unique local PDFs | ${globalSummary.totals.uniqueLocalPdfs ?? ""} |
| Cloud PDF objects | ${globalSummary.totals.totalCloudPdfObjects ?? ""} |
| Unique cloud PDFs | ${globalSummary.totals.uniqueCloudPdfs ?? ""} |
| Local∩cloud hashes | ${globalSummary.totals.localCloudDuplicateHashes ?? ""} |
| Cloud-only | ${globalSummary.totals.genuinelyNewCloudOnlyPdfs ?? ""} |
| Global unique PDFs | ${globalSummary.totals.totalGloballyUniquePdfs ?? ""} |
| Global unique bundles | ${globalSummary.totals.totalGloballyUniqueCaseBundleGroups ?? ""} |
| Synthetic-likely bundles | ${globalSummary.totals.syntheticOrTemplateDerivedBundles ?? ""} |
| Inaccessible cloud | ${globalSummary.totals.inaccessibleOrMissingCloudObjects ?? ""} |

## Notes
- Classification uses content samples + case metadata; filename alone is never decisive.
- Ambiguous / mixed housing+criminal → UNKNOWN_REQUIRES_REVIEW (excluded from criminal assurance).
- Master assurance was NOT run by this script.
`;
  writeFileSync(path.join(OUT, "DOMAIN-CLASSIFICATION-REPORT.md"), md);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
