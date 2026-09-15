/**
 * Live PR #101 preview capture: fresh Brookes Overview + File + Court Today.
 * Gold20 only. Does not write the password into artefacts.
 *
 *   node artifacts/casebrain-qa/assurance/overview-charge-file-first-v1/run-capture.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE =
  process.env.GOLD20_PREVIEW ||
  "https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app";
const EMAIL = "gduffy1993+casebrain-gold20@gmail.com";
const OUT = path.resolve("artifacts/casebrain-qa/assurance/overview-charge-file-first-v1");
const secret = JSON.parse(
  fs.readFileSync(path.resolve("artifacts/casebrain-qa/gold20/sign-in.local.json"), "utf8"),
);
const PASSWORD = String(secret.password || "");

const CASES = [
  { id: "brookes-fresh", caseId: "95a2746e-d1d3-4f55-aad6-4fb41a7b428b" },
];

const TABS = [
  { key: "overview", query: "overview", extraOk: (t) => /Case command centre|Taylor Brookes|Key defence/i.test(t) },
  {
    key: "file",
    query: "file",
    extraOk: (t) =>
      /Raw source extract|Intimidating a witness|CHARGE AND PARTICULARS|Text extracted \(11/i.test(t) &&
      t.length > 800,
  },
  { key: "today", query: "today", extraOk: (t) => /Top chase|Safe court line|Before court|Our read/i.test(t) },
];

function log(line) {
  fs.writeSync(1, String(line) + "\n");
}

function stillLoading(t) {
  return /Loading (matter dashboard|disclosure chase tracker|papers|workspace|case overview)|Building matter brief/i.test(
    t,
  );
}

async function signIn(page) {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle", timeout: 90000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).first().click();
  for (let i = 0; i < 25; i++) {
    if (!page.url().includes("sign-in")) return true;
    await page.waitForTimeout(800);
  }
  return !page.url().includes("sign-in");
}

async function waitBody(page, { extraOk, timeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    last = (await page.locator("body").innerText().catch(() => "")) || "";
    const okLen = last.length > 400;
    const extra = extraOk ? extraOk(last) : true;
    if (okLen && extra && !stillLoading(last) && !/Sign in to CaseBrain/i.test(last)) {
      return last;
    }
    await page.waitForTimeout(1500);
  }
  return last;
}

(async () => {
  if (!PASSWORD) throw new Error("password missing");
  fs.mkdirSync(path.join(OUT, "receipts"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const report = { signedIn: false, recaptured: [], errors: [], base: BASE, email: EMAIL, sha: process.env.PROOF_SHA || "" };
  try {
    report.signedIn = await signIn(page);
    log("SIGNED_IN=" + report.signedIn);
    for (const spec of CASES) {
      try {
        const src = await page.evaluate(async (caseId) => {
          const res = await fetch(`/api/criminal/${caseId}/bundle-source`, {
            credentials: "include",
            cache: "no-store",
          });
          return res.json();
        }, spec.caseId);
        const scan = String(src?.data?.frontMatterScan || src?.frontMatterScan || "");
        const dir = path.join(OUT, "receipts", spec.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "bundle-source-scan.txt"), scan, "utf8");
        log(`${spec.id}/bundle-source chars=${scan.length} intimidating=${/intimidating a witness/i.test(scan)}`);
      } catch (e) {
        report.errors.push(`${spec.id}/bundle-source:${e.message || e}`);
      }
      const row = { id: spec.id, caseId: spec.caseId, tabs: {} };
      for (const tab of TABS) {
        const url = `${BASE}/cases/${spec.caseId}?tab=${tab.query}&controlRoom=1&demoShell=1`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        const body = await waitBody(page, { timeoutMs: 50000, extraOk: tab.extraOk });
        const dir = path.join(OUT, "receipts", spec.id);
        const shotDir = path.join(OUT, "screenshots", spec.id);
        fs.mkdirSync(dir, { recursive: true });
        fs.mkdirSync(shotDir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${tab.key}.txt`), body, "utf8");
        await page.screenshot({ path: path.join(shotDir, `${tab.key}.png`), fullPage: true }).catch((e) => {
          report.errors.push(`${spec.id}/${tab.key}-shot:${e.message}`);
        });
        row.tabs[tab.key] = { len: body.length, loading: stillLoading(body) };
        log(`${spec.id}/${tab.key} len=${body.length} loading=${stillLoading(body)}`);
      }
      report.recaptured.push(row);
    }
  } catch (e) {
    report.errors.push(String(e && e.stack ? e.stack : e));
  } finally {
    fs.writeFileSync(path.join(OUT, "CAPTURE.json"), JSON.stringify(report, null, 2));
    await browser.close();
  }
  log("DONE errors=" + report.errors.length);
  if (report.errors.length) process.exit(1);
})();
