/**
 * Bundle Truth Ledger — single source-truth builder for criminal bundles.
 */

import {
  buildMetadataScan,
  extractBundleCaseMetadata,
  formatOffenceDisplayFromBundle,
  parseUkHearingDateTime,
} from "@/lib/criminal/extract-bundle-case-metadata";
import type { BattleboardOutput, BattleboardRoute } from "@/lib/criminal/strategy-battleboard";
import {
  buildForbiddenClaimsForMaterials,
  estimateOcrConfidence,
  normaliseBundleMaterials,
  repairGluedMg6StatusText,
} from "@/lib/criminal/bundle-material-normalizer";
import type {
  BuildBundleTruthLedgerInput,
  BundleOffenceFamily,
  BundleTruthLedger,
  BundleTruthOffenceFamily,
  DocumentPriority,
  MaterialStatus,
  NormalisedMaterialRow,
  SourceAnchor,
  TruthConfidence,
} from "@/lib/criminal/bundle-truth-types";
import type { ProofMapOffenceLens } from "@/lib/eval/casebrain-auditor/proof-map-types";

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const VIOLENCE_FAMILIES: BundleOffenceFamily[] = [
  "murder",
  "manslaughter",
  "gbh_s18",
  "gbh_s20_abh",
  "provisional_violence",
];

/** Preserve court time as written in source (HH:MM). */
export function extractLiteralHearingTime(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const match = t.match(/\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i);
  if (!match) return null;
  return `${match[1]!.padStart(2, "0")}:${match[2]!}`;
}

function sliceWindow(text: string, centerRe: RegExp, before: number, after: number): string {
  const m = centerRe.exec(text);
  if (m?.index == null) return "";
  const start = Math.max(0, m.index - before);
  const end = Math.min(text.length, m.index + after);
  return text.slice(start, end);
}

function priorityZone(bundleText: string, priority: DocumentPriority): string {
  const n = bundleText.replace(/\r\n/g, "\n");
  switch (priority) {
    case "charge_sheet":
      return (
        sliceWindow(n, /===\s*SECTION:\s*CHARGE(?:_SHEET)?\s*===/i, 0, 8000) ||
        sliceWindow(n, /\bcharge\s+sheet\b/i, 120, 6000)
      );
    case "indictment":
      return sliceWindow(n, /\b(?:indictment|corrected\s+indictment|latest\s+indictment)\b/i, 80, 6000);
    case "mg5":
      return (
        sliceWindow(n, /===\s*SECTION:\s*MG5\s*===/i, 0, 12000) ||
        sliceWindow(n, /\bmg5\s+case\s+summary\b/i, 80, 10000)
      );
    case "mg6":
      return sliceWindow(n, /\bmg6c?\b/i, 80, 15000);
    default:
      return "";
  }
}

function detectFamilyInText(text: string): BundleOffenceFamily | null {
  const b = text.toLowerCase();
  if (/\bpervert(ing)?\s+the\s+course\s+of\s+justice\b/i.test(b)) return "perverting_justice";
  if (/\bmurder\b|unlawful\s+killing.*intent\s+to\s+kill/i.test(b)) return "murder";
  if (/\bmanslaughter\b/.test(b)) return "manslaughter";
  if (/s\.?\s*18\b|wounding\s+with\s+intent|intent\s+to\s+cause\s+(?:really\s+)?serious\s+harm/i.test(b)) {
    return "gbh_s18";
  }
  if (
    /s\.?\s*20\b|unlawful\s+wounding|grievous\s+bodily\s+harm|\bgbh\b|actual\s+bodily\s+harm|\babh\b|s\.?\s*47\b/i.test(
      b,
    )
  ) {
    return "gbh_s20_abh";
  }
  if (/\brobbery\b/.test(b)) return "robbery";
  if (/\bburglary\b/.test(b)) return "burglary";
  if (/\btheft\b|steal|shoplift/i.test(b)) return "theft";
  if (
    /section\s*5\s*\(\s*2\s*\)|possession of a controlled drug[^.\n]{0,160}section\s*5\s*\(\s*2/i.test(b) &&
    !/intent\s+to\s+supply|section\s*5\s*\(\s*3/i.test(b)
  ) {
    return "possession";
  }
  if (/\bpwits\b|intent\s+to\s+supply|section\s*5\s*\(\s*3\s*\)/i.test(b)) return "pwits";
  if (/\bfraud\b|false\s+representation/i.test(b)) return "fraud";
  if (/dangerous\s+driving|careless\s+driving|drink[-\s]?drive|road\s+traffic/i.test(b)) return "driving";
  if (/affray|violent\s+disorder|public\s+order/i.test(b)) return "public_order";
  if (/harassment|stalking|coercive\s+control/i.test(b)) return "harassment";
  if (/sexual|rape|assault\s+by\s+penetration/i.test(b)) return "sexual";
  if (/\bassault\b|\bwounding\b|\binjury\b|\bbottle\b|\bviolence\b/i.test(b)) return "provisional_violence";
  return null;
}

function blockedFamiliesFor(family: BundleOffenceFamily): BundleOffenceFamily[] {
  if (VIOLENCE_FAMILIES.includes(family)) {
    return ["fraud", "pwits", "perverting_justice", "theft", "robbery"];
  }
  if (family === "fraud") return ["gbh_s20_abh", "gbh_s18", "robbery", "pwits", "provisional_violence"];
  if (family === "pwits") return ["fraud", "gbh_s20_abh", "robbery", "provisional_violence"];
  if (family === "robbery") return ["fraud", "pwits", "provisional_violence"];
  if (family === "perverting_justice") return ["gbh_s20_abh", "fraud", "pwits"];
  return ["perverting_justice"];
}

function resolveOffenceFamily(
  bundleText: string,
  chargeWording: string | null,
): BundleTruthOffenceFamily {
  const chargeZone =
    priorityZone(bundleText, "charge_sheet") ||
    priorityZone(bundleText, "indictment") ||
    compact(chargeWording ?? "");

  const fromCharge = detectFamilyInText(chargeZone);
  if (fromCharge) {
    return {
      family: fromCharge,
      confidence: chargeWording ? "high" : "medium",
      sourceAnchor: {
        documentPriority: chargeZone.includes("INDICTMENT") ? "indictment" : "charge_sheet",
        sectionLabel: "Charge / indictment",
        excerpt: (chargeWording?.slice(0, 200) ?? chargeZone.slice(0, 200)) || null,
      },
      blockedFamilies: blockedFamiliesFor(fromCharge),
    };
  }

  const mg5Zone = priorityZone(bundleText, "mg5");
  const fromMg5 = detectFamilyInText(mg5Zone);
  if (fromMg5) {
    return {
      family: fromMg5,
      confidence: "medium",
      sourceAnchor: {
        documentPriority: "mg5",
        sectionLabel: "MG5 / case summary",
        excerpt: mg5Zone.slice(0, 200) || null,
      },
      blockedFamilies: blockedFamiliesFor(fromMg5),
    };
  }

  if (chargeWording && !/charge unclear|not safely extracted/i.test(chargeWording)) {
    const fromWording = detectFamilyInText(chargeWording);
    if (fromWording) {
      return {
        family: fromWording,
        confidence: "medium",
        sourceAnchor: { documentPriority: "unknown", sectionLabel: "Charge wording", excerpt: chargeWording },
        blockedFamilies: blockedFamiliesFor(fromWording),
      };
    }
  }

  const lowPriorityTail = bundleText.slice(0, 80_000);
  const fromBackground = detectFamilyInText(lowPriorityTail);
  if (fromBackground && !["fraud", "pwits"].includes(fromBackground)) {
    return {
      family: fromBackground,
      confidence: "provisional",
      sourceAnchor: { documentPriority: "unknown", sectionLabel: "Bundle scan (provisional)", excerpt: null },
      blockedFamilies: blockedFamiliesFor(fromBackground),
    };
  }

  return {
    family: "unknown",
    confidence: "provisional",
    sourceAnchor: null,
    blockedFamilies: blockedFamiliesFor("unknown"),
  };
}

function extractCoDefendants(scan: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const m of scan.matchAll(/\bCo-?defendant\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi)) {
    const name = compact(m[1] ?? "");
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}

function extractCountNumber(scan: string): string | null {
  const m = scan.match(/\bCount\s*(\d+)\b/i);
  return m?.[1] ?? null;
}

function extractParticularsNearCharge(bundleText: string): string | null {
  const zone =
    priorityZone(bundleText, "charge_sheet") || priorityZone(bundleText, "indictment") || bundleText.slice(0, 20_000);
  const m = zone.match(/\bParticulars(?:\s+of\s+offence)?\s*:\s*([^\n]{16,280})/i);
  return m?.[1] ? compact(m[1]) : null;
}

export function proofMapLensFromLedger(ledger: BundleTruthLedger): ProofMapOffenceLens {
  const f = ledger.offenceFamily.family;
  switch (f) {
    case "murder":
    case "manslaughter":
    case "gbh_s18":
    case "gbh_s20_abh":
    case "provisional_violence":
      return "violence_gbh";
    case "fraud":
      return "fraud";
    case "pwits":
      return "pwits";
    case "possession":
      return "generic_provisional";
    case "robbery":
      return "robbery_id";
    case "driving":
    case "motoring":
      return "motoring";
    case "perverting_justice":
      return "generic_provisional";
    case "unknown":
    default:
      return "generic_provisional";
  }
}

export function ledgerUsesSourceMaterialOnlyProofMap(ledger: BundleTruthLedger): boolean {
  return ledger.offenceFamily.family === "unknown" || ledger.offenceFamily.confidence === "provisional";
}

export function isOffenceFamilyBlocked(
  candidate: BundleOffenceFamily,
  ledger: BundleTruthLedger,
): boolean {
  return ledger.offenceFamily.blockedFamilies.includes(candidate);
}

export function textViolatesForbiddenClaims(text: string, ledger: BundleTruthLedger): boolean {
  const lower = text.toLowerCase();
  return ledger.forbiddenClaims.some((fc) => lower.includes(fc.phrase.toLowerCase()));
}

export function sanitizeTextAgainstForbiddenClaims(text: string, ledger: BundleTruthLedger): string {
  let out = text;
  for (const fc of ledger.forbiddenClaims) {
    const re = new RegExp(fc.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    out = out.replace(re, `[${fc.reason} — wording suppressed]`);
  }
  return compact(out);
}

export function formatHearingDisplayFromLedger(
  ledger: BundleTruthLedger,
  hearingType?: string | null,
): string | null {
  const h = ledger.hearing;
  if (!h.rawLiteral && !h.dateIso) return null;

  let datePart: string | null = null;
  if (h.rawLiteral) {
    const parsed = parseUkHearingDateTime(h.rawLiteral);
    if (parsed?.display) {
      datePart = h.timeLiteral
        ? parsed.display.replace(/\s+at\s+\d{1,2}:\d{2}/i, "").trim()
        : parsed.display;
    }
  }
  if (!datePart && h.dateIso) {
    try {
      datePart = new Date(h.dateIso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      datePart = null;
    }
  }
  if (!datePart) return h.rawLiteral;

  const display = h.timeLiteral ? `${datePart} at ${h.timeLiteral}` : datePart;
  const type = (hearingType ?? h.hearingType)?.trim();
  const safeType =
    type && !/stage not recorded|not safely extracted|no hearing date/i.test(type) ? type : null;
  return safeType ? `${safeType} · ${display}` : display;
}

export function ledgerChargeDisplay(ledger: BundleTruthLedger): string | null {
  const w = ledger.charge.wording;
  if (w && !/charge unclear|not safely extracted|provisional — offence family/i.test(w)) return w;
  return null;
}

/** Normalise broken OCR/casing in chase and anchor labels. */
export function formatDisplayLabelCasing(line: string): string {
  return line
    .replace(/\bcCTV Full Window\b/gi, "CCTV full window")
    .replace(/\bcCTV Continuity\b/gi, "CCTV Continuity")
    .replace(/\bcCTV\b/g, "CCTV")
    .replace(/\bcctv full window\b/gi, "CCTV full window")
    .replace(/\bcctv continuity\b/gi, "CCTV Continuity")
    .replace(/\bcctv\b/g, "CCTV")
    .replace(/\binterview\s+[Rr]ecording\b/g, "Interview recording")
    .replace(/\s+/g, " ")
    .trim();
}

/** MG6 glue repair + display casing for all solicitor-facing surfaced lines. */
export function formatSolicitorSurfaceLine(line: string): string {
  return formatDisplayLabelCasing(repairGluedMg6StatusText(line));
}

function softenTemplateRiskLine(line: string, ledger: BundleTruthLedger | null): string {
  if (!ledger) return line;
  if (
    /Interview admission narrows the defence route/i.test(line) &&
    materialNotSafelyServed(ledger, /interview|transcript|pace/i)
  ) {
    return "Any interview admission, if served and reviewed, could narrow the defence route.";
  }
  if (
    /Continuity\/provenance is later proved/i.test(line) &&
    materialNotSafelyServed(ledger, /continuity|provenance|cctv|footage|video|bwv/i)
  ) {
    return "Continuity/provenance may later be proved on served material.";
  }
  return line;
}

export function isAdminGuidanceLine(line: string): boolean {
  const l = line.trim();
  if (!l || l.length < 8) return false;
  return (
    /\bkey case facts should come from charge\b/i.test(l) ||
    /\bno conclusion is drawn from the charge wording\b/i.test(l) ||
    /\bthis front note is not complete\b/i.test(l) ||
    /\bcontinuation page only\b/i.test(l) ||
    /\bcase admin email\b/i.test(l) ||
    /\bverify charge family with solicitor\b/i.test(l) ||
    /\bscanned continuation\b/i.test(l) ||
    /\bpage note\s*\d+\b/i.test(l) ||
    /\badministrative continuation text\b/i.test(l) ||
    /\bthis page contains administrative\b/i.test(l) ||
    /\bprimary eval hook\b/i.test(l) ||
    /\bfictional training data\b/i.test(l)
  );
}

const AFFIRMATIVE_OVERSTATEMENT_RE =
  /\b(confirms?|proves?|establishes|is consistent|supports\s+(?:the\s+)?crown|safely relies on)\b/i;

export type TruthSurfaceGuardContext = {
  ledger: BundleTruthLedger | null;
  bundleText?: string | null;
};

function materialNotSafelyServed(
  ledger: BundleTruthLedger,
  pattern: RegExp,
): boolean {
  const rows = ledger.materials.filter((m) => pattern.test(`${m.label} ${m.detail ?? ""} ${m.displayLine}`));
  if (!rows.length) return true;
  return !rows.some((m) => m.status === "served");
}

function materialHasStatus(
  ledger: BundleTruthLedger,
  pattern: RegExp,
  statuses: MaterialStatus[],
): boolean {
  return ledger.materials.some((m) => {
    const text = `${m.label} ${m.detail ?? ""} ${m.displayLine}`;
    return pattern.test(text) && statuses.includes(m.status);
  });
}

function bundleMentionsPattern(bundleText: string, pattern: RegExp): boolean {
  return pattern.test(bundleText);
}

/** Block generic battleboard/risk templates unless papers support them. */
export function isBlockedBattleboardTemplateLine(
  line: string,
  ledger: BundleTruthLedger | null,
  bundleText?: string | null,
): boolean {
  if (!line.trim()) return true;
  if (isAdminGuidanceLine(line)) return true;
  if (!ledger) return false;

  const t = bundleText ?? "";
  const lower = line.toLowerCase();

  // Generic battleboard template — never surface as solicitor-facing risk.
  if (/\bmg11 is consistent and served\b/i.test(lower)) return true;

  if (/\bfull cctv confirms|\bcctv confirms|\bcctv proves\b/i.test(lower)) {
    if (materialNotSafelyServed(ledger, /\bcctv|footage|video\b/i)) return true;
    if (/\bfull cctv confirms crown timing\b/i.test(lower)) return true;
    if (bundleMentionsPattern(t, /\b(?:no|not)\s+cctv\b|\bcctv\b[^.\n]{0,40}(?:outstanding|not served|partial|missing)\b/i)) {
      return true;
    }
  }
  if (/mg11 is consistent|mg11.*\b(served|final|consistent)\b/i.test(lower)) {
    return materialNotSafelyServed(ledger, /mg11|witness\s+statement|complainant/i);
  }
  if (/complainant injury account is consistent|medical is consistent|medical report proves/i.test(lower)) {
    return (
      materialNotSafelyServed(ledger, /medical|hospital|injury|fme/i) ||
      materialNotSafelyServed(ledger, /mg11|witness|complainant/i)
    );
  }
  if (/cad\/999 timing supports|999\/cad timing supports/i.test(lower)) {
    const hasCad =
      ledger.materials.some((m) => /cad|999|dispatch|control\s*room/i.test(m.displayLine)) ||
      bundleMentionsPattern(t, /\bcad\b|\b999\b|dispatch/i);
    if (!hasCad) return true;
    return materialNotSafelyServed(ledger, /cad|999|dispatch|control\s*room/i);
  }
  if (/outstanding bank\/device\/source material may support the crown/i.test(lower)) {
    return !bundleMentionsPattern(t, /\bbank\b|device|phone extraction|transaction|fraud|mailbox|export log/i);
  }
  if (/interview denial remains to be tested against bank\/device/i.test(lower)) {
    return !bundleMentionsPattern(t, /\bbank\b|device|phone extraction|transaction schedule/i);
  }
  if (/cad\/999 timing may affect sequence/i.test(lower)) {
    const hasCad =
      ledger.materials.some((m) => /cad|999|dispatch|audio/i.test(m.displayLine)) ||
      bundleMentionsPattern(t, /\bcad\b|\b999\b|dispatch/i);
    return !hasCad;
  }
  if (ledger && AFFIRMATIVE_OVERSTATEMENT_RE.test(lower)) {
    if (/\b(cctv|footage|video)\b/i.test(lower) && materialNotSafelyServed(ledger, /\bcctv|footage|video\b/i)) {
      return true;
    }
    if (/\b(medical|hospital|injury|fme)\b/i.test(lower) && materialNotSafelyServed(ledger, /medical|hospital|injury|fme/i)) {
      return true;
    }
    if (/\b(interview|transcript|pace)\b/i.test(lower) && materialNotSafelyServed(ledger, /interview|transcript|pace/i)) {
      return true;
    }
    if (/\b(mg11|witness|complainant)\b/i.test(lower) && materialNotSafelyServed(ledger, /mg11|witness|complainant/i)) {
      return true;
    }
  }

  return false;
}

/** Prefer ledger MG6C row for chase-family anchors (not battleboard MG11 fallback). */
export function ledgerAnchorForChaseFamily(
  familyId: string,
  ledger: BundleTruthLedger,
): string | null {
  const familyPatterns: Record<string, RegExp> = {
    cctv_master: /\b(cctv|master|footage|full\s*window|video)\b/i,
    cctv_continuity: /\b(cctv|continuity|provenance)\b/i,
    cad_999: /\b(999|cad|dispatch|control\s*room)\b/i,
    bwv: /\b(bwv|body[-\s]?worn)\b/i,
    interview: /\b(interview|transcript|pace)\b/i,
    mg6_unused: /\b(mg6|unused|disclosure\s*schedule)\b/i,
    medical_expert: /\b(medical|hospital|pathology|expert|fme|gp)\b/i,
    exhibit_provenance: /\b(exhibit|provenance)\b/i,
  };
  const re = familyPatterns[familyId];
  if (!re) return null;

  const needy = ledger.materials.filter(
    (m) =>
      re.test(m.displayLine) &&
      ["outstanding", "absent", "draft", "unsigned", "partial", "unclear"].includes(m.status),
  );
  if (needy.length) return formatDisplayLabelCasing(needy[0]!.displayLine);

  const any = ledger.materials.find((m) => re.test(m.displayLine));
  return any ? formatDisplayLabelCasing(any.displayLine) : null;
}

export function guardSolicitorLine(
  line: string,
  ctx: TruthSurfaceGuardContext,
): string | null {
  let formatted = formatSolicitorSurfaceLine(line);
  if (!formatted || isAdminGuidanceLine(formatted)) return null;
  formatted = softenTemplateRiskLine(formatted, ctx.ledger);
  if (isBlockedBattleboardTemplateLine(formatted, ctx.ledger, ctx.bundleText)) return null;
  if (ctx.ledger && textViolatesForbiddenClaims(formatted, ctx.ledger)) return null;
  return formatted;
}

export function guardSolicitorLines(
  lines: string[],
  ctx: TruthSurfaceGuardContext,
  max = lines.length,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = guardSolicitorLine(raw, ctx);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
    if (out.length >= max) break;
  }
  return out;
}

/** @deprecated Prefer {@link guardSolicitorLines}. */
export function filterTemplateSafeLines(
  lines: string[],
  ledger: BundleTruthLedger | null,
  bundleText?: string | null,
  max = lines.length,
): string[] {
  return guardSolicitorLines(lines, { ledger, bundleText }, max);
}

function guardBattleboardRoute(
  route: BattleboardRoute,
  ctx: TruthSurfaceGuardContext,
): BattleboardRoute {
  return {
    ...route,
    why_it_helps: guardSolicitorLines(route.why_it_helps, ctx),
    what_hurts_us: guardSolicitorLines(route.what_hurts_us, ctx),
    evidence_anchors: guardSolicitorLines(route.evidence_anchors, ctx),
    collapse_risks: guardSolicitorLines(route.collapse_risks, ctx),
    next_moves: guardSolicitorLines(route.next_moves, ctx),
    hearing_line: guardSolicitorLine(route.hearing_line, ctx) ?? "",
    safety_note: guardSolicitorLine(route.safety_note, ctx) ?? "",
  };
}

/** Apply the same solicitor-surface guards used by QA export to live Battleboard output. */
export function guardBattleboardOutput(
  battleboard: BattleboardOutput,
  ctx: TruthSurfaceGuardContext,
): BattleboardOutput {
  const routes = battleboard.routes.map((route) => guardBattleboardRoute(route, ctx));
  const primary = battleboard.primary_route
    ? guardBattleboardRoute(battleboard.primary_route, ctx)
    : undefined;
  return {
    ...battleboard,
    solicitor_safe_summary:
      guardSolicitorLine(battleboard.solicitor_safe_summary, ctx) ?? battleboard.solicitor_safe_summary,
    position_notice: battleboard.position_notice
      ? guardSolicitorLine(battleboard.position_notice, ctx) ?? undefined
      : battleboard.position_notice,
    primary_route: primary,
    routes,
    global_collapse_risks: guardSolicitorLines(battleboard.global_collapse_risks, ctx),
    urgent_next_moves: guardSolicitorLines(battleboard.urgent_next_moves, ctx),
  };
}

export function buildBundleTruthLedger(input: BuildBundleTruthLedgerInput): BundleTruthLedger {
  const bundleText = input.bundleText ?? "";
  const emptyLedger = (): BundleTruthLedger => ({
    version: "bundle-truth-v1",
    defendant: { defendant: null, coDefendants: [], confidence: "low" },
    court: null,
    hearing: {
      rawLiteral: null,
      dateIso: null,
      timeLiteral: null,
      hearingType: null,
      sourceAnchor: null,
      confidence: "low",
    },
    stage: null,
    charge: {
      wording: null,
      countNumber: null,
      particulars: null,
      sourceAnchor: null,
      confidence: "low",
    },
    offenceFamily: {
      family: "unknown",
      confidence: "provisional",
      sourceAnchor: null,
      blockedFamilies: blockedFamiliesFor("unknown"),
    },
    materials: [],
    ocrConfidence: "low",
    reviewRequired: true,
    forbiddenClaims: [],
    sourceAnchors: [],
  });

  if (!bundleText.trim() || bundleText.trim().length < 40) {
    return emptyLedger();
  }

  const meta = extractBundleCaseMetadata(bundleText, input.parsedHeader as never);
  const scan = buildMetadataScan(bundleText);
  const materials = normaliseBundleMaterials(bundleText);
  const forbiddenClaims = buildForbiddenClaimsForMaterials(materials);
  const ocrConfidence = estimateOcrConfidence(bundleText);

  const chargeWording =
    meta.offenceWording ??
    meta.offenceDisplay ??
    (meta.offenceSource !== "unavailable" ? null : null);

  const chargeConfidence: TruthConfidence = chargeWording ? "high" : "low";
  const offenceFamily = resolveOffenceFamily(bundleText, chargeWording);

  const hearingRaw = meta.nextHearingRaw;
  const timeLiteral = extractLiteralHearingTime(hearingRaw);
  const hearingTypeMatch = hearingRaw?.match(/\bfor\s+(PTPH|CMH|PCMH|trial|mention|sentencing)\b/i);
  const hearingType = hearingTypeMatch?.[1]?.toUpperCase() ?? null;

  const defendant =
    meta.defendantName ??
    input.parsedHeader?.accused?.trim() ??
    null;

  const reviewRequired =
    ocrConfidence === "low" ||
    chargeConfidence === "low" ||
    offenceFamily.confidence === "provisional" ||
    offenceFamily.family === "unknown" ||
    materials.some((m) => m.status === "unclear" || m.status === "draft" || m.status === "unsigned");

  const anchors: SourceAnchor[] = [];
  if (offenceFamily.sourceAnchor) anchors.push(offenceFamily.sourceAnchor);

  return {
    version: "bundle-truth-v1",
    defendant: {
      defendant,
      coDefendants: extractCoDefendants(scan),
      confidence: defendant ? "high" : "low",
    },
    court: meta.court,
    hearing: {
      rawLiteral: hearingRaw,
      dateIso: meta.nextHearingIso,
      timeLiteral,
      hearingType,
      sourceAnchor: hearingRaw
        ? { documentPriority: "mg5", sectionLabel: "Hearing listing", excerpt: hearingRaw.slice(0, 200) }
        : null,
      confidence: hearingRaw ? "high" : "low",
    },
    stage: meta.stage ?? input.parsedHeader?.stage ?? null,
    charge: {
      wording: chargeWording ? formatOffenceDisplayFromBundle(chargeWording) : null,
      countNumber: extractCountNumber(scan),
      particulars: extractParticularsNearCharge(bundleText),
      sourceAnchor: chargeWording
        ? { documentPriority: "charge_sheet", sectionLabel: "Charge", excerpt: chargeWording.slice(0, 200) }
        : null,
      confidence: chargeConfidence,
    },
    offenceFamily,
    materials,
    ocrConfidence,
    reviewRequired,
    forbiddenClaims,
    sourceAnchors: anchors,
  };
}

export function ledgerMaterialsNeedingChase(ledger: BundleTruthLedger): NormalisedMaterialRow[] {
  return ledger.materials.filter((m) =>
    ["outstanding", "absent", "partial", "draft", "unsigned", "unclear"].includes(m.status),
  );
}
