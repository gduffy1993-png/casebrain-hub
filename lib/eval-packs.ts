/**
 * Internal eval pack registry (A–T). Orchestration / reporting only — not used in answer generation.
 *
 * A–J were the original regression / generalisation corpus. K–T extend the
 * harness with messy real-world inputs, workflow/stage breadth, multi-defendant
 * pressure, vulnerability/safeguards, instruction conflict, defence-fact /
 * CPS pressure, thin-bundle / no-safe-strategy, prompt-injection robustness,
 * and solicitor export / review-readiness paths. A–J behaviour is preserved.
 */

export type EvalPackId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L"
  | "M"
  | "N"
  | "O"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T";

export const EVAL_PACK_IDS: readonly EvalPackId[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
];

export const EVAL_PACK_LABELS: Record<EvalPackId, string> = {
  A: "Northshire regression / stability",
  B: "Generic bundle wording / generalisation",
  C: "Hallucination traps",
  D: "Gold-answer truth",
  E: "Procedural stages",
  F: "Youth / vulnerability",
  G: "Evidence chaos",
  H: "Strategy pressure",
  I: "Multi-defendant / multi-count",
  J: "Document-type variation",
  K: "Messy real-world PDFs",
  L: "Stage-specific workflow",
  M: "Multi-defendant / multi-count pressure",
  N: "Youth / vulnerability / safeguards",
  O: "Client instructions conflict",
  P: "Bad defence facts / CPS pressure",
  Q: "No-safe-strategy / thin bundle",
  R: "Prompt injection / malicious document",
  S: "Solicitor exports",
  T: "Solicitor review readiness",
};

export type InferredEvalPack = {
  pack_id: EvalPackId;
  pack_name: string;
  eval_case_no: number | null;
};

function extractCaseOrdinal(title: string): number | null {
  const m =
    /\bcase\s*#?\s*(\d{1,3})\b/i.exec(title) ||
    /\b(?:case|cb)[\s_-]*(\d{1,3})\b/i.exec(title) ||
    /\b(\d{1,3})\s*\/\s*40\b/i.exec(title);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 && n <= 999 ? n : null;
}

/**
 * Infer pack from filename / case title when DB tags are unset (uploads, legacy rows).
 */
export function inferEvalPackFromTitle(title: string): InferredEvalPack | null {
  const t = title.trim();
  if (!t) return null;
  const upper = t.toUpperCase();
  const caseNo = extractCaseOrdinal(t);

  const pick = (id: EvalPackId): InferredEvalPack => ({
    pack_id: id,
    pack_name: EVAL_PACK_LABELS[id],
    eval_case_no: caseNo,
  });

  if (/\bNS-CPS\b/i.test(t) || /\bPACK\s*A\b/i.test(upper) || /\bCB-A\b/i.test(upper)) return pick("A");
  if (/\bCB-TEST\b/i.test(upper) || /\bPACK\s*B\b/i.test(upper) || /\bCB-B\b/i.test(upper)) return pick("B");
  if (/\bCB-TRAP\b/i.test(upper)) return pick("C");
  if (/\bCB-GOLD\b/i.test(upper)) return pick("D");
  if (/\bCB-STAGE\b/i.test(upper)) return pick("E");
  if (/\bCB-VULN\b/i.test(upper)) return pick("F");
  if (/\bCB-CHAOS\b/i.test(upper)) return pick("G");
  if (/\bCB-STRATEGY\b/i.test(upper)) return pick("H");
  if (/\bCB-MULTI\b/i.test(upper)) return pick("I");
  if (/\bCB-DOC\b/i.test(upper)) return pick("J");

  // Packs K–T: each accepts the universal `PACK X` / `CB-X` shape plus a few
  // label-distinctive identifiers chosen so they do not collide with A–J's
  // existing markers (e.g. `CB-STAGE` stays Pack E; Pack L uses `CB-WORKFLOW`
  // / `CB-STAGE2`; `CB-VULN` stays Pack F; Pack N uses `CB-SAFEGUARDS` /
  // `CB-YOUTH2`; `CB-MULTI` stays Pack I; Pack M uses `CB-MDPRESS` /
  // `CB-MULTI2`). The universal patterns are sufficient even when a project
  // hasn't standardised a label-specific prefix yet.
  if (/\bPACK\s*K\b/i.test(upper) || /\bCB-K\b/i.test(upper) || /\bCB-MESSY\b/i.test(upper) || /\bCB-REAL\b/i.test(upper)) return pick("K");
  if (/\bPACK\s*L\b/i.test(upper) || /\bCB-L\b/i.test(upper) || /\bCB-WORKFLOW\b/i.test(upper) || /\bCB-STAGE2\b/i.test(upper)) return pick("L");
  if (/\bPACK\s*M\b/i.test(upper) || /\bCB-M\b/i.test(upper) || /\bCB-MDPRESS\b/i.test(upper) || /\bCB-MULTI2\b/i.test(upper)) return pick("M");
  if (/\bPACK\s*N\b/i.test(upper) || /\bCB-N\b/i.test(upper) || /\bCB-SAFEGUARDS\b/i.test(upper) || /\bCB-YOUTH2\b/i.test(upper)) return pick("N");
  if (/\bPACK\s*O\b/i.test(upper) || /\bCB-O\b/i.test(upper) || /\bCB-INSTRUCT\b/i.test(upper) || /\bCB-CONFLICT\b/i.test(upper)) return pick("O");
  if (/\bPACK\s*P\b/i.test(upper) || /\bCB-P\b/i.test(upper) || /\bCB-CPS\b/i.test(upper) || /\bCB-PRESS\b/i.test(upper)) return pick("P");
  if (/\bPACK\s*Q\b/i.test(upper) || /\bCB-Q\b/i.test(upper) || /\bCB-THIN\b/i.test(upper) || /\bCB-NOSAFE\b/i.test(upper)) return pick("Q");
  if (/\bPACK\s*R\b/i.test(upper) || /\bCB-R\b/i.test(upper) || /\bCB-INJECT\b/i.test(upper) || /\bCB-MALICIOUS\b/i.test(upper)) return pick("R");
  if (/\bPACK\s*S\b/i.test(upper) || /\bCB-S\b/i.test(upper) || /\bCB-EXPORT\b/i.test(upper)) return pick("S");
  if (/\bPACK\s*T\b/i.test(upper) || /\bCB-T\b/i.test(upper) || /\bCB-REVIEW\b/i.test(upper) || /\bCB-READY\b/i.test(upper)) return pick("T");

  return null;
}

export function parseEvalPackId(raw: string | null | undefined): EvalPackId | null {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s || s === "NONE" || s === "NORMAL") return null;
  if (EVAL_PACK_IDS.includes(s as EvalPackId)) return s as EvalPackId;
  return null;
}

/** Effective pack for grouping: explicit DB field wins, else title inference. */
export function effectiveEvalPackForCase(row: {
  title?: string | null;
  eval_pack_id?: string | null;
  eval_pack_name?: string | null;
  eval_case_no?: number | null;
}): { pack_id: EvalPackId; pack_name: string; eval_case_no: number | null; source: "db" | "inferred" } | null {
  const fromDb = parseEvalPackId(row.eval_pack_id ?? undefined);
  if (fromDb) {
    return {
      pack_id: fromDb,
      pack_name: (row.eval_pack_name && row.eval_pack_name.trim()) || EVAL_PACK_LABELS[fromDb],
      eval_case_no: typeof row.eval_case_no === "number" && Number.isFinite(row.eval_case_no) ? row.eval_case_no : null,
      source: "db",
    };
  }
  const inferred = inferEvalPackFromTitle(row.title ?? "");
  if (!inferred) return null;
  return { ...inferred, source: "inferred" };
}

export type EvalPackResolutionSource = "db" | "inferred_title" | "inferred_doc";

/**
 * Pack resolution for eval UI / runners: DB tag wins, then title patterns, then first-document filename patterns.
 */
export function resolveCaseEvalPack(row: {
  title?: string | null;
  eval_pack_id?: string | null;
  eval_pack_name?: string | null;
  eval_case_no?: number | null;
  eval_doc_hint?: string | null;
}): {
  pack_id: EvalPackId;
  pack_name: string;
  eval_case_no: number | null;
  source: EvalPackResolutionSource;
} | null {
  const fromDb = parseEvalPackId(row.eval_pack_id ?? undefined);
  if (fromDb) {
    return {
      pack_id: fromDb,
      pack_name: (row.eval_pack_name && row.eval_pack_name.trim()) || EVAL_PACK_LABELS[fromDb],
      eval_case_no: typeof row.eval_case_no === "number" && Number.isFinite(row.eval_case_no) ? row.eval_case_no : null,
      source: "db",
    };
  }
  const fromTitle = inferEvalPackFromTitle(row.title ?? "");
  if (fromTitle) {
    return { ...fromTitle, source: "inferred_title" };
  }
  const docHint = row.eval_doc_hint?.trim();
  if (docHint) {
    const fromDoc = inferEvalPackFromTitle(docHint);
    if (fromDoc) {
      return { ...fromDoc, source: "inferred_doc" };
    }
  }
  return null;
}
