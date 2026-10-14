/** Bounded supervised learning. Rules contain labels, never another case's answers. */
import { z } from "zod";

export const LEARNING_VERSION = "field-label-learning-v1-paged-reader";
export const FIELDS = ["defendant", "charge", "court", "hearing"] as const;
export type LearningField = typeof FIELDS[number];
export const FIELD_TITLES: Record<LearningField, string> = {
  defendant: "Defendant", charge: "Charge", court: "Court", hearing: "Hearing date",
};
const fieldCue: Record<LearningField, RegExp> = {
  defendant: /\b(defendant|accused)\b/i,
  charge: /\b(charge|offence|offense|allegation)\b/i,
  court: /\b(court|venue)\b/i,
  hearing: /\b(hearing|listing)\b/i,
};
export const RuleSchema = z.object({
  field: z.enum(FIELDS),
  label: z.string().trim().min(3).max(64).regex(/^[A-Za-z][A-Za-z ()/-]*$/),
}).strict().superRefine((rule, ctx) => {
  if (!fieldCue[rule.field].test(rule.label)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Label must identify the selected field." });
});
export type LabelRule = z.infer<typeof RuleSchema>;
export type ApprovedRule = LabelRule & { id: string; status: "approved"; pipelineVersion: string };
export type SourceMatch = { value: string; line: string; lineNumber: number; compiledPage: number | null; ruleId: string };
export const normalizeValue = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();

export function plausibleValue(field: LearningField, value: string): boolean {
  if (!value || value.length > 320 || /\b(ignore|instructions|system prompt|details\s*20\d\d)\b/i.test(value)) return false;
  switch (field) {
    case "defendant": return /^[\p{L}][\p{L} .’'-]{2,95}$/u.test(value) && !/\b(court|offence|unknown|defendant|accused)\b/i.test(value);
    case "charge": return /\b(contrary to|section\s*\d+|common law)\b/i.test(value) && !/\bdefendant,?\s*charge,?\s*court\b/i.test(value);
    case "court": return /\bcourt\b/i.test(value) && value.length <= 160 && !/\b(hearing|defendant|charge)\b/i.test(value);
    case "hearing": return /\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]20\d{2}\b/i.test(value) && !/\b(cancelled|vacated|superseded|previous|former)\b/i.test(value);
  }
}

/** Exact row label only. No fuzzy matching, model instructions or arbitrary regex. */
export function matchLabelRule(text: string, rule: LabelRule, id = "candidate"): SourceMatch[] {
  const valid = RuleSchema.safeParse({ field: rule.field, label: rule.label });
  if (!valid.success) return [];
  const label = normalizeValue(valid.data.label);
  const pages = text.split("\f");
  return pages.flatMap((page, pageIndex) => page.split(/\r?\n/).flatMap((line, index) => {
    const boundary = line.search(/[:|\t]/);
    if (boundary < 0 || normalizeValue(line.slice(0, boundary)) !== label) return [];
    const value = line.slice(boundary + 1).trim();
    if (!plausibleValue(rule.field, value)) return [];
    return [{ value, line: line.trim(), lineNumber: index + 1, compiledPage: pages.length > 1 ? pageIndex + 1 : null, ruleId: id }];
  }));
}

/** Ambiguous rows are withheld; existing facts are never overwritten. */
export function learnedFields(text: string, rules: ApprovedRule[]): Partial<Record<LearningField, SourceMatch>> {
  const result: Partial<Record<LearningField, SourceMatch>> = {};
  for (const field of FIELDS) {
    const matches = rules.filter(r => r.status === "approved" && r.pipelineVersion === LEARNING_VERSION && r.field === field)
      .flatMap(r => matchLabelRule(text, r, r.id));
    const canonicalLabels: Record<LearningField, string[]> = {
      defendant: ["Defendant", "Accused"], charge: ["Charge", "Offence", "Statement of offence"],
      court: ["Court", "Venue"], hearing: ["Next hearing", "Hearing date", "Listing date"],
    };
    const otherRows = canonicalLabels[field].flatMap(label => matchLabelRule(text, { field, label }, "source"));
    if (field === "defendant") {
      for (const line of text.split(/\r?\n|\f/)) {
        const name = line.match(/^\s*R\s+v\s+(.+)$/i)?.[1]?.trim();
        if (name && plausibleValue(field, name)) otherRows.push({ value: name, line, lineNumber: 0, compiledPage: null, ruleId: "source" });
      }
    }
    const values = new Set([...matches, ...otherRows].map(m => normalizeValue(m.value)));
    if (matches.length && values.size === 1) result[field] = matches[0];
  }
  return result;
}

export type EvaluationObservation = {
  id: string; sourceHash: string; sourceCaseId: string; originalPdf: boolean;
  expected: string; baseline: string | null; candidate: string | null;
};
export type EvaluationReport = {
  pipelineVersion: string; candidateKey: string; baselineKey: string;
  tested: number; baselineCorrect: number; candidateCorrect: number;
  improvements: number; regressions: number; failures: number;
  eligible: boolean; reasons: string[]; observations: EvaluationObservation[];
};
export function evaluateObservations(rule: LabelRule, observations: EvaluationObservation[],
  training: { sourceHash: string; caseId: string }, baselineKey: string): EvaluationReport {
  const reasons: string[] = [];
  if (!RuleSchema.safeParse({ field: rule.field, label: rule.label }).success) reasons.push("Invalid label rule.");
  if (observations.length < 5) reasons.push("At least five held-out original PDFs are required.");
  if (new Set(observations.map(o => o.sourceHash)).size !== observations.length) reasons.push("Duplicate PDFs are not independent tests.");
  if (new Set(observations.map(o => o.sourceCaseId)).size !== observations.length) reasons.push("Each test must be from a different case.");
  if (observations.some(o => !o.originalPdf)) reasons.push("Every test must use original PDF bytes.");
  if (observations.some(o => !o.expected.trim() || !o.sourceHash || !o.sourceCaseId)) reasons.push("Every test needs a verified answer and source identity.");
  if (observations.some(o => o.sourceHash === training.sourceHash || o.sourceCaseId === training.caseId)) reasons.push("Training source cannot be a held-out test.");
  let baselineCorrect = 0, candidateCorrect = 0, improvements = 0, regressions = 0;
  for (const o of observations) {
    const base = normalizeValue(o.baseline ?? "") === normalizeValue(o.expected);
    const candidate = normalizeValue(o.candidate ?? "") === normalizeValue(o.expected);
    baselineCorrect += Number(base); candidateCorrect += Number(candidate);
    improvements += Number(!base && candidate);
    // An incorrect new fact is a regression even when the baseline abstained.
    if (!candidate && (base || normalizeValue(o.candidate ?? "") !== normalizeValue(o.baseline ?? ""))) regressions += 1;
  }
  if (improvements < 2) reasons.push("At least two held-out cases must improve.");
  if (regressions) reasons.push("Regressions prevent approval.");
  if (candidateCorrect !== observations.length) reasons.push("All verified answers in this evaluation must match.");
  return { pipelineVersion: LEARNING_VERSION, candidateKey: `${rule.field}:${normalizeValue(rule.label)}`,
    baselineKey, tested: observations.length, baselineCorrect, candidateCorrect, improvements, regressions,
    failures: observations.length - candidateCorrect, eligible: reasons.length === 0, reasons, observations };
}
