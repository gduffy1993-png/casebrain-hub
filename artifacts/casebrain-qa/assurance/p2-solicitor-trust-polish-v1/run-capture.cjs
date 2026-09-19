/**
 * PR #101 P2 solicitor trust polish — Gold20 spot capture.
 * Cases: Brookes, Patel, OCR Beck, Hale, Dunn, Gauntlet, Arden, Davies.
 *
 *   node artifacts/casebrain-qa/assurance/p2-solicitor-trust-polish-v1/run-capture.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = (
  process.env.GOLD20_PREVIEW ||
  "https://casebrain-hub-git-ui-demo-overv-5aa27b-gduffy1993-pngs-projects.vercel.app"
).replace(/\/$/, "");
const EMAIL = "gduffy1993+casebrain-gold20@gmail.com";
const OUT = path.resolve("artifacts/casebrain-qa/assurance/p2-solicitor-trust-polish-v1");
const SHA = process.env.GOLD20_PROOF_SHA || "f95c941cccb411442bd50272ffa3a58c085c07f0";
const secret = JSON.parse(
  fs.readFileSync(path.resolve("artifacts/casebrain-qa/gold20/sign-in.local.json"), "utf8"),
);
const PASSWORD = String(secret.password || "");

const CASES = [
  { id: "hale", file: "CB-MURDER-TEST-0001_criminal_defence_bundle.pdf", caseId: "9b555b7b-d520-4c33-a661-9ed93acc0fe1", expect: "Leon Hale" },
  { id: "patel", file: "CB-TB-546_Patel.pdf", caseId: "ffddc1a8-b837-4bde-bb50-bc55be0e7626", expect: "Isaac Patel" },
  { id: "davies", file: "CB-TB-439_Davies.pdf", caseId: "60bcda4a-87f8-48e0-826e-e2f0dcd74fb2", expect: "Layla Davies" },
  { id: "dunn", file: "CB-TB-343_Dunn.pdf", caseId: "33b31c1e-4277-4c90-ac52-3cc0b959ad05", expect: "Ellis Dunn" },
  { id: "arden", file: "CB-MONSTER-2026-0001.pdf", caseId: "578ecbd4-0450-4550-9b6e-86a8a3fe692e", expect: "Arden Vale" },
  { id: "gauntlet", file: "gauntlet-08-kitchen-sink.pdf", caseId: "280e487c-3680-4eca-97f1-988828f448e2", expect: "Riley North" },
  { id: "ocr-beck", file: "CB-OCR-2026-0013.pdf", caseId: "1d454c0b-da05-4385-8151-016426ca59b9", expect: "Emery Beck" },
  { id: "brookes-fresh", file: "CB-FRESH-001_Taylor_Brookes_Digital_Attribution.pdf", caseId: "95a2746e-d1d3-4f55-aad6-4fb41a7b428b", expect: "Taylor Brookes" },
];

const TABS = [
  { key: "overview", query: "overview" },
  { key: "chase", query: "disclosure-chase" },
  { key: "court", query: "today" },
];

function log(line) {
  fs.writeSync(1, String(line) + "\n");
}

function stillLoading(t) {
  return /Loading (matter dashboard|disclosure chase tracker|papers|workspace|case overview)|Building matter brief/i.test(
    t,
  );
}

function chaseHydrated(t) {
  if (/TOTAL\s*\n\s*[1-9]/i.test(t)) return true;
  if (/MISSING\n/i.test(t) && /OUTSTANDING/i.test(t) && t.length > 1800) return true;
  return false;
}

async function waitBody(page, key) {
  const deadline = Date.now() + 55000;
  const started = Date.now();
  let last = "";
  while (Date.now() < deadline) {
    last = (await page.locator("body").innerText().catch(() => "")) || "";
    if (last.length > 350 && !stillLoading(last) && !/Sign in to CaseBrain/i.test(last)) {
      if (key === "overview") {
        if (/CASE COMMAND CENTRE|What needs attention|No outstanding attention/i.test(last)) return last;
      } else if (key === "chase") {
        if (chaseHydrated(last)) return last;
        if (/DISCLOSURE CHASE/i.test(last) && Date.now() - started > 20000) return last;
      } else if (key === "court") {
        if (/SAFE COURT LINE|Top chase|Before court|Our read/i.test(last)) return last;
      } else {
        return last;
      }
    }
    await page.waitForTimeout(1200);
  }
  return last;
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

async function openWhy(page, body) {
  const why = page.getByText(/Why \/ source receipt/i).first();
  if (!(await why.count())) return { body, whyOpened: false };
  await why.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(700);
  const after = (await page.locator("body").innerText().catch(() => body)) || body;
  return {
    body: after,
    whyOpened: /FILE QUOTE|SOURCE CLASS|direct_pdf_quote|derived_from_absence|MG6|Backed by listed child receipts/i.test(
      after,
    ),
  };
}

(async () => {
  if (!PASSWORD) throw new Error("password missing");
  fs.mkdirSync(path.join(OUT, "receipts"), { recursive: true });
  fs.mkdirSync(path.join(OUT, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const report = {
    preview: BASE,
    email: EMAIL,
    sha: SHA,
    signedIn: false,
    account: "gold20",
    workspace: "e066f4cd-749f-4436-baa9-8c187092149a",
    cases: [],
    errors: [],
  };
  try {
    report.signedIn = await signIn(page);
    log("SIGNED_IN=" + report.signedIn);
    if (!report.signedIn) report.errors.push("still_on_sign_in");
    for (const spec of CASES) {
      const recDir = path.join(OUT, "receipts", spec.id);
      const shotDir = path.join(OUT, "screenshots", spec.id);
      fs.mkdirSync(recDir, { recursive: true });
      fs.mkdirSync(shotDir, { recursive: true });
      const row = { ...spec, tabs: {} };
      for (const tab of TABS) {
        const url = `${BASE}/cases/${spec.caseId}?tab=${tab.query}&controlRoom=1&demoShell=1`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        let body = await waitBody(page, tab.key);
        let whyOpened = false;
        if (tab.key === "overview" || tab.key === "chase" || tab.key === "court") {
          const why = await openWhy(page, body);
          body = why.body;
          whyOpened = why.whyOpened;
        }
        fs.writeFileSync(path.join(recDir, `${tab.key}.txt`), body, "utf8");
        await page.screenshot({ path: path.join(shotDir, `${tab.key}.png`), timeout: 20000 }).catch((e) => {
          report.errors.push(`${spec.id}/${tab.key}-shot:${e.message}`);
        });
        row.tabs[tab.key] = {
          url,
          ok: Boolean(body) && !/Sign in to CaseBrain/i.test(body),
          textLen: body.length,
          loading: stillLoading(body),
          whyOpened,
          identityHit: spec.expect ? body.includes(spec.expect) : null,
          flags: {
            reasonableExcuse: /reasonable excuse/i.test(body),
            emailTail: /not included with the email/i.test(body),
            officerNote: /officer note says/i.test(body),
            settledFragment: /treated as a settled/i.test(body),
            possessionPack: /Possession \/ knowledge \/ phone-attribution/i.test(body),
            chargeBlank: /Charge not safely identified from uploaded papers/i.test(body),
            emptyOverview: /No outstanding attention items/i.test(body),
            emptyChase: /No source-material chase items safely detected/i.test(body),
            genericCadChip: /CAD \/ dispatch log material/i.test(body),
            generic999Chip: /999 audio \/ emergency-call material/i.test(body),
            furtherPapersChip: /Further papers on the file/i.test(body),
            fullPhoneGeneric: /Full phone download \/ source extraction/i.test(body),
            chargeGlue: /Primary charge:Concealing/i.test(body),
            noQuote: /No supporting File\/PDF quote available/i.test(body),
            childReceipts: /Backed by listed child receipts|Item receipts/i.test(body),
          },
        };
        log(`${spec.id}/${tab.key} len=${body.length} why=${whyOpened}`);
      }
      report.cases.push(row);
    }
  } catch (e) {
    report.errors.push(String(e && e.stack ? e.stack : e));
  } finally {
    const json = JSON.stringify(report, null, 2);
    if (PASSWORD && json.includes(PASSWORD)) throw new Error("refusing to write password");
    fs.writeFileSync(path.join(OUT, "CAPTURE.json"), json);
    await browser.close();
  }
  log("DONE errors=" + report.errors.length);
  if (report.errors.length) process.exit(1);
})().catch((e) => {
  console.error("RUN_FAIL", e && e.message ? e.message : e);
  process.exit(1);
});
