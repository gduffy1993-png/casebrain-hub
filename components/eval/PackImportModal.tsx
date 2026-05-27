"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EVAL_PACK_LABELS, type EvalPackId } from "@/lib/eval-packs";
import {
  PACK_IMPORT_CHUNK_SIZE,
  buildPackImportPreview,
  listPackImportNonGoldSorted,
  parseEvalPackManifestCsv,
  type ManifestRow,
} from "@/lib/eval-pack-import-ui";

function fileKey(f: File): string {
  return `${f.name}\0${f.size}\0${f.lastModified}`;
}

function mergeUniqueFiles(prev: File[], incoming: File[]): File[] {
  const m = new Map<string, File>();
  for (const f of prev) m.set(fileKey(f), f);
  for (const f of incoming) m.set(fileKey(f), f);
  return Array.from(m.values());
}

export type PackImportCompleteSummary = {
  packId: EvalPackId;
  selected_count: number;
  will_import_count: number;
  created: number;
  updated: number;
  replaced: number;
  skipped: number;
  error_count: number;
  final_pack_count: number;
  warnings: string[];
  errors: string[];
};

type PackImportModalProps = {
  packId: EvalPackId;
  isOpen: boolean;
  onClose: () => void;
  existingPackCaseNos: Set<number>;
  onComplete: (summary: PackImportCompleteSummary) => void | Promise<void>;
};

export function PackImportModal({ packId, isOpen, onClose, existingPackCaseNos, onComplete }: PackImportModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [manifestMap, setManifestMap] = useState<Map<string, ManifestRow>>(() => new Map());
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const manifestInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFiles([]);
    setManifestMap(new Map());
    setReplaceExisting(false);
    setConfirmReplace(false);
    setBusy(false);
    setLastError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
    if (manifestInputRef.current) manifestInputRef.current.value = "";
  }, [isOpen, packId]);

  const orderedFiles = useMemo(() => listPackImportNonGoldSorted(files).slice(0, 40), [files]);

  const { rows, warnings: previewWarnings } = useMemo(
    () =>
      buildPackImportPreview({
        packId,
        files,
        manifest: manifestMap,
        existingPackCaseNos,
        preferSequentialSlots: packId === "Y",
      }),
    [packId, files, manifestMap, existingPackCaseNos]
  );

  const importPairs = useMemo(() => {
    const out: { row: (typeof rows)[number]; file: File }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const file = orderedFiles[i];
      if (!file || row.unsupported) continue;
      out.push({ row, file });
    }
    return out;
  }, [rows, orderedFiles]);

  const onPickFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setFiles((prev) => mergeUniqueFiles(prev, picked));
    setLastError(null);
  }, []);

  const onManifest = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setManifestMap(parseEvalPackManifestCsv(text));
      setLastError(null);
    };
    reader.onerror = () => setLastError("Could not read manifest file");
    reader.readAsText(f);
  }, []);

  const canImport = importPairs.length > 0 && !busy;
  const replaceOk = !replaceExisting || confirmReplace;

  const runImport = useCallback(async () => {
    if (!canImport || !replaceOk) return;
    setBusy(true);
    setLastError(null);
    const selectedCount = files.length;
    const willImportCount = importPairs.length;
    let created = 0;
    let updated = 0;
    let replaced = 0;
    let skipped = 0;
    let finalPackCount = 0;
    const warnings: string[] = [...previewWarnings];
    const errors: string[] = [];

    try {
      for (let i = 0; i < importPairs.length; i += PACK_IMPORT_CHUNK_SIZE) {
        const slice = importPairs.slice(i, i + PACK_IMPORT_CHUNK_SIZE);
        const isFirstChunk = i === 0;
        const fd = new FormData();
        fd.append("packId", packId);
        fd.append("replaceExisting", replaceExisting ? "true" : "false");
        fd.append("confirmReplace", confirmReplace ? "true" : "false");
        fd.append("clearPackDocumentsFirst", isFirstChunk && replaceExisting ? "true" : "false");
        fd.append("selectedCount", String(selectedCount));
        fd.append("willImportCount", String(willImportCount));
        fd.append(
          "items",
          JSON.stringify(slice.map((p) => ({ evalCaseNo: p.row.evalCaseNo, caseTitle: p.row.caseTitle })))
        );
        for (const p of slice) fd.append("files", p.file);

        const res = await fetch("/api/eval-packs/import", { method: "POST", body: fd, credentials: "include" });
        const json = (await res.json().catch(() => ({}))) as PackImportCompleteSummary & {
          ok?: boolean;
          error?: string;
          created_count?: number;
          updated_count?: number;
          replaced_count?: number;
          skipped_count?: number;
        };
        if (!res.ok) {
          throw new Error(json.error || res.statusText || "Import failed");
        }
        created += json.created_count ?? json.created ?? 0;
        updated += json.updated_count ?? json.updated ?? 0;
        replaced += json.replaced_count ?? json.replaced ?? 0;
        skipped += json.skipped_count ?? json.skipped ?? 0;
        finalPackCount = json.final_pack_count ?? finalPackCount;
        if (Array.isArray(json.warnings)) warnings.push(...json.warnings);
        if (Array.isArray(json.errors)) errors.push(...json.errors);
      }

      if (willImportCount > 0 && finalPackCount !== willImportCount) {
        warnings.push(
          `Pack ${packId} final case count is ${finalPackCount} but ${willImportCount} file(s) were imported — expected ${willImportCount}. Check for archived duplicates or import errors.`
        );
      }

      const summary: PackImportCompleteSummary = {
        packId,
        selected_count: selectedCount,
        will_import_count: willImportCount,
        created,
        updated,
        replaced,
        skipped,
        error_count: errors.length,
        final_pack_count: finalPackCount,
        warnings,
        errors,
      };
      console.info("[pack-import]", summary);
      await onComplete(summary);
      onClose();
    } catch (e) {
      setLastError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [
    canImport,
    replaceOk,
    importPairs,
    packId,
    replaceExisting,
    confirmReplace,
    previewWarnings,
    onComplete,
    onClose,
  ]);

  if (!isOpen) return null;

  const packLabel = EVAL_PACK_LABELS[packId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="relative flex max-h-[90vh] w-full max-w-4xl flex-col gap-3 overflow-hidden p-4 shadow-xl">
        <button
          type="button"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          <h2 className="text-lg font-semibold pr-8">Import pack — {packId}</h2>
          <p className="text-sm text-muted-foreground">{packLabel}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onPickFiles} />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            className="hidden"
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={onPickFiles}
          />
          <input ref={manifestInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onManifest} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            Choose files
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => folderInputRef.current?.click()}>
            Choose folder
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => manifestInputRef.current?.click()}>
            Optional manifest CSV
          </Button>
          <span className="text-xs text-muted-foreground self-center">
            {files.length} file(s) selected · {importPairs.length} will import
          </span>
        </div>

        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={replaceExisting}
            onChange={(e) => {
              setReplaceExisting(e.target.checked);
              if (!e.target.checked) setConfirmReplace(false);
            }}
          />
          <span>
            Replace existing pack cases (removes documents for matching{" "}
            <code className="text-xs">eval_case_no</code> in this pack only; does not delete cases or touch other packs).
          </span>
        </label>
        {replaceExisting && (
          <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmReplace}
              onChange={(e) => setConfirmReplace(e.target.checked)}
            />
            <span>I understand existing documents for these pack slots will be removed and replaced.</span>
          </label>
        )}

        {lastError && <p className="text-sm text-red-600">{lastError}</p>}

        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="sticky top-0 z-[1] border-b border-border bg-muted">
              <tr className="text-foreground">
                <th className="p-2 font-medium">File</th>
                <th className="p-2 font-medium">#</th>
                <th className="p-2 font-medium">Title</th>
                <th className="p-2 font-medium">Pack</th>
                <th className="p-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.fileName}-${idx}`}
                  className={
                    r.unsupported
                      ? "border-t border-border/60 bg-muted/30 text-muted-foreground"
                      : "border-t border-border/60 odd:bg-card even:bg-muted/20"
                  }
                >
                  <td className="max-w-[200px] truncate p-2 text-foreground" title={r.fileName}>
                    {r.fileName}
                  </td>
                  <td className="p-2 font-mono text-foreground">{r.unsupported ? "—" : r.evalCaseNo}</td>
                  <td className="max-w-[240px] truncate p-2 text-foreground" title={r.caseTitle}>
                    {r.unsupported ? "—" : r.caseTitle}
                  </td>
                  <td className="p-2 font-mono text-foreground">{r.packId}</td>
                  <td className="p-2 text-foreground">{r.unsupported ? "skip" : r.action}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-muted-foreground">
                    Select case files (PDF, DOC, DOCX, TXT). Gold sidecars (*-GOLD.txt) are skipped with a warning.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="max-h-28 overflow-auto rounded-md bg-muted/40 p-2 text-xs text-muted-foreground space-y-0.5">
          <p className="font-medium text-foreground">Preview warnings</p>
          {previewWarnings.length === 0 ? <p>None</p> : previewWarnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void runImport()}
            disabled={!canImport || !replaceOk}
            title={!replaceOk ? "Confirm replace to continue" : undefined}
          >
            {busy ? "Importing…" : `Import (${importPairs.length} files)`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
