import { humanizeChaseFragmentLabel } from "@/lib/criminal/disclosure-chase-finalize";

/** Prod Taylor Loom demo case — presentation routing only. */
export const DEMO_PRESENTATION_CASE_ID =
  process.env.NEXT_PUBLIC_DEMO_PRESENTATION_CASE_ID?.trim() ||
  "4e22fb0f-8631-4cda-9aef-fea6a24f6163";

export function buildDemoPresentationCaseHref(): string {
  return `/cases/${DEMO_PRESENTATION_CASE_ID}?tab=overview&controlRoom=1`;
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
  return why ? `${core} — ${why}` : core;
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

/** Drop wrong-family do-not-say / risk lines when bundle does not mention that material. */
export function filterBundleFamilyWarnings(lines: string[], bundleHay: string): string[] {
  const hay = bundleHay.toLowerCase();
  const families: BundleFamily[] = ["bwv", "custody", "drugs", "cctv", "cad", "encro", "abe"];
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      for (const family of families) {
        if (lineMentionsFamily(line, family) && !bundleMentionsFamily(hay, family)) {
          return false;
        }
      }
      return true;
    });
}
