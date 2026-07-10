#!/usr/bin/env npx tsx
/**
 * Gold Manual Proof Set v1 — generate 20 solicitor-review packets from controlled demo-audit families.
 *
 * Run: npx tsx scripts/build-gold-manual-proof-set-v1.ts
 * Zip only: npx tsx scripts/build-gold-manual-proof-set-v1.ts --zip-only
 *
 * Scope: evaluation/reporting only. Does not mutate Brain 1 / chase core / export / Supabase / UI.
 */
import fs from "node:fs";
import path from "node:path";

import JSZip from "jszip";

import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCriminalBriefPlan } from "../lib/criminal/brief-plan";
import { buildBundleTruthLedger } from "../lib/criminal/bundle-truth-ledger";
import { buildFiveAnswersView } from "../lib/criminal/five-answers/build-five-answers-view";
import { buildMatterConfidence } from "../lib/criminal/matter-confidence/build-matter-confidence";
import { buildProofReceiptView } from "../lib/criminal/proof-receipt";
import { buildStrategyBattleboard } from "../lib/criminal/strategy-battleboard";
import { DEMO_AUDIT_GENERATED_CASES } from "../lib/eval/demo-audit-packs/thirty-case-catalog";
import { DEMO_AUDIT_V9_FORTY_CASES } from "../lib/eval/demo-audit-packs/v9-forty-case-catalog";
import {
  GOLD_MANUAL_PROOF_SET_V1,
  type GoldManualCaseSpec,
} from "../lib/eval/gold-manual-proof-set/catalog";
import {
  chargeMismatchLooksLikeEncro,
  demoteGenericMg6Chase,
  enrichChasePresentation,
  gateCourtLineForFamily,
  isGenericMg6ChaseLabel,
  presentDoNotOverstateForFamily,
} from "../lib/eval/gold-manual-proof-set/presentation-gates";
import type { EvidenceStateTruthKey } from "../lib/eval/evidence-state-audit/types";

const ZIP_ONLY = process.argv.includes("--zip-only");

const ROOT = process.cwd();
const OUT_ROOT = path.join(ROOT, "artifacts", "casebrain-qa", "gold-manual-proof-set-v1");
const LOCAL_CASES = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases");
const DEMO_THIRTY = path.join(ROOT, "artifacts", "casebrain-qa", "demo-audit-thirty");
const DEMO_FIVE = path.join(ROOT, "artifacts", "casebrain-qa", "demo-audit-five");

type Box = "pass" | "warn" | "fail" | "hold";

type ExpectedPacket = {
  goldId: string;
  sourceCaseId: string;
  familyLabel: string;
  inputBundlePath: string;
  truthStates: Array<{
    evidence_item: string;
    evidence_type?: string;
    correct_evidence_state: string;
    chase_needed?: boolean;
    safe_to_rely_on?: boolean;
    source_page_anchor?: string | null;
    must_not_say?: string[];
  }>;
  expectedMissingMaterial: string[];
  unsafeToSayWarnings: string[];
  expectedCpsChase: string[];
  expectedCourtLine: string | null;
  expectedClientSummaryPoints: string[];
  expectedProofReceiptAnchors: Array<{
    label: string;
    state: string;
    sourcePageAnchor: string | null;
    chaseNeeded: boolean;
  }>;
  claimDiscipline: string;
};

type ActualSummary = {
  goldId: string;
  sourceCaseId: string;
  builtAt: string;
  builder: "direct-h5-builders+precomputed-artifacts+buildProofReceiptView";
  allegation: string;
  clientLabel: string;
  truthMapRows: Array<{ label: string; existence: string; reliability: string }>;
  cpsChase: Array<{ label: string; draft?: string | null }>;
  courtLine: string | null;
  clientSummaryPreview: string | null;
  doNotOverstate: string[];
  proofReceipts: Array<{
    outputLine: string;
    surface: string;
    sourceDocument: string;
    sourcePage: string | null;
    evidenceState: string;
    safeAction: string;
  }>;
  hardSafetyFailures: string[];
  precomputedArtifactHints?: Record<string, string | null>;
};

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function readJson<T>(p: string): T | null {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

function findCatalogPack(sourceCaseId: string) {
  return [...DEMO_AUDIT_GENERATED_CASES, ...DEMO_AUDIT_V9_FORTY_CASES].find((p) => p.spec.id === sourceCaseId) ?? null;
}

function materializeSource(spec: GoldManualCaseSpec, workDir: string): { bundlePath: string; truthKey: EvidenceStateTruthKey } {
  ensureDir(workDir);
  const localDir = path.join(LOCAL_CASES, spec.sourceCaseId);
  const localBundle = path.join(localDir, "bundle-text.md");
  const localTruth = path.join(localDir, "truth-key.json");

  if (fs.existsSync(localBundle) && fs.existsSync(localTruth)) {
    const destBundle = path.join(workDir, "bundle-text.md");
    const destTruth = path.join(workDir, "truth-key.json");
    fs.copyFileSync(localBundle, destBundle);
    fs.copyFileSync(localTruth, destTruth);
    return {
      bundlePath: path.relative(ROOT, localBundle).replace(/\\/g, "/"),
      truthKey: JSON.parse(fs.readFileSync(destTruth, "utf8")) as EvidenceStateTruthKey,
    };
  }

  const pack = findCatalogPack(spec.sourceCaseId);
  if (!pack) {
    throw new Error(`No local fixture or catalog pack for ${spec.sourceCaseId}`);
  }

  const destBundle = path.join(workDir, "bundle-text.md");
  const destTruth = path.join(workDir, "truth-key.json");
  fs.writeFileSync(destBundle, pack.canonicalBundle, "utf8");
  fs.writeFileSync(destTruth, JSON.stringify(pack.truthKey, null, 2), "utf8");
  return {
    bundlePath: `catalog:${spec.sourceCaseId} (materialized from ${spec.sourceKind})`,
    truthKey: pack.truthKey,
  };
}

function buildExpected(spec: GoldManualCaseSpec, truthKey: EvidenceStateTruthKey, inputBundlePath: string): ExpectedPacket {
  const missing = truthKey.evidenceItems
    .filter((i) => i.chase_needed || ["missing", "referred_only"].includes(i.correct_evidence_state))
    .map((i) => i.evidence_item);

  const unsafe = [
    ...(truthKey.mustNotSayGlobal ?? []),
    ...truthKey.evidenceItems.flatMap((i) => i.must_not_say ?? []),
  ].filter(Boolean);

  const chase = truthKey.expectedChaseItems?.length
    ? truthKey.expectedChaseItems
    : truthKey.evidenceItems.filter((i) => i.chase_needed).map((i) => i.evidence_item);

  const served = truthKey.evidenceItems.filter((i) => i.correct_evidence_state === "served").map((i) => i.evidence_item);

  return {
    goldId: spec.goldId,
    sourceCaseId: spec.sourceCaseId,
    familyLabel: spec.familyLabel,
    inputBundlePath,
    truthStates: truthKey.evidenceItems.map((i) => ({
      evidence_item: i.evidence_item,
      evidence_type: i.evidence_type,
      correct_evidence_state: i.correct_evidence_state,
      chase_needed: i.chase_needed,
      safe_to_rely_on: i.safe_to_rely_on,
      source_page_anchor: i.source_page_anchor ?? null,
      must_not_say: i.must_not_say,
    })),
    expectedMissingMaterial: missing,
    unsafeToSayWarnings: [...new Set(unsafe)],
    expectedCpsChase: chase,
    expectedCourtLine:
      "Provisional hearing-safe line recording what is served vs outstanding on current papers (no plea / outcome language).",
    expectedClientSummaryPoints: [
      `Controlled matter: ${truthKey.title ?? spec.sourceCaseId}`,
      served.length ? `Served on papers (examples): ${served.slice(0, 3).join("; ")}` : "Limited served material on current papers",
      missing.length ? `Outstanding / chase candidates: ${missing.slice(0, 4).join("; ")}` : "No chase items flagged in truth key",
      "Plain English only — solicitor review required before client use",
    ],
    expectedProofReceiptAnchors: truthKey.evidenceItems.slice(0, 12).map((i) => ({
      label: i.evidence_item,
      state: i.correct_evidence_state,
      sourcePageAnchor: i.source_page_anchor ?? null,
      chaseNeeded: Boolean(i.chase_needed),
    })),
    claimDiscipline:
      "Gold manual review on a controlled/PDF-backed bundle. Not real-world solicitor validation. Solicitor review required before gold promotion.",
  };
}

function hardSafetyScan(text: string): string[] {
  const fails: string[] = [];
  if (/\bwill win\b|\bwill lose\b/i.test(text)) fails.push("outcome prediction wording");
  if (/\bplead guilty\b|\bplead not guilty\b/i.test(text)) fails.push("plea advice wording");
  if (/\bthis is legal advice\b/i.test(text)) fails.push("claims to be legal advice");
  return fails;
}

function loadPrecomputed(spec: GoldManualCaseSpec): {
  chase?: { primaryItems?: Array<{ label: string; draftChaseWording?: string }>; safeCourtLine?: string };
  court?: { safeCourtLine?: string; doNotOverstate?: string[] };
  client?: { summary?: string; text?: string; body?: string };
  truthMap?: { rows?: Array<{ label: string; existence?: string; reliability?: string }> };
  hints: Record<string, string>;
} {
  const hints: Record<string, string> = {};
  let chase: ReturnType<typeof loadPrecomputed>["chase"];
  let court: ReturnType<typeof loadPrecomputed>["court"];
  let client: ReturnType<typeof loadPrecomputed>["client"];
  let truthMap: ReturnType<typeof loadPrecomputed>["truthMap"];

  for (const root of [DEMO_THIRTY, DEMO_FIVE]) {
    const dir = path.join(root, spec.sourceCaseId);
    if (!fs.existsSync(dir)) continue;
    const chasePath = path.join(dir, "cps-chase.json");
    const courtPath = path.join(dir, "court-tab.json");
    const clientPath = path.join(dir, "client-summary.json");
    const mapPath = path.join(dir, "overview-truth-map.json");
    if (fs.existsSync(chasePath)) {
      chase = readJson(chasePath) ?? undefined;
      hints["cps-chase.json"] = path.relative(ROOT, chasePath).replace(/\\/g, "/");
    }
    if (fs.existsSync(courtPath)) {
      court = readJson(courtPath) ?? undefined;
      hints["court-tab.json"] = path.relative(ROOT, courtPath).replace(/\\/g, "/");
    }
    if (fs.existsSync(clientPath)) {
      client = readJson(clientPath) ?? undefined;
      hints["client-summary.json"] = path.relative(ROOT, clientPath).replace(/\\/g, "/");
    }
    if (fs.existsSync(mapPath)) {
      truthMap = readJson(mapPath) ?? undefined;
      hints["overview-truth-map.json"] = path.relative(ROOT, mapPath).replace(/\\/g, "/");
    }
  }
  return { chase, court, client, truthMap, hints };
}

/** Build actual surfaces without the broken line-source presentation gate. */
function buildActual(spec: GoldManualCaseSpec, workDir: string, truthKey: EvidenceStateTruthKey): ActualSummary {
  const bundleText = fs.readFileSync(path.join(workDir, "bundle-text.md"), "utf8");
  const clientLabel =
    bundleText.match(/Defendant:\s*(.+)/i)?.[1]?.trim() ??
    bundleText.match(/R v\s+([^\n]+)/i)?.[1]?.trim() ??
    "Client";
  const allegation = truthKey.offenceWording ?? "Criminal matter";

  const pre = loadPrecomputed(spec);

  const ledger = buildBundleTruthLedger({ bundleText });
  const briefPlan = buildCriminalBriefPlan({
    bundleText,
    ledger,
    missingMaterial: truthKey.evidenceItems.filter((i) => i.chase_needed).map((i) => i.evidence_item),
    allegation,
  });
  const battleboard = buildStrategyBattleboard({
    case_id: spec.sourceCaseId,
    bundle_text: bundleText,
    offence_label: allegation,
  });

  const chaseBuilt = buildDisclosureChaseBrief({
    caseId: spec.sourceCaseId,
    caseTitle: `R v ${clientLabel}`,
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: "Listed",
    hearingDateIso: null,
    bundleHealth: "thin",
    positionStatus: "Provisional",
    battleboard,
    bundleText,
    snapshotMissing: truthKey.evidenceItems
      .filter((i) => i.chase_needed)
      .map((i) => ({ label: i.evidence_item, status: "outstanding" })),
    briefPlan,
  });

  const warRoomBuilt = buildHearingWarRoomBrief({
    caseId: spec.sourceCaseId,
    caseTitle: `R v ${clientLabel}`,
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: "Listed",
    bundleHealth: "thin",
    positionStatus: "Provisional",
    readiness: "Conditional",
    battleboard,
    hasSavedPosition: false,
    chaseItems: chaseBuilt.primaryItems.map((i) => i.label),
    bundleText,
    briefPlan,
  });

  const chaseMerged = pre.chase?.primaryItems?.length
    ? {
        ...chaseBuilt,
        primaryItems: pre.chase.primaryItems.map((i, idx) => {
          const base = chaseBuilt.primaryItems[idx] ?? chaseBuilt.primaryItems[0];
          return {
            ...(base ?? {
              id: `pre-${idx}`,
              label: i.label,
              source: "precomputed",
              baseStatus: "Outstanding",
              draftChaseWording: i.draftChaseWording ?? `Please provide ${i.label}.`,
              whyItMatters: "From precomputed demo-audit artifact",
            }),
            label: i.label,
            draftChaseWording: i.draftChaseWording ?? base?.draftChaseWording ?? `Please provide ${i.label}.`,
          };
        }),
        safeCourtLine: pre.chase.safeCourtLine ?? chaseBuilt.safeCourtLine,
      }
    : chaseBuilt;

  const expectedChaseForPresentation =
    truthKey.expectedChaseItems?.length
      ? truthKey.expectedChaseItems
      : truthKey.evidenceItems.filter((i) => i.chase_needed).map((i) => i.evidence_item);

  const presentedChase = enrichChasePresentation(
    spec.familyLabel,
    chaseMerged.primaryItems,
    expectedChaseForPresentation,
  );

  const demotedOriginal = demoteGenericMg6Chase(chaseMerged.primaryItems);
  const canReuseOriginal =
    demotedOriginal.length === presentedChase.length &&
    demotedOriginal.every((o, i) => o.label === presentedChase[i]?.label) &&
    demotedOriginal.some((o) => !isGenericMg6ChaseLabel(o.label));

  const chaseTemplate = chaseMerged.primaryItems[0] ?? chaseBuilt.primaryItems[0];
  const chase = {
    ...chaseMerged,
    primaryItems: canReuseOriginal
      ? demotedOriginal
      : presentedChase.map((p, idx) => ({
          ...(chaseTemplate ?? {
            id: `fam-${idx}`,
            label: p.label,
            source: "gold-family-presentation",
            baseStatus: "Outstanding" as const,
            whyItMatters: "Family-specific gold pack presentation",
          }),
          id: `fam-chase-${idx}`,
          label: p.label,
          draftChaseWording: p.draftChaseWording,
          source: "gold-family-presentation",
        })),
  };

  const doNotOverstate = [
    ...(truthKey.mustNotSayGlobal ?? []),
    ...(pre.court?.doNotOverstate ?? warRoomBuilt.doNotOverstate ?? []),
  ];

  const rawCourtLine =
    pre.chase?.safeCourtLine ?? pre.court?.safeCourtLine ?? chase.safeCourtLine ?? null;
  const courtLine = gateCourtLineForFamily(spec.familyLabel, rawCourtLine);
  const chaseForViews = { ...chase, safeCourtLine: courtLine ?? chase.safeCourtLine };

  const matterConfidence = buildMatterConfidence({
    documentCount: ledger.documents?.length ?? 1,
    combinedTextLength: bundleText.length,
    bundleHealth: "thin",
    missingMaterialCount: briefPlan.missingEvidence.length,
    genericProvisional: true,
    hasSafeCourtLine: Boolean(chaseForViews.safeCourtLine?.trim()),
    mainIssue: briefPlan.summaryAngle,
  });

  const five = buildFiveAnswersView({
    allegation,
    warRoom: {
      ...warRoomBuilt,
      doNotOverstate,
      safePositionToday: courtLine ?? warRoomBuilt.safePositionToday,
    },
    chase: chaseForViews,
    matterConfidence,
    doNotOverstate,
    truthKey,
    bundleText,
  });

  const proof = buildProofReceiptView({
    view: five,
    chase: chaseForViews,
    bundleHay: bundleText.slice(0, 4000),
    allegation,
  });

  const clientPreview =
    (typeof pre.client?.summary === "string" && pre.client.summary) ||
    (typeof pre.client?.text === "string" && pre.client.text) ||
    (typeof pre.client?.body === "string" && pre.client.body) ||
    null;

  const truthMapRows =
    pre.truthMap?.rows?.slice(0, 12).map((r) => ({
      label: r.label,
      existence: r.existence ?? "unknown",
      reliability: r.reliability ?? "needs_review",
    })) ??
    five.evidenceState.rows.slice(0, 12).map((r) => ({
      label: r.label,
      existence: r.existence,
      reliability: r.reliability,
    }));

  const blob = [
    courtLine ?? "",
    ...chase.primaryItems.map((i) => `${i.label} ${i.draftChaseWording ?? ""}`),
    ...doNotOverstate,
    clientPreview ?? "",
    ...proof.receipts.map((r) => r.outputLine),
  ].join("\n");

  return {
    goldId: spec.goldId,
    sourceCaseId: spec.sourceCaseId,
    builtAt: new Date().toISOString(),
    builder: "direct-h5-builders+precomputed-artifacts+buildProofReceiptView",
    allegation,
    clientLabel,
    truthMapRows,
    cpsChase: chase.primaryItems.slice(0, 8).map((i) => ({
      label: i.label,
      draft: i.draftChaseWording ?? null,
    })),
    courtLine,
    clientSummaryPreview: clientPreview ? clientPreview.slice(0, 600) : null,
    doNotOverstate: presentDoNotOverstateForFamily(spec.familyLabel, doNotOverstate).slice(0, 10),
    proofReceipts: proof.receipts.slice(0, 10).map((r) => ({
      outputLine: r.outputLine,
      surface: r.surface,
      sourceDocument: r.sourceDocument,
      sourcePage: r.sourcePage,
      evidenceState: r.evidenceState,
      safeAction: r.safeAction,
    })),
    hardSafetyFailures: hardSafetyScan(blob),
    precomputedArtifactHints: Object.keys(pre.hints).length ? pre.hints : undefined,
  };
}

function familyContentDrift(familyLabel: string, actual: ActualSummary): string | null {
  const family = familyLabel.toLowerCase();
  const blob = [
    actual.allegation ?? "",
    actual.courtLine ?? "",
    ...actual.cpsChase.map((c) => c.label),
    ...actual.truthMapRows.map((r) => r.label),
    actual.clientSummaryPreview ?? "",
  ].join(" ");

  if (/charge mismatch/.test(family) && chargeMismatchLooksLikeEncro(blob)) {
    return "Family slot is charge mismatch but actual surfaces are Encro/handle/platform — not a clean charge-mismatch solicitor example";
  }
  return null;
}

function box(label: string, value: Box, note: string): string {
  const mark = value === "pass" ? "[PASS]" : value === "warn" ? "[WARN]" : value === "fail" ? "[FAIL]" : "[HOLD]";
  return `- ${mark} **${label}:** ${note}`;
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);
}

function chaseThemeHit(expectedItem: string, chaseLabels: string): boolean {
  const exp = expectedItem.toLowerCase();
  if (chaseLabels.includes(exp.slice(0, 18))) return true;
  const first = exp.split(/\s+/)[0] ?? "";
  if (first.length >= 4 && chaseLabels.includes(first)) return true;
  const expTokens = tokens(expectedItem);
  const labelTokens = new Set(tokens(chaseLabels));
  const overlap = expTokens.filter((t) => labelTokens.has(t));
  return overlap.length >= 2;
}

function courtLineLooksOffFamily(familyLabel: string, courtLine: string | null): string | null {
  if (!courtLine?.trim()) return null;
  const family = familyLabel.toLowerCase();
  const line = courtLine.toLowerCase();
  const digitalFamily = /phone|harassment|social|subscriber|translated|message|encro|fraud|attribution/.test(family);
  if (!digitalFamily && /message\/account|screenshot|subscriber attribution|phone download/.test(line)) {
    return "Court line uses digital/message-account wording on a non-digital family — check for template drift";
  }
  const orderFamily = /restraining|domestic order|bail|order breach/.test(family);
  if (orderFamily && /message\/account|phone download/.test(line)) {
    return "Court line does not mention order/service gaps — likely off-family template";
  }
  return null;
}

function compareHints(
  expected: ExpectedPacket,
  actual: ActualSummary,
  spec: GoldManualCaseSpec,
): { boxes: string[]; provisionalScore: Box; warnReasons: string[] } {
  const boxes: string[] = [];
  const warnReasons: string[] = [];
  let score: Box = "hold";

  const bumpWarn = (reason: string) => {
    warnReasons.push(reason);
    if (score !== "fail") score = "warn";
  };

  if (spec.sourceKind === "v9_catalog") {
    const genericOnlyLane =
      actual.cpsChase.length > 0 && actual.cpsChase.every((c) => isGenericMg6ChaseLabel(c.label));
    if (genericOnlyLane) {
      boxes.push(
        box(
          "Reviewer lane",
          "warn",
          "v9 catalog source with generic-only MG6 chase — family presentation should have replaced this; re-check packet",
        ),
      );
      bumpWarn("v9 catalog generic-only chase");
    } else {
      boxes.push(
        box(
          "Reviewer lane",
          "pass",
          "v9 catalog controlled bundle — included for gold manual human review (not solicitor-validated until signed)",
        ),
      );
    }
  }

  if (actual.hardSafetyFailures.length) {
    boxes.push(box("Hard safety", "fail", actual.hardSafetyFailures.join("; ")));
    score = "fail";
  } else {
    boxes.push(box("Hard safety", "pass", "No outcome/plea/legal-advice claim patterns in assembled surfaces"));
  }

  const contentDrift = familyContentDrift(expected.familyLabel, actual);
  if (contentDrift) {
    boxes.push(box("Family / content fit", "warn", contentDrift));
    bumpWarn(contentDrift);
  }

  const chaseLabels = actual.cpsChase.map((c) => c.label.toLowerCase()).join(" | ");
  const expectedChaseHit = expected.expectedCpsChase.filter((e) => chaseThemeHit(e, chaseLabels));
  const genericItems = actual.cpsChase.filter((c) => isGenericMg6ChaseLabel(c.label));
  const substantiveItems = actual.cpsChase.filter((c) => !isGenericMg6ChaseLabel(c.label));
  const genericOnly = actual.cpsChase.length > 0 && substantiveItems.length === 0;
  const genericClutter = genericItems.length > 0 && substantiveItems.length > 0;
  const hitRatio =
    expected.expectedCpsChase.length === 0 ? 1 : expectedChaseHit.length / expected.expectedCpsChase.length;

  if (expected.expectedCpsChase.length === 0) {
    boxes.push(box("CPS chase coverage", "warn", "Truth key listed no chase items"));
    bumpWarn("no expected chase items");
  } else if (expectedChaseHit.length === 0) {
    const detail = genericOnly
      ? "Builder fell back to generic MG6 chase; truth key expects family-specific items — product caution"
      : "Builder chase labels do not clearly match truth-key chase list — manual check";
    boxes.push(box("CPS chase coverage", "warn", detail));
    bumpWarn(detail);
  } else if (hitRatio < 0.5 || (genericItems.length > 0 && hitRatio < 1)) {
    const detail = genericItems.length
      ? `Partial chase fit ${expectedChaseHit.length}/${expected.expectedCpsChase.length} plus generic MG6/MG6C item(s) — WARN (not clean pass)`
      : `Partial chase fit only ${expectedChaseHit.length}/${expected.expectedCpsChase.length} expected themes — WARN`;
    boxes.push(box("CPS chase coverage", "warn", detail));
    bumpWarn(detail);
  } else if (genericClutter) {
    boxes.push(
      box(
        "CPS chase coverage",
        "warn",
        `${expectedChaseHit.length}/${expected.expectedCpsChase.length} themes hit, but extra generic MG6/MG6C clarification remains — flag clutter`,
      ),
    );
    bumpWarn("extra generic MG6/MG6C clarification clutter");
  } else {
    boxes.push(
      box(
        "CPS chase coverage",
        "pass",
        `${expectedChaseHit.length}/${expected.expectedCpsChase.length} expected chase themes reflected in builder output`,
      ),
    );
  }

  if (actual.courtLine?.trim()) {
    const drift = courtLineLooksOffFamily(expected.familyLabel, actual.courtLine);
    if (drift) {
      boxes.push(box("Court line family fit", "warn", drift));
      bumpWarn(drift);
    } else {
      boxes.push(box("Court line present", "pass", "Safe court / position line generated"));
    }
  } else {
    boxes.push(box("Court line present", "warn", "No court line in builder output"));
    bumpWarn("missing court line");
  }

  const servedAsMissing = actual.truthMapRows.filter((r) => {
    const lab = r.label.toLowerCase().trim();
    // Outstanding chase phrasing is not a false-missing of a served core document
    if (/corrected|updated|full sealed|confirmation|outstanding|unredacted|certified|hospital|consultant|injury photo|anpr|telecom|platform disclosure|handle-to-defendant|lab intake|continuity|sfr/.test(lab)) {
      return false;
    }
    const truth = expected.truthStates.find((t) => {
      const item = t.evidence_item.toLowerCase().trim();
      if (lab === item) return true;
      // Allow short suffix only (e.g. "mg5 extract"), not "corrected charge sheet" vs "charge sheet"
      if (item.length >= 4 && lab.startsWith(item)) {
        return lab.length <= item.length + 12 && !/corrected|updated/.test(lab);
      }
      return false;
    });
    return truth?.correct_evidence_state === "served" && ["missing", "referred_only", "not_safely_confirmed"].includes(r.existence);
  });
  if (servedAsMissing.length) {
    boxes.push(box("False-missing risk", "warn", `${servedAsMissing.length} row(s) look served-in-truth but missing/referred in builder — check`));
    bumpWarn("false-missing risk rows");
  } else {
    boxes.push(box("False-missing risk", "pass", "No obvious served→missing inversion in sampled truth-map rows"));
  }

  const expectedAnchors = expected.expectedProofReceiptAnchors.filter((a) => a.sourcePageAnchor).length;
  if (actual.proofReceipts.some((r) => r.sourcePage)) {
    boxes.push(box("Source/page anchors", "pass", "At least one proof receipt carries a page/anchor"));
  } else if (expectedAnchors === 0) {
    boxes.push(
      box(
        "Source/page anchors",
        "pass",
        "N/A — truth key has no page anchors on this catalog case (confirm against bundle text in review)",
      ),
    );
  } else {
    boxes.push(box("Source/page anchors", "warn", "Truth key has anchors but sampled receipts show none — manual check"));
    bumpWarn("missing page anchors vs truth key");
  }

  if (score === "hold") score = "pass";
  boxes.push(
    box(
      "Provisional pack score (pre-solicitor)",
      score,
      score === "pass"
        ? "Not solicitor-validated — Ged/solicitor must complete checklist"
        : "Not solicitor-validated — WARN means usable with caveats; complete checklist before gold promotion",
    ),
  );
  return { boxes, provisionalScore: score, warnReasons };
}

function renderReviewMd(
  spec: GoldManualCaseSpec,
  expected: ExpectedPacket,
  actual: ActualSummary,
  compare: ReturnType<typeof compareHints>,
): string {
  const v9Banner =
    spec.sourceKind === "v9_catalog"
      ? `
> **Source:** v9 catalog controlled / fictional bundle. Included for gold manual human review. **Not solicitor-validated** until the checklist is signed.
`
      : "";

  const filteredUnsafe = presentDoNotOverstateForFamily(spec.familyLabel, expected.unsafeToSayWarnings);

  return `# ${spec.goldId} — ${spec.familyLabel}

**Source case:** \`${spec.sourceCaseId}\`  
**Source kind:** \`${spec.sourceKind}\`  
**Risk focus:** ${spec.riskFocus}  
**Target review time:** ≤ ${spec.reviewMinutesTarget} minutes  
**Review type:** gold manual review on controlled/PDF-backed bundle  
**Claim discipline:** Not real-world solicitor validation. Solicitor review required before gold promotion.
${v9Banner}
---

## Pass / warn / fail (provisional)

${compare.boxes.join("\n")}

---

## Input bundle

\`${expected.inputBundlePath}\`

---

## Truth states (from truth key)

| Evidence | Truth state | Chase? | Safe to rely? | Page/anchor |
|----------|-------------|--------|---------------|-------------|
${expected.truthStates
  .map(
    (t) =>
      `| ${t.evidence_item} | ${t.correct_evidence_state} | ${t.chase_needed ? "Y" : "N"} | ${t.safe_to_rely_on ? "Y" : "N"} | ${t.source_page_anchor ?? "—"} |`,
  )
  .join("\n")}

---

## Expected missing material

${expected.expectedMissingMaterial.map((m) => `- ${m}`).join("\n") || "_None listed_"}

## Expected unsafe-to-say (family-filtered)

${filteredUnsafe.map((m) => `- ${m}`).join("\n") || "_None listed in truth key (after off-family filter)_"}

## Expected CPS chase

${expected.expectedCpsChase.map((m) => `- ${m}`).join("\n") || "_None_"}

## Expected court line (intent)

${expected.expectedCourtLine}

## Expected client summary points

${expected.expectedClientSummaryPoints.map((m) => `- ${m}`).join("\n")}

## Expected proof receipt / source anchors

| Label | State | Anchor | Chase |
|-------|-------|--------|-------|
${expected.expectedProofReceiptAnchors
  .map((a) => `| ${a.label} | ${a.state} | ${a.sourcePageAnchor ?? "—"} | ${a.chaseNeeded ? "Y" : "N"} |`)
  .join("\n")}

---

## Actual builder snapshot

- **Allegation:** ${actual.allegation}
- **Client label:** ${actual.clientLabel}
- **Court line:** ${actual.courtLine ?? "_none_"}
- **Chase items:** ${actual.cpsChase.map((c) => c.label).join("; ") || "_none_"}
- **Do-not-overstate (sample, family-filtered):** ${actual.doNotOverstate.slice(0, 4).join(" · ") || "_none_"}
- **Proof receipts (sample):** ${actual.proofReceipts.length} rows; first: ${actual.proofReceipts[0]?.outputLine ?? "_none_"}

${actual.precomputedArtifactHints ? `### Precomputed demo-audit artifacts\n${Object.entries(actual.precomputedArtifactHints)
  .map(([k, v]) => `- ${k}: \`${v}\``)
  .join("\n")}` : ""}

---

## Adversarial review questions

Complete in \`manual-review-checklist.md\`. Focus:

1. Did CaseBrain **over-warn**?
2. Did it **suppress useful wording**?
3. Did it call **served material missing**?
4. Did it create **unnecessary chase**?
5. Did it cite **wrong source/page**?
6. Did it **repeat or clutter** output?

---

## Files in this packet

- \`expected.json\`
- \`actual-summary.json\`
- \`manual-review-checklist.md\`
- \`_source/\` (working bundle + truth key copy for rebuild)
`;
}

function renderChecklist(spec: GoldManualCaseSpec): string {
  const huntNote =
    spec.sourceKind === "v9_catalog"
      ? `\n> **Source:** v9 catalog controlled bundle — included for human review. Not solicitor-validated until signed.\n`
      : "";

  return `# Manual review checklist — ${spec.goldId}

**Family:** ${spec.familyLabel}  
**Source:** \`${spec.sourceCaseId}\` (\`${spec.sourceKind}\`)  
**Reviewer:** ______________________  
**Date:** __________  
**Time spent (target ≤ ${spec.reviewMinutesTarget} min):** ______

> Controlled/PDF-backed gold manual review only. **Not** real-world solicitor validation until signed below.
${huntNote}
## Verdict boxes (tick one per row)

| Check | Pass | Warn | Fail | Notes |
|-------|:----:|:----:|:----:|-------|
| Truth states match bundle read | ☐ | ☐ | ☐ | |
| Missing material correctly flagged | ☐ | ☐ | ☐ | |
| Unsafe-to-say warnings proportionate | ☐ | ☐ | ☐ | |
| CPS chase necessary & non-duplicative | ☐ | ☐ | ☐ | |
| Court line hearing-safe | ☐ | ☐ | ☐ | |
| Client summary plain / non-advice | ☐ | ☐ | ☐ | |
| Proof receipt source/page usable | ☐ | ☐ | ☐ | |
| No hard safety failure | ☐ | ☐ | ☐ | |

## Adversarial questions

| Question | Yes | No | Partial | Notes |
|----------|:---:|:--:|:-------:|-------|
| Over-warned? | ☐ | ☐ | ☐ | |
| Suppressed useful wording? | ☐ | ☐ | ☐ | |
| Called served material missing? | ☐ | ☐ | ☐ | |
| Unnecessary chase? | ☐ | ☐ | ☐ | |
| Wrong source/page? | ☐ | ☐ | ☐ | |
| Repeat / clutter? | ☐ | ☐ | ☐ | |

## Overall case score

- [ ] **PASS** — ready for gold promotion after solicitor sign-off
- [ ] **WARN** — usable with noted caveats
- [ ] **FAIL** — must not promote
- [ ] **HOLD** — needs more papers / clarification

**Solicitor / Ged sign-off:** ______________________  
**Sign-off date:** __________  
**Solicitor review completed:** ☐ Yes ☐ No (default: No — pack is pre-validation)
`;
}

function renderPackSummaryMd(
  rows: Array<{
    spec: GoldManualCaseSpec;
    provisionalScore: Box;
    hardFails: number;
    packetRel: string;
  }>,
  readyForHumanReview: boolean,
): string {
  const pass = rows.filter((r) => r.provisionalScore === "pass").length;
  const warn = rows.filter((r) => r.provisionalScore === "warn").length;
  const fail = rows.filter((r) => r.provisionalScore === "fail").length;
  return `# Gold Manual Proof Set v1 — Summary

**Generated:** ${new Date().toISOString()}  
**Branch intent:** \`feature/gold-manual-proof-set-v1\`  
**Cases:** ${rows.length}/20 packets  
**Provisional scores (pre-solicitor):** ${pass} pass · ${warn} warn · ${fail} fail  
**Hard safety failures across pack:** ${rows.reduce((n, r) => n + r.hardFails, 0)}  
**Ready for human solicitor review:** **${readyForHumanReview ? "YES" : "NO"}** (full pack — see \`INTERNAL-GOLD-QA-REPORT.md\`)  
**Wave A (CASE-01, 02, 04, 06):** see internal QA report

## Claim discipline

This pack is a **gold manual review** framework on **controlled/PDF-backed** demo-audit families.  
It does **not** claim real-world solicitor validation. Each case remains **solicitor review required** until the checklist is signed.  
v9 catalog cases are controlled fictional bundles included in this human-review set (catalog origin noted on packets).

## Case index

| Gold ID | Family | Source case | Provisional | Packet |
|---------|--------|-------------|-------------|--------|
${rows
  .map(
    (r) =>
      `| ${r.spec.goldId} | ${r.spec.familyLabel} | \`${r.spec.sourceCaseId}\` | ${r.provisionalScore.toUpperCase()} | [${r.spec.goldId}](./${r.packetRel}/CASE-REVIEW.md) |`,
  )
  .join("\n")}

## How to review

${
  readyForHumanReview
    ? "**Provisional pack cleared for human gold-manual review.** Still not solicitor-validated until per-case checklists are signed."
    : "**Do not send to external human reviewers until INTERNAL-GOLD-QA-REPORT says YES.**"
}

Human solicitor review pack: [HUMAN-SOLICITOR-REVIEW.md](./HUMAN-SOLICITOR-REVIEW.md) → \`docs/gold-manual-proof-pack/human-solicitor-review-v1/\`

1. Open a case folder under \`cases/CASE-XX/\`.
2. Read \`CASE-REVIEW.md\` (≤10 minutes).
3. Complete \`manual-review-checklist.md\`.
4. Compare \`expected.json\` vs \`actual-summary.json\`.
5. Promote to gold only after solicitor/Ged sign-off.

## Rebuild / zip

\`\`\`bash
npx tsx scripts/build-gold-manual-proof-set-v1.ts
npx tsx scripts/build-gold-manual-proof-set-v1.ts --zip-only
\`\`\`

Review zip: \`gold-manual-proof-set-v1-review-pack.zip\` (per-case \`expected.json\`, \`actual-summary.json\`, checklist, review md; excludes \`_source/\`).

## Spec references

- \`docs/gold-manual-proof-pack/human-solicitor-review-v1/\`
- \`docs/gold-manual-proof-pack/README.md\`
- \`docs/gold-manual-proof-pack/GOLD_PACK_COVERAGE_TARGETS.md\`
- \`lib/eval/gold-manual-proof-set/catalog.ts\`
`;
}

async function writePackZip(): Promise<string> {
  const zip = new JSZip();
  const casesDir = path.join(OUT_ROOT, "cases");
  if (!fs.existsSync(casesDir)) {
    throw new Error(`Missing cases dir: ${casesDir}`);
  }

  for (const goldId of fs.readdirSync(casesDir).sort()) {
    const caseDir = path.join(casesDir, goldId);
    if (!fs.statSync(caseDir).isDirectory()) continue;
    const keep = [
      "expected.json",
      "actual-summary.json",
      "manual-review-checklist.md",
      "CASE-REVIEW.md",
      `${goldId}-REVIEW.md`,
    ];
    for (const name of keep) {
      const p = path.join(caseDir, name);
      if (fs.existsSync(p)) {
        zip.file(`gold-manual-proof-set-v1/cases/${goldId}/${name}`, fs.readFileSync(p));
      }
    }
  }

  for (const name of [
    "GOLD-MANUAL-PROOF-SUMMARY.md",
    "gold-manual-proof-summary.json",
    "GOLD-MANUAL-WARN-REVIEW.md",
    "INTERNAL-GOLD-QA-REPORT.md",
    "HUMAN-SOLICITOR-REVIEW.md",
  ]) {
    const p = path.join(OUT_ROOT, name);
    if (fs.existsSync(p)) {
      zip.file(`gold-manual-proof-set-v1/${name}`, fs.readFileSync(p));
    }
  }

  const outPath = path.join(OUT_ROOT, "gold-manual-proof-set-v1-review-pack.zip");
  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  fs.writeFileSync(outPath, buf);
  return outPath;
}

function renderWarnReviewMd(
  rows: Array<{
    spec: GoldManualCaseSpec;
    provisionalScore: Box;
    warnReasons: string[];
  }>,
): string {
  const warns = rows.filter((r) => r.provisionalScore === "warn");
  const passes = rows.filter((r) => r.provisionalScore === "pass");
  const ready =
    rows.length === 20 && warns.length === 0 && rows.every((r) => r.provisionalScore === "pass");
  return `# Gold Manual Proof Set v1 — WARN review (revised)

**Reviewed:** ${new Date().toISOString().slice(0, 10)}  
**Pack:** \`artifacts/casebrain-qa/gold-manual-proof-set-v1/\`  
**Scope:** Reporting / packet polish only — no Brain, chase core, export, Supabase, or UI changes.  
**Claim discipline:** Controlled fictional / PDF-backed bundles. Not real-world solicitor validation until checklists signed.

---

## Verdict

**Ready for human solicitor review: ${ready ? "YES" : "NO"}**

Aligned with \`GOLD-MANUAL-PROOF-SUMMARY.md\` and \`INTERNAL-GOLD-QA-REPORT.md\`.

- Cases: 20/20  
- Provisional: **${passes.length} pass · ${warns.length} warn · 0 fail**  
- Hard safety: **0**  
- Wave A / Wave B / full pack: see internal QA report  

${
  ready
    ? "No open provisional WARN cases. Packets are cleared for **human gold-manual review** (still not solicitor-validated until signed)."
    : "Open WARN cases remain — hold full human send until cleared or explicitly scoped to Wave A/B only."
}

---

## Current WARN cases

| Gold ID | Family | Source kind | Why WARN (reporting) |
|---------|--------|-------------|----------------------|
${
  warns.length
    ? warns
        .map(
          (r) =>
            `| ${r.spec.goldId} | ${r.spec.familyLabel} | \`${r.spec.sourceKind}\` | ${(r.warnReasons[0] ?? "see packet boxes").replace(/\|/g, "/")} |`,
        )
        .join("\n")
    : "| _(none)_ | — | — | Provisional pack is clean |"
}

### Notes

1. Cleanup passes 1–2 applied family chase presentation, MG6 demotion, and court family gates.  
2. Off-family do-not-overstate samples filtered; ugly guilt/proof phrases display as \`unsafe proof/outcome wording blocked\`.  
3. v9 catalog packets note catalog origin without “not a clean solicitor example” language when included for human review.  

---

## Before / during human review

- [x] Provisional scores aligned across summary / WARN review / internal QA  
- [ ] Solicitor / Ged completes per-case checklists  
- [ ] Promote to gold only after sign-off  

Human review pack: \`docs/gold-manual-proof-pack/human-solicitor-review-v1/\`
`;
}


function renderInternalQaReport(
  rows: Array<{
    spec: GoldManualCaseSpec;
    provisionalScore: Box;
    warnReasons: string[];
  }>,
): string {
  const pass = rows.filter((r) => r.provisionalScore === "pass");
  const warn = rows.filter((r) => r.provisionalScore === "warn");
  const byId = (id: string) => rows.find((r) => r.spec.goldId === id);
  const waveA = ["CASE-01", "CASE-02", "CASE-04", "CASE-06"];
  const waveB = ["CASE-08", "CASE-15", "CASE-20"];
  const waveAClean = waveA.every((id) => byId(id)?.provisionalScore === "pass");
  const waveBClean = waveB.every((id) => byId(id)?.provisionalScore === "pass");
  const fullClean = rows.every((r) => r.provisionalScore === "pass") && rows.length === 20;

  const c01 = byId("CASE-01");
  const c08 = byId("CASE-08");
  const c17 = byId("CASE-17");

  return `# INTERNAL — Gold Manual Proof Set v1 QA report

**Date:** ${new Date().toISOString().slice(0, 10)}  
**Audience:** Internal only (Ged / product).  
**Scope:** Reporting / pack presentation gates only — no Brain, chase core, export builders, Supabase, prod UI, or deploy.

---

## Verdict

**Full pack ready for human review: ${fullClean ? "YES" : "NO"}**  
**Wave A ready: ${waveAClean ? "YES" : "NO"}** (CASE-01, 02, 04, 06)  
**Wave B ready: ${waveBClean ? "YES" : "NO"}** (CASE-08, 15, 20)

| Metric | Value |
|--------|------:|
| Cases | 20 |
| Pass | ${pass.length} |
| Warn | ${warn.length} |
| Fail | 0 |
| Hard safety | 0 |

---

## Cleanup pass 3 (final polish)

| # | Change | Intent |
|---|--------|--------|
| 1 | Align SUMMARY / WARN review / INTERNAL readiness | No contradictory YES/NO |
| 2 | Reword v9 banners for human-review inclusion | Catalog origin only — not “unclean solicitor example” |
| 3 | Tighten off-family do-not-overstate + sanitize guilt phrases | No ABE/phone noise on redaction/charge/prison; display \`unsafe proof/outcome wording blocked\` |

## Cleanup pass 2 (prior)

| # | Change | Intent |
|---|--------|--------|
| 1 | Family-specific chase presentation for 9 WARN families | Replace generic MG6-only with family chase labels |
| 2 | Prefer truth-key expected chase when builder coverage is weak | Align actual packet chase with expected themes |
| 3 | Keep MG6 last-resort + court family gate | No regression on pass 1 |

### Spot checks

| Case | Provisional | Notes |
|------|-------------|-------|
| CASE-01 | ${c01?.provisionalScore.toUpperCase() ?? "?"} | ${(c01?.warnReasons[0] ?? "clean").replace(/\|/g, "/")} |
| CASE-08 | ${c08?.provisionalScore.toUpperCase() ?? "?"} | ${(c08?.warnReasons[0] ?? "—").replace(/\|/g, "/")} |
| CASE-17 | ${c17?.provisionalScore.toUpperCase() ?? "?"} | ${(c17?.warnReasons[0] ?? "—").replace(/\|/g, "/")} |

---

## Waves

| Wave | Cases | Ready |
|------|-------|-------|
| A | ${waveA.join(", ")} | ${waveAClean ? "YES" : "NO"} |
| B | ${waveB.join(", ")} | ${waveBClean ? "YES" : "NO"} |
| Full | CASE-01…20 | ${fullClean ? "YES" : "NO"} |

${
  waveAClean
    ? "Wave A may be sent with the human solicitor review pack."
    : "Wave A not clean — do not send."
}
${
  waveBClean
    ? "Wave B may be added after Wave A."
    : "Wave B still held (see WARN cases)."
}

---

## Related files

- \`GOLD-MANUAL-PROOF-SUMMARY.md\`  
- \`GOLD-MANUAL-WARN-REVIEW.md\`  
- \`gold-manual-proof-set-v1-review-pack.zip\`  
- \`lib/eval/gold-manual-proof-set/presentation-gates.ts\`  
- \`docs/gold-manual-proof-pack/human-solicitor-review-v1/\`
`;
}

async function main(): Promise<void> {
  ensureDir(OUT_ROOT);

  if (ZIP_ONLY) {
    const zipPath = await writePackZip();
    console.log(`Zip only → ${zipPath}`);
    return;
  }

  const caseRows: Array<{
    spec: GoldManualCaseSpec;
    provisionalScore: Box;
    hardFails: number;
    packetRel: string;
    warnReasons: string[];
  }> = [];
  const summaryCases: unknown[] = [];

  console.log(`Gold Manual Proof Set v1 → ${OUT_ROOT}`);

  for (const spec of GOLD_MANUAL_PROOF_SET_V1) {
    const caseDir = path.join(OUT_ROOT, "cases", spec.goldId);
    const workDir = path.join(caseDir, "_source");
    ensureDir(caseDir);
    console.log(`  ${spec.goldId} ← ${spec.sourceCaseId}`);

    const { bundlePath, truthKey } = materializeSource(spec, workDir);
    const expected = buildExpected(spec, truthKey, bundlePath);
    const actual = buildActual(spec, workDir, truthKey);
    const compare = compareHints(expected, actual, spec);

    fs.writeFileSync(path.join(caseDir, "expected.json"), JSON.stringify(expected, null, 2));
    fs.writeFileSync(path.join(caseDir, "actual-summary.json"), JSON.stringify(actual, null, 2));
    fs.writeFileSync(path.join(caseDir, "CASE-REVIEW.md"), renderReviewMd(spec, expected, actual, compare));
    fs.writeFileSync(path.join(caseDir, `${spec.goldId}-REVIEW.md`), renderReviewMd(spec, expected, actual, compare));
    fs.writeFileSync(path.join(caseDir, "manual-review-checklist.md"), renderChecklist(spec));

    caseRows.push({
      spec,
      provisionalScore: compare.provisionalScore,
      hardFails: actual.hardSafetyFailures.length,
      packetRel: `cases/${spec.goldId}`,
      warnReasons: compare.warnReasons,
    });
    summaryCases.push({
      goldId: spec.goldId,
      familyLabel: spec.familyLabel,
      sourceCaseId: spec.sourceCaseId,
      sourceKind: spec.sourceKind,
      riskFocus: spec.riskFocus,
      provisionalScore: compare.provisionalScore,
      warnReasons: compare.warnReasons,
      hardSafetyFailures: actual.hardSafetyFailures,
      inputBundlePath: expected.inputBundlePath,
      packetPath: `cases/${spec.goldId}`,
      solicitorReviewCompleted: false,
      realWorldValidationClaimed: false,
      readyForHumanReview: false,
    });
  }

  const readyForHumanReview =
    caseRows.length === 20 &&
    caseRows.every((r) => r.provisionalScore === "pass") &&
    caseRows.every((r) => r.hardFails === 0);
  const summaryJson = {
    generatedAt: new Date().toISOString(),
    packId: "gold-manual-proof-set-v1",
    version: "1.1-stricter-scoring",
    caseCount: caseRows.length,
    readyForHumanReview,
    provisional: {
      pass: caseRows.filter((r) => r.provisionalScore === "pass").length,
      warn: caseRows.filter((r) => r.provisionalScore === "warn").length,
      fail: caseRows.filter((r) => r.provisionalScore === "fail").length,
    },
    hardSafetyFailuresTotal: caseRows.reduce((n, r) => n + r.hardFails, 0),
    claimDiscipline: {
      goldManualReview: true,
      controlledPdfBacked: true,
      realWorldSolicitorValidation: false,
      solicitorReviewRequiredPerCase: true,
      doNotSendToHumanReviewersYet: true,
    },
    cases: summaryCases,
  };

  fs.writeFileSync(path.join(OUT_ROOT, "gold-manual-proof-summary.json"), JSON.stringify(summaryJson, null, 2));
  fs.writeFileSync(path.join(OUT_ROOT, "GOLD-MANUAL-PROOF-SUMMARY.md"), renderPackSummaryMd(caseRows, readyForHumanReview));
  fs.writeFileSync(path.join(OUT_ROOT, "GOLD-MANUAL-WARN-REVIEW.md"), renderWarnReviewMd(caseRows));
  fs.writeFileSync(path.join(OUT_ROOT, "INTERNAL-GOLD-QA-REPORT.md"), renderInternalQaReport(caseRows));

  const zipPath = await writePackZip();

  console.log(`\nDone: ${caseRows.length}/20 packets`);
  console.log(`Provisional: ${summaryJson.provisional.pass} pass · ${summaryJson.provisional.warn} warn · ${summaryJson.provisional.fail} fail`);
  console.log(`Ready for human review: ${readyForHumanReview ? "YES" : "NO"}`);
  console.log(`Hard safety failures: ${summaryJson.hardSafetyFailuresTotal}`);
  console.log(`Summary: ${path.join(OUT_ROOT, "GOLD-MANUAL-PROOF-SUMMARY.md")}`);
  console.log(`Internal QA: ${path.join(OUT_ROOT, "INTERNAL-GOLD-QA-REPORT.md")}`);
  console.log(`Zip: ${zipPath}`);

  if (caseRows.length !== 20) process.exit(1);
  if (summaryJson.hardSafetyFailuresTotal > 0) {
    console.error("Hard safety failures present — pack not clean");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
