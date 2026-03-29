/**
 * Generate selectable-text PDFs from docs/fictional-golden-10/NS-CPS-*.txt
 * Usage: npm run generate:fictional-golden
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const DOCS_DIR = path.join(__dirname, "../docs/fictional-golden-10");

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  if (!fs.existsSync(DOCS_DIR)) {
    console.error("Missing folder:", DOCS_DIR);
    process.exit(1);
  }
  const files = fs
    .readdirSync(DOCS_DIR)
    .filter((f) => f.startsWith("NS-CPS-") && f.endsWith(".txt"))
    .sort();

  if (!files.length) {
    console.log("No NS-CPS-*.txt files in", DOCS_DIR);
    process.exit(0);
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  for (const f of files) {
    const text = fs.readFileSync(path.join(DOCS_DIR, f), "utf8");
    const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.45; color: #111; padding: 0; margin: 0; }
    pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; margin: 0; }
  </style>
</head>
<body><pre>${escapeHtml(text)}</pre></body>
</html>`;

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const outPath = path.join(DOCS_DIR, f.replace(/\.txt$/i, ".pdf"));
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", bottom: "18mm", left: "18mm", right: "18mm" },
    });
    await page.close();
    console.log("Wrote", path.relative(process.cwd(), outPath));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
