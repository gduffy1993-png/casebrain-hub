/**
 * AUD-02..05 / XPP-01..05 — substantive audience/perspective evaluators against
 * audience-packs.json (real schema from stage300-new150-audience-packs@1.0.0):
 *   {
 *     schemaVersion, caseId, packs: [
 *       { audienceId, perspectiveId, payloadText, payloadSha256, producer, comparable }
 *     ]
 *   }
 * Also tolerates a legacy object-keyed packs map if ever encountered.
 */

import type { EssentialCaseInputs } from "../inputs/load-essential-inputs";
import type { EssentialControlId } from "../constants";
import type { EssentialControlResult, EssentialHit } from "../types";

const AUDIENCE_KEYS = ["court", "cps", "client", "supervisor"] as const;
type AudienceKey = (typeof AUDIENCE_KEYS)[number];

type Pack = { payloadSha256: string | null; text: string | null };

const GENERIC_TEXT_MIN_LENGTH = 30;
const CPS_CHASE_REQUEST_RE = /\b(please (provide|serve|disclose)|outstanding (disclosure|evidence)|request(ed|ing)? (that|for))\b/i;
const SUPERVISOR_LEAKAGE_RE = /\b(controlRoom|findingId|riskScore|internal[_\s-]?only|detectorClassification)\b/i;

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function extractPack(packsRoot: Record<string, unknown> | null, key: AudienceKey): Pack | null {
  if (!packsRoot) return null;
  const packsVal = packsRoot.packs;

  // Real new-150 schema: packs is an array of { audienceId, payloadText, payloadSha256, ... }
  if (Array.isArray(packsVal)) {
    const aliases =
      key === "cps"
        ? ["cps", "prosecution"]
        : key === "court"
          ? ["court", "judicial"]
          : key === "client"
            ? ["client"]
            : ["supervisor"];
    const found = packsVal.find(
      (p) => isObj(p) && typeof p.audienceId === "string" && aliases.includes(p.audienceId),
    );
    if (!isObj(found)) return null;
    const text =
      typeof found.payloadText === "string"
        ? found.payloadText
        : typeof found.text === "string"
          ? found.text
          : null;
    return {
      payloadSha256: typeof found.payloadSha256 === "string" ? found.payloadSha256 : null,
      text,
    };
  }

  // Legacy object-keyed fallback
  const packs = isObj(packsVal) ? packsVal : packsRoot;
  const raw = packs?.[key];
  if (!isObj(raw)) return null;
  return {
    payloadSha256: typeof raw.payloadSha256 === "string" ? raw.payloadSha256 : null,
    text:
      typeof raw.payloadText === "string"
        ? raw.payloadText
        : typeof raw.text === "string"
          ? raw.text
          : null,
  };
}

function notExercised(controlId: EssentialControlId, reason: string): EssentialControlResult {
  return {
    controlId,
    namedControlExerciseStatus: "not_exercised",
    applicable: false,
    missingInputReason: reason,
    evidenceRefs: [],
    hits: [],
    backing: "capture_receipt",
    phraseProbeUsed: false,
  };
}

function evaluated(
  controlId: EssentialControlId,
  evidenceRefs: string[],
  hits: EssentialHit[],
): EssentialControlResult {
  return {
    controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    evidenceRefs,
    hits,
    backing: "capture_receipt",
    phraseProbeUsed: false,
  };
}

function genericOrEmptyHit(controlId: EssentialControlId, audience: AudienceKey, pack: Pack): EssentialHit | null {
  const text = (pack.text ?? "").trim();
  if (text.length === 0) {
    return {
      findingCode: `${controlId}-EMPTY-PACK`,
      occurrenceRef: `/packs/${audience}/text`,
      exactWording: "",
      plainEnglish: `${audience} audience pack is empty.`,
      evidenceRefs: [`/packs/${audience}/text`],
      candidateClass: "candidate_defect",
    };
  }
  if (text.length < GENERIC_TEXT_MIN_LENGTH) {
    return {
      findingCode: `${controlId}-GENERIC-PACK`,
      occurrenceRef: `/packs/${audience}/text`,
      exactWording: text,
      plainEnglish: `${audience} audience pack text is too short/generic to be audience-specific (${text.length} chars).`,
      evidenceRefs: [`/packs/${audience}/text`],
      candidateClass: "candidate_defect",
    };
  }
  return null;
}

function distinctnessHits(controlId: EssentialControlId, packs: Record<AudienceKey, Pack | null>): EssentialHit[] {
  const hits: EssentialHit[] = [];
  const present = AUDIENCE_KEYS.filter((k) => packs[k]);
  const shas = present.map((k) => packs[k]!.payloadSha256).filter((s): s is string => !!s);
  const distinctShas = new Set(shas);
  if (shas.length >= 2 && distinctShas.size < shas.length) {
    hits.push({
      findingCode: `${controlId}-NOT-DISTINCT-PAYLOAD`,
      occurrenceRef: "/packs",
      exactWording: shas.join(","),
      plainEnglish: `Audience packs are not all distinct by payloadSha256 (${distinctShas.size} distinct of ${shas.length}) — relabelled-audience risk.`,
      evidenceRefs: present.map((k) => `/packs/${k}/payloadSha256`),
      candidateClass: "candidate_defect",
    });
  }
  // Identical wording under different audience labels (text equality, independent of hash field).
  for (let i = 0; i < present.length; i++) {
    for (let j = i + 1; j < present.length; j++) {
      const a = packs[present[i]]!;
      const b = packs[present[j]]!;
      if (a.text && b.text && a.text.trim() === b.text.trim()) {
        hits.push({
          findingCode: `${controlId}-IDENTICAL-WORDING-RELABELLED`,
          occurrenceRef: `/packs/${present[i]}/text`,
          exactWording: a.text.slice(0, 200),
          plainEnglish: `${present[i]} and ${present[j]} audience packs contain byte-identical wording — likely a relabelled copy rather than an audience-specific rewrite.`,
          evidenceRefs: [`/packs/${present[i]}/text`, `/packs/${present[j]}/text`],
          candidateClass: "candidate_defect",
        });
      }
    }
  }
  return hits;
}

function leakageHit(controlId: EssentialControlId, client: Pack): EssentialHit | null {
  if (client.text && SUPERVISOR_LEAKAGE_RE.test(client.text)) {
    return {
      findingCode: `${controlId}-CLIENT-LEAKAGE`,
      occurrenceRef: "/packs/client/text",
      exactWording: client.text.slice(0, 200),
      plainEnglish: "Client-facing pack appears to contain supervisor/internal control-room signal text (leakage of internal-only content into a client-visible surface).",
      evidenceRefs: ["/packs/client/text"],
      candidateClass: "candidate_defect",
    };
  }
  return null;
}

function cpsChaseHit(controlId: EssentialControlId, cps: Pack): EssentialHit | null {
  if (cps.text && cps.text.trim().length >= GENERIC_TEXT_MIN_LENGTH && !CPS_CHASE_REQUEST_RE.test(cps.text)) {
    return {
      findingCode: `${controlId}-CPS-NO-CHASE-REQUEST`,
      occurrenceRef: "/packs/cps/text",
      exactWording: cps.text.slice(0, 200),
      plainEnglish: "CPS pack present but does not contain a specific chase/disclosure request string.",
      evidenceRefs: ["/packs/cps/text"],
      candidateClass: "candidate_defect",
    };
  }
  return null;
}

export function evaluateAudXppFamily(inputs: EssentialCaseInputs): EssentialControlResult[] {
  const raw = inputs.audiencePacks.value;
  const controlIds: EssentialControlId[] = [
    "MAA2-AUD-02-CLIENT-PLAIN",
    "MAA2-AUD-03-COURT-PRECISE",
    "MAA2-AUD-04-CPS-SPECIFIC",
    "MAA2-AUD-05-SUPERVISOR-RISK",
    "MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE",
    "MAA2-XPP-02-PROSECUTION-CHALLENGE",
    "MAA2-XPP-03-JUDICIAL-NEUTRALITY",
    "MAA2-XPP-04-CLIENT-COMPREHENSION",
    "MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE",
  ];

  if (!raw) {
    return controlIds.map((id) =>
      notExercised(
        id,
        "audience-packs.json absent for this case — audience/perspective controls not_exercised.",
      ),
    );
  }

  const packs: Record<AudienceKey, Pack | null> = {
    court: extractPack(raw, "court"),
    cps: extractPack(raw, "cps"),
    client: extractPack(raw, "client"),
    supervisor: extractPack(raw, "supervisor"),
  };
  const anyPack = AUDIENCE_KEYS.some((k) => packs[k]);
  if (!anyPack) {
    return controlIds.map((id) =>
      notExercised(id, "audience-packs.json present but no recognised court/cps/client/supervisor pack entries found — unresolved schema, fail-closed."),
    );
  }

  const dist = distinctnessHits("MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE", packs);

  const results: EssentialControlResult[] = [];

  // AUD-02 client-plain
  {
    const p = packs.client;
    if (!p) results.push(notExercised("MAA2-AUD-02-CLIENT-PLAIN", "client pack absent from audience-packs.json"));
    else {
      const hits = [genericOrEmptyHit("MAA2-AUD-02-CLIENT-PLAIN", "client", p), leakageHit("MAA2-AUD-02-CLIENT-PLAIN", p)].filter(
        (h): h is EssentialHit => h != null,
      );
      results.push(evaluated("MAA2-AUD-02-CLIENT-PLAIN", ["/packs/client"], hits));
    }
  }
  // AUD-03 court-precise
  {
    const p = packs.court;
    if (!p) results.push(notExercised("MAA2-AUD-03-COURT-PRECISE", "court pack absent from audience-packs.json"));
    else {
      const hits = [genericOrEmptyHit("MAA2-AUD-03-COURT-PRECISE", "court", p)].filter((h): h is EssentialHit => h != null);
      results.push(evaluated("MAA2-AUD-03-COURT-PRECISE", ["/packs/court"], hits));
    }
  }
  // AUD-04 cps-specific
  {
    const p = packs.cps;
    if (!p) results.push(notExercised("MAA2-AUD-04-CPS-SPECIFIC", "cps pack absent from audience-packs.json"));
    else {
      const hits = [genericOrEmptyHit("MAA2-AUD-04-CPS-SPECIFIC", "cps", p), cpsChaseHit("MAA2-AUD-04-CPS-SPECIFIC", p)].filter(
        (h): h is EssentialHit => h != null,
      );
      results.push(evaluated("MAA2-AUD-04-CPS-SPECIFIC", ["/packs/cps"], hits));
    }
  }
  // AUD-05 supervisor-risk
  {
    const p = packs.supervisor;
    if (!p) results.push(notExercised("MAA2-AUD-05-SUPERVISOR-RISK", "supervisor pack absent from audience-packs.json"));
    else {
      const hits = [genericOrEmptyHit("MAA2-AUD-05-SUPERVISOR-RISK", "supervisor", p)].filter((h): h is EssentialHit => h != null);
      results.push(evaluated("MAA2-AUD-05-SUPERVISOR-RISK", ["/packs/supervisor"], hits));
    }
  }
  // XPP-01 defence-solicitor perspective ~ overall cross-audience distinctness (>=4 distinct payloadSha256)
  {
    const shas = AUDIENCE_KEYS.map((k) => packs[k]?.payloadSha256).filter((s): s is string => !!s);
    const distinct = new Set(shas);
    const hits = [...dist];
    if (shas.length < 4) {
      hits.push({
        findingCode: "MAA2-XPP-01-INSUFFICIENT-AUDIENCE-COVERAGE",
        occurrenceRef: "/packs",
        exactWording: `${shas.length}/4`,
        plainEnglish: `Only ${shas.length}/4 audience packs carry a payloadSha256 — cannot confirm 4-way distinctness.`,
        evidenceRefs: ["/packs"],
        candidateClass: "candidate_defect",
      });
    } else if (distinct.size < 4) {
      hits.push({
        findingCode: "MAA2-XPP-01-LESS-THAN-4-DISTINCT",
        occurrenceRef: "/packs",
        exactWording: `${distinct.size}/4`,
        plainEnglish: `Only ${distinct.size} distinct payloadSha256 values across the 4 audience packs — expected 4 genuinely distinct payloads.`,
        evidenceRefs: ["/packs"],
        candidateClass: "candidate_defect",
      });
    }
    results.push(evaluated("MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE", ["/packs"], hits));
  }
  // XPP-02 prosecution-challenge perspective ~ cps vs client wording distinctness
  {
    const cps = packs.cps;
    const client = packs.client;
    if (!cps || !client) {
      results.push(notExercised("MAA2-XPP-02-PROSECUTION-CHALLENGE", "cps and/or client pack absent — cannot compare perspectives"));
    } else {
      const hits: EssentialHit[] = [];
      if (cps.text && client.text && cps.text.trim() === client.text.trim()) {
        hits.push({
          findingCode: "MAA2-XPP-02-CPS-CLIENT-IDENTICAL",
          occurrenceRef: "/packs/cps/text",
          exactWording: cps.text.slice(0, 200),
          plainEnglish: "CPS and client packs are byte-identical — no independent prosecution-challenge perspective visible.",
          evidenceRefs: ["/packs/cps/text", "/packs/client/text"],
          candidateClass: "candidate_defect",
        });
      }
      results.push(evaluated("MAA2-XPP-02-PROSECUTION-CHALLENGE", ["/packs/cps", "/packs/client"], hits));
    }
  }
  // XPP-03 judicial neutrality ~ court pack must not carry supervisor/internal risk-leakage language
  {
    const p = packs.court;
    if (!p) results.push(notExercised("MAA2-XPP-03-JUDICIAL-NEUTRALITY", "court pack absent"));
    else {
      const hits: EssentialHit[] = [];
      if (p.text && SUPERVISOR_LEAKAGE_RE.test(p.text)) {
        hits.push({
          findingCode: "MAA2-XPP-03-COURT-PACK-LEAKAGE",
          occurrenceRef: "/packs/court/text",
          exactWording: p.text.slice(0, 200),
          plainEnglish: "Court-facing pack contains internal/supervisor risk-language — not neutral.",
          evidenceRefs: ["/packs/court/text"],
          candidateClass: "candidate_defect",
        });
      }
      results.push(evaluated("MAA2-XPP-03-JUDICIAL-NEUTRALITY", ["/packs/court"], hits));
    }
  }
  // XPP-04 client comprehension ~ client pack plain-language + no leakage
  {
    const p = packs.client;
    if (!p) results.push(notExercised("MAA2-XPP-04-CLIENT-COMPREHENSION", "client pack absent"));
    else {
      const hits = [genericOrEmptyHit("MAA2-XPP-04-CLIENT-COMPREHENSION", "client", p), leakageHit("MAA2-XPP-04-CLIENT-COMPREHENSION", p)].filter(
        (h): h is EssentialHit => h != null,
      );
      results.push(evaluated("MAA2-XPP-04-CLIENT-COMPREHENSION", ["/packs/client"], hits));
    }
  }
  // XPP-05 supervisor-risk perspective ~ supervisor pack must be distinct from client (risk detail retained)
  {
    const sup = packs.supervisor;
    const client = packs.client;
    if (!sup || !client) {
      results.push(notExercised("MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE", "supervisor and/or client pack absent"));
    } else {
      const hits: EssentialHit[] = [];
      if (sup.text && client.text && sup.text.trim() === client.text.trim()) {
        hits.push({
          findingCode: "MAA2-XPP-05-SUPERVISOR-CLIENT-IDENTICAL",
          occurrenceRef: "/packs/supervisor/text",
          exactWording: sup.text.slice(0, 200),
          plainEnglish: "Supervisor and client packs are byte-identical — supervisor-specific risk perspective not visible.",
          evidenceRefs: ["/packs/supervisor/text", "/packs/client/text"],
          candidateClass: "candidate_defect",
        });
      }
      results.push(evaluated("MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE", ["/packs/supervisor", "/packs/client"], hits));
    }
  }

  return results;
}
