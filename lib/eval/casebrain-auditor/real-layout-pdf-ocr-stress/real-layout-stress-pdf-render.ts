import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { RealLayoutStressSampleManifest } from "./real-layout-stress-types";
import { buildStressBundlePages, pagesToFixtureText, type StressBundlePage } from "./real-layout-stress-content";
import {
  ensureRealLayoutStressDirs,
  realLayoutStressFixturePath,
  realLayoutStressManifestPath,
  realLayoutStressPdfPath,
  realLayoutStressSampleDir,
} from "./real-layout-stress-paths";

function renderPage(doc: InstanceType<typeof PDFDocument>, page: StressBundlePage): void {
  doc.fontSize(11).font("Helvetica-Bold").text(page.title, { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(9).font("Helvetica").text(page.body, { align: "left", lineGap: 2 });
  doc.moveDown(0.6);
  if (page.markers.length) {
    doc.fontSize(7).fillColor("#666666").text(`[markers: ${page.markers.join(", ")}]`);
    doc.fillColor("#000000");
  }
}

export async function materialiseStressSample(
  manifest: RealLayoutStressSampleManifest,
): Promise<{ pdfPath: string; fixturePath: string; pageCount: number }> {
  ensureRealLayoutStressDirs();
  const sampleDir = realLayoutStressSampleDir(manifest.sampleId);
  fs.mkdirSync(sampleDir, { recursive: true });

  const pages = buildStressBundlePages(manifest);
  const fixtureText = pagesToFixtureText(pages);
  const fixturePath = realLayoutStressFixturePath(manifest.sampleId);
  fs.writeFileSync(fixturePath, fixtureText, "utf8");
  fs.writeFileSync(realLayoutStressManifestPath(manifest.sampleId), JSON.stringify(manifest, null, 2), "utf8");

  const pdfPath = realLayoutStressPdfPath(manifest.sampleId);
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: { top: 48, bottom: 48, left: 48, right: 48 },
      info: {
        Title: `Fictional layout stress — ${manifest.sampleId}`,
        Author: "CaseBrain Synthetic Bundle Factory",
        Subject: "Fictional Crown bundle — layout/OCR stress test",
      },
    });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    for (let i = 0; i < pages.length; i++) {
      if (i > 0) doc.addPage();
      renderPage(doc, pages[i]!);
    }
    doc.end();
    stream.on("finish", () => resolve());
    stream.on("error", reject);
  });

  return { pdfPath, fixturePath, pageCount: pages.length };
}
