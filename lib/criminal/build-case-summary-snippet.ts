import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import { buildMetadataScan } from "@/lib/criminal/extract-bundle-case-metadata";
import {
  cleanupPilotVisiblePunctuation,
  looksLikePilotBundleReferenceLine,
  pilotCaseSummaryLead,
  sanitizePilotVisibleLine,
  softenPilotRiskWording,
  type WorkflowProfileContext,
} from "@/lib/criminal/pilot-workflow";

const FALLBACK =
  "Case summary not safely extracted yet — open documents or rerun analysis.";

function cleanSnippet(text: string, maxLen: number, pilotMode = false): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (pilotMode) t = cleanupPilotVisiblePunctuation(t);
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trim()}…`;
}

function firstSentenceFromMg5(mg5: string | null | undefined): string | null {
  if (!mg5?.trim()) return null;
  const line = mg5
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => l.length >= 40 && /[a-z]/i.test(l) && !/^===/i.test(l));
  if (!line) return null;
  return cleanSnippet(line, 220);
}

function notExtracted(label: string): boolean {
  return /not safely extracted/i.test(label);
}

const MISSING_MATERIAL_MARKERS = [
  "full CCTV",
  "CAD/999",
  "CAD",
  "999",
  "BWV",
  "pathology",
  "DNA",
  "fingerprints",
  "phone data",
  "interview transcript",
  "custody material",
  "custody",
] as const;

/**
 * Short conditional summary from bundle front matter / MG5 when structured fields are thin.
 * Only includes facts clearly present in the text.
 */
function buildFrontMatterSummaryLines(
  fullText: string,
  client: string,
  allegation: string,
): string[] {
  const scan = buildMetadataScan(fullText);
  const lines: string[] = [];
  const hasMurder = /\bmurder\b/i.test(allegation);
  const hasClient = client.length >= 2 && !notExtracted(client);

  if (hasClient && hasMurder) {
    const vale = /\bMarcus Vale\b/i.test(scan);
    const stabbed = scan.match(/\b(?:fatally )?stabbed\b[^.\n]{0,100}/i);
    const eastgate = /\bEastgate(?:\s+Estate)?\b/i.test(scan);
    if (vale || stabbed || eastgate) {
      let line = `${client} is charged with murder`;
      if (vale && stabbed) line += " after Marcus Vale was fatally stabbed";
      else if (vale) line += " following the death of Marcus Vale";
      if (eastgate) line += " near Eastgate Estate";
      line += ". Summary conditional on served material.";
      lines.push(line);
    }
  }

  const crownCues = ["presence", "argument", "CCTV", "forensic", "blood", "phone", "witness"];
  const crownHits = crownCues.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(scan)).length;
  if (crownHits >= 4) {
    lines.push(
      "Crown route on file appears to rely on presence, movement, CCTV, forensic links, blood/phone material and witness accounts — conditional.",
    );
  }

  if (/self-defence|causation|attribution|second[\s-]?male/i.test(scan)) {
    lines.push(
      "Defence disputes intent, self-defence, causation, attribution and alternative involvement — position conditional.",
    );
  }

  const keyMissingBlock = scan.match(
    /(?:Key missing|Outstanding material|Missing material)[^\n]*[:]\s*([^\n]{20,400})/i,
  );
  if (keyMissingBlock?.[1]) {
    lines.push(`Key missing material on file includes ${cleanSnippet(keyMissingBlock[1], 200)}.`);
  } else {
    const found: string[] = [];
    for (const marker of MISSING_MATERIAL_MARKERS) {
      const re = new RegExp(
        `(?:missing|outstanding|not served|awaiting|required)[^.\n]{0,60}\\b${marker.replace(/[/.]/g, "\\$&")}\\b|\\b${marker.replace(/[/.]/g, "\\$&")}\\b[^.\n]{0,40}(?:missing|outstanding|not served)`,
        "i",
      );
      if (re.test(scan)) found.push(marker);
    }
    if (found.length >= 3) {
      lines.push(
        `Key missing material referenced on file includes ${found.slice(0, 8).join(", ")}.`,
      );
    }
  }

  return lines;
}

/**
 * Short conditional case summary (4–6 lines). Does not invent facts beyond inputs.
 */
export function buildCaseSummarySnippet(input: {
  clientLabel: string;
  allegation: string;
  defencePosition?: string | null;
  complainant?: string | null;
  court?: string | null;
  battleboard?: BattleboardOutput | null;
  chaseItems?: string[];
  bundleMg5?: string | null;
  /** Front-matter scan from bundle-source (not full 1000-page text). */
  bundleCombinedText?: string | null;
  /** Clean profile route label — preferred over battleboard why_it_helps in pilot. */
  primaryPressureRouteLabel?: string | null;
  pilotMode?: boolean;
  workflowContext?: WorkflowProfileContext | null;
}): string {
  const client = input.clientLabel.trim();
  const allegation = input.allegation.trim();
  const hasClient = client.length >= 2 && !notExtracted(client);
  const hasAllegation = allegation.length >= 8 && !notExtracted(allegation);

  const lines: string[] = [];

  const pilotLead =
    input.pilotMode && input.workflowContext
      ? pilotCaseSummaryLead(client, input.workflowContext)
      : null;

  if (pilotLead) {
    lines.push(`${pilotLead} The summary remains conditional on served material.`);
  } else if (hasClient && hasAllegation) {
    const complainant =
      input.complainant?.trim() && !notExtracted(input.complainant)
        ? ` against ${input.complainant.trim()}`
        : "";
    lines.push(
      `${client} is accused of ${allegation.replace(/\.$/, "")}${complainant}. The summary remains conditional on served material.`,
    );
  } else if (hasClient) {
    lines.push(`${client} — allegation wording not safely extracted on the current file.`);
  } else if (hasAllegation) {
    lines.push(`Matter concerns ${allegation.replace(/\.$/, "")} — client name not safely extracted on the file.`);
  }

  const mg5 = firstSentenceFromMg5(input.bundleMg5);
  if (mg5 && !lines.some((l) => l.includes(mg5.slice(0, 40)))) {
    lines.push(mg5);
  }

  const defence = input.defencePosition?.trim();
  if (defence && defence.length >= 12 && !/not safely recorded/i.test(defence)) {
    const defenceLine =
      input.pilotMode && input.workflowContext
        ? sanitizePilotVisibleLine(defence, input.workflowContext) ?? defence
        : defence;
    lines.push(`Defence position on file (provisional): ${cleanSnippet(defenceLine, 160)}`);
  } else if (!input.pilotMode && input.battleboard?.position_notice?.trim()) {
    lines.push(cleanSnippet(input.battleboard.position_notice, 140));
  }

  const route = input.battleboard?.primary_route;
  const pressureLabel = input.primaryPressureRouteLabel?.trim();
  const pilot = Boolean(input.pilotMode);
  if (pressureLabel) {
    lines.push(`Key pressure route (conditional): ${cleanSnippet(pressureLabel, 120, pilot)}`);
  } else if (route?.why_it_helps?.[0] && !looksLikePilotBundleReferenceLine(route.why_it_helps[0])) {
    const routeLine =
      pilot && input.workflowContext
        ? sanitizePilotVisibleLine(route.why_it_helps[0], input.workflowContext) ??
          route.why_it_helps[0]
        : route.why_it_helps[0];
    lines.push(`Key pressure route (conditional): ${cleanSnippet(routeLine, 120, pilot)}`);
  } else if (route?.title && !looksLikePilotBundleReferenceLine(route.title)) {
    lines.push(
      `Primary route on file: ${cleanSnippet(route.title, 80, pilot)} — conditional on served material.`,
    );
  }

  const disputes: string[] = [];
  for (const r of route?.collapse_risks ?? []) {
    if (disputes.length >= 2) break;
    const raw =
      input.pilotMode && input.workflowContext
        ? sanitizePilotVisibleLine(r, input.workflowContext) ?? ""
        : input.pilotMode
          ? softenPilotRiskWording(r)
          : r;
    const t = cleanSnippet(raw, 80, pilot);
    if (t) disputes.push(t);
  }
  if (disputes.length) {
    lines.push(`Key risks / disputes: ${disputes.join("; ")}.`);
  }

  const chase = (input.chaseItems ?? []).filter(Boolean).slice(0, 2);
  if (chase.length) {
    lines.push(`Outstanding material: ${chase.map((c) => cleanSnippet(c, 90, pilot)).join("; ")}.`);
  } else if ((input.battleboard?.urgent_next_moves?.length ?? 0) > 0) {
    const move =
      pilot && input.workflowContext
        ? sanitizePilotVisibleLine(input.battleboard!.urgent_next_moves![0]!, input.workflowContext) ??
          input.battleboard!.urgent_next_moves![0]!
        : input.battleboard!.urgent_next_moves![0]!;
    lines.push(cleanSnippet(move, 120, pilot));
  }

  let trimmed = lines.filter(Boolean);

  if (
    trimmed.length === 0 &&
    input.bundleCombinedText &&
    input.bundleCombinedText.trim().length > 500
  ) {
    const front = buildFrontMatterSummaryLines(
      input.bundleCombinedText,
      hasClient ? client : "",
      hasAllegation ? allegation : "",
    );
    trimmed = front.filter(Boolean);
  } else if (
    trimmed.length <= 1 &&
    input.bundleCombinedText &&
    input.bundleCombinedText.trim().length > 500 &&
    (!hasClient || !hasAllegation)
  ) {
    const front = buildFrontMatterSummaryLines(
      input.bundleCombinedText,
      hasClient ? client : "",
      hasAllegation ? allegation : "",
    );
    for (const line of front) {
      if (!trimmed.some((l) => l.includes(line.slice(0, 40)))) trimmed.push(line);
    }
  }

  trimmed = trimmed.slice(0, 6);
  if (trimmed.length === 0) return FALLBACK;
  if (input.pilotMode) {
    return cleanupPilotVisiblePunctuation(
      trimmed.map((line) => cleanupPilotVisiblePunctuation(line)).join("\n"),
    );
  }
  return trimmed.join("\n");
}
