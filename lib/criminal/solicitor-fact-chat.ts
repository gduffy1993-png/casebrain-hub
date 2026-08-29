/**
 * Deterministic chat answers from the solicitor fact record.
 * Narrow matchers so eval gold routes (allegation / MG6 / interview) are not stolen.
 */

import type { RenderedSolicitorFacts } from "@/lib/criminal/solicitor-fact-renderer";

export function isSolicitorFactRecordQuestion(message: string): boolean {
  const q = message.trim().toLowerCase();
  if (!q || q.length > 160) return false;
  if (
    /\b(fact sheet|locked facts|what is confirmed|what's confirmed|what is not confirmed|not confirmed on the file)\b/.test(
      q,
    )
  ) {
    return true;
  }
  if (/\b(evidence counts?|how many (were )?(served|referred|missing)|served referred missing)\b/.test(q)) {
    return true;
  }
  if (/\b(hearing date|when is (the )?(next )?hearing|hearing status)\b/.test(q)) {
    return true;
  }
  if (/\boffence family\b/.test(q)) {
    return true;
  }
  if (/\bmg11 status\b/.test(q)) {
    return true;
  }
  return false;
}

export function answerSolicitorFactQuestion(
  message: string,
  rendered: RenderedSolicitorFacts,
): string | null {
  if (!isSolicitorFactRecordQuestion(message)) return null;
  const q = message.trim().toLowerCase();
  if (/\b(hearing date|when is (the )?(next )?hearing|hearing status)\b/.test(q)) {
    return rendered.hearingLine;
  }
  if (/\b(evidence counts?|how many (were )?(served|referred|missing)|served referred missing)\b/.test(q)) {
    return rendered.evidenceCountsLine;
  }
  if (/\boffence family\b/.test(q)) {
    return rendered.familyLine;
  }
  if (/\bmg11 status\b/.test(q)) {
    return rendered.mg11Line;
  }
  return rendered.chatFactSheet;
}
