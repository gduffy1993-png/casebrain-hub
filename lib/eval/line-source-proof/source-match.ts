import type { LineCategory, LineSourceStrength } from "./types";
import {
  detectPhoneSubtopic,
  preferredMg6ScheduleId,
} from "./case-shape-anchors";

export type BundleSection = { name: string; body: string; startLine: number };

export function parseBundleSections(bundleText: string): BundleSection[] {
  const sections: BundleSection[] = [];
  const parts = bundleText.split(/^=== SECTION:\s*(.+?)\s*===/m);
  let lineNo = 1;
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i]?.trim() ?? "unknown";
    const body = parts[i + 1]?.trim() ?? "";
    sections.push({ name, body, startLine: lineNo });
    lineNo += (parts[i]?.split(/\n/).length ?? 0) + (body.split(/\n/).length ?? 0);
  }
  if (sections.length === 0) {
    sections.push({ name: "FULL_BUNDLE", body: bundleText, startLine: 1 });
  }
  return sections;
}

type EvidenceTopic =
  | "cctv"
  | "cad"
  | "bwv"
  | "custody"
  | "mg11"
  | "mg6"
  | "mg5"
  | "charge"
  | "interview"
  | "phone"
  | "encro"
  | "abe"
  | "exhibit"
  | "unknown";

const TOPIC_PATTERNS: Array<{ topic: EvidenceTopic; linePattern: RegExp; labelPattern: RegExp }> = [
  { topic: "cctv", linePattern: /\bcctv\b|master footage|cctv full/i, labelPattern: /\bcctv\b|master footage/i },
  { topic: "cad", linePattern: /\bcad\b|\b999\b|emergency call logging/i, labelPattern: /\bcad\b|\b999\b/i },
  { topic: "bwv", linePattern: /\bbwv\b|body[-\s]?worn/i, labelPattern: /\bbwv\b|body[-\s]?worn/i },
  {
    topic: "custody",
    linePattern: /\bcustody|pace\b|safeguard/i,
    labelPattern: /\bcustody|pace\b|safeguard/i,
  },
  { topic: "mg11", linePattern: /\bmg11|officer statement|complainant statement/i, labelPattern: /\bmg11|officer statement|complainant/i },
  { topic: "mg6", linePattern: /\bmg6|unused schedule|mg6c\//i, labelPattern: /\bmg6|schedule/i },
  { topic: "mg5", linePattern: /\bmg5|offence report/i, labelPattern: /\bmg5/i },
  {
    topic: "charge",
    linePattern: /statement of offence|particulars of offence|contrary to section|harassment|possession of/i,
    labelPattern: /assault|charge|offence|harassment|possession of|indecent images/i,
  },
  { topic: "interview", linePattern: /\binterview|transcript\b/i, labelPattern: /\binterview|transcript/i },
  {
    topic: "phone",
    linePattern: /\bphone|ufed|screenshot|extraction|subscriber|whatsapp|sms|message export|attribution|download summary|multiple exports|mg6c\/mul|mg6c\/pla|phone seizure|partial message|mg6c\/pho/i,
    labelPattern: /\bphone|ufed|screenshot|subscriber|whatsapp|sms|message|attribution|extraction|multiple exports|phone seizure|partial message/i,
  },
  {
    topic: "encro",
    linePattern: /\bencro|handle mapping|encrypted comms|encrochat|shadow-\d+/i,
    labelPattern: /\bencro|handle mapping|encrochat|shadow-\d+/i,
  },
  {
    topic: "abe",
    linePattern: /\babe\b|achieving best evidence|first account|interview recording/i,
    labelPattern: /\babe\b|first account|interview recording/i,
  },
  { topic: "exhibit", linePattern: /\bexhibit mapping|provenance/i, labelPattern: /\bexhibit/i },
];

function bundleLines(bundleText: string): string[] {
  return bundleText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function findLines(bundleText: string, pattern: RegExp): string[] {
  return bundleLines(bundleText).filter((l) => pattern.test(l));
}

export function detectTopic(hay: string): EvidenceTopic {
  for (const { topic, labelPattern } of TOPIC_PATTERNS) {
    if (labelPattern.test(hay)) return topic;
  }
  return "unknown";
}

/** Allegation lines with offence wording should not be routed to phone attribution topic. */
export function resolveTopicForBundle(hay: string, bundleText: string): EvidenceTopic {
  if (/\bpossession of\b|indecent images|contrary to section/i.test(hay) && !/\bphone\b|subscriber|ufed|screenshot pack/i.test(hay)) {
    return "charge";
  }
  let topic = detectTopic(hay);
  if (
    topic === "cctv" &&
    /\bbwv\b|body[-\s]?worn/i.test(hay) &&
    bundleMentionsTopic(bundleText, "bwv") &&
    !bundleMentionsTopic(bundleText, "cctv")
  ) {
    return "bwv";
  }
  return topic;
}

function bundleMentionsTopic(bundleText: string, topic: EvidenceTopic): boolean {
  if (topic === "unknown") return false;
  const rule = TOPIC_PATTERNS.find((p) => p.topic === topic);
  if (!rule) return false;
  return rule.linePattern.test(bundleText);
}

function rankHits(topic: EvidenceTopic, hits: string[]): string[] {
  if (hits.length <= 1) return hits;
  const score = (line: string): number => {
    const l = line.toLowerCase();
    if (topic === "bwv") {
      if (/mg6c\/\d+.*bwv|bwv.*referred|not attached/i.test(l)) return 100;
      if (/\bbwv\b|body[-\s]?worn/i.test(l)) return 80;
      return 10;
    }
    if (topic === "custody") {
      if (/custody record extract|mg6c\/\d+.*custody|pace|safeguard/i.test(l)) return 100;
      if (/\bcustody|pace\b/i.test(l)) return 70;
      return 10;
    }
    if (topic === "encro") {
      if (/mg6c\/enc|encro message/i.test(l)) return 100;
      if (/mg6c\/han|handle mapping/i.test(l)) return 95;
      if (/mg6c\/co-|co-defendant/i.test(l)) return 90;
      if (/mg6c\/pla|platform extraction/i.test(l)) return 85;
      if (/shadow-\d+|mapping certificate/i.test(l)) return 80;
      return 20;
    }
    if (topic === "abe") {
      if (/mg6c\/abe.*transcript fragment.*served/i.test(l)) return 100;
      if (/mg6c\/abe.*recording.*referred/i.test(l)) return 90;
      if (/mg6c\/abe.*recording.*outstanding/i.test(l)) return 85;
      if (/first account outstanding|not served — first account/i.test(l)) return 95;
      return 30;
    }
    if (topic === "cctv") {
      if (/mg6c\/cct.*still.*served/i.test(l)) return 100;
      if (/mg6c\/mas.*master cctv.*referred/i.test(l)) return 95;
      if (/mg6c\/mas.*master footage.*outstanding/i.test(l)) return 90;
      if (/\bcctv|master footage/i.test(l)) return 70;
      return 0;
    }
    if (topic === "cad") {
      if (/\bcad\s+log\b|\bcad\b.*outstanding|\b999\b/i.test(l)) return 100;
      if (/\bcad\b|\b999\b/i.test(l)) return 80;
      if (/emergency call|non-emergency/i.test(l)) return 40;
      return 10;
    }
    if (topic === "mg6") {
      if (/mg6c\//i.test(l)) return 100;
      if (/mg6/i.test(l)) return 60;
      return 10;
    }
    if (topic === "phone") {
      if (/mg6c\/001.*phone extraction|summary only|source download outstanding/i.test(l)) return 100;
      if (/mg6c\/002.*screenshot/i.test(l)) return 100;
      if (/mg6c\/003.*subscriber/i.test(l)) return 100;
      if (/mg6c\//i.test(l)) return 90;
      if (/attribution disputed|complainant mg11/i.test(l)) return 85;
      if (/screenshot pack \(served\)/i.test(l) && !/\|\s*\d+\s*\|/.test(l)) return 70;
      if (/\|\s*\d+\s*\|/.test(l)) return 5;
      return 40;
    }
    if (topic === "mg11") {
      if (/attribution disputed|messages caused/i.test(l)) return 100;
      return 60;
    }
    return 50;
  };
  return [...hits].sort((a, b) => score(b) - score(a));
}

function topicLineHits(bundleText: string, topic: EvidenceTopic): string[] {
  const rule = TOPIC_PATTERNS.find((p) => p.topic === topic);
  if (!rule) return [];
  return rankHits(topic, findLines(bundleText, rule.linePattern));
}

export function isGenericSnippet(snippet: string | null): boolean {
  if (!snippet?.trim()) return true;
  const s = snippet.trim();
  if (s.length < 24) return true;
  if (/^\s*\|?\s*document\s*\|/i.test(s)) return true;
  if (/\|\s*\d+\s*\|/.test(s) && s.length < 80) return true;
  if (/^mg6\s*\/\s*unused schedule/i.test(s) && !/mg6c\//i.test(s)) return true;
  if (/^bundle:\s*/i.test(s)) return true;
  if (/^section\s+\w+$/i.test(s)) return true;
  return false;
}

export function snippetSupportsEvidenceItem(
  evidenceItem: string | null,
  outputLine: string,
  snippet: string | null,
  topic: EvidenceTopic,
  lineCategory?: LineCategory,
): { ok: boolean; reason: string | null } {
  if (!snippet?.trim()) {
    return { ok: false, reason: "no_source_found" };
  }

  const itemHay = `${evidenceItem ?? ""} ${outputLine}`.toLowerCase();
  const snippetLower = snippet.toLowerCase();

  if (topic === "cctv") {
    if (!/\bcctv|master footage/i.test(snippetLower)) {
      return { ok: false, reason: "adjacent_source_mismatch" };
    }
    return { ok: true, reason: null };
  }

  if (topic === "cad") {
    const relaxed =
      lineCategory === "strategic_review" ||
      lineCategory === "contradiction_or_risk" ||
      lineCategory === "evidence_state" ||
      lineCategory === "court_note" ||
      lineCategory === "chase_request" ||
      lineCategory === "export_line";
    if (!/\bcad\b|\b999\b/i.test(snippetLower)) {
      return relaxed && /cad log|call recording|non-emergency/i.test(snippetLower)
        ? { ok: true, reason: null }
        : { ok: false, reason: "adjacent_source_mismatch" };
    }
    return { ok: true, reason: null };
  }

  if (topic === "phone") {
    const sub = detectPhoneSubtopic(itemHay);
    const relaxed =
      lineCategory === "strategic_review" ||
      lineCategory === "contradiction_or_risk" ||
      lineCategory === "evidence_state" ||
      lineCategory === "court_note" ||
      lineCategory === "export_line";
    if (sub === "screenshot" && !/screenshot/i.test(snippetLower)) {
      return relaxed && /mg6c\/00[123]|phone|message/i.test(snippetLower)
        ? { ok: true, reason: null }
        : { ok: false, reason: "adjacent_source_mismatch" };
    }
    if (sub === "subscriber" && !/subscriber|account data/i.test(snippetLower)) {
      return relaxed && /mg6c\/00[123]/i.test(snippetLower)
        ? { ok: true, reason: null }
        : { ok: false, reason: "adjacent_source_mismatch" };
    }
    if (sub === "extraction" && !/phone extraction|extraction|download|summary only|ufed|multiple exports|platform extraction|phone seizure|partial message|screenshot/i.test(snippetLower)) {
      return relaxed && /mg6c\/(ufe|pla|mul|pho|00[123])|ufed|export not served|multiple exports|phone seizure|partial message/i.test(snippetLower)
        ? { ok: true, reason: null }
        : { ok: false, reason: "adjacent_source_mismatch" };
    }
    if (sub === "attribution" && !/attribution|mg11|complainant/i.test(snippetLower)) {
      return relaxed && /mg6c\/00[123]|mg11|attribution|message/i.test(snippetLower)
        ? { ok: true, reason: null }
        : { ok: false, reason: "adjacent_source_mismatch" };
    }
    return { ok: true, reason: null };
  }

  if (topic === "encro") {
    if (!/\bencro|handle mapping/i.test(snippetLower)) {
      return { ok: false, reason: "adjacent_source_mismatch" };
    }
    return { ok: true, reason: null };
  }

  if (topic === "bwv") {
    if (!/\bbwv|body[-\s]?worn/i.test(snippetLower)) {
      return { ok: false, reason: "adjacent_source_mismatch" };
    }
    return { ok: true, reason: null };
  }

  if (topic === "custody") {
    if (!/\bcustody|pace|safeguard/i.test(snippetLower)) {
      return { ok: false, reason: "adjacent_source_mismatch" };
    }
    if (itemHay.includes("cctv") && !/\bcctv/i.test(snippetLower)) {
      return { ok: false, reason: "adjacent_source_mismatch" };
    }
    return { ok: true, reason: null };
  }

  if (evidenceItem) {
    const tokens = evidenceItem
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3 && !["full", "record", "material", "video"].includes(t));
    const matched = tokens.some((t) => snippetLower.includes(t));
    if (tokens.length > 0 && !matched && topic === "unknown") {
      return { ok: false, reason: "evidence_item_not_in_snippet" };
    }
  }

  return { ok: true, reason: null };
}

export type SourceMatch = {
  sourceAnchor: string | null;
  sourcePage: string | null;
  sourceSection: string | null;
  sourceSnippet: string | null;
  sourceStrength: LineSourceStrength;
  topic: EvidenceTopic;
  bundleMentionsTopic: boolean;
  genericSourceOnly: boolean;
  adjacentMismatch: boolean;
  evidenceItemInSnippet: boolean;
  reviewReason: string | null;
};

function pageFromSnippet(snippet: string): string | null {
  const m = snippet.match(/\b(?:pp?\.?|pages?)\s*(\d+(?:-\d+)?)/i) ?? snippet.match(/\|\s*(\d+)\s*\|/);
  return m?.[1] ?? null;
}

function sectionFromSnippet(sections: BundleSection[], snippet: string): string | null {
  const probe = snippet.toLowerCase().slice(0, 48);
  for (const s of sections) {
    if (s.body.toLowerCase().includes(probe)) return s.name;
  }
  return null;
}

function inferStrengthFromSnippet(snippet: string): LineSourceStrength {
  const lower = snippet.toLowerCase();
  if (/referred|not attached|outstanding|extract only|draft unsigned/i.test(lower)) {
    return /mg6c\/|mg6|schedule/i.test(lower) ? "schedule_only" : "medium";
  }
  if (/^\s*\|?\s*document\s*\|/i.test(snippet) || /\|\s*\d+\s*\|/.test(snippet) && snippet.length < 60) {
    return "index_only";
  }
  if (/signed|served|i activated|officer states|statement of offence/i.test(lower)) return "strong";
  if (/ocr|fragment|partial/i.test(lower)) return "ocr_fragile";
  if (snippet.length < 24) return "no_anchor";
  if (/mg6\s*\/\s*unused/i.test(lower) && !/mg6c\//i.test(lower)) return "weak";
  return "medium";
}

function filterHitsForTopic(topic: EvidenceTopic, ranked: string[], hay = ""): string[] {
  if (topic === "bwv") {
    return ranked.filter((h) => /\bbwv|body[-\s]?worn|mg6c\/\d+.*bwv/i.test(h));
  }
  if (topic === "custody") {
    return ranked.filter((h) => /\bcustody|pace|safeguard|mg6c\/\d+.*custody/i.test(h));
  }
  if (topic === "encro") {
    return ranked.filter((h) => /encro|handle mapping|shadow-|mg6c\/(enc|han|pla|co-)/i.test(h));
  }
  if (topic === "abe") {
    return ranked.filter((h) => /abe|first account|mg6c\/abe|mg6c\/ful/i.test(h));
  }
  if (topic === "cctv") {
    return ranked.filter((h) => /\bcctv|master footage|mg6c\/(cct|mas)/i.test(h));
  }
  if (topic === "cad") {
    return ranked.filter((h) => /\bcad\b|\b999\b|cad log|call recording/i.test(h));
  }
  if (topic === "phone") {
    const sub = detectPhoneSubtopic(hay);
    if (sub === "extraction") {
      const extractionHits = ranked.filter((h) =>
        /mg6c\/(ufe|pla|mul|pho)|ufed extraction|platform extraction|multiple exports|phone seizure|partial message|screenshot pack|referred on mg6.*export not served/i.test(
          h,
        ),
      );
      if (extractionHits.length > 0) return extractionHits;
    }
    const scheduleId = preferredMg6ScheduleId(sub);
    if (scheduleId) {
      const scheduled = ranked.filter((h) => new RegExp(`mg6c\\/${scheduleId}\\b`, "i").test(h));
      if (scheduled.length > 0) return scheduled;
    }
    return ranked.filter((h) => !/^\s*document\s*\|/i.test(h) && !(/\|\s*\d+\s*\|/.test(h) && h.length < 80));
  }
  if (topic === "mg11") {
    return ranked.filter((h) => /\bmg11|complainant|attribution disputed|messages caused/i.test(h));
  }
  return ranked;
}

function buildMatchFromHits(
  hits: string[],
  sections: BundleSection[],
  topic: EvidenceTopic,
  hay = "",
): SourceMatch {
  const ranked = rankHits(topic, hits);
  const filtered = filterHitsForTopic(topic, ranked, hay);
  const mg6Specific = filtered.filter((h) => /mg6c\//i.test(h));
  const useHits =
    topic === "bwv" || topic === "custody" || topic === "phone" || topic === "encro" || topic === "abe" || topic === "cctv"
      ? mg6Specific.length > 0
        ? mg6Specific
        : filtered
      : topic === "mg6"
        ? mg6Specific.length > 0
          ? mg6Specific
          : filtered
        : filtered;
  const joinLimit =
    topic === "bwv" || topic === "custody" || topic === "mg6" || topic === "phone" || topic === "encro" || topic === "abe" || topic === "cctv"
      ? 1
      : 2;
  const primary = useHits[0] ?? filtered[0] ?? ranked[0] ?? "";
  const snippet = useHits.slice(0, joinLimit).join(" | ").slice(0, 280);
  const generic =
    isGenericSnippet(primary) ||
    (topic === "mg6" && !/mg6c\//i.test(primary)) ||
    (topic === "phone" && /\|\s*\d+\s*\|/.test(primary) && primary.length < 80);
  return {
    sourceAnchor: primary || null,
    sourcePage: pageFromSnippet(snippet),
    sourceSection: sectionFromSnippet(sections, snippet),
    sourceSnippet: snippet,
    sourceStrength: generic ? "weak" : inferStrengthFromSnippet(snippet),
    topic,
    bundleMentionsTopic: true,
    genericSourceOnly: generic,
    adjacentMismatch: false,
    evidenceItemInSnippet: true,
    reviewReason: generic ? "generic_source_only" : null,
  };
}

function emptyMatch(topic: EvidenceTopic, bundleHasTopic: boolean, reason: string): SourceMatch {
  return {
    sourceAnchor: null,
    sourcePage: null,
    sourceSection: null,
    sourceSnippet: null,
    sourceStrength: "no_anchor",
    topic,
    bundleMentionsTopic: bundleHasTopic,
    genericSourceOnly: false,
    adjacentMismatch: reason === "adjacent_source_mismatch",
    evidenceItemInSnippet: false,
    reviewReason: reason,
  };
}

export function matchSourceForLine(
  bundleText: string,
  outputLine: string,
  evidenceItem: string | null,
  evidenceAnchor: string | null,
  lineCategory?: LineCategory,
): SourceMatch {
  const sections = parseBundleSections(bundleText);
  const hay = `${outputLine} ${evidenceItem ?? ""}`;
  const topic = resolveTopicForBundle(hay.toLowerCase(), bundleText);
  const bundleHasTopic = topic !== "unknown" ? bundleMentionsTopic(bundleText, topic) : false;

  const scheduleInOutput = outputLine.match(/mg6c\/([a-z0-9-]+)/i);
  if (scheduleInOutput) {
    const scheduleHits = findLines(bundleText, new RegExp(`mg6c\\/${scheduleInOutput[1]}\\b`, "i"));
    if (scheduleHits.length > 0) {
      return buildMatchFromHits(scheduleHits, sections, topic === "unknown" ? "phone" : topic, hay);
    }
  }

  if (evidenceAnchor?.trim()) {
    const snippet = evidenceAnchor.slice(0, 280);
    const generic = isGenericSnippet(snippet);
    const support = snippetSupportsEvidenceItem(evidenceItem, outputLine, snippet, topic);
    const anchorOk =
      support.ok &&
      !generic &&
      !(requiresLineLevelProof(lineCategory) && generic) &&
      !(topic === "bwv" && !/\bbwv|body[-\s]?worn|mg6c\/\d+.*bwv/i.test(snippet.toLowerCase()));

    if (anchorOk) {
      return {
        sourceAnchor: evidenceAnchor,
        sourcePage: pageFromSnippet(snippet),
        sourceSection: sectionFromSnippet(sections, snippet),
        sourceSnippet: snippet,
        sourceStrength: generic ? "weak" : inferStrengthFromSnippet(snippet),
        topic,
        bundleMentionsTopic: bundleHasTopic,
        genericSourceOnly: generic,
        adjacentMismatch: false,
        evidenceItemInSnippet: true,
        reviewReason: generic ? "generic_source_only" : null,
      };
    }
  }

  if (topic === "cctv" && !bundleHasTopic) {
    return emptyMatch("cctv", false, "bundle_does_not_mention_cctv");
  }

  if (topic === "cad" && !bundleHasTopic) {
    return emptyMatch("cad", false, "bundle_does_not_mention_cad");
  }

  if (topic !== "unknown") {
    let hits = topicLineHits(bundleText, topic);
    if (topic === "cad") {
      const cadExtras = findLines(bundleText, /\bcad\s+log|call recording.*cad|\bcad\b.*(?:outstanding|not listed|retained)/i);
      hits = [...new Set([...cadExtras, ...hits])];
    }
    if (topic === "custody") {
      const custodySection = sections.find((s) => s.name.toUpperCase().includes("CUSTODY"));
      if (custodySection?.body) {
        const bodyLine = custodySection.body.split(/\n/).map((l) => l.trim()).find((l) => l.length > 10);
        if (bodyLine) hits.unshift(bodyLine);
      }
    }
    if (topic === "mg11") {
      const mg11Section = sections.find((s) => s.name.toUpperCase().includes("MG11"));
      if (mg11Section?.body) {
        const bodyLine = mg11Section.body
          .split(/\n/)
          .map((l) => l.trim())
          .find((l) => l.length > 20 && !/^===/.test(l));
        if (bodyLine) hits.unshift(bodyLine);
      }
    }
    if (hits.length === 0) {
      return emptyMatch(topic, bundleHasTopic, bundleHasTopic ? "no_line_level_snippet" : "bundle_does_not_mention_topic");
    }
    const match = buildMatchFromHits(hits, sections, topic, hay);
    const support = snippetSupportsEvidenceItem(evidenceItem, outputLine, match.sourceSnippet, topic, lineCategory);
    if (!support.ok) {
      if (topic === "cad" && /\bcad\b/i.test(bundleText)) {
        const cadHits = findLines(bundleText, /\bcad\s+log|call recording.*cad|\bcad\b.*not listed/i);
        if (cadHits.length > 0) {
          const fallback = buildMatchFromHits(cadHits, sections, topic, hay);
          const fbSupport = snippetSupportsEvidenceItem(
            evidenceItem,
            outputLine,
            fallback.sourceSnippet,
            topic,
            lineCategory,
          );
          if (fbSupport.ok) {
            fallback.evidenceItemInSnippet = true;
            if (fallback.genericSourceOnly) fallback.reviewReason = "generic_source_only";
            return fallback;
          }
        }
      }
      return {
        ...emptyMatch(topic, bundleHasTopic, support.reason ?? "evidence_item_not_in_snippet"),
        sourceSnippet: null,
      };
    }
    match.evidenceItemInSnippet = true;
    if (match.genericSourceOnly) match.reviewReason = "generic_source_only";
    return match;
  }

  if (/assault|emergency worker|harassment|statement of offence|contrary to section/i.test(hay)) {
    const hits = findLines(bundleText, /assault|emergency worker|harassment|statement of offence|particulars of offence/i);
    if (hits.length > 0) {
      return buildMatchFromHits(hits, sections, "charge", hay);
    }
  }

  if (/message\/account|outstanding message|complainant statement/i.test(hay)) {
    const hits = [
      ...findLines(bundleText, /mg6c\/00[123]|phone extraction|screenshot pack|subscriber data/i),
      ...findLines(bundleText, /complainant mg11|attribution disputed/i),
    ];
    if (hits.length > 0) {
      return buildMatchFromHits(hits, sections, "phone", hay);
    }
  }

  if (lineCategory === "safety_warning") {
    return {
      sourceAnchor: null,
      sourcePage: null,
      sourceSection: null,
      sourceSnippet: null,
      sourceStrength: "no_anchor",
      topic: "unknown",
      bundleMentionsTopic: false,
      genericSourceOnly: false,
      adjacentMismatch: false,
      evidenceItemInSnippet: false,
      reviewReason: null,
    };
  }

  return emptyMatch("unknown", false, "no_source_found");
}

export function inferSupportFromEvidenceState(
  evidenceState: string | null,
  source: SourceMatch,
  outputLine: string,
  lineCategory?: LineCategory,
): import("./types").LineSupportStatus {
  if (lineCategory === "safety_warning") {
    return "supported";
  }

  if (source.adjacentMismatch || source.reviewReason === "bundle_does_not_mention_cctv" || source.reviewReason === "bundle_does_not_mention_cad") {
    if (lineCategory === "strategic_review" || lineCategory === "contradiction_or_risk") {
      return source.sourceSnippet ? "partially_supported" : "source_unavailable";
    }
    return "unsupported";
  }

  if (source.reviewReason === "full_extraction_overclaim" || source.reviewReason === "handle_attribution_overclaim" || source.reviewReason === "encro_overclaim" || source.reviewReason === "abe_overclaim" || source.reviewReason === "cctv_stills_overclaim") {
    return "unsupported";
  }

  if (source.reviewReason === "other_defendant_bleed") {
    return "blocked";
  }

  if (!source.sourceSnippet || source.sourceStrength === "no_anchor") {
    if (lineCategory && isMeaningfulEvidenceCategory(lineCategory)) {
      return "source_unavailable";
    }
    return "source_unavailable";
  }

  if (source.genericSourceOnly && requiresLineLevelProof(lineCategory)) {
    return "partially_supported";
  }

  if (!source.evidenceItemInSnippet && requiresLineLevelProof(lineCategory)) {
    return "partially_supported";
  }

  const lower = outputLine.toLowerCase();
  if (lineCategory !== "safety_warning" && /\b(blocked|must not say)\b/i.test(lower) && !/\bdo not (state|say|treat|import|overstate|rely)\b/i.test(lower)) {
    return "blocked";
  }

  switch (evidenceState) {
    case "served":
      return source.sourceStrength === "no_anchor" || source.genericSourceOnly ? "partially_supported" : "supported";
    case "referred_only":
      return "referred_only";
    case "missing":
      return source.sourceSnippet ? "missing" : "source_unavailable";
    case "incomplete":
      return "incomplete";
    case "not_safely_confirmed":
    case "provisional":
    case "unknown":
      return source.sourceStrength === "no_anchor" ? "source_unavailable" : "partially_supported";
    case "other_defendant_only":
      return "blocked";
    default:
      if (/referred/i.test(lower)) return "referred_only";
      if (/missing|outstanding/i.test(lower)) return source.sourceSnippet ? "missing" : "source_unavailable";
      if (/incomplete|extract only|partial/i.test(lower)) return "incomplete";
      if (!source.sourceSnippet) return "source_unavailable";
      return "partially_supported";
  }
}

export function isMeaningfulEvidenceCategory(category: LineCategory): boolean {
  return [
    "evidence_claim",
    "evidence_state",
    "missing_material",
    "chase_request",
    "court_note",
    "client_summary",
    "confidence_status",
    "export_line",
    "contradiction_or_risk",
  ].includes(category);
}

export function requiresLineLevelProof(category?: LineCategory): boolean {
  if (!category) return false;
  return ["chase_request", "court_note", "client_summary", "export_line", "evidence_state", "evidence_claim"].includes(
    category,
  );
}

export function isDerivedWorkflowStatus(draft: {
  lineCategory: LineCategory;
  outputLine: string;
}): boolean {
  if (draft.lineCategory !== "confidence_status" && draft.lineCategory !== "strategic_review") return false;
  return /next action|confidence:|sendability|workflow|derived from/i.test(draft.outputLine);
}
