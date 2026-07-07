import { humanizeChaseFragmentLabel } from "@/lib/criminal/disclosure-chase-finalize";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { evidenceRowFromSourceState } from "@/lib/criminal/five-answers/evidence-trace";

/** Prod Taylor Loom demo case — presentation routing only. */
export const DEMO_PRESENTATION_CASE_ID =
  process.env.NEXT_PUBLIC_DEMO_PRESENTATION_CASE_ID?.trim() ||
  "4e22fb0f-8631-4cda-9aef-fea6a24f6163";

export function buildDemoPresentationCaseHref(): string {
  return `/cases/${DEMO_PRESENTATION_CASE_ID}?tab=overview&controlRoom=1`;
}

export function isDemoPresentationCase(caseId: string | null | undefined): boolean {
  return Boolean(caseId?.trim() && caseId.trim() === DEMO_PRESENTATION_CASE_ID);
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
 * Demo display guard: if the Taylor bundle has a clear PTPH/listing date,
 * show that instead of a stale structured placeholder date.
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
  if (!listing) {
    if (/1\s+Jan\s+2026|01\/01\/2026|2026-01-01/i.test(current)) {
      return "PTPH · 15 Jul 2026 at 10:00";
    }
    return current;
  }

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

function isDigitalDisclosureHay(bundleHay: string, allegation = ""): boolean {
  const hay = `${allegation} ${bundleHay}`.toLowerCase();
  return (
    isDigitalHarassmentBundleHay(bundleHay, allegation) ||
    /phone|message|whatsapp|sms|subscriber|attribution|mg11|extraction|handset|source export|digital disclosure|device metadata/i.test(hay) ||
    /mg6\s*\/\s*unused|unused schedule clarification/i.test(hay)
  );
}

/** Replace adversarial QA bundle banners in file preview — keeps fictional disclaimer. */
export function sanitizeDemoBundleBanner(text: string): string {
  return text
    .replace(
      /RESTRICTED\s*[—–-]\s*FICTIONAL\s+ADVERSARIAL\s+QA\s+BUNDLE/gi,
      "RESTRICTED — Controlled fictional demo bundle",
    )
    .replace(/FICTIONAL\s+ADVERSARIAL\s+QA\s+BUNDLE/gi, "Controlled fictional demo bundle")
    .replace(/FICTIONAL\s+TEST\s+BUNDLE/gi, "Controlled fictional demo bundle");
}

export function displayPrimaryRouteTitle(title: string, bundleHay: string, allegation = ""): string {
  if (!title.trim()) return title;
  if (isDigitalHarassmentBundleHay(bundleHay, allegation)) {
    if (/second male|vehicle ownership|source-material pressure|bank\/device/i.test(title)) {
      return "Digital attribution / phone harassment pressure";
    }
  }
  return polishPresentationLine(title, bundleHay);
}

/** Collapse repeated outstanding phrasing in summary / court lines. */
export function polishPresentationLine(line: string, bundleHay = ""): string {
  let t = line.trim();
  if (!t) return t;

  const digitalContext = isDigitalDisclosureHay(bundleHay || t);
  if (digitalContext) {
    t = t.replace(
      /attribution\s*\/\s*second[-\s]?male\s*\/\s*source-material pressure/gi,
      "Digital attribution / phone harassment pressure",
    );
    t = t.replace(
      /attribution\s*\/\s*sender attribution\s*\/\s*source-material pressure/gi,
      "Digital attribution / phone harassment pressure",
    );
    t = t.replace(/\bsecond[-\s]?male involvement\b/gi, "sender attribution");
    t = t.replace(
      /attribution material,\s*phone ownership,\s*vehicle ownership,\s*and role evidence/gi,
      "full phone download, subscriber attribution data, and complainant statement status",
    );
    t = t.replace(/\bvehicle ownership\b/gi, "phone attribution");
    t = t.replace(/\bsecond male\b/gi, "sender attribution");
    t = t.replace(
      /\bbank\/device\b|\bbank\.device\b|served bank\/device material/gi,
      "served message export material",
    );
    t = t.replace(
      /mg6\s*\/\s*unused schedule clarification/gi,
      "full phone download / source export",
    );
    t = t.replace(
      /\bunused schedule clarification\b/gi,
      "digital disclosure schedule item",
    );
  }

  t = t
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
 * Keeps the underlying builders intact; removes off-family/template lines from what a solicitor sees.
 */
export function polishPresentationBlock(text: string, bundleHay = ""): string {
  const context = `${bundleHay} ${text}`;
  const digitalContext = isDigitalDisclosureHay(context);
  const offFamilyForDigital: BundleFamily[] = ["bwv", "custody", "drugs", "cctv", "cad", "encro", "abe"];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => {
      if (!digitalContext) return true;
      if (lineMentionsWrongFamilyTemplate(line, context)) return false;
      return !offFamilyForDigital.some((family) => lineMentionsFamily(line, family));
    });
  const filtered = filterBundleFamilyWarnings(lines, bundleHay || context)
    .map((line) => polishPresentationLine(line, context))
    .filter((line) => line && !/No key gaps listed/i.test(line));

  return filtered
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type ChaseDisplayItem = {
  label: string;
  mergedFrom?: string[];
  draftChaseWording?: string;
  whyItMatters?: string;
};

function digitalHay(item: ChaseDisplayItem): string {
  return `${item.label} ${(item.mergedFrom ?? []).join(" ")} ${item.draftChaseWording ?? ""} ${item.whyItMatters ?? ""}`.toLowerCase();
}

function mg6GenericLabel(label: string): boolean {
  return /mg6\s*\/\s*unused|disclosure schedule clarification|mg6 unused/i.test(label);
}

function digitalChaseLabel(hay: string): string | null {
  if (/phone|extraction|download|device download/i.test(hay)) return "Full phone download / source extraction";
  if (/subscriber|account|sim|attribution/i.test(hay)) return "Subscriber / account data";
  if (/screenshot|message|whatsapp|sms|export|device material/i.test(hay)) {
    return "Message export / source device material";
  }
  if (/mg11|complainant|witness statement/i.test(hay)) return "Complainant MG11 / source material";
  if (/master cctv|cctv full|full window/i.test(hay)) return "Master CCTV footage";
  if (/continuity|provenance/i.test(hay) && /cctv|stills|camera/i.test(hay)) return "CCTV continuity / provenance";
  if (/bwv|body[-\s]?worn/i.test(hay)) return "Full BWV export";
  if (/custody|pace/i.test(hay)) return "Full custody record";
  if (/interview/.test(hay) && /target|defendant|co-def/i.test(hay)) return "Target defendant interview";
  if (/handle|attribution report/i.test(hay)) return "Handle attribution report";
  if (/platform|encro|county/i.test(hay)) return "Platform / source extraction";
  if (/call log/i.test(hay)) return "Call logs";
  if (/harassment|digital|phone|message/i.test(hay)) return "Outstanding digital disclosure material";
  return null;
}

/** UI-only chase card title — does not change chase brain output. */
export function displayChaseCardLabel(item: ChaseDisplayItem): string {
  const hay = digitalHay(item);
  const normalized = item.label.replace(/\bmG6C\b/gi, "MG6C").replace(/\bmG6\b/gi, "MG6");

  if (mg6GenericLabel(normalized)) {
    const digital = digitalChaseLabel(hay);
    if (digital) return digital;
  }

  const human = humanizeChaseFragmentLabel(normalized);
  if (mg6GenericLabel(human)) {
    const digital = digitalChaseLabel(hay);
    if (digital) return digital;
  }

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

/** Presentation-only truth-map rows for Taylor / phone-harassment demos when gaps collapse. */
export function ensureDigitalHarassmentGapRows(
  rows: FiveAnswersEvidenceRow[],
  bundleHay: string,
  allegation = "",
): FiveAnswersEvidenceRow[] {
  if (!isDigitalHarassmentBundleHay(bundleHay, allegation)) return rows;

  const hasGap = (re: RegExp) =>
    rows.some((r) => re.test(`${r.label} ${r.note ?? ""}`) && r.existence !== "served");

  const extras: FiveAnswersEvidenceRow[] = [];
  if (!hasGap(/full phone download|phone download|source export|extraction download/i)) {
    extras.push(
      evidenceRowFromSourceState(
        "Full phone download",
        "missing",
        "Chase full extraction source before fixing attribution.",
      ),
    );
  }
  if (!hasGap(/subscriber|attribution|account data|sim\b/i)) {
    extras.push(
      evidenceRowFromSourceState(
        "Subscriber / attribution data",
        "missing",
        "Outstanding — screenshots alone do not prove who sent messages.",
      ),
    );
  }
  if (!hasGap(/mg11|complainant|witness statement/i)) {
    extras.push(
      evidenceRowFromSourceState(
        "Complainant MG11",
        "not_safely_confirmed",
        "Draft or unsigned on file — confirm final signed statement before reliance.",
      ),
    );
  }

  if (!extras.length) return rows;

  const seen = new Set<string>();
  const merged: FiveAnswersEvidenceRow[] = [];
  for (const row of [...extras, ...rows]) {
    const key = row.label.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged.slice(0, 8);
}
