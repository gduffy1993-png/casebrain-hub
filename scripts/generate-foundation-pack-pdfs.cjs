/**
 * Generate pilot-believable PDFs from docs/bundle-foundation-pack/generated/sources/*.txt
 * Usage: node scripts/generate-foundation-pack-pdfs.cjs
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const SRC_DIR = path.join(__dirname, "../docs/bundle-foundation-pack/generated/sources");
const OUT_DIR =
  process.env.FOUNDATION_PDF_DIR ||
  path.join(__dirname, "../docs/bundle-foundation-pack/generated/pdfs");

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const OUT_NAMES = {
  "2001": "CB-FOUND-2001_Ellis.pdf",
  "2002": "CB-FOUND-2002_Smith.pdf",
  "2003": "CB-FOUND-2003_Nguyen.pdf",
  "2004": "CB-FOUND-2004_Clarke.pdf",
  "2005": "CB-FOUND-2005_Okafor.pdf",
  "2006": "CB-FOUND-2006_Carter.pdf",
  "2007": "CB-FOUND-2007_Morrison.pdf",
};

function outName(txtFile) {
  const id = Object.keys(OUT_NAMES).find((k) => txtFile.includes(k));
  if (id) return OUT_NAMES[id];
  return txtFile.replace(/\.txt$/i, ".pdf");
}

async function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error("Missing:", SRC_DIR);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".txt"));
  if (!files.length) {
    console.log("No .txt sources in", SRC_DIR);
    process.exit(0);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const f of files) {
    const text = fs.readFileSync(path.join(SRC_DIR, f), "utf-8");
    const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #111; margin: 0; }
    pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0; }
  </style>
</head>
<body><pre>${escapeHtml(text)}</pre></body>
</html>`;

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const outPath = path.join(OUT_DIR, outName(f));
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
    });
    await page.close();
    console.log("Wrote", outPath);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
