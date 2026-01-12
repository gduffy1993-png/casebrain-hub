import type { PracticeArea, Severity, KeyFactsKeyDate } from "@/lib/types/casebrain";
import type { DomainKey, DomainSummary } from "./types";
import { DOMAIN_ORDER } from "./types";
import { normalizeText, splitIntoSentences, uniq } from "./util";

type DocInput = {
  id: string;
  name?: string | null;
  type?: string | null;
  extracted_json?: unknown;
  created_at?: string;
};

type VersionMissingEvidenceItem = {
  area?: string;
  label: string;
  priority?: string;
  notes?: string;
};

const DOMAIN_TITLES: Record<DomainKey, string> = {
  incident_accident: "Incident / Accident Summary",
  hospital_medical: "Hospital / Medical Summary",
  police_procedural: "Police / Procedural Summary",
  disclosure_integrity: "Disclosure & Evidence Integrity Summary",
  expert_opinion: "Expert / Opinion Summary",
  damages_impact: "Damages / Impact Summary",
};

const DOMAIN_KEYWORDS: Record<DomainKey, string[]> = {
  incident_accident: [
    "incident",
    "accident",
    "collision",
    "rta",
    "rtc",
    "mechanism",
    "fall",
    "slip",
    "trip",
    "impact",
    "assault",
    "attack",
    "altercation",
    "injury occurred",
    "where it happened",
  ],
  hospital_medical: [
    "a&e",
    "accident and emergency",
    "hospital",
    "nhs",
    "trust",
    "ward",
    "clinic",
    "gp",
    "radiology",
    "x-ray",
    "xray",
    "ct",
    "mri",
    "scan",
    "operation",
    "surgery",
    "diagnosis",
    "treatment",
    "discharge",
    "consultant",
  ],
  police_procedural: [
    "custody",
    "interview",
    "pace",
    "caution",
    "detention",
    "bail",
    "conditions",
    "arrest",
    "police",
    "statement",
    "mg5",
    "mg6",
    "mg 6",
    "cps",
    "court",
    "hearing",
    "listing",
    "charge",
    "charged",
    "remand",
  ],
  disclosure_integrity: [
    "disclosure",
    "unused material",
    "mg6a",
    "mg6c",
    "schedule",
    "continuity",
    "exhibit",
    "chain of custody",
    "metadata",
    "late served",
    "served late",
    "missing pages",
    "redaction",
    "cctv",
    "bwv",
    "body worn",
    "999",
    "cad",
    "call log",
  ],
  expert_opinion: [
    "expert",
    "report",
    "opinion",
    "consultant opinion",
    "engineer",
    "orthopaedic",
    "psychiatric",
    "forensic",
    "pathologist",
    "addendum",
    "joint statement",
    "instruction",
  ],
  damages_impact: [
    "damages",
    "impact",
    "loss of earnings",
    "special damages",
    "general damages",
    "quantum",
    "care",
    "needs",
    "rehab",
    "accommodation",
    "employment",
    "benefits",
    "medical expenses",
    "symptoms",
  ],
};

/**
 * Detect witness statement from content (for domain assignment).
 * Uses same heuristics as bundle completeness: explicit markers or first-person narrative.
 */
function isWitnessStatement(doc: DocInput): boolean {
  const name = typeof doc.name === "string" ? doc.name.toLowerCase() : "";
  const type = typeof doc.type === "string" ? doc.type.toLowerCase() : "";
  
  // Filename-based detection
  if (/\b(witness\s*statement|statement\s+of\s+witness|mg\s*11|mg11)\b/i.test(`${name} ${type}`)) {
    return true;
  }
  
  // Content-based detection
  const extracted = doc.extracted_json && typeof doc.extracted_json === "object" ? (doc.extracted_json as any) : null;
  if (!extracted) return false;
  
  const summary = typeof extracted.summary === "string" ? extracted.summary : "";
  const text = typeof extracted.text === "string" ? extracted.text : "";
  const rawText = typeof extracted.raw_text === "string" ? extracted.raw_text : "";
  const corpus = normalizeText([summary, text, rawText].filter(Boolean).join(" ")).toLowerCase();
  
  if (!corpus) return false;
  
  // Explicit markers
  if (corpus.includes("witness details") || corpus.includes("statement of truth")) {
    return true;
  }
  
  // First-person narrative patterns (at least 2 matches for reliability)
  const firstPersonPatterns = [
    /\bI\s+(was|saw|witnessed|observed|noticed|heard|became|noted|recalled|remember|remembered)\b/i,
    /\bI\s+(am|was)\s+involved\b/i,
    /\bI\s+(told|said|stated|informed|reported)\b/i,
  ];
  const matches = firstPersonPatterns.filter(pattern => pattern.test(corpus)).length;
  if (matches >= 2) {
    return true;
  }
  
  return false;
}

function inferDomainsForDoc(doc: DocInput): DomainKey[] {
  const extracted = doc.extracted_json && typeof doc.extracted_json === "object" ? (doc.extracted_json as any) : null;
  const summary = typeof extracted?.summary === "string" ? extracted.summary : "";
  const name = typeof doc.name === "string" ? doc.name : "";
  const type = typeof doc.type === "string" ? doc.type : "";
  const corpus = normalizeText([name, type, summary].filter(Boolean).join(" "));

  const matched: DomainKey[] = [];
  
  // Special handling: Witness statements should be assigned to incident_accident and police_procedural domains
  if (isWitnessStatement(doc)) {
    matched.push("incident_accident");
    matched.push("police_procedural");
  }
  
  // Standard keyword-based domain inference
  for (const domain of DOMAIN_ORDER) {
    const kws = DOMAIN_KEYWORDS[domain];
    if (kws.some((kw) => corpus.includes(kw))) matched.push(domain);
  }

  return uniq(matched);
}

function severityFromString(s: string | undefined): Severity | undefined {
  const v = (s ?? "").toUpperCase();
  if (v === "LOW" || v === "MEDIUM" || v === "HIGH" || v === "CRITICAL") return v as Severity;
  return undefined;
}

function mapMissingEvidenceToDomain(domain: DomainKey, item: VersionMissingEvidenceItem): boolean {
  const area = (item.area ?? "other").toLowerCase();
  const label = normalizeText(item.label);

  if (domain === "hospital_medical") {
    return area.includes("medical") || label.includes("medical") || label.includes("records") || label.includes("radiology");
  }
  if (domain === "expert_opinion") {
    return area.includes("expert") || label.includes("expert") || label.includes("report") || label.includes("instruction");
  }
  if (domain === "police_procedural") {
    return area.includes("admin") || label.includes("custody") || label.includes("interview") || label.includes("pace") || label.includes("bail") || label.includes("charge");
  }
  if (domain === "disclosure_integrity") {
    return label.includes("disclosure") || label.includes("mg6") || label.includes("schedule") || label.includes("cctv") || label.includes("bwv") || label.includes("999") || label.includes("cad");
  }
  if (domain === "damages_impact") {
    return area.includes("funding") || label.includes("loss") || label.includes("earnings") || label.includes("damages") || label.includes("care") || label.includes("rehab");
  }
  // incident_accident
  return label.includes("incident") || label.includes("accident") || label.includes("mechanism") || label.includes("photos") || label.includes("witness");
}

function buildTimelineHighlightsForDomain(domainDocIds: string[], docsById: Map<string, DocInput>, keyDates: KeyFactsKeyDate[]): Array<{ dateISO: string; label: string; sourceDocIds?: string[] }> {
  // If keyDates exist, reuse them as safe timeline anchors; otherwise pull from extracted_json.dates.
  const out: Array<{ dateISO: string; label: string; sourceDocIds?: string[] }> = [];

  for (const kd of keyDates) {
    if (!kd?.date || !kd?.label) continue;
    out.push({ dateISO: kd.date, label: kd.label });
  }

  // Add domain-specific dates (lightweight)
  for (const id of domainDocIds) {
    const doc = docsById.get(id);
    if (!doc) continue;
    const extracted = doc.extracted_json && typeof doc.extracted_json === "object" ? (doc.extracted_json as any) : null;
    const dates = Array.isArray(extracted?.dates) ? extracted.dates : [];
    for (const d of dates) {
      const iso = typeof d?.isoDate === "string" ? d.isoDate : typeof d?.date === "string" ? d.date : null;
      const label = typeof d?.label === "string" ? d.label : null;
      if (!iso || !label) continue;
      out.push({ dateISO: iso, label, sourceDocIds: [id] });
    }
  }

  // Deduplicate + sort by date
  const uniqKey = new Set<string>();
  const deduped: typeof out = [];
  for (const item of out) {
    const k = `${item.dateISO}|${item.label}`;
    if (uniqKey.has(k)) continue;
    uniqKey.add(k);
    deduped.push(item);
  }

  deduped.sort((a, b) => new Date(a.dateISO).getTime() - new Date(b.dateISO).getTime());
  return deduped.slice(0, 8);
}

function buildKeyFactsForDomain(domainDocIds: string[], docsById: Map<string, DocInput>): string[] {
  const facts: string[] = [];
  const seen = new Set<string>();

  const push = (s: string) => {
    const t = s.trim();
    if (t.length < 15) return;
    const n = normalizeText(t);
    if (!n || seen.has(n)) return;
    seen.add(n);
    facts.push(t);
  };

  for (const id of domainDocIds) {
    const doc = docsById.get(id);
    if (!doc) continue;
    const extracted = doc.extracted_json && typeof doc.extracted_json === "object" ? (doc.extracted_json as any) : null;
    const summary = typeof extracted?.summary === "string" ? extracted.summary : "";
    const name = typeof doc.name === "string" ? doc.name : "";
    const corpus = `${name}. ${summary}`.trim();
    for (const sentence of splitIntoSentences(corpus)) {
      if (sentence.length > 260) continue;
      push(sentence);
      if (facts.length >= 8) break;
    }
    if (facts.length >= 8) break;
  }

  return facts;
}

function buildContradictionsOrUncertainties(domain: DomainKey, domainDocIds: string[], docsById: Map<string, DocInput>, missingEvidence: VersionMissingEvidenceItem[]): string[] {
  const out: string[] = [];

  // Uncertainty: no missing evidence items for domain but domain docs are thin
  const domainMissing = missingEvidence.filter((m) => mapMissingEvidenceToDomain(domain, m));
  if (domainDocIds.length > 0 && domainDocIds.length <= 1) {
    out.push("Bundle coverage for this domain looks thin (only 1 relevant document detected). Treat gaps as likely until confirmed.");
  }

  // Simple contradiction flag: same label date appears with different isoDates across docs
  const dateByLabel = new Map<string, Set<string>>();
  for (const id of domainDocIds) {
    const doc = docsById.get(id);
    if (!doc) continue;
    const extracted = doc.extracted_json && typeof doc.extracted_json === "object" ? (doc.extracted_json as any) : null;
    const dates = Array.isArray(extracted?.dates) ? extracted.dates : [];
    for (const d of dates) {
      const label = typeof d?.label === "string" ? d.label.trim() : "";
      const iso = typeof d?.isoDate === "string" ? d.isoDate.trim() : "";
      if (!label || !iso) continue;
      if (!dateByLabel.has(label)) dateByLabel.set(label, new Set<string>());
      dateByLabel.get(label)!.add(iso);
    }
  }
  for (const [label, isos] of dateByLabel.entries()) {
    if (isos.size >= 2) {
      out.push(`Date inconsistency detected for "${label}" across documents (${Array.from(isos).join(", ")}).`);
      break;
    }
  }

  // If missing evidence exists, make it explicit uncertainty signal
  if (domainMissing.length > 0) {
    out.push("This domain contains missing evidence items; treat any conclusions here as provisional until those items are obtained.");
  }

  return uniq(out).slice(0, 5);
}

function buildHelpsHurts(domain: DomainKey, practiceArea: PracticeArea, missingEvidence: VersionMissingEvidenceItem[], domainDocIds: string[]): string[] {
  const out: string[] = [];
  const domainMissingCount = missingEvidence.filter((m) => mapMissingEvidenceToDomain(domain, m)).length;

  if (domainDocIds.length === 0) return [];

  if (domainMissingCount > 0) {
    out.push("Hurts (for now): key supporting material appears to be missing in this domain, which limits how hard you can commit to a narrative.");
  } else {
    out.push("Helps: this domain is comparatively complete, which supports clearer sequencing and firmer requests.");
  }

  // Practice-area specific framing (decision support only)
  if (practiceArea === "criminal" && (domain === "disclosure_integrity" || domain === "police_procedural")) {
    out.push("Key leverage area: if CPIA/continuity gaps exist, the prosecution may be forced to explain, narrow, or adjourn. Treat this as evidence-first, not argument-first.");
  }
  if (practiceArea === "clinical_negligence" && domain === "hospital_medical") {
    out.push("Critical to merits: the clinical timeline (presentation → diagnosis → treatment) usually drives breach/causation direction. Anchor requests to dates, not impressions.");
  }
  if (practiceArea === "personal_injury" && domain === "incident_accident") {
    out.push("Liability hinge: mechanism + independent corroboration (CCTV/witness/photos) is usually what forces early admissions or exposes weak denials.");
  }

  return uniq(out).slice(0, 4);
}

export function buildDomainSummaries(input: {
  practiceArea: PracticeArea;
  documents: DocInput[];
  keyDates: KeyFactsKeyDate[];
  versionMissingEvidence?: VersionMissingEvidenceItem[];
}): DomainSummary[] {
  const docsById = new Map<string, DocInput>();
  for (const d of input.documents) docsById.set(d.id, d);

  const domainDocIds: Record<DomainKey, string[]> = {
    incident_accident: [],
    hospital_medical: [],
    police_procedural: [],
    disclosure_integrity: [],
    expert_opinion: [],
    damages_impact: [],
  };

  for (const doc of input.documents) {
    for (const domain of inferDomainsForDoc(doc)) {
      domainDocIds[domain].push(doc.id);
    }
  }

  const missingEvidence = input.versionMissingEvidence ?? [];

  const summaries: DomainSummary[] = [];
  for (const domain of DOMAIN_ORDER) {
    const ids = uniq(domainDocIds[domain]);
    if (ids.length === 0) continue; // trigger rule

    const domainMissing = missingEvidence
      .filter((m) => mapMissingEvidenceToDomain(domain, m))
      .map((m) => ({
        label: m.label,
        priority: severityFromString(m.priority),
        notes: m.notes,
      }))
      .slice(0, 8);

    const keyFacts = buildKeyFactsForDomain(ids, docsById);
    const timelineHighlights = buildTimelineHighlightsForDomain(ids, docsById, input.keyDates);
    const contradictionsOrUncertainties = buildContradictionsOrUncertainties(domain, ids, docsById, missingEvidence);
    const helpsHurts = buildHelpsHurts(domain, input.practiceArea, missingEvidence, ids);

    const relevanceScore =
      Math.min(10, ids.length) +
      (domainMissing.some((m) => m.priority === "CRITICAL") ? 5 : 0) +
      (domainMissing.some((m) => m.priority === "HIGH") ? 2 : 0);

    summaries.push({
      domain,
      title: DOMAIN_TITLES[domain],
      sourceDocIds: ids,
      relevanceScore,
      keyFacts,
      timelineHighlights,
      contradictionsOrUncertainties,
      missingEvidence: domainMissing,
      helpsHurts,
    });
  }

  return summaries;
}


