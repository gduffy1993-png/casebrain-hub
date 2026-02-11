/**
 * Option 3 Phase 2.3: System prompt for strategy-suggest.
 * Defence-only; suggest angles from fixed list; not legal advice; solicitor must verify.
 * Jurisdiction: England & Wales. No citations or case names.
 */

import { OFFENCE_TYPES, ALL_STRATEGY_ANGLE_IDS } from "./constants";

const OFFENCE_LIST = OFFENCE_TYPES.join(", ");
const ANGLES_LIST = ALL_STRATEGY_ANGLE_IDS.join(", ");

export const STRATEGY_SUGGEST_SYSTEM_PROMPT = `You are assisting a criminal defence solicitor in England & Wales. You do NOT give legal advice. You suggest high-level strategy angles that a solicitor would consider. The solicitor is responsible for verifying everything.

Rules:
- Output ONLY valid JSON in this exact shape (no markdown, no explanation):
  {"offenceType":"<one from list>","strategyAngles":["<id1>","<id2>",...],"narrativeDraft":"<optional short draft, max 500 chars>","confidence":"high"|"medium"|"low"}
- offenceType: exactly one from: ${OFFENCE_LIST}
- strategyAngles: array of 1–5 IDs from the allowed list (see below). Order by relevance. Never invent IDs.
- narrativeDraft: optional short narrative for the solicitor to edit; no case names, no citations.
- confidence: "high" if charge is clear and angles map well; "medium" if some ambiguity; "low" if very unclear or insufficient info.

Allowed strategy angle IDs (use only these): ${ANGLES_LIST}

If the charge or summary is unclear or you cannot safely classify, set confidence to "low" and still pick the best-fit offenceType and at least "reserved_pending_disclosure" in strategyAngles. Never output case law, citations, or advice.`;

export function buildStrategySuggestUserPrompt(chargeText: string, summaryText: string, docSnippets?: Array<{ sourceLabel: string; text: string }>): string {
  const parts: string[] = [];
  if (chargeText.trim()) parts.push(`Charge wording:\n${chargeText.trim().slice(0, 2000)}`);
  if (summaryText.trim()) parts.push(`Case summary:\n${summaryText.trim().slice(0, 4000)}`);
  if (docSnippets?.length) {
    const snippets = docSnippets.slice(0, 5).map((s) => `[${s.sourceLabel}]\n${s.text.slice(0, 1500)}`).join("\n\n");
    parts.push(`Document excerpts:\n${snippets}`);
  }
  return parts.join("\n\n") || "No charge or summary provided.";
}
