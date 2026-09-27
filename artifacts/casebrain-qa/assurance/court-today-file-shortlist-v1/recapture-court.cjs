/**
 * Recapture Court Today only for the four proof cases.
 *   node artifacts/casebrain-qa/assurance/court-today-file-shortlist-v1/recapture-court.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE =
  "https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app";
const EMAIL = "gduffy1993+casebrain-gold20@gmail.com";
const OUT = path.resolve("artifacts/casebrain-qa/assurance/court-today-file-shortlist-v1");
const secret = JSON.parse(
  fs.readFileSync(path.resolve("artifacts/casebrain-qa/gold20/sign-in.local.json"), "utf8"),
);
const PASSWORD = String(secret.password || "");

const CASES = [
  { id: "patterson", caseId: "1098e31f-aa53-424e-a405-683440907f7a" },
  { id: "davies", caseId: "60bcda4a-87f8-48e0-826e-e2f0dcd74fb2" },
  { id: "trap-fresh", caseId: "ba0931b2-1e30-4aad-8655-e91afac35660" },
  { id: "brookes-fresh", caseId: "95a2746e-d1d3-4f55-aad6-4fb41a7b428b" },
];

function stillLoading(t) {
  return /Loading (matter dashboard|disclosure chase tracker|papers|workspace|case overview)|Building matter brief/i.test(
    t,
  );
}

(async () => {
  if (!PASSWORD) throw new Error("password missing");
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle", timeout: 90000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).first().click();
  for (let i = 0; i < 25 && page.url().includes("sign-in"); i++) await page.waitForTimeout(800);
  fs.writeSync(1, "SIGNED_IN=" + !page.url().includes("sign-in") + "\n");
  for (const spec of CASES) {
    await page.goto(`${BASE}/cases/${spec.caseId}?tab=today&controlRoom=1&demoShell=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    let last = "";
    const deadline = Date.now() + 50000;
    while (Date.now() < deadline) {
      last = (await page.locator("body").innerText().catch(() => "")) || "";
      if (last.length > 400 && /Safe court line|Top chase|Before court/i.test(last) && !stillLoading(last)) break;
      await page.waitForTimeout(1500);
    }
    const dir = path.join(OUT, "receipts", spec.id);
    const shotDir = path.join(OUT, "screenshots", spec.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(shotDir, { recursive: true });
    fs.writeFileSync(path.join(dir, "today.txt"), last, "utf8");
    await page.screenshot({ path: path.join(shotDir, "today.png"), fullPage: true }).catch(() => {});
    fs.writeSync(1, `${spec.id}/today len=${last.length} loading=${stillLoading(last)}\n`);
  }
  await browser.close();
  fs.writeSync(1, "DONE\n");
})();
