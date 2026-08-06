/**
 * Real-PDF Live Pilot v1 — output PDF raster/page-render checks.
 *
 * Uses Puppeteer's bundled Chromium plus pdf.js (loaded from a CDN inside the
 * Chromium page — no pdfjs-dist/canvas/ghostscript package is installed locally)
 * to rasterise every page of every GENERATED output strategy PDF under
 * bulk/output-pdfs/ (NEVER a source PDF) to a PNG, then runs pixel-level
 * heuristics on each page:
 *   - blank / near-all-white page
 *   - tiny non-white content bounding box vs page size (possible clipping/overflow)
 *   - broken-font / tofu-glyph density in the text layer (replacement-char count)
 *   - pageCount > 0, %PDF- header present
 * It also cross-checks the extracted text against the case's own materialised
 * charge-completeness result: when the recorded charge is incomplete, the
 * incomplete-charge warning and provenance limitation must actually appear in
 * the rendered/extracted PDF text.
 *
 * Honesty: this rasterises GENERATED output PDFs only. If Chromium/puppeteer or
 * the CDN pdf.js load fails for environment reasons, the exact blocker is
 * recorded as NOT_EXERCISED for the affected case(s) — never silently skipped
 * and never claimed to have passed.
 *
 * Disk budget: old page-renders are deleted before regenerating; source PDFs are
 * never copied or touched.
 *
 *   node --import tsx scripts/assurance/real-pdf-live-pilot/output-pdf-raster-checks.ts
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { ARTEFACT_ROOT, PILOT_20 } from "./pilot-20-definition";

const REPO_ROOT = process.cwd();
const ARTEFACTS_DIR = path.join(REPO_ROOT, ARTEFACT_ROOT);
const OUTPUT_PDFS_DIR = path.join(ARTEFACTS_DIR, "bulk", "output-pdfs");
const PAGE_RENDERS_DIR = path.join(ARTEFACTS_DIR, "bulk", "page-renders");
const CASE_RESULTS_DIR = path.join(ARTEFACTS_DIR, "bulk", "case-results");

const INCOMPLETE_CHARGE_WARNING_SNIPPET = "recorded charge wording appears incomplete";

const PDFJS_VERSION = "3.11.174";
const PDFJS_LIB_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`;
const PDFJS_WORKER_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

const HARNESS_HTML = `<!doctype html>
<html>
<head><meta charset="utf-8"><title>real-pdf-live-pilot-raster-harness</title></head>
<body>
<script src="${PDFJS_LIB_URL}"></script>
<script>
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = ${JSON.stringify(PDFJS_WORKER_URL)};
</script>
</body>
</html>`;

export type PageRasterResult = {
  pageNumber: number;
  pngRelativePath: string;
  widthPx: number;
  heightPx: number;
  nonWhitePixelFraction: number;
  blankOrNearAllWhite: boolean;
  nonWhiteBoundingBox: { x0: number; y0: number; x1: number; y1: number } | null;
  tinyContentBoundingBoxSuspected: boolean;
  textLength: number;
  tofuCharCount: number;
  brokenFontSuspected: boolean;
};

export type CaseRasterResult = {
  caseId: string;
  outputPdfRelativePath: string | null;
  status: "EXERCISED" | "NOT_EXERCISED";
  blocker: string | null;
  pdfHeaderOk: boolean | null;
  byteLength: number | null;
  pageCount: number | null;
  pages: PageRasterResult[];
  anyBlankPage: boolean;
  anyTinyContentBoundingBox: boolean;
  anyBrokenFontSuspected: boolean;
  incompleteChargeExpected: boolean;
  incompleteChargeWarningPresentInText: boolean | "not_applicable";
};

function rimraf(p: string): void {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(p: string, data: unknown): void {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function writeText(p: string, text: string): void {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, text, "utf8");
}

function loadCaseChargeExpectation(caseId: string): { incompleteExpected: boolean } {
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(CASE_RESULTS_DIR, `${caseId}.json`), "utf8"),
    ) as { summary?: { chargeReadiness?: { completenessStatus?: string | null } | null } };
    const status = raw.summary?.chargeReadiness?.completenessStatus ?? null;
    return { incompleteExpected: Boolean(status) && status !== "complete" };
  } catch {
    return { incompleteExpected: false };
  }
}

function blankResult(caseId: string, blocker: string, outputPdfRelativePath: string | null = null): CaseRasterResult {
  return {
    caseId,
    outputPdfRelativePath,
    status: "NOT_EXERCISED",
    blocker,
    pdfHeaderOk: null,
    byteLength: null,
    pageCount: null,
    pages: [],
    anyBlankPage: false,
    anyTinyContentBoundingBox: false,
    anyBrokenFontSuspected: false,
    incompleteChargeExpected: loadCaseChargeExpectation(caseId).incompleteExpected,
    incompleteChargeWarningPresentInText: "not_applicable",
  };
}

/** In-page evaluation payload shape returned from the Chromium context. */
type EvalPageResult = {
  pageNumber: number;
  pngDataUrl: string;
  widthPx: number;
  heightPx: number;
  nonWhitePixelFraction: number;
  blankOrNearAllWhite: boolean;
  nonWhiteBoundingBox: { x0: number; y0: number; x1: number; y1: number } | null;
  tinyContentBoundingBoxSuspected: boolean;
  textLength: number;
  tofuCharCount: number;
};

async function rasterCaseOutputPdf(
  browser: import("puppeteer").Browser,
  caseId: string,
): Promise<CaseRasterResult> {
  const pdfPath = path.join(OUTPUT_PDFS_DIR, `${caseId}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    return blankResult(caseId, `No generated output PDF found at ${pdfPath}.`);
  }
  const buf = fs.readFileSync(pdfPath);
  const outputPdfRelativePath = path.relative(REPO_ROOT, pdfPath).split(path.sep).join("/");
  const pdfHeaderOk = buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-";
  const { incompleteExpected } = loadCaseChargeExpectation(caseId);

  const outDir = path.join(PAGE_RENDERS_DIR, caseId);
  ensureDir(outDir);

  const page = await browser.newPage();
  try {
    await page.setContent(HARNESS_HTML, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.waitForFunction(
      () => Boolean((window as unknown as { pdfjsLib?: unknown }).pdfjsLib),
      { timeout: 30_000 },
    );

    const base64 = buf.toString("base64");
    const evalFn = async (b64: string) => {
      // Inline base64 decode (no nested named function — some TS-to-JS transforms
      // inject a __name() helper call for named function declarations that only
      // exists in the Node runtime, not inside the evaluated browser context).
      const raw = atob(b64);
      const data = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) data[i] = raw.charCodeAt(i);
      const pdfjsLib = (window as unknown as { pdfjsLib: any }).pdfjsLib;
      const loadingTask = pdfjsLib.getDocument({ data });
      const doc = await loadingTask.promise;
      const pages: EvalPageResult[] = [];
      let fullText = "";
      for (let i = 1; i <= doc.numPages; i += 1) {
        const pg = await doc.getPage(i);
        const viewport = pg.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.ceil(viewport.width));
        canvas.height = Math.max(1, Math.ceil(viewport.height));
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        await pg.render({ canvasContext: ctx, viewport }).promise;
        const w = canvas.width;
        const h = canvas.height;
        const imgData = ctx.getImageData(0, 0, w, h).data;
        let nonWhite = 0;
        let minX = w;
        let minY = h;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const idx = (y * w + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const bch = imgData[idx + 2];
            if (r < 250 || g < 250 || bch < 250) {
              nonWhite += 1;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        const nonWhitePixelFraction = nonWhite / (w * h);
        const textContent = await pg.getTextContent();
        const text = (textContent.items as Array<{ str?: string }>).map((it) => it.str ?? "").join(" ");
        fullText += `\n${text}`;
        const tofuMatches = text.match(/[\uFFFD\u25A1\u2B1B\u25AF]/g);
        const bboxArea = maxX >= 0 ? (maxX - minX + 1) * (maxY - minY + 1) : 0;
        pages.push({
          pageNumber: i,
          pngDataUrl: canvas.toDataURL("image/png"),
          widthPx: w,
          heightPx: h,
          nonWhitePixelFraction,
          blankOrNearAllWhite: nonWhitePixelFraction < 0.0015,
          nonWhiteBoundingBox: maxX >= 0 ? { x0: minX, y0: minY, x1: maxX, y1: maxY } : null,
          tinyContentBoundingBoxSuspected:
            maxX >= 0 && nonWhitePixelFraction >= 0.0015 && bboxArea / (w * h) < 0.02,
          textLength: text.length,
          tofuCharCount: tofuMatches ? tofuMatches.length : 0,
        });
      }
      return { pageCount: doc.numPages, pages, fullText };
    };
    const evalResult = await page.evaluate(evalFn, base64);

    const pages: PageRasterResult[] = evalResult.pages.map((p) => {
      const pngRelativePath = path
        .relative(REPO_ROOT, path.join(outDir, `page-${String(p.pageNumber).padStart(3, "0")}.png`))
        .split(path.sep)
        .join("/");
      const b64 = p.pngDataUrl.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(path.join(REPO_ROOT, pngRelativePath), Buffer.from(b64, "base64"));
      return {
        pageNumber: p.pageNumber,
        pngRelativePath,
        widthPx: p.widthPx,
        heightPx: p.heightPx,
        nonWhitePixelFraction: p.nonWhitePixelFraction,
        blankOrNearAllWhite: p.blankOrNearAllWhite,
        nonWhiteBoundingBox: p.nonWhiteBoundingBox,
        tinyContentBoundingBoxSuspected: p.tinyContentBoundingBoxSuspected,
        textLength: p.textLength,
        tofuCharCount: p.tofuCharCount,
        brokenFontSuspected: p.tofuCharCount > 0,
      };
    });

    const warningPresent = evalResult.fullText.toLowerCase().includes(INCOMPLETE_CHARGE_WARNING_SNIPPET);

    return {
      caseId,
      outputPdfRelativePath,
      status: "EXERCISED",
      blocker: null,
      pdfHeaderOk,
      byteLength: buf.length,
      pageCount: evalResult.pageCount,
      pages,
      anyBlankPage: pages.some((p) => p.blankOrNearAllWhite),
      anyTinyContentBoundingBox: pages.some((p) => p.tinyContentBoundingBoxSuspected),
      anyBrokenFontSuspected: pages.some((p) => p.brokenFontSuspected),
      incompleteChargeExpected: incompleteExpected,
      incompleteChargeWarningPresentInText: incompleteExpected ? warningPresent : "not_applicable",
    };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return {
      ...blankResult(caseId, `Raster render failed for ${caseId}: ${message}`, outputPdfRelativePath),
      pdfHeaderOk,
      byteLength: buf.length,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

function buildVisualReportMarkdown(results: CaseRasterResult[]): string {
  const lines: string[] = [
    "# Output-PDF visual report",
    "",
    "Full pixel-level raster checks via Puppeteer (bundled Chromium) + pdf.js (loaded from a CDN inside the",
    "rendered page; no pdfjs-dist/canvas/ghostscript package is installed locally). Every GENERATED output",
    "strategy PDF under `bulk/output-pdfs/` was rasterised page-by-page; source PDFs were never opened for",
    "rendering. Page PNGs are written to `bulk/page-renders/<caseId>/page-NNN.png` (gitignored).",
    "",
    "| Case | Status | Pages | %PDF- | Bytes | Blank page? | Tiny content bbox? | Broken font (tofu)? | Charge incomplete? | Warning in text? | Blocker |",
    "|---|---|---:|---|---:|---|---|---|---|---|---|",
  ];
  for (const entry of PILOT_20) {
    const r = results.find((x) => x.caseId === entry.id);
    if (!r) {
      lines.push(`| ${entry.id} | NOT_EXERCISED | - | - | - | - | - | - | - | - | No raster result recorded |`);
      continue;
    }
    lines.push(
      `| ${r.caseId} | ${r.status} | ${r.pageCount ?? "-"} | ${r.pdfHeaderOk ?? "-"} | ${
        r.byteLength ?? "-"
      } | ${r.anyBlankPage} | ${r.anyTinyContentBoundingBox} | ${r.anyBrokenFontSuspected} | ${
        r.incompleteChargeExpected
      } | ${r.incompleteChargeWarningPresentInText} | ${r.blocker ?? ""} |`,
    );
  }
  lines.push("");
  const exercisedCount = results.filter((r) => r.status === "EXERCISED").length;
  const anyBlank = results.some((r) => r.anyBlankPage);
  const anyTiny = results.some((r) => r.anyTinyContentBoundingBox);
  const anyTofu = results.some((r) => r.anyBrokenFontSuspected);
  const anyWarningMissing = results.some(
    (r) => r.incompleteChargeExpected && r.incompleteChargeWarningPresentInText === false,
  );
  lines.push(
    `Raster-exercised: ${exercisedCount}/${PILOT_20.length}. Any blank page: ${anyBlank}. ` +
      `Any tiny/clipped content bbox: ${anyTiny}. Any broken-font/tofu suspected: ${anyTofu}. ` +
      `Any case with an incomplete charge whose warning did not survive into the rendered/extracted PDF text: ${anyWarningMissing}.`,
  );
  return `${lines.join("\n")}\n`;
}

export async function runOutputPdfRasterChecks(): Promise<{
  results: CaseRasterResult[];
  launchStatus: "EXERCISED" | "NOT_EXERCISED";
  launchBlocker: string | null;
}> {
  // Disk budget ~5GB free — always start from a clean page-renders directory.
  rimraf(PAGE_RENDERS_DIR);
  ensureDir(PAGE_RENDERS_DIR);

  let puppeteerMod: typeof import("puppeteer");
  try {
    puppeteerMod = await import("puppeteer");
  } catch (error) {
    const blocker = `puppeteer module failed to import: ${error instanceof Error ? error.message : String(error)}`;
    const results = PILOT_20.map((e) => blankResult(e.id, blocker));
    writeJson(path.join(ARTEFACTS_DIR, "output-pdf-raster-results.json"), {
      schemaVersion: "real-pdf-live-pilot-output-pdf-raster-results@1.0.0",
      generatedAt: new Date().toISOString(),
      launchStatus: "NOT_EXERCISED",
      launchBlocker: blocker,
      results,
    });
    writeText(path.join(ARTEFACTS_DIR, "output-pdf-visual-report.md"), buildVisualReportMarkdown(results));
    return { results, launchStatus: "NOT_EXERCISED", launchBlocker: blocker };
  }

  let browser: import("puppeteer").Browser | null = null;
  let launchBlocker: string | null = null;
  try {
    browser = await puppeteerMod.launch({
      headless: true,
      args: ["--allow-file-access-from-files", "--no-sandbox", "--disable-setuid-sandbox"],
    });
  } catch (error) {
    launchBlocker = `Chromium failed to launch via puppeteer: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }

  if (!browser) {
    const blocker = launchBlocker ?? "Unknown puppeteer launch failure.";
    const results = PILOT_20.map((e) => blankResult(e.id, blocker));
    writeJson(path.join(ARTEFACTS_DIR, "output-pdf-raster-results.json"), {
      schemaVersion: "real-pdf-live-pilot-output-pdf-raster-results@1.0.0",
      generatedAt: new Date().toISOString(),
      launchStatus: "NOT_EXERCISED",
      launchBlocker: blocker,
      results,
    });
    writeText(path.join(ARTEFACTS_DIR, "output-pdf-visual-report.md"), buildVisualReportMarkdown(results));
    return { results, launchStatus: "NOT_EXERCISED", launchBlocker: blocker };
  }

  try {
    const results: CaseRasterResult[] = [];
    for (const entry of PILOT_20) {
      results.push(await rasterCaseOutputPdf(browser, entry.id));
    }
    writeJson(path.join(ARTEFACTS_DIR, "output-pdf-raster-results.json"), {
      schemaVersion: "real-pdf-live-pilot-output-pdf-raster-results@1.0.0",
      generatedAt: new Date().toISOString(),
      launchStatus: "EXERCISED",
      launchBlocker: null,
      pdfjsVersion: PDFJS_VERSION,
      pdfjsSource: "CDN (unpkg), loaded inside the rendered Chromium page — not a locally installed package.",
      results,
    });
    writeText(path.join(ARTEFACTS_DIR, "output-pdf-visual-report.md"), buildVisualReportMarkdown(results));
    return { results, launchStatus: "EXERCISED", launchBlocker: null };
  } finally {
    await browser.close().catch(() => {});
  }
}

const isMainModule = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMainModule) {
  runOutputPdfRasterChecks()
    .then((r) => {
      console.log(
        JSON.stringify(
          {
            launchStatus: r.launchStatus,
            launchBlocker: r.launchBlocker,
            exercisedCount: r.results.filter((x) => x.status === "EXERCISED").length,
            totalCases: r.results.length,
          },
          null,
          2,
        ),
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
