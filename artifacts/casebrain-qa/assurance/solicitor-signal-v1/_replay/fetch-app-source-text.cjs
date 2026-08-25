/**
 * Save the exact text CaseBrain analyses for each case (bundle-source frontMatterScan),
 * so the old and new material normalisers can be replayed over real input offline.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const password = process.env.SMOKE_PASSWORD?.trim() || "";
const caseIds = (process.env.F167_CASE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!base) throw new Error("F167_PREVIEW required");
if (!out) throw new Error("F167_OUT required");
if (!password) throw new Error("password required");

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(base + "/sign-in", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"], #email, input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], #password, input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  for (let i = 0; i < 25; i++) {
    if (!page.url().includes("sign-in")) break;
    await page.waitForTimeout(1000);
  }
  if (page.url().includes("sign-in")) throw new Error("sign-in failed");

  const index = [];
  for (const id of caseIds) {
    const data = await page.evaluate(async (caseId) => {
      const res = await fetch(`/api/criminal/${caseId}/bundle-source`);
      const json = await res.json().catch(() => null);
      const d = json?.data ?? null;
      return {
        status: res.status,
        frontMatterScan: d?.frontMatterScan ?? null,
        combinedTextLength: d?.combinedTextLength ?? null,
        snippets: d?.snippets ?? null,
        documentRows: d?.documentRows ?? null,
      };
    }, id);

    const scan = data.frontMatterScan ?? "";
    const snippetText = data.snippets
      ? Object.entries(data.snippets)
          .map(([k, v]) => `\n=== SNIPPET: ${k} ===\n${typeof v === "string" ? v : JSON.stringify(v)}`)
          .join("\n")
      : "";

    fs.writeFileSync(path.join(out, `${id}.app-source.txt`), scan, "utf8");
    if (snippetText) fs.writeFileSync(path.join(out, `${id}.snippets.txt`), snippetText, "utf8");

    index.push({
      caseId: id,
      status: data.status,
      scanChars: scan.length,
      combinedTextLength: data.combinedTextLength,
      documents: (data.documentRows || []).map((r) => r?.name).filter(Boolean),
    });
    console.log(JSON.stringify(index[index.length - 1]));
  }
  fs.writeFileSync(path.join(out, "APP-SOURCE-INDEX.json"), JSON.stringify(index, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("RUN_FAIL", e && e.message ? e.message : e);
  process.exit(1);
});
