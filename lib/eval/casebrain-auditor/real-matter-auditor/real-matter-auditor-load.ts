import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";
import { validateLocalManifest } from "./real-matter-auditor-validate";
import {
  localBundlePdfPath,
  localBundleTextPath,
  localHumanTruthPath,
  localManifestPath,
  localMatterDir,
  localRealMattersRoot,
} from "./real-matter-auditor-paths";
import type {
  RealMatterHumanTruth,
  RealMatterListEntry,
  RealMatterLocalManifest,
} from "./real-matter-auditor-types";

export function listLocalRealMatters(): RealMatterListEntry[] {
  const root = localRealMattersRoot();
  if (!fs.existsSync(root)) return [];

  const dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  const out: RealMatterListEntry[] = [];

  for (const d of dirs) {
    const localId = d.name;
    const manifestPath = localManifestPath(localId);
    if (!fs.existsSync(manifestPath)) continue;

    try {
      const parsed = validateLocalManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
      if (!parsed.ok) continue;
      const m = parsed.manifest;
      out.push({
        localId: m.localId,
        anonymisedLabel: m.anonymisedLabel,
        offenceFamily: m.offenceFamily,
        holdout: Boolean(m.holdout),
        inputType: m.inputType,
        hasBundleText: fs.existsSync(localBundleTextPath(localId)),
        hasBundlePdf: fs.existsSync(localBundlePdfPath(localId)),
        hasHumanTruth: fs.existsSync(localHumanTruthPath(localId)),
      });
    } catch {
      /* skip invalid */
    }
  }

  return out.sort((a, b) => a.localId.localeCompare(b.localId));
}

export function loadLocalManifest(localId: string): RealMatterLocalManifest | null {
  const p = localManifestPath(localId);
  if (!fs.existsSync(p)) return null;
  const parsed = validateLocalManifest(JSON.parse(fs.readFileSync(p, "utf8")));
  return parsed.ok ? parsed.manifest : null;
}

export function loadHumanTruth(localId: string): RealMatterHumanTruth | null {
  const p = localHumanTruthPath(localId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as RealMatterHumanTruth;
  } catch {
    return null;
  }
}

export async function loadLocalBundleText(localId: string): Promise<{
  text: string;
  source: "bundle-text" | "bundle-pdf-extract" | "none";
  extractError?: string;
}> {
  const textPath = localBundleTextPath(localId);
  const pdfPath = localBundlePdfPath(localId);

  if (fs.existsSync(textPath)) {
    const text = fs.readFileSync(textPath, "utf8");
    if (fs.existsSync(pdfPath)) {
      return { text, source: "bundle-text" };
    }
    return { text, source: "bundle-text" };
  }

  if (fs.existsSync(pdfPath)) {
    try {
      const buffer = fs.readFileSync(pdfPath);
      const text = await extractTextFromFileBuffer(
        "bundle.pdf",
        "application/pdf",
        Buffer.from(buffer),
      );
      return { text: text || "", source: "bundle-pdf-extract" };
    } catch (e) {
      return {
        text: "",
        source: "none",
        extractError: e instanceof Error ? e.message : "pdf_extract_failed",
      };
    }
  }

  return { text: "", source: "none" };
}

export function matterDirExists(localId: string): boolean {
  return fs.existsSync(localMatterDir(localId));
}
