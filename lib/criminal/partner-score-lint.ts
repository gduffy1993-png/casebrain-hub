import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterBrief } from "@/components/criminal/workflow/buildMatterBrief";
import type { CriminalBriefPlan } from "@/lib/criminal/brief-plan";

export type PartnerScoreViolationKind =
  | "required_tab_field"
  | "genericness"
  | "wrong_modality"
  | "court_readiness"
  | "source_backing"
  | "template_bleed";

export type PartnerScoreSeverity = "major" | "minor";

export type PartnerScoreViolation = {
  kind: PartnerScoreViolationKind;
  severity: PartnerScoreSeverity;
  surface: "today" | "chase" | "summary" | "client";
  message: string;
  detail?: string;
};

export type PartnerScoreLintInput = {
  profile: CriminalBriefPlan["profile"];
  missingMaterial?: string[] | null;
  contradictionLabels?: string[] | null;
  bundleText?: string | null;
  war: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  matter: MatterBrief;
};

export type PartnerScoreLintResult = {
  score: number;
  grade: "pass" | "weak" | "fail";
  violations: PartnerScoreViolation[];
};

function plain(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(plain).join("\n");
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).map(plain).join("\n");
  return String(value);
}

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(text: string): string[] {
  return norm(text)
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !["material", "source", "served", "outstanding", "please"].includes(t));
}

function hasAnyToken(haystack: string, needles: string[]): boolean {
  const h = norm(haystack);
  return needles.some((n) => h.includes(n));
}

function add(
  out: PartnerScoreViolation[],
  kind: PartnerScoreViolationKind,
  severity: PartnerScoreSeverity,
  surface: PartnerScoreViolation["surface"],
  message: string,
  detail?: string,
): void {
  out.push({ kind, severity, surface, message, detail });
}

function requiredSection(matter: MatterBrief, id: string): boolean {
  const section = matter.sections.find((s) => s.id === id);
  return Boolean(section && plain(section).trim().length >= 40);
}

function profileKeywords(profile: CriminalBriefPlan["profile"]): string[] {
  switch (profile) {
    case "digital_attribution":
      return ["phone", "device", "extraction", "metadata", "attribution", "message"];
    case "bwv_police_contact":
      return ["bwv", "body worn", "officer", "scene", "contact"];
    case "custody_pace":
      return ["custody", "pace", "interview", "safeguard"];
    case "domestic_harassment":
      return ["domestic", "harassment", "message", "contact", "complainant"];
    case "drugs_pwits":
      return ["drug", "pwits", "continuity", "lab", "phone"];
    case "violence_assault":
      return ["injury", "assault", "force", "medical", "sequence"];
    case "sexual_abe":
      return ["abe", "sexual", "complainant", "medical", "disclosure"];
    case "driving_motoring":
      return ["driving", "vehicle", "road", "device", "procedure"];
    case "fraud_account":
      return ["fraud", "account", "loss", "transaction", "bank"];
    case "robbery_id":
      return ["robbery", "identification", "cctv", "id", "description"];
    case "mixed_unclear":
      return ["provisional", "disclosure", "source", "instructions"];
  }
}

function lintRequiredFields(input: PartnerScoreLintInput, out: PartnerScoreViolation[]): void {
  const { war, chase, matter, missingMaterial } = input;
  if (!war.safePositionToday?.trim()) {
    add(out, "required_tab_field", "major", "today", "Today tab missing safe position line.");
  }
  if (!war.sayThis?.length) {
    add(out, "required_tab_field", "major", "today", "Today tab missing say-this lines.");
  }
  if (!war.askCourtToRecord?.length) {
    add(out, "required_tab_field", "major", "today", "Today tab missing court-record asks.");
  }
  if (!chase.safeCourtLine?.trim()) {
    add(out, "required_tab_field", "major", "chase", "Chase tab missing safe court line.");
  }
  if ((missingMaterial?.length ?? 0) > 0 && chase.items.length === 0) {
    add(out, "required_tab_field", "major", "chase", "Missing material exists but no chase items were produced.");
  }
  for (const id of ["theory", "risks", "opportunities", "chase", "client"]) {
    if (!requiredSection(matter, id)) {
      add(out, "required_tab_field", "major", "summary", `Matter brief missing usable ${id} section.`);
    }
  }
}

function lintGenericness(input: PartnerScoreLintInput, out: PartnerScoreViolation[]): void {
  const text = plain({
    today: input.war.sayThis,
    chase: input.chase.items.map((i) => `${i.label} ${i.whyItMatters}`),
    summary: input.matter.sections,
  });
  const keywords = profileKeywords(input.profile);
  if (!hasAnyToken(text, keywords)) {
    add(
      out,
      "genericness",
      "major",
      "summary",
      "Output does not contain profile-specific language.",
      `profile=${input.profile}`,
    );
  }

  const genericHits = text.match(/\b(?:source material|full disclosure|solicitor review|required|provisional pending disclosure)\b/gi) ?? [];
  const specificHits = text.match(/\b(?:cctv|bwv|cad|999|mg11|mg6|interview|custody|medical|extraction|metadata|loss|transaction|continuity|particulars|abe)\b/gi) ?? [];
  if (genericHits.length >= 12 && specificHits.length < 4) {
    add(out, "genericness", "minor", "summary", "Output leans generic without enough evidence-specific nouns.");
  }
}

function lintWrongModality(input: PartnerScoreLintInput, out: PartnerScoreViolation[]): void {
  const text = plain({
    today: input.war.sayThis,
    summary: input.matter.sections,
    client: input.war.draftWording.clientExplanation,
  });
  const lowerBundle = (input.bundleText ?? "").toLowerCase();
  const unsupportedClaim = (label: string, claimRe: RegExp, bundleNeedle: RegExp) => {
    if (!claimRe.test(text)) return;
    if (bundleNeedle.test(lowerBundle)) return;
    add(out, "wrong_modality", "major", "summary", `${label} fact claim appears without bundle support.`);
  };

  unsupportedClaim("BWV", /\bbwv\s+(?:shows|confirms|captures|proves)\b/i, /\bbwv|body[-\s]?worn/i);
  unsupportedClaim("CCTV", /\bcctv\s+(?:shows|confirms|captures|proves)\b/i, /\bcctv|video|footage/i);
  unsupportedClaim("Extraction", /\b(?:extraction|metadata)\s+(?:shows|confirms|proves)\b/i, /\bextraction|metadata|device|phone/i);
  unsupportedClaim("ABE", /\babe\s+(?:shows|confirms|proves|account)\b/i, /\babe|achieving best evidence/i);
}

function lintCourtReadiness(input: PartnerScoreLintInput, out: PartnerScoreViolation[]): void {
  const todayLines = [input.war.safePositionToday, ...input.war.sayThis, ...input.war.askCourtToRecord].filter(Boolean);
  const courtReady = todayLines.some((line) =>
    /\b(?:court|record|timetable|provisional|outstanding|disclos|position)\b/i.test(line),
  );
  if (!courtReady) {
    add(out, "court_readiness", "major", "today", "Today output lacks a court-ready record/timetable/provisional line.");
  }
  const unsafe = todayLines.find((line) => /\b(?:we need to review|look at this|check the file|maybe)\b/i.test(line));
  if (unsafe) {
    add(out, "court_readiness", "minor", "today", "Today line reads like internal review rather than court wording.", unsafe);
  }
}

function lintSourceBacking(input: PartnerScoreLintInput, out: PartnerScoreViolation[]): void {
  const missing = input.missingMaterial ?? [];
  if (missing.length > 0) {
    const chaseText = plain(input.chase.items.map((i) => `${i.label} ${i.draftChaseWording} ${i.courtLine}`));
    const covered = missing.filter((item) => hasAnyToken(chaseText, tokens(item)));
    if (covered.length < Math.min(2, missing.length)) {
      add(
        out,
        "source_backing",
        "major",
        "chase",
        "Chase output does not cover enough expected missing material.",
        `covered=${covered.length}/${missing.length}`,
      );
    }
  }

  const contradictionLabels = input.contradictionLabels ?? [];
  if (contradictionLabels.length > 0) {
    const actionText = plain({
      today: input.war.sayThis,
      chase: input.chase.items,
      summary: input.matter.sections,
    });
    if (!/\b(?:reconcile|contradiction|differ|does not match|unresolved|linkage)\b/i.test(actionText)) {
      add(out, "source_backing", "major", "summary", "Contradictions exist but outputs do not surface reconciliation action.");
    }
  }
}

function lintTemplateBleed(input: PartnerScoreLintInput, out: PartnerScoreViolation[]): void {
  const text = plain({
    today: input.war,
    chase: input.chase,
    matter: input.matter,
  });
  const bleed = text.match(/(?:\bREQ-[A-Z0-9-]+|lorem ipsum|\[insert|\bTODO\b|\bundefined\b|\bnull\b)/gi) ?? [];
  if (bleed.length > 0) {
    add(out, "template_bleed", "major", "summary", "Template or placeholder text leaked into solicitor output.", bleed[0]);
  }
}

export function lintPartnerScore(input: PartnerScoreLintInput): PartnerScoreLintResult {
  const violations: PartnerScoreViolation[] = [];
  lintRequiredFields(input, violations);
  lintGenericness(input, violations);
  lintWrongModality(input, violations);
  lintCourtReadiness(input, violations);
  lintSourceBacking(input, violations);
  lintTemplateBleed(input, violations);

  const penalty = violations.reduce((sum, v) => sum + (v.severity === "major" ? 12 : 4), 0);
  const score = Math.max(0, 100 - penalty);
  return {
    score,
    grade: score >= 82 ? "pass" : score >= 65 ? "weak" : "fail",
    violations,
  };
}
