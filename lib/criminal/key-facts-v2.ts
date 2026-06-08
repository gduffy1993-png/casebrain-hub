/**
 * V2 Key Facts: discrete facts only (no narrative).
 * Narrative/prosecution text feeds Summary tab; only structured facts go here, with source + confidence.
 */

import type {
  KeyFactsV2Hierarchy,
  StructuredKeyFact,
  SolicitorBuckets,
  KeyFactsBundleSummarySection,
} from "@/lib/types/casebrain";
import type { CriminalCaseMeta } from "./structured-extractor";

const CONFIDENCE_HIGH: "high" = "high";

function fact(
  text: string,
  category: StructuredKeyFact["category"],
  source: string,
  confidence: StructuredKeyFact["confidence"] = CONFIDENCE_HIGH,
): StructuredKeyFact {
  return { text, category, source, confidence };
}

function emptyHierarchy(): KeyFactsV2Hierarchy {
  return {
    people: [],
    places: [],
    times: [],
    evidence: [],
    disclosure: [],
    risks: [],
    statements: [],
    cctvRefs: [],
    forensicRefs: [],
    charge: [],
  };
}

/**
 * Categorise a criminal keyFact string (e.g. "Defendant: X", "Next hearing: 2024-01-01") into V2 category.
 */
function categorizeCriminalFact(keyFact: string): StructuredKeyFact["category"] {
  const lower = keyFact.toLowerCase();
  if (lower.startsWith("defendant:") || lower.includes("witness") || lower.includes("complainant")) return "people";
  if (lower.startsWith("offence:") || lower.startsWith("charge:")) return "charge";
  if (lower.startsWith("plea:")) return "charge";
  if (lower.startsWith("next hearing:") || lower.includes("date") || lower.includes("time")) return "times";
  if (lower.includes("location") || lower.includes("address") || lower.includes("canal") || lower.includes("wharf")) return "places";
  if (lower.includes("cctv") || lower.includes("bwv") || lower.includes("footage")) return "cctvRefs";
  if (lower.includes("forensic") || lower.includes("fire cause") || lower.includes("accelerant")) return "forensicRefs";
  if (lower.includes("disclosure") || lower.includes("mg6") || lower.includes("missing")) return "disclosure";
  if (lower.includes("risk") || lower.includes("motive") || lower.includes("circumstantial")) return "risks";
  return "evidence";
}

/**
 * Build V2 key facts hierarchy from criminal structured extractor output.
 * Uses only discrete facts (keyFacts array); no narrative/summary text.
 */
export function buildCriminalStructuredKeyFacts(
  meta: CriminalCaseMeta,
  sourceLabel: string,
): KeyFactsV2Hierarchy {
  const out = emptyHierarchy();

  for (const keyFact of meta.keyFacts) {
    const text = keyFact.trim();
    if (!text) continue;
    const category = categorizeCriminalFact(text);
    const item = fact(text, category, sourceLabel, "high");
    switch (category) {
      case "people":
        out.people.push(item);
        break;
      case "places":
        out.places.push(item);
        break;
      case "times":
        out.times.push(item);
        break;
      case "evidence":
        out.evidence.push(item);
        break;
      case "disclosure":
        out.disclosure.push(item);
        break;
      case "risks":
        out.risks.push(item);
        break;
      case "statements":
        out.statements.push(item);
        break;
      case "cctvRefs":
        out.cctvRefs.push(item);
        break;
      case "forensicRefs":
        out.forensicRefs.push(item);
        break;
      case "charge":
        out.charge.push(item);
        break;
    }
  }

  if (meta.defendantName) {
    const exists = out.people.some((p) => p.text.toLowerCase().includes(meta.defendantName!.toLowerCase()));
    if (!exists) out.people.push(fact(`Defendant: ${meta.defendantName}`, "people", sourceLabel));
  }
  if (meta.charges[0]?.offence) {
    const exists = out.charge.some((c) => c.text.toLowerCase().includes(meta.charges[0].offence.toLowerCase()));
    if (!exists) out.charge.push(fact(`Offence: ${meta.charges[0].offence}`, "charge", sourceLabel));
  }
  if (meta.nextHearing) {
    const exists = out.times.some((t) => t.text.includes(meta.nextHearing!));
    if (!exists) out.times.push(fact(`Next hearing: ${meta.nextHearing.slice(0, 10)}`, "times", sourceLabel));
  }

  if (meta.disclosure.missingItems.length > 0) {
    for (const item of meta.disclosure.missingItems) {
      out.disclosure.push(fact(`Missing: ${item}`, "disclosure", sourceLabel, "high"));
    }
  }

  return out;
}

/**
 * Build solicitor buckets (prosecution, defence, disputed, agreed, unknowns, missing disclosure, risks)
 * from criminal meta + bundle summary sections. Feeds Summary tab.
 */
export function buildCriminalSolicitorBuckets(
  meta: CriminalCaseMeta,
  bundleSummarySections: KeyFactsBundleSummarySection[],
): SolicitorBuckets {
  const prosecutionCase: string[] = [];
  const defenceCase: string[] = [];
  const disputedIssues: string[] = [];
  const agreedFacts: string[] = [];
  const unknowns: string[] = [];
  const missingDisclosure: string[] = [...meta.disclosure.missingItems];
  const risks: string[] = [];

  // Prosecution: from bundle sections (Allegations / Charges, etc.) and charge
  for (const sec of bundleSummarySections) {
    const title = (sec.title || "").toLowerCase();
    if (title.includes("allegation") || title.includes("charge") || title.includes("court")) {
      const bullets = splitIntoBullets(sec.body);
      prosecutionCase.push(...bullets.slice(0, 8));
    }
  }
  if (meta.charges[0]?.offence) {
    prosecutionCase.push(`Charge: ${meta.charges[0].offence}`);
  }

  // Defence: no direct ID, no CCTV, no forensic confirmation, interview stance, etc.
  const text = [
    ...meta.keyFacts,
    ...bundleSummarySections.map((s) => s.body),
  ].join(" ").toLowerCase();
  if (/no direct id|no direct identification|no cctv|no footage/i.test(text)) defenceCase.push("No direct identification; no CCTV covering key moments.");
  if (/no forensic|forensic.*not.*confirm|not yet compared/i.test(text)) defenceCase.push("No forensic confirmation / comparison outstanding.");
  if (/overwritten|no longer available|cctv.*lost/i.test(text)) defenceCase.push("CCTV overwritten or no longer available.");
  if (/no comment|no-comment|no comment interview/i.test(text)) defenceCase.push("Interview: no comment.");
  if (/neighbour.*couldn't|could not identify|unable to id/i.test(text)) defenceCase.push("Witness could not identify defendant.");
  if (/circumstantial only|circumstantial evidence/i.test(text)) defenceCase.push("Prosecution rely on circumstantial evidence only.");

  // Disputed: identity, intent, causation (generic from charge)
  disputedIssues.push("Identity (who did it)");
  disputedIssues.push("Intent / mens rea");
  disputedIssues.push("Causation / actus reus (if applicable)");

  // Agreed: neutral facts from keyFacts
  if (meta.defendantName) agreedFacts.push(`Defendant: ${meta.defendantName}`);
  if (meta.charges[0]?.dateOfOffence) agreedFacts.push(`Offence date: ${meta.charges[0].dateOfOffence}`);
  if (meta.nextHearing) agreedFacts.push(`Next hearing: ${meta.nextHearing.slice(0, 10)}`);

  // Unknowns: awaiting reports, not yet served
  if (/awaiting|awaited|not yet|outstanding|pending/i.test(text)) {
    if (/fire cause|cause report|cause of fire/i.test(text)) unknowns.push("Fire cause report");
    if (/footwear|comparison|not yet compared/i.test(text)) unknowns.push("Footwear comparison");
    if (/accelerant|not confirmed/i.test(text)) unknowns.push("Accelerant (if any)");
  }

  // Risks
  if (/circumstantial|motive|opportunity/i.test(text)) risks.push("Circumstantial case can still convict if motive and opportunity are strong.");
  if (/anpr|vehicle.*area|presence/i.test(text)) risks.push("ANPR / vehicle in area supports opportunity.");
  if (/motive|dispute|ccj/i.test(text)) risks.push("Prosecution may rely on motive (e.g. dispute, CCJ).");

  return {
    prosecutionCase: prosecutionCase.slice(0, 10),
    defenceCase: defenceCase.length > 0 ? defenceCase : ["Defence case to be refined from instructions and disclosure."],
    disputedIssues: disputedIssues.slice(0, 8),
    agreedFacts: agreedFacts.slice(0, 8),
    unknowns: unknowns.slice(0, 8),
    missingDisclosure: missingDisclosure.slice(0, 15),
    risks: risks.slice(0, 8),
  };
}

function splitIntoBullets(body: string): string[] {
  const out: string[] = [];
  const parts = body.split(/\n|\.\s+/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (p.length < 15 || p.length > 300) continue;
    out.push(p);
  }
  return out.slice(0, 10);
}

/** V2: Seeds for Strategy (Defence Plan) from Key Facts. Pass to buildDefenceStrategyPlan as keyFactsSeeds. */
export function deriveStrategySeedsFromKeyFacts(keyFacts: {
  structuredKeyFacts?: KeyFactsV2Hierarchy | null;
  solicitorBuckets?: SolicitorBuckets | null;
} | null): { defenceAngles: string[] } {
  const defenceAngles: string[] = [];
  if (!keyFacts) return { defenceAngles };

  const buckets = keyFacts.solicitorBuckets;
  const structured = keyFacts.structuredKeyFacts;
  const defenceText = (buckets?.defenceCase ?? []).join(" ").toLowerCase();
  const missingText = (buckets?.missingDisclosure ?? []).join(" ").toLowerCase();

  if (/no direct id|no direct identification|identification in dispute/i.test(defenceText)) {
    defenceAngles.push("Identification in dispute");
  }
  if (/no cctv|no footage|cctv overwritten|no longer available/i.test(defenceText)) {
    defenceAngles.push("No CCTV to confirm or exclude defendant's presence or conduct");
  }
  if (/no forensic|forensic.*not.*confirm|not yet compared/i.test(defenceText)) {
    defenceAngles.push("Forensic / comparison evidence not established");
  }
  if (/no comment|no-comment/i.test(defenceText)) {
    defenceAngles.push("Client gave no comment interview – put prosecution to proof");
  }
  if (/circumstantial only|circumstantial evidence/i.test(defenceText)) {
    defenceAngles.push("Prosecution rely on circumstantial evidence only");
  }
  if (/fire cause|ignition|accelerant|no ignition/i.test(defenceText)) {
    defenceAngles.push("No ignition source or cause of fire established");
  }
  if (structured?.disclosure?.length && missingText) {
    defenceAngles.push("Key disclosure outstanding – chase before committing position");
  }

  return { defenceAngles: defenceAngles.slice(0, 6) };
}
