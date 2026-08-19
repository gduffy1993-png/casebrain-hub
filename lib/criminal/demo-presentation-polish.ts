import { humanizeChaseFragmentLabel } from "@/lib/criminal/disclosure-chase-finalize";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { sanitizeSolicitorVisibleText } from "@/lib/criminal/overview-presentation";

/**
 * Explicit demo presentation case id — env only.
 * No hard-coded UUID may participate in production source→truth resolution.
 * (CB-HIST-NO-CASE-IDENTITY-TRUTH-BRANCH)
 */
export const DEMO_PRESENTATION_CASE_ID =
  process.env.NEXT_PUBLIC_DEMO_PRESENTATION_CASE_ID?.trim() || "";

export function buildDemoPresentationCaseHref(): string {
  if (!DEMO_PRESENTATION_CASE_ID) return "/cases";
  return `/cases/${DEMO_PRESENTATION_CASE_ID}?tab=overview&controlRoom=1`;
}

export function isDemoPresentationCase(caseId: string | null | undefined): boolean {
  return Boolean(
    DEMO_PRESENTATION_CASE_ID &&
      caseId?.trim() &&
      caseId.trim() === DEMO_PRESENTATION_CASE_ID,
  );
}

function formatDemoListingDate(day: string, month: string, year: string, time?: string | null): string {
  const monthShort: Record<string, string> = {
    january: "Jan",
    february: "Feb",
    march: "Mar",
    april: "Apr",
    may: "May",
    june: "Jun",
    july: "Jul",
    august: "Aug",
    september: "Sep",
    october: "Oct",
    november: "Nov",
    december: "Dec",
  };
  const monthLabel = monthShort[month.toLowerCase()] ?? month;
  return `${Number(day)} ${monthLabel} ${year}${time ? ` at ${time}` : ""}`;
}

/**
 * Demo display guard: when an *explicit* demo case id is configured AND the bundle
 * itself contains a listing date, prefer that source date over a stale placeholder.
 * Never invent a hard-coded hearing/date from case identity alone.
 */
export function resolveDemoPresentationHearingLabel({
  caseId,
  currentLabel,
  bundleHay,
}: {
  caseId: string | null | undefined;
  currentLabel: string | null | undefined;
  bundleHay: string | null | undefined;
}): string {
  const current = currentLabel?.trim() ?? "";
  if (!isDemoPresentationCase(caseId)) return current;

  const hay = bundleHay ?? "";
  const listing = hay.match(
    /\b(PTPH|plea\s+and\s+trial\s+preparation|listing)\s*(?:listed)?\s*[—–-]\s*(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})(?:,\s*(\d{1,2}:\d{2}))?/i,
  );
  if (!listing) return current;

  const [, kindRaw, day, month, year, time] = listing;
  const kind = /plea\s+and\s+trial/i.test(kindRaw ?? "") ? "PTPH" : (kindRaw ?? "PTPH").toUpperCase();
  return `${kind} · ${formatDemoListingDate(day!, month!, year!, time)}`;
}

/** Phone-harassment / digital attribution bundle shape for presentation filters. */
export function isDigitalHarassmentBundleHay(bundleHay: string, allegation = ""): boolean {
  const hay = `${allegation} ${bundleHay}`.toLowerCase();
  return (
    /harassment|protection from harassment/i.test(hay) &&
    /screenshot|phone|message|whatsapp|sms|subscriber|attribution|mg6|mg11|extraction|digital|handset/i.test(
      hay,
    )
  );
}

/** Replace adversarial QA bundle banners in file preview — keeps fictional disclaimer. */
export function sanitizeDemoBundleBanner(text: string): string {
  return text
    .replace(
      /FICTIONAL\s+EVALUATION\s+PDF\s*[—–-]\s*NOT\s+REAL\s+POLICE\s+MATERIAL/gi,
      "Controlled fictional source pack — not drafting",
    )
    .replace(
      /CB-[A-Z0-9-]+\s*\|\s*fictional\s+[^|\n\r]*?(?:page\s+\d+)?/gi,
      "Controlled fictional source page",
    )
    .replace(
      /RESTRICTED\s*[—–-]\s*FICTIONAL\s+ADVERSARIAL\s+QA\s+BUNDLE/gi,
      "RESTRICTED — Controlled fictional demo bundle",
    )
    .replace(/FICTIONAL\s+ADVERSARIAL\s+QA\s+BUNDLE/gi, "Controlled fictional demo bundle")
    .replace(/FICTIONAL\s+TEST\s+BUNDLE/gi, "Controlled fictional demo bundle");
}

export function displayPrimaryRouteTitle(title: string, bundleHay: string, allegation = ""): string {
  if (!title.trim()) return title;
  void allegation;
  return polishPresentationLine(title, bundleHay);
}

/**
 * Meaning-preserving lexical cleanup only (CB-HIST-PRESENTATION-MUST-PRESERVE-SEMANTICS).
 * May shorten repeated outstanding wording. Must not change evidence family, invent
 * items/states/sources/people/counts/dates, or substitute one disclosure item for another.
 */
export function polishPresentationLine(line: string, bundleHay = ""): string {
  let t = line.trim();
  if (!t) return t;
  void bundleHay;

  const financialContext =
    /fraud|proceeds\s+of\s+crime|criminal\s+property|money\s+launder|poca\b|section\s+32[789]\b|bank\s+(?:account|transfer|statement)|financial\s+investigation/i.test(
      bundleHay,
    );

  if (!financialContext) {
    t = t
      .replace(/,\s*bank\/financial\s+material\b/gi, "")
      .replace(/\s+and\s+bank\/financial\s+material\b/gi, "");
  }

  t = t
    .replace(
      /\b(Identification,\s*participation\s+and\s+attribution\s+remain\s+conditional\s+on\s+served\s+CCTV,\s*interview\s+material),\s*bank\/financial\s+material\b/gi,
      "$1",
    )
    .replace(
      /\bserved\s+CCTV,\s*interview\s+material\b/gi,
      "served CCTV and interview material",
    )
    .replace(
      /\bappears outstanding on the current (?:papers?|file)\.?\s+remains outstanding and should be disclosed on a timetable\.?/gi,
      "appears outstanding and should be disclosed on a timetable.",
    )
    .replace(
      /\bappears outstanding on the current (?:papers?|file)\.?\s+remains outstanding\b/gi,
      "appears outstanding",
    )
    .replace(
      /(\bremains outstanding\b(?:\s+and should be disclosed on a timetable)?)(?:\s*\1)+/gi,
      "$1",
    )
    .replace(/\bremains outstanding\s+and should be disclosed on a timetable\.?\s+remains outstanding/gi,
      "remains outstanding and should be disclosed on a timetable",
    );

  return t.replace(/\s{2,}/g, " ").trim();
}

/**
 * UI-only text block cleanup for demo-facing previews/copy surfaces.
 * Keeps the underlying builders intact; removes only lines proven to be
 * unsupported template contamination for families the bundle does not mention.
 *
 * CB-HIST-PRESENTATION-CANNOT-SUPPRESS-SOURCE-BACKED-FAMILY:
 * must not drop source-backed BWV/custody/CCTV/etc. merely because another
 * family (e.g. digital/phone) is dominant in the same matter.
 */
export function polishPresentationBlock(text: string, bundleHay = ""): string {
  const context = `${bundleHay} ${text}`;
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => {
      if (lineMentionsWrongFamilyTemplate(line, context)) return false;
      return true;
    });
  const filtered = filterBundleFamilyWarnings(lines, bundleHay || context)
    .map((line) => polishPresentationLine(line, context))
    .filter((line) => line && !/No key gaps listed/i.test(line));

  return sanitizeSolicitorVisibleText(
    filtered
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

type ChaseDisplayItem = {
  label: string;
  mergedFrom?: string[];
  draftChaseWording?: string;
  whyItMatters?: string;
};

function digitalHay(item: ChaseDisplayItem): string {
  // Label + concrete mergedFrom only — never let draft/why prose reclassify the family.
  return `${item.label} ${(item.mergedFrom ?? []).join(" ")}`.toLowerCase();
}

function itemIdentityHay(item: ChaseDisplayItem): string {
  return item.label.toLowerCase();
}

function mg6GenericLabel(label: string): boolean {
  return /mg6\s*\/\s*unused|disclosure schedule clarification|mg6 unused/i.test(label);
}

function digitalChaseLabel(hay: string): string | null {
  // Prefer concrete source wording already present — never remap MG6→phone family.
  if (/phone|extraction|download|device download/i.test(hay) && !/mg6/i.test(hay.split("—")[0] ?? hay)) {
    return "Full phone download / source extraction";
  }
  if (/subscriber|account|sim|attribution/i.test(hay) && !/^mg6\b/i.test(hay.trim()) && !/mg11|complainant|witness/i.test(hay)) {
    return "Subscriber / account data";
  }
  if (/screenshot|message|whatsapp|sms|export|device material/i.test(hay) && !/mg6/i.test(hay.split("—")[0] ?? hay)) {
    return "Message export / source device material";
  }
  if (/mg11|complainant|witness statement/i.test(hay)) return "Complainant MG11 / source material";
  if (/master cctv|cctv full|full window/i.test(hay)) return "Master CCTV footage";
  if (/continuity|provenance/i.test(hay) && /cctv|stills|camera/i.test(hay)) return "CCTV continuity / provenance";
  if (/\bcctv\b|stills|footage|camera/i.test(hay)) return "CCTV material";
  if (/bwv|body[-\s]?worn/i.test(hay)) return "Full BWV export";
  if (/custody|pace/i.test(hay)) return "Full custody record";
  if (/interview/.test(hay) && /target|defendant|co-def/i.test(hay)) return "Target defendant interview";
  if (/handle|attribution report/i.test(hay)) return "Handle attribution report";
  if (/platform|encro|county/i.test(hay)) return "Platform / source extraction";
  if (/call log/i.test(hay)) return "Call logs";
  return null;
}

/** UI-only chase card title — does not change chase brain output or evidence family. */
export function displayChaseCardLabel(item: ChaseDisplayItem): string {
  const identity = itemIdentityHay(item);
  const hay = digitalHay(item);
  const normalized = item.label.replace(/\bmG6C\b/gi, "MG6C").replace(/\bmG6\b/gi, "MG6");

  if (/^additional\s+source[- ]material\s+issues?\b/i.test(normalized)) {
    const fromMerged = (item.mergedFrom ?? [])
      .map((m) => m.trim())
      .find((m) => m && !/^additional\s+source[- ]material/i.test(m));
    if (fromMerged) {
      // Prefer the concrete merged source label; do not invent a phone family from MG6 alone
      // or from unrelated why/draft prose.
      if (!mg6GenericLabel(fromMerged)) {
        const digital = digitalChaseLabel(fromMerged.toLowerCase());
        if (digital) return digital;
      }
      return humanizeChaseFragmentLabel(fromMerged).replace(/\bmG6C\b/gi, "MG6C").replace(/\bmG6\b/gi, "MG6");
    }
    return "Other source-material item";
  }

  // MG6 / unused schedule clarification keeps its schedule family — never becomes phone download.
  if (mg6GenericLabel(normalized)) {
    return humanizeChaseFragmentLabel(normalized).replace(/\bmG6C\b/gi, "MG6C").replace(/\bmG6\b/gi, "MG6");
  }

  const human = humanizeChaseFragmentLabel(normalized);
  if (mg6GenericLabel(human)) {
    return human.replace(/\bmG6C\b/gi, "MG6C").replace(/\bmG6\b/gi, "MG6");
  }

  // Classify from the item label (and concrete mergedFrom) only — never from why/draft.
  const digital = digitalChaseLabel(identity) ?? digitalChaseLabel(hay);
  if (digital && !mg6GenericLabel(normalized)) return digital;

  return human.replace(/\bmG6C\b/gi, "MG6C").replace(/\bmG6\b/gi, "MG6");
}

/** Polish chase bullet lines on Summary tab — presentation only. */
export function displayChaseBulletLine(line: string): string {
  const fakeItem = { label: line.split(" — ")[0] ?? line, whyItMatters: line };
  const core = displayChaseCardLabel(fakeItem);
  const why = line.includes(" — ") ? line.split(" — ").slice(1).join(" — ").trim() : "";
  return polishPresentationLine(why ? `${core} — ${why}` : core, line);
}

export function displayChaseItemText(text: string | null | undefined, item: ChaseDisplayItem): string {
  const context = digitalHay(item);
  const raw = text ?? "";
  const [filtered] = filterBundleFamilyWarnings([raw], context);
  if (raw.trim() && !filtered) {
    const fallback = digitalChaseLabel(context);
    return fallback ? `${fallback} — solicitor review.` : "";
  }
  return polishPresentationLine(filtered ?? raw, context);
}

type BundleFamily = "bwv" | "custody" | "drugs" | "cctv" | "cad" | "encro" | "abe";

function bundleMentionsFamily(hay: string, family: BundleFamily): boolean {
  switch (family) {
    case "bwv":
      return /bwv|body[-\s]?worn|bodycam|body cam/i.test(hay);
    case "custody":
      return /custody|pace|detention|appropriate adult|safeguard/i.test(hay);
    case "drugs":
      return /\bdrug\b|pwits|intent to supply|drug continuity|drug\/cash|forensic continuity/i.test(hay);
    case "cctv":
      return /\bcctv\b|stills|footage|camera/i.test(hay);
    case "cad":
      return /\bcad\b|999|control.?room/i.test(hay);
    case "encro":
      return /encro|handle|platform|county.?lines/i.test(hay);
    case "abe":
      return /\babe\b|achieving best evidence/i.test(hay);
    default:
      return false;
  }
}

function lineMentionsFamily(line: string, family: BundleFamily): boolean {
  const l = line.toLowerCase();
  switch (family) {
    case "bwv":
      return /\bbwv\b|body[-\s]?worn|bodycam|body cam/i.test(l);
    case "custody":
      return /custody safeguard|pace safeguard|detention safeguard|appropriate adult|custody record/i.test(l);
    case "drugs":
      return /drug continuity|pwits|intent to supply|drug\/cash|drugs continuity/i.test(l);
    case "cctv":
      return /\bcctv\b|stills|footage|camera/i.test(l);
    case "cad":
      return /\bcad\b|999|control.?room/i.test(l);
    case "encro":
      return /encro|handle attribution|platform extraction|county.?lines/i.test(l);
    case "abe":
      return /\babe\b|achieving best evidence/i.test(l);
    default:
      return false;
  }
}

function lineMentionsWrongFamilyTemplate(line: string, hay: string): boolean {
  const l = line.toLowerCase();
  if (/vehicle ownership/i.test(l) && !/vehicle|registration|vrm|number plate/i.test(hay)) return true;
  if (/second male/i.test(l) && !/second male|james carter|co-?accused|other male/i.test(hay)) return true;
  if (
    /bank\/device|bank\.device|generic bank|device generic|served bank\/device/i.test(l) &&
    !/bank|cardholder|card|bank statement|atm/i.test(hay)
  ) {
    return true;
  }
  if (
    /drugs continuity|pwits|intent to supply/i.test(l) &&
    !/\bdrug\b|pwits|intent to supply/i.test(hay)
  ) {
    return true;
  }
  return false;
}

/** Drop wrong-family do-not-say / risk lines when bundle does not mention that material. */
export function filterBundleFamilyWarnings(lines: string[], bundleHay: string): string[] {
  const hay = bundleHay.toLowerCase();
  const families: BundleFamily[] = ["bwv", "custody", "drugs", "cctv", "cad", "encro", "abe"];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of lines) {
    const line = polishPresentationLine(raw.trim(), hay);
    if (!line) continue;
    const key = line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;

    let drop = lineMentionsWrongFamilyTemplate(line, hay);
    if (!drop) {
      for (const family of families) {
        if (lineMentionsFamily(line, family) && !bundleMentionsFamily(hay, family)) {
          drop = true;
          break;
        }
      }
    }
    if (drop) continue;

    seen.add(key);
    out.push(line);
  }

  return out;
}

/**
 * Presentation must not invent evidence rows (CB-HIST-PRESENTATION-CANNOT-CREATE-EVIDENCE-STATE).
 * Returns the incoming factual set unchanged.
 */
export function ensureDigitalHarassmentGapRows(
  rows: FiveAnswersEvidenceRow[],
  bundleHay: string,
  allegation = "",
): FiveAnswersEvidenceRow[] {
  void bundleHay;
  void allegation;
  return rows;
}
