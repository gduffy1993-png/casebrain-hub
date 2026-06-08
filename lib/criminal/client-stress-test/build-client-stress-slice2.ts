import type { ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { sanitizeClientStressLine } from "./client-stress-sanitize";
import type {
  ClientInstructionChecklistItem,
  DoNotConcedeGuardItem,
  ReasoningCategory,
} from "./client-stress-slice2-types";
import type { ClientAccountOption } from "./client-stress-types";

export type Slice2BuildContext = {
  reasoning: ReasoningV2ViewModel;
  selectedOptions: ClientAccountOption[];
  offenceFamily: "motoring" | "pwits" | "violence" | "robbery" | "fraud" | "generic";
  thinSource: boolean;
};

function item(
  questionText: string,
  whyItMatters: string,
  linkedAccountOption: ClientAccountOption | null,
  reasoningCategory: ReasoningCategory,
  provisional: boolean,
): ClientInstructionChecklistItem {
  return {
    questionText: sanitizeClientStressLine(questionText),
    whyItMatters: sanitizeClientStressLine(whyItMatters),
    linkedAccountOption,
    reasoningCategory,
    provisional,
  };
}

function guard(
  concessionRiskLabel: string,
  whyNotToConcedeYet: string,
  sourceOrMissingBasis: string,
  safeWordingAlternative: string,
  solicitorReviewRequired: boolean,
): DoNotConcedeGuardItem {
  return {
    concessionRiskLabel: sanitizeClientStressLine(concessionRiskLabel),
    whyNotToConcedeYet: sanitizeClientStressLine(whyNotToConcedeYet),
    sourceOrMissingBasis: sanitizeClientStressLine(sourceOrMissingBasis),
    safeWordingAlternative: sanitizeClientStressLine(safeWordingAlternative),
    solicitorReviewRequired,
  };
}

function dedupeChecklist(items: ClientInstructionChecklistItem[]): ClientInstructionChecklistItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.questionText.toLowerCase().slice(0, 72);
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(i.questionText);
  });
}

function dedupeGuards(items: DoNotConcedeGuardItem[]): DoNotConcedeGuardItem[] {
  const seen = new Set<string>();
  return items.filter((g) => {
    const key = g.concessionRiskLabel.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(g.concessionRiskLabel);
  });
}

function missingBasis(reasoning: ReasoningV2ViewModel, patterns: RegExp[]): string {
  const hit = reasoning.missingMaterial.find((m) =>
    patterns.some((p) => p.test(`${m.label} ${m.sourceSection}`)),
  );
  if (hit) return `${hit.label} — outstanding or partial on served papers (${hit.sourceSection}).`;
  if (reasoning.missingMaterial.length) {
    return `${reasoning.missingMaterial.length} disclosure item(s) outstanding on proof map — compare chase list.`;
  }
  return "Core source material may be incomplete on current papers — provisional comparison only.";
}

function hasMissing(reasoning: ReasoningV2ViewModel, patterns: RegExp[]): boolean {
  return reasoning.missingMaterial.some((m) => patterns.some((p) => p.test(m.label)));
}

export function buildClientInstructionChecklist(ctx: Slice2BuildContext): ClientInstructionChecklistItem[] {
  const { reasoning, selectedOptions: opts, offenceFamily: family, thinSource } = ctx;
  const prov = thinSource || reasoning.humanReviewRequired;
  const items: ClientInstructionChecklistItem[] = [];

  if (opts.includes("no_comment_limited_instructions")) {
    items.push(
      item(
        "What instructions can the client safely give on the structured account before the next hearing step?",
        "Limited instructions prevent aligning account to served material.",
        "no_comment_limited_instructions",
        "generic",
        true,
      ),
    );
  }

  if (opts.includes("denies_presence") || opts.includes("mistaken_identity")) {
    items.push(
      item(
        "Where was the client at the relevant time, and who can corroborate presence or absence?",
        "Presence/at location is a core element — must be compared to CCTV, witness, and timeline on papers.",
        opts.includes("mistaken_identity") ? "mistaken_identity" : "denies_presence",
        "presence",
        prov,
      ),
      item(
        "What does the client say about CCTV stills, identification procedure, or visual identification on the papers?",
        "Identification may be unresolved if only stills or summaries are served.",
        opts.includes("mistaken_identity") ? "mistaken_identity" : "denies_presence",
        "cctv",
        prov || hasMissing(reasoning, [/cctv/i, /master/i, /export/i]),
      ),
      item(
        "Are there witnesses, alibi, or route/timeline points the client can give — without merging Crown narrative?",
        "Unresolved attribution keeps the account conditional on served papers.",
        "denies_presence",
        "witnesses",
        prov,
      ),
    );
  }

  if (family === "motoring" && (opts.includes("denies_presence") || opts.includes("accident_no_dangerous_standard"))) {
    items.push(
      item(
        "Who had access to the vehicle and keys; what does the client say about being the driver?",
        "Driver identity is a separate element from dangerous/careless standard on motoring papers.",
        "denies_presence",
        "vehicle",
        true,
      ),
      item(
        "What is outstanding on CCTV master/export, ANPR, or officer observations for driver ID?",
        "Partial stills alone may not resolve driver identity on served papers.",
        "denies_presence",
        "cctv",
        true,
      ),
    );
  }

  if (opts.includes("denies_participation") || opts.includes("accepts_presence_disputes_role")) {
    items.push(
      item(
        "What role or participation does the client admit or deny — separate from mere presence?",
        "Role/participation disputes must not collapse into one agreed Crown narrative.",
        opts.includes("accepts_presence_disputes_role")
          ? "accepts_presence_disputes_role"
          : "denies_participation",
        "role",
        prov,
      ),
    );
  }

  if (
    opts.includes("denies_possession") ||
    opts.includes("denies_intent") ||
    opts.includes("accepts_possession_disputes_supply")
  ) {
    items.push(
      item(
        "Phone ownership, SIM, messages, and who had control of the device — per client instructions?",
        "Attribution and knowledge often turn on phone material on PWITS papers.",
        opts.includes("accepts_possession_disputes_supply")
          ? "accepts_possession_disputes_supply"
          : "denies_possession",
        "phone",
        prov || hasMissing(reasoning, [/phone/i, /download/i, /extraction/i]),
      ),
      item(
        "Packaging, cash, scales, or dealing indicators — personal use vs supply in client words?",
        "Supply inference remains provisional until lab/messages/source material is served.",
        opts.includes("accepts_possession_disputes_supply")
          ? "accepts_possession_disputes_supply"
          : "denies_intent",
        "supply",
        prov,
      ),
      item(
        "Lab continuity, weight, and handling — what does client say was for personal use only?",
        "Possession without supply proof is not established on thin papers alone.",
        "accepts_possession_disputes_supply",
        "possession",
        prov,
      ),
    );
  }

  if (opts.includes("self_defence")) {
    items.push(
      item(
        "Sequence of events: who moved first, threat, and when force was used?",
        "Self-defence is only live to the extent sequence is supported on papers and instructions.",
        "self_defence",
        "self_defence",
        true,
      ),
      item(
        "Force used, retreat, injuries caused, and whether proportionality is addressed on papers?",
        "Proportionality/causation cannot be conceded before medical/CCTV/CAD material is reviewed.",
        "self_defence",
        "injury",
        true,
      ),
      item(
        "Witnesses, BWV, CAD/999, or medical timing — what does client say aligns or conflicts?",
        "Cross-source checks needed before fixing hearing position.",
        "self_defence",
        "witnesses",
        prov,
      ),
    );
  }

  if (opts.includes("accident_no_dangerous_standard") || family === "motoring") {
    items.push(
      item(
        "Driving standard, causation, and collision sequence — client account in own words?",
        "Dangerous/careless standard and causation need served CCTV/expert/CAD where relevant.",
        "accident_no_dangerous_standard",
        "causation",
        prov,
      ),
    );
  }

  for (const d of reasoning.disclosureChasePriorities.slice(0, 3)) {
    items.push(
      item(
        `Instructions on chased item: ${d.label.slice(0, 120)}`,
        d.chaseNote ?? "Outstanding material may change what can be safely asked or conceded.",
        null,
        "disclosure",
        true,
      ),
    );
  }

  return dedupeChecklist(items);
}

export function buildDoNotConcedeGuards(ctx: Slice2BuildContext): DoNotConcedeGuardItem[] {
  const { reasoning, selectedOptions: opts, offenceFamily: family, thinSource } = ctx;
  const prov = thinSource || reasoning.humanReviewRequired;
  const guards: DoNotConcedeGuardItem[] = [];

  for (const line of reasoning.warRoom.doNotConcede) {
    guards.push(
      guard(
        "Hearing position / evidential strength",
        "War room spine flags do-not-overstate on current papers.",
        "Source-backed war room view from proof map.",
        line.slice(0, 280),
        prov,
      ),
    );
  }

  if (opts.includes("denies_presence") || opts.includes("mistaken_identity")) {
    guards.push(
      guard(
        "Presence / attendance",
        "Client denies presence — do not adopt Crown timeline as agreed.",
        missingBasis(reasoning, [/cctv/i, /witness/i, /mg11/i]),
        "Presence/at location remains unresolved on served papers until instructions and material are on file.",
        prov,
      ),
      guard(
        "Identification",
        "Visual or witness identification may be partial on current papers.",
        missingBasis(reasoning, [/cctv/i, /identif/i, /turnbull/i, /vip/i]),
        "Identification remains provisional — compare stills, procedure, and master material when served.",
        prov || hasMissing(reasoning, [/cctv/i, /master/i]),
      ),
    );
  }

  if (family === "motoring" && opts.includes("denies_presence")) {
    guards.push(
      guard(
        "Driver identity",
        "Do not concede the client was not driving if only partial CCTV/stills are served.",
        missingBasis(reasoning, [/cctv/i, /anpr/i, /driver/i, /master/i, /export/i]),
        "Driver identity remains unresolved on served papers.",
        true,
      ),
    );
  }

  if (opts.includes("denies_participation") || opts.includes("accepts_presence_disputes_role")) {
    guards.push(
      guard(
        "Role / participation",
        "Participation dispute must not be merged into agreed facts.",
        "Compare served CCTV, phone, and witness material on proof map.",
        "Role/participation remains in dispute on current papers.",
        prov,
      ),
    );
  }

  if (opts.includes("denies_possession") || opts.includes("denies_intent")) {
    guards.push(
      guard(
        "Possession / knowledge",
        "Possession elements are not conceded from charge wording alone.",
        missingBasis(reasoning, [/phone/i, /lab/i, /possession/i]),
        "Possession/knowledge remains unresolved on served papers pending served material.",
        prov,
      ),
      guard(
        "Intent / supply inference",
        "Do not concede supply intent without messages, lab, or attribution material.",
        missingBasis(reasoning, [/supply/i, /intent/i, /message/i, /lab/i]),
        "Intent/supply inference remains provisional on current papers.",
        prov,
      ),
    );
  }

  if (opts.includes("accepts_possession_disputes_supply")) {
    guards.push(
      guard(
        "Supply intent",
        "Client accepts possession but denies supply — do not concede supply from charge alone.",
        missingBasis(reasoning, [/phone/i, /lab/i, /message/i, /supply/i]),
        "Supply inference remains provisional pending phone/lab/source material on file.",
        true,
      ),
      guard(
        "Phone ownership / knowledge",
        "Ownership and control of device are not established on thin papers.",
        missingBasis(reasoning, [/phone/i, /sim/i, /attribution/i]),
        "Phone attribution and knowledge remain unresolved on served papers.",
        prov,
      ),
    );
  }

  if (opts.includes("self_defence")) {
    guards.push(
      guard(
        "Proportionality / lawful excuse",
        "Self-defence sequence not conceded before instructions and medical/source review.",
        missingBasis(reasoning, [/medical/i, /cctv/i, /bwv/i, /cad/i, /injur/i]),
        "Self-defence remains a live issue only to the extent supported by served papers and instructions.",
        true,
      ),
      guard(
        "Causation / injury mechanism",
        "Injury/cause links need medical and sequence material on file.",
        missingBasis(reasoning, [/medical/i, /injur/i, /cause/i]),
        "Causation and injury mechanism remain unresolved on current papers.",
        prov,
      ),
      guard(
        "Intent at time of force",
        "Do not concede intent or aggression facts without CCTV/BWV/CAD alignment.",
        "Compare contradiction and missing material on proof map.",
        "Intent at the time of force remains provisional on served papers.",
        true,
      ),
    );
  }

  if (opts.includes("accident_no_dangerous_standard") || family === "motoring") {
    guards.push(
      guard(
        "Driving standard / dangerous or careless act",
        "Standard of driving not conceded without expert/CCTV/CAD where relevant.",
        missingBasis(reasoning, [/cctv/i, /expert/i, /cad/i, /999/i]),
        "Driving standard remains conditional on served collision and expert material.",
        prov,
      ),
    );
  }

  if (reasoning.contradictions.length) {
    guards.push(
      guard(
        "Agreed facts on contradictions",
        "Unresolved contradictions on papers — do not merge accounts.",
        `${reasoning.contradictions.length} contradiction(s) flagged on proof map.`,
        "Ask the court to record conflicts; do not treat Crown and defence accounts as one narrative.",
        true,
      ),
    );
  }

  guards.push(
    guard(
      "Interview / admissions",
      "Do not concede interview content unless transcript/audio is served and reviewed.",
      missingBasis(reasoning, [/interview/i, /pace/i, /custody/i]),
      "Interview fairness and content remain conditional on served PACE/interview material.",
      prov || hasMissing(reasoning, [/interview/i, /pace/i]),
    ),
  );

  guards.push(
    guard(
      "Exhibit continuity",
      "Do not concede continuity or integrity without served continuity material.",
      missingBasis(reasoning, [/continuity/i, /exhibit/i, /chain/i]),
      "Exhibit continuity remains unresolved on current papers.",
      prov,
    ),
  );

  return dedupeGuards(guards);
}

export function slice2ContextFromReasoning(
  reasoning: ReasoningV2ViewModel,
  selectedOptions: ClientAccountOption[],
): Slice2BuildContext {
  const charge = reasoning.charge.toLowerCase();
  let family: Slice2BuildContext["offenceFamily"] = "generic";
  if (/dangerous driving|careless|motoring|rta/i.test(charge)) family = "motoring";
  else if (/pwits|intent to supply|class a/i.test(charge)) family = "pwits";
  else if (/section\s*18|section\s*20|gbh|wounding/i.test(charge)) family = "violence";
  else if (/robbery/i.test(charge)) family = "robbery";
  else if (/fraud|dishonesty/i.test(charge)) family = "fraud";

  const thinSource =
    reasoning.humanReviewRequired ||
    reasoning.missingMaterial.length >= 3 ||
    reasoning.evidenceHelpingDefence.length + reasoning.evidenceHurtingDefence.length < 2;

  return { reasoning, selectedOptions, offenceFamily: family, thinSource };
}
