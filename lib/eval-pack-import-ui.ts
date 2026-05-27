/**
 * Client-side helpers for Eval Pack import preview (no server imports).
 */

import type { EvalPackId } from "@/lib/eval-packs";
import { EVAL_PACK_LABELS } from "@/lib/eval-packs";

export const PACK_IMPORT_ALLOWED_EXT = new Set([".pdf", ".doc", ".docx", ".txt"]);

export const PACK_IMPORT_MAX_FILES = 40;
export const PACK_IMPORT_CHUNK_SIZE = 20;

/** Non-gold files sorted by name (uncapped). */
export function listPackImportNonGoldSorted(files: File[]): File[] {
  return files
    .filter((f) => !isEvalGoldAnswerFileName(f.name))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
}

/** First 40 non-gold files after sort — same order as import preview rows. */
export function orderPackImportCandidateFiles(files: File[]): File[] {
  return listPackImportNonGoldSorted(files).slice(0, PACK_IMPORT_MAX_FILES);
}

export type ManifestRow = {
  filename: string;
  eval_case_no: number | null;
  title: string | null;
};

export type PackImportPreviewRow = {
  fileName: string;
  evalCaseNo: number;
  caseTitle: string;
  packId: EvalPackId;
  action: "create" | "update";
  unsupported: boolean;
  goldSkipped: boolean;
};

/** Gold answer sidecar files — not imported as case documents (future: eval_gold_answers table). */
export function isEvalGoldAnswerFileName(name: string): boolean {
  return /-GOLD\.txt$/i.test(name.trim());
}

export function isAllowedPackImportFileName(name: string): boolean {
  const n = name.toLowerCase();
  for (const ext of PACK_IMPORT_ALLOWED_EXT) {
    if (n.endsWith(ext)) return true;
  }
  return false;
}

/**
 * Infer eval_case_no from filename patterns (CB-TRAP-2026-0001 → 1, NS-CPS-2026-0401 → 1, etc.).
 */
export function inferEvalCaseNoFromFilename(filename: string): number | null {
  const stem = filename.replace(/\.[^/.]+$/i, "");
  const matches = [...stem.matchAll(/(\d{4})/g)].map((m) => m[1]!);
  if (matches.length === 0) return null;
  const last4 = matches[matches.length - 1]!;
  const n = parseInt(last4, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n >= 1 && n <= 40) return n;
  if (n > 40) {
    const two = parseInt(last4.slice(-2), 10);
    if (Number.isFinite(two) && two >= 1 && two <= 40) return two;
    const one = parseInt(last4.slice(-1), 10);
    if (Number.isFinite(one) && one >= 1 && one <= 9) return one;
  }
  return null;
}

/** Parse optional CSV: filename,eval_case_no,title (header optional). */
export function parseEvalPackManifestCsv(text: string): Map<string, ManifestRow> {
  const out = new Map<string, ManifestRow>();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return out;
  let start = 0;
  const h = lines[0]!.toLowerCase();
  if (/filename|file|name/.test(h) && /case|no|num|title/.test(h)) start = 1;
  for (let i = start; i < lines.length; i++) {
    const parts = lines[i]!.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 1) continue;
    const filename = parts[0]!;
    const noRaw = parts[1];
    const title = parts[2] ?? null;
    let eval_case_no: number | null = null;
    if (noRaw != null && noRaw !== "") {
      const n = parseInt(noRaw, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 999) eval_case_no = Math.min(40, n);
    }
    out.set(filename.toLowerCase(), { filename, eval_case_no, title: title?.trim() || null });
  }
  return out;
}

export function defaultPackCaseTitle(packId: EvalPackId, evalCaseNo: number, fileName: string): string {
  const label = EVAL_PACK_LABELS[packId];
  return `Pack ${packId} — Case ${evalCaseNo} — ${fileName}`;
}

function allocateCaseNo(desired: number, used: Set<number>): number {
  const d = Math.min(40, Math.max(1, desired));
  if (!used.has(d)) return d;
  for (let n = 1; n <= 40; n++) {
    if (!used.has(n)) return n;
  }
  return d;
}

export function buildPackImportPreview(args: {
  packId: EvalPackId;
  files: File[];
  manifest: Map<string, ManifestRow>;
  existingPackCaseNos: Set<number>;
  /** Assign slots 1…N in sort order (avoids filename inference collisions e.g. Pack Y 0108→8). */
  preferSequentialSlots?: boolean;
}): { rows: PackImportPreviewRow[]; warnings: string[] } {
  const warnings: string[] = [];
  const rawFull = listPackImportNonGoldSorted(args.files);
  const nameCounts = new Map<string, number>();
  for (const f of args.files) {
    const k = f.name.toLowerCase();
    nameCounts.set(k, (nameCounts.get(k) ?? 0) + 1);
  }
  const dupNames = [...nameCounts.entries()].filter(([, c]) => c > 1).map(([k]) => k);
  if (dupNames.length) {
    warnings.push(`Duplicate filename(s) in selection: ${dupNames.join(", ")}`);
  }

  const goldCount = args.files.filter((f) => isEvalGoldAnswerFileName(f.name)).length;
  if (goldCount > 0) {
    warnings.push(
      `Gold answer files detected (${goldCount}) but not imported yet — they will be skipped. Future: separate eval_gold_answers table.`
    );
  }

  const unsupported = args.files.filter(
    (f) => !isAllowedPackImportFileName(f.name) && !isEvalGoldAnswerFileName(f.name)
  );
  if (unsupported.length) {
    warnings.push(`Unsupported file type(s) (will be skipped): ${unsupported.map((f) => f.name).join(", ")}`);
  }

  if (rawFull.length > PACK_IMPORT_MAX_FILES) {
    warnings.push(
      `More than ${PACK_IMPORT_MAX_FILES} case files selected (${rawFull.length}). Only the first ${PACK_IMPORT_MAX_FILES} after sort are previewed/imported.`
    );
  }

  const usable = rawFull.slice(0, PACK_IMPORT_MAX_FILES);
  const rows: PackImportPreviewRow[] = [];
  const usedSlots = new Set<number>();
  const desiredSeen = new Map<number, string>();

  let seq = 0;
  for (const f of usable) {
    if (!isAllowedPackImportFileName(f.name)) {
      rows.push({
        fileName: f.name,
        evalCaseNo: -1,
        caseTitle: "",
        packId: args.packId,
        action: "create",
        unsupported: true,
        goldSkipped: false,
      });
      continue;
    }

    seq += 1;
    const man = args.manifest.get(f.name.toLowerCase());
    let desired =
      man?.eval_case_no != null && man.eval_case_no >= 1 ? Math.min(40, man.eval_case_no) : null;
    if (desired == null && !args.preferSequentialSlots) {
      desired = inferEvalCaseNoFromFilename(f.name);
    }
    if (desired == null) desired = seq;
    const beforeAlloc = desired;
    const prev = desiredSeen.get(beforeAlloc);
    if (prev) {
      warnings.push(
        `Duplicate inferred case number ${beforeAlloc} for "${f.name}" and "${prev}" — second file will use the next free slot.`
      );
    } else {
      desiredSeen.set(beforeAlloc, f.name);
    }
    const evalCaseNo = allocateCaseNo(desired, usedSlots);
    if (evalCaseNo !== beforeAlloc) {
      warnings.push(
        `Adjusted case number for "${f.name}": wanted slot ${beforeAlloc}, using free slot ${evalCaseNo} (collision).`
      );
    }
    usedSlots.add(evalCaseNo);

    const caseTitle =
      (man?.title && man.title.trim()) ||
      defaultPackCaseTitle(args.packId, evalCaseNo, f.name.replace(/\.[^/.]+$/i, ""));

    const action = args.existingPackCaseNos.has(evalCaseNo) ? "update" : "create";

    rows.push({
      fileName: f.name,
      evalCaseNo,
      caseTitle,
      packId: args.packId,
      action,
      unsupported: false,
      goldSkipped: false,
    });
  }

  return { rows, warnings };
}
