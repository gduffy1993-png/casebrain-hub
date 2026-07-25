/**
 * run-v9 evidence pack — internal-language full-surface scan + prior v8 acceptance.
 * Not programme PASS. Does not mutate runs v1–v8.
 *
 *   npx tsx scripts/integrity-programme/scale3000-run-v9-evidence-pack.ts
 */
import fs from "node:fs";
import path from "node:path";
import { containsAbsoluteProofWording } from "@/lib/criminal/absolute-proof-wording";
import {
  containsSolicitorForbiddenInternalLanguage,
  GENERAL_SUPPLIED_PAPERS_PROVENANCE,
} from "@/lib/criminal/solicitor-charge-model";
import {
  violatesDrinkDriveCopyInvariant,
} from "@/lib/criminal/solicitor-family-provenance";
import { missingCompatibleEvidenceDisclosure } from "@/lib/criminal/solicitor-partial-view-disclosure";

const ROOT = path.resolve(__dirname, "../..");
const BASE = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/scale3000-solicitor-materialisation",
);
const RUN = "run-v9";
const PREV = "run-v8";

type StringEntry = { textHash: string; text: string; count: number };
type SurfaceRow = {
  caseId: string;
  surfaceId: string;
  text: string;
  textHash: string;
  canCopy: boolean;
  canExport?: boolean;
  apiUsable?: boolean;
  gateStatus?: string;
};
type Identity = { caseId: string; sourceCaseId?: string; allegation?: string; family?: string };

function loadStrings(run: string): Map<string, StringEntry> {
  const p = path.join(BASE, run, "string-index.json");
  if (!fs.existsSync(p)) return new Map();
  const raw = JSON.parse(fs.readFileSync(p, "utf8")) as
    | Record<string, { text: string; count: number }>
    | { strings: StringEntry[] }
    | StringEntry[];
  if (Array.isArray(raw)) return new Map(raw.map((s) => [s.textHash, s]));
  if (raw && typeof raw === "object" && Array.isArray((raw as { strings?: StringEntry[] }).strings)) {
    return new Map((raw as { strings: StringEntry[] }).strings.map((s) => [s.textHash, s]));
  }
  const map = new Map<string, StringEntry>();
  for (const [textHash, v] of Object.entries(raw as Record<string, { text: string; count: number }>)) {
    map.set(textHash, { textHash, text: v.text, count: v.count });
  }
  return map;
}

function* surfaces(run: string): Generator<SurfaceRow> {
  const p = path.join(BASE, run, "surfaces.jsonl");
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    yield JSON.parse(line) as SurfaceRow;
  }
}

function loadIdentities(run: string): Map<string, Identity> {
  const p = path.join(BASE, run, "identity-manifest.jsonl");
  const map = new Map<string, Identity>();
  if (!fs.existsSync(p)) return map;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as Identity;
    map.set(row.caseId, row);
  }
  return map;
}

function allegationForCase(
  caseId: string,
  ids: Map<string, Identity>,
  sourceContextByCase: Map<string, string>,
): string {
  const id = ids.get(caseId);
  if (id?.sourceCaseId === "demo-audit-18-motoring-sjp-thin") {
    return "Fail to provide driver details, contrary to section 172(2)";
  }
  if (id?.sourceCaseId === "demo-audit-19-motoring-breath-specimen") {
    return "Fail to provide a specimen of breath for analysis";
  }
  const ctx = sourceContextByCase.get(caseId) ?? "";
  const fromCtx = ctx.match(/^Allegation:\s*(.+)$/im)?.[1]?.trim();
  if (fromCtx) return fromCtx;
  return id?.allegation ?? id?.family ?? "";
}

function main() {
  const ids = loadIdentities(RUN);
  const sourceContextByCase = new Map<string, string>();
  for (const s of surfaces(RUN)) {
    if (s.surfaceId === "source_context") sourceContextByCase.set(s.caseId, s.text);
  }
  const prev = loadStrings(PREV);
  const cur = loadStrings(RUN);
  const added: string[] = [];
  const removed: string[] = [];
  for (const h of cur.keys()) if (!prev.has(h)) added.push(h);
  for (const h of prev.keys()) if (!cur.has(h)) removed.push(h);

  const chargeStates = { verified: 0, discrepancy: 0, unresolved: 0, other: 0 };
  const provenanceQuality = { exact_document_page: 0, general_supplied_papers: 0 };
  const correctedMatters: string[] = [];
  const stillBlockedMatters: string[] = [];
  const quarantineMatters: string[] = [];
  let quarantineSurfaceCount = 0;
  let copyableAbsolute = 0;
  let copyableDrinkLeak = 0;
  let incompleteDisclosureLeaks = 0;
  let internalAuditPhraseHits = 0;
  let silentChargeRewrite = 0;
  let detachedChargeWarning = 0;
  let wrongFamilyCopyable = 0;
  let internalLanguageHitsAllSurfaces = 0;
  let internalLanguageHitsCopyable = 0;
  const internalLanguageExamples: Array<{ caseId: string; surfaceId: string; canCopy: boolean; preview: string }> =
    [];

  const matrixSurfaces = [
    "case_header",
    "case_header_charge_copy",
    "source_context",
    "truth_map",
    "overview_counts",
    "chase_brief",
    "cps_chase_draft",
    "copy_preview",
    "export_preview",
    "api_consumer_preview",
    "client_summary",
    "court_line",
  ] as const;
  const matrix: Record<
    string,
    {
      total: number;
      copyable: number;
      drinkLeaks: number;
      absoluteProof: number;
      incompleteDisclosure: number;
      internalLanguage: number;
      internalAuditPhrase: number;
    }
  > = {};
  for (const sid of matrixSurfaces) {
    matrix[sid] = {
      total: 0,
      copyable: 0,
      drinkLeaks: 0,
      absoluteProof: 0,
      incompleteDisclosure: 0,
      internalLanguage: 0,
      internalAuditPhrase: 0,
    };
  }

  const s172Ids = new Set(
    [...ids.values()].filter((i) => i.sourceCaseId === "demo-audit-18-motoring-sjp-thin").map((i) => i.caseId),
  );

  for (const s of surfaces(RUN)) {
    const exitUsable = s.canCopy || s.canExport === true || s.apiUsable === true;
    const hasInternal = containsSolicitorForbiddenInternalLanguage(s.text);
    if (hasInternal) {
      internalLanguageHitsAllSurfaces += 1;
      if (exitUsable) internalLanguageHitsCopyable += 1;
      if (internalLanguageExamples.length < 20) {
        internalLanguageExamples.push({
          caseId: s.caseId,
          surfaceId: s.surfaceId,
          canCopy: s.canCopy,
          preview: s.text.slice(0, 200),
        });
      }
    }
    if (/blocked\s*≠\s*repaired|Blocked ≠ repaired/i.test(s.text)) {
      internalAuditPhraseHits += 1;
    }

    if (s.surfaceId in matrix) {
      const m = matrix[s.surfaceId]!;
      m.total += 1;
      if (hasInternal) m.internalLanguage += 1;
      if (/blocked\s*≠\s*repaired/i.test(s.text)) m.internalAuditPhrase += 1;
      if (s.canCopy) {
        m.copyable += 1;
        if (containsAbsoluteProofWording(s.text)) {
          m.absoluteProof += 1;
          copyableAbsolute += 1;
        }
        const id = ids.get(s.caseId);
        const alg = allegationForCase(s.caseId, ids, sourceContextByCase);
        if (
          violatesDrinkDriveCopyInvariant({
            allegation: alg,
            auditFamily: id?.family ?? id?.sourceCaseId,
            text: s.text,
            canCopy: true,
          })
        ) {
          m.drinkLeaks += 1;
          copyableDrinkLeak += 1;
        }
      }
    }

    if (s.surfaceId === "evidence_family_quarantine" && !/^\(no quarantined/i.test(s.text)) {
      quarantineSurfaceCount += 1;
      quarantineMatters.push(s.caseId);
    }

    if (
      (s.surfaceId === "overview_counts" || s.surfaceId === "truth_map") &&
      s.canCopy &&
      /Reconciliation:|quarantined/i.test(s.text) === false &&
      s172Ids.has(s.caseId) &&
      /Missing 0|Total \d+/i.test(s.text)
    ) {
      incompleteDisclosureLeaks += 1;
      matrix[s.surfaceId]!.incompleteDisclosure += 1;
    }

    if (s.surfaceId === "case_header" || s.surfaceId === "case_header_charge_copy") {
      if (s.text.includes(GENERAL_SUPPLIED_PAPERS_PROVENANCE)) {
        provenanceQuality.general_supplied_papers += 1;
      } else if (/Source:\s*.+\b(p\.?\s*\d+|page\s+\d+|MG\d+|document ID)\b/i.test(s.text)) {
        provenanceQuality.exact_document_page += 1;
      } else if (/Source:/i.test(s.text)) {
        provenanceQuality.general_supplied_papers += 1;
      }
    }

    if (s.surfaceId === "case_header") {
      const status = (s.gateStatus || "").toLowerCase();
      if (status === "verified") chargeStates.verified += 1;
      else if (status === "discrepancy") chargeStates.discrepancy += 1;
      else if (status === "unresolved") chargeStates.unresolved += 1;
      else chargeStates.other += 1;

      if (
        /Charge wording requires solicitor verification/i.test(s.text) &&
        !/Charge recorded on the papers:/i.test(s.text)
      ) {
        silentChargeRewrite += 1;
        stillBlockedMatters.push(s.caseId);
      } else if (/Possible citation discrepancy:|Charge recorded on the papers:/i.test(s.text) || /^Charge:/m.test(s.text)) {
        correctedMatters.push(s.caseId);
      }
    }

    if (
      s.surfaceId === "case_header_charge_copy" &&
      s.canCopy &&
      /Fraud by false representation contrary to section 1|section 4\(2\)\(b\)/i.test(s.text) &&
      !/Citation discrepancy|Possible citation discrepancy|Charge recorded on the papers/i.test(s.text)
    ) {
      detachedChargeWarning += 1;
    }

    if (
      s.canCopy &&
      s172Ids.has(s.caseId) &&
      (s.surfaceId === "truth_map" || s.surfaceId === "chase_brief" || s.surfaceId === "copy_preview") &&
      (/intoxilyser|breath[-\s/]?device|calibration certificate/i.test(s.text) ||
        (s.surfaceId === "chase_brief" && /CCTV|medical|expert/i.test(s.text) && !/excluded|quarantined/i.test(s.text)))
    ) {
      wrongFamilyCopyable += 1;
    }
  }

  // Provenance counted per charge surface — report unique matters approx via half (header+copy)
  const provenanceTotals = {
    exactDocumentPageSurfaces: provenanceQuality.exact_document_page,
    generalSuppliedPapersSurfaces: provenanceQuality.general_supplied_papers,
    note: "Counted on case_header + case_header_charge_copy surfaces (typically 2× matters).",
  };

  const changedTexts = [
    ...added.map((h) => ({
      disposition: "added" as const,
      textHash: h,
      preview: (cur.get(h)?.text ?? "").slice(0, 240),
      count: cur.get(h)?.count ?? 0,
    })),
    ...removed.map((h) => ({
      disposition: "removed" as const,
      textHash: h,
      preview: (prev.get(h)?.text ?? "").slice(0, 240),
      count: prev.get(h)?.count ?? 0,
    })),
  ];

  const priorV8Acceptance = {
    recordedChargeVisibleEveryMatter: chargeStates.verified + chargeStates.discrepancy + chargeStates.unresolved === 3000,
    zeroSilentChargeRewriting: silentChargeRewrite === 0,
    zeroDetachedDiscrepancyWarning: detachedChargeWarning === 0,
    zeroUnqualifiedPartialEvidenceTotals: incompleteDisclosureLeaks === 0,
    zeroWrongFamilyCopyable: wrongFamilyCopyable === 0,
    zeroCopyableAbsoluteProof: copyableAbsolute === 0,
    zeroInternalAuditPhraseOnSolicitorSurfaces: internalAuditPhraseHits === 0,
    zeroDrinkDeviceCopyOnNonDrink: copyableDrinkLeak === 0,
  };

  const acceptance = {
    ...priorV8Acceptance,
    zeroInternalLanguageAllVisibleSurfaces: internalLanguageHitsAllSurfaces === 0,
    zeroInternalLanguageCopyableExits: internalLanguageHitsCopyable === 0,
    scannerCoversNonCopyableSurfaces: true,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    programmePassSupported: false,
    note: "run-v9 audit materialisation — safe provenance; full-surface internal-language scan. Not programme PASS.",
    run: RUN,
    comparedTo: PREV,
    stringDelta: {
      previousExactUnique: prev.size,
      currentExactUnique: cur.size,
      added: added.length,
      removed: removed.length,
      changed: added.length + removed.length,
      changedTexts,
    },
    chargeStateTotals: chargeStates,
    provenanceQualityTotals: provenanceTotals,
    quarantineTotals: {
      mattersWithQuarantineReviewSurface: new Set(quarantineMatters).size,
      quarantineReviewSurfaces: quarantineSurfaceCount,
      demoAudit18Identities: s172Ids.size,
    },
    correctedAndStillBlocked: {
      chargePresentationCorrectedUniqueMatters: new Set(correctedMatters).size,
      stillBlockedGenericChargeUniqueMatters: new Set(stillBlockedMatters).size,
      stillBlockedMatterIdsSample: [...new Set(stillBlockedMatters)].slice(0, 40),
    },
    internalLanguageScan: {
      allVisibleSurfaceHits: internalLanguageHitsAllSurfaces,
      copyableExitHits: internalLanguageHitsCopyable,
      examples: internalLanguageExamples,
      expectedAll: 0,
      expectedCopyable: 0,
    },
    allExitAcceptanceMatrix: matrix,
    priorRunV8AcceptanceResults: priorV8Acceptance,
    acceptanceContracts: acceptance,
    counters: {
      copyableAbsolute,
      copyableDrinkLeak,
      incompleteDisclosureLeaks,
      internalAuditPhraseHits,
      silentChargeRewrite,
      detachedChargeWarning,
      wrongFamilyCopyable,
      internalLanguageHitsAllSurfaces,
      internalLanguageHitsCopyable,
    },
  };

  const out = path.join(BASE, RUN, "run-v9-evidence-pack.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: true,
        out,
        stringDelta: {
          added: added.length,
          removed: removed.length,
          changed: added.length + removed.length,
        },
        chargeStateTotals: chargeStates,
        provenanceQualityTotals: provenanceTotals,
        internalLanguageScan: report.internalLanguageScan,
        acceptance,
      },
      null,
      2,
    ),
  );
}

main();
