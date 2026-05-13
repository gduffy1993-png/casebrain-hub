/**
 * Internal eval pack registry (A–J). Orchestration / reporting only — not used in answer generation.
 */

export type EvalPackId = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";

export const EVAL_PACK_IDS: readonly EvalPackId[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

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
