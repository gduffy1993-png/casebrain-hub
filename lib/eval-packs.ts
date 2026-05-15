/**
 * Internal eval pack registry (A–X). Orchestration / reporting only — not used in answer generation.
 *
 * A–J were the original regression / generalisation corpus. K–T extend the
 * harness (messy PDFs, workflow, multi-D, safeguards, conflicts, CPS pressure,
 * thin bundle, injection, exports, review). U–X add OCR/scan/photo, strategy
 * leverage, timeline/alibi, and hearing/court-move corpora. A–T stay the
 * documented full-regression lock; U–X are next eval waves (not in that lock).
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
  | "T"
  | "U"
  | "V"
  | "W"
  | "X";

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
  "U",
  "V",
  "W",
  "X",
];

/** A–T locked full-regression baseline (orchestration / runner quick-select only). */
export const EVAL_PACK_LOCKED_BASELINE_IDS: readonly EvalPackId[] = EVAL_PACK_IDS.filter((id) => id <= "T");

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
  U: "Scanned / photo / OCR evidence",
  V: "Strategy leverage / why this helps",
  W: "Timeline / sequence / alibi conflict",
  X: "Hearing / court move reasoning",
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

  // Packs U–X: narrow markers so A–T inference is unchanged. Pack X avoids bare `CB-X`
  // (collides with generic text) unless it matches a file ref or exhibit prefix.
  if (
    /\bPACK\s*U\b/i.test(upper) ||
    /\bCB-OCR\b/i.test(upper) ||
    /\bCB-SCAN\b/i.test(upper) ||
    /\bCB-PHOTO\b/i.test(upper) ||
    /\bEX-U-/i.test(t) ||
    /\bCB-U-\d{4}-\d{3,4}\b/i.test(upper) ||
    /\bCB-U\b/i.test(upper)
  )
    return pick("U");
  if (
    /\bPACK\s*V\b/i.test(upper) ||
    /\bCB-LEVERAGE\b/i.test(upper) ||
    /\bCB-WHY\b/i.test(upper) ||
    /\bEX-V-/i.test(t) ||
    /\bCB-V-\d{4}-\d{3,4}\b/i.test(upper) ||
    /\bCB-V\b/i.test(upper)
  )
    return pick("V");
  if (
    /\bPACK\s*W\b/i.test(upper) ||
    /\bCB-TIMELINE\b/i.test(upper) ||
    /\bCB-SEQUENCE\b/i.test(upper) ||
    /\bCB-ALIBI\b/i.test(upper) ||
    /\bEX-W-/i.test(t) ||
    /\bCB-W-\d{4}-\d{3,4}\b/i.test(upper) ||
    /\bCB-W\b/i.test(upper)
  )
    return pick("W");
  if (
    /\bPACK\s*X\b/i.test(upper) ||
    /\bEX-X-/i.test(t) ||
    /\bCB-X-\d{4}-\d{3,4}\b/i.test(upper) ||
    /\bCB-HEARING\b/i.test(upper) ||
    /\bCB-COURT\b/i.test(upper) ||
    /\bCB-MOVE\b/i.test(upper)
  )
    return pick("X");

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
