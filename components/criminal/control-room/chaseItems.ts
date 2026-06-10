import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import { gateMaterialLines } from "@/lib/criminal/chase-source-gate";
import { scrubDevRefs } from "@/lib/criminal/dev-ref-scrub";

const CHASE_LINE_RE =
  /\b(chase|outstanding|not\s+served|awaiting|cctv|bwv|999|interview\s+recording|custody|mg6|disclosure|source\s+material|cad|continuity)\b/i;

const POSITION_ACTION_RE =
  /^record\s+defence\s+position|^take\s+instructions\s+before/i;

function normalizeChaseLabel(raw: string): string {
  return raw.replace(/^Chase\/record:\s*/i, "").trim();
}

function isChaseLine(text: string): boolean {
  const t = text.trim();
  if (!t || POSITION_ACTION_RE.test(t)) return false;
  return CHASE_LINE_RE.test(t);
}

export function collectChaseItems(input: {
  snapshotMissing?: { label: string; status: string }[];
  proceduralOutstanding?: string[];
  battleboard?: BattleboardOutput | null;
  bundleText?: string | null;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string | null | undefined) => {
    const s = scrubDevRefs(normalizeChaseLabel(raw ?? ""));
    if (!s || seen.has(s)) return;
    seen.add(s);
    out.push(s);
  };

  for (const m of input.snapshotMissing ?? []) {
    if (m.status === "MISSING" || m.status === "UNASSESSED") push(m.label);
  }
  for (const item of input.proceduralOutstanding ?? []) {
    if (isChaseLine(item)) push(item);
    else push(item);
  }
  for (const u of input.battleboard?.urgent_next_moves ?? []) {
    if (isChaseLine(u)) push(u);
  }
  for (const route of input.battleboard?.routes ?? []) {
    for (const move of route.next_moves ?? []) {
      if (isChaseLine(move)) push(move);
    }
  }

  return input.bundleText?.trim() ? gateMaterialLines(out, input.bundleText) : out;
}

export function formatMissingEvidenceStrip(chaseItems: string[]): { label: string; warn: boolean } {
  if (chaseItems.length === 0) {
    return { label: "None tracked", warn: false };
  }
  const preview = chaseItems.slice(0, 3).join(" · ");
  const head =
    chaseItems.length >= 2 ? "Source-material chase required" : "Chase items detected";
  return {
    label: `${head}: ${preview}`.slice(0, 120),
    warn: true,
  };
}

export function formatDisclosureGlance(chaseItems: string[]): string {
  if (chaseItems.length === 0) return "No tracked gaps";
  if (chaseItems.length === 1) return "Chase items detected";
  return `Source-material chase (${chaseItems.length} items)`;
}
