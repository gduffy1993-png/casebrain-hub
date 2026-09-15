/**
 * Live proof for OCR labelled charge reader — Gold20 QA, PR 101 preview.
 * OCR Beck Overview/File/Chase/Court/Papers + stay-good smoke: Brookes, Vale, Leverage, Ahmed, Patel, Gauntlet.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE =
  "https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app";
const EMAIL = "gduffy1993+casebrain-gold20@gmail.com";
const OUT = path.resolve("artifacts/casebrain-qa/assurance/ocr-labelled-charge-reader-v1");
const SHA = process.env.PROOF_SHA || "a0cbe255da239b431c886748109355111b4d8aca";
const secret = JSON.parse(
  fs.readFileSync(path.resolve("artifacts/casebrain-qa/gold20/sign-in.local.json"), "utf8"),
);
const PASSWORD = String(secret.password || "");

const CASES = [
  { id: "ocr-beck", caseId: "1d454c0b-da05-4385-8151-016426ca59b9", expect: "Emery Beck", tabs: ["overview", "file", "chase", "court", "papers"] },
  { id: "brookes-fresh", caseId: "95a2746e-d1d3-4f55-aad6-4fb41a7b428b", expect: "Taylor Brookes", tabs: ["overview"] },
  { id: "vale-bell", caseId: "b6d8ed78-b475-4d78-bc44-a7ec1e5475f0", expect: "Vale Bell", tabs: ["overview"] },
  { id: "leverage", caseId: "17e21c53-5635-481e-a189-c8116d56c3d6", expect: "Alden Vale", tabs: ["overview"] },
  { id: "ahmed", caseId: "ff92431f-fd4b-4adb-992e-abfdb5c80faa", expect: "Holly Ahmed", tabs: ["overview"] },
  { id: "patel", caseId: "ffddc1a8-b837-4bde-bb50-bc55be0e7626", expect: "Isaac Patel", tabs: ["overview"] },
  { id: "gauntlet", caseId: "280e487c-3680-4eca-97f1-988828f448e2", expect: "Riley North", tabs: ["overview"] },
];

const TAB_QUERY = {
  overview: "overview",
  file: "file",
  chase: "disclosure-chase",
  court: "today",
  papers: "papers",
};

function log(line) {
  fs.writeSync(1, String(line) + "\n");
}

function extraOk(key, t) {
  if (key === "file") return /RAW SOURCE EXTRACT|Text extracted/i.test(t);
  if (key === "overview") return /CASE COMMAND CENTRE|What needs attention/i.test(t);
  if (key === "chase") return /DISCLOSURE CHASE|No chase board|No source-material chase/i.test(t);
  if (key === "court") return /SAFE COURT LINE|Top chase|Before court/i.test(t);
  if (key === "papers") return /Papers|Served|Outstanding/i.test(t);
  return true;
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

async function waitBody(page, key) {
  const deadline = Date.now() + 45000;
  let last = "";
  while (Date.now() < deadline) {
    last = (await page.locator("body").innerText().catch(() => "")) || "";
    if (last.length > 350 && extraOk(key, last) && !/Sign in to CaseBrain/i.test(last)) {
      if (key === "file" && !/RAW SOURCE EXTRACT/i.test(last) && Date.now() < deadline - 8000) {
        await page.waitForTimeout(1200);
        continue;
      }
      return last;
    }
    await page.waitForTimeout(1200);
  }
  return last;
}

(async () => {
  fs.mkdirSync(path.join(OUT, "receipts"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const report = { preview: BASE, email: EMAIL, sha: SHA, signedIn: false, cases: [], errors: [] };
  report.signedIn = await signIn(page);
  log("SIGNED_IN=" + report.signedIn);
  for (const spec of CASES) {
    const recDir = path.join(OUT, "receipts", spec.id);
    const shotDir = path.join(OUT, "screenshots", spec.id);
    fs.mkdirSync(recDir, { recursive: true });
    fs.mkdirSync(shotDir, { recursive: true });
    const row = { id: spec.id, caseId: spec.caseId, tabs: {} };
    for (const key of spec.tabs) {
      await page.goto(`${BASE}/cases/${spec.caseId}?tab=${TAB_QUERY[key]}&controlRoom=1&demoShell=1`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      let body = await waitBody(page, key);
      if (key === "overview" || key === "chase" || key === "court") {
        const why = page.getByText(/Why \/ source receipt/i).first();
        if (await why.count()) {
          await why.click({ timeout: 4000 }).catch(() => {});
          await page.waitForTimeout(700);
          body = (await page.locator("body").innerText().catch(() => body)) || body;
        }
      }
      fs.writeFileSync(path.join(recDir, `${key}.txt`), body, "utf8");
      await page.screenshot({ path: path.join(shotDir, `${key}.png`) }).catch(() => {});
      row.tabs[key] = {
        textLen: body.length,
        identityHit: body.includes(spec.expect),
        chargeNotIdentified: /Charge not safely identified from uploaded papers/i.test(body),
        abh: /ABH|actual bodily harm|occasioning/i.test(body),
        intimidating: /Intimidating a witness/i.test(body),
        possessionPack: /Possession \/ knowledge \/ phone-attribution/i.test(body),
        fragments: /reasonable excuse|treated as a settled|Officer note says/i.test(body),
        leverageGaps: /full CCTV master|continuity statement|ID procedure notes/i.test(body),
        drugDriving: /drug|controlled drug|toxicology/i.test(body),
      };
      log(`${spec.id}/${key} abh=${row.tabs[key].abh} blank=${row.tabs[key].chargeNotIdentified}`);
    }
    report.cases.push(row);
  }
  const json = JSON.stringify(report, null, 2);
  if (PASSWORD && json.includes(PASSWORD)) throw new Error("password leak");
  fs.writeFileSync(path.join(OUT, "CAPTURE.json"), json);
  await browser.close();
  log("DONE");
})().catch((e) => {
  console.error("RUN_FAIL", e);
  process.exit(1);
});
