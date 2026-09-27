const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const EMAIL = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const PASSWORD =
  process.env.SMOKE_PASSWORD?.trim() ||
  process.env.CB_QA_PASSWORD?.trim() ||
  process.env.QA_PASSWORD?.trim() ||
  "";
const OUT = process.env.F167_OUT;
const CASE_ID = process.env.F167_CASE_ID || "99090c69-5d78-41e3-946d-119b4bc335ba";
const TABS = ["overview", "court", "papers", "client-summary", "disclosure-chase", "file"];
const LABEL = process.env.F167_CAPTURE_LABEL || "before";

function shot(name) {
  return path.join(OUT, "screenshots", LABEL, name);
}

async function signIn(page, base) {
  await page.goto(base + "/sign-in", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1000);
  const emailSel = page.locator('input[type="email"], #email, input[name="email"]').first();
  const passSel = page.locator('input[type="password"], #password, input[name="password"]').first();
  await emailSel.waitFor({ timeout: 30000 });
  await emailSel.fill(EMAIL);
  await passSel.fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5000);
  for (let i = 0; i < 20; i++) {
    if (!page.url().includes("sign-in")) break;
    await page.waitForTimeout(1000);
  }
  return !page.url().includes("sign-in");
}

function extractRecord(body) {
  const pick = (re) => {
    const m = body.match(re);
    return m ? m[0] : null;
  };
  return {
    evidenceState: pick(/\b\d+\s+served\b[\s\S]{0,80}?\b\d+\s+missing\b[\s\S]{0,80}?\b\d+\s+incomplete\b/i),
    served: pick(/\b\d+\s+served\b/i),
    missing: pick(/\b\d+\s+missing\b/i),
    incomplete: pick(/\b\d+\s+incomplete\b/i),
    openChase: pick(/Open Chase\s*\(\d+\)/i),
    chaseItems: pick(/Source-material chase\s*\(\d+\s*items?\)/i),
    cpsChase: pick(/CPS Chase|DISCLOSURE CHASE[\s\S]{0,120}/i),
    courtLine: pick(/SAFE COURT LINE[\s\S]{0,400}/i),
    defenceRoute: pick(/PRIMARY DEFENCE PRESSURE ROUTE[\s\S]{0,300}/i),
    risks: pick(/BIGGEST RISK[\s\S]{0,500}/i),
    opportunities: pick(/CONDITIONAL ON SERVED MATERIAL[\s\S]{0,400}|OPPORTUNIT[\s\S]{0,400}/i),
    actions: pick(/NEXT 3 SOLICITOR ACTIONS[\s\S]{0,500}/i),
    readiness: pick(/READINESS[\s\S]{0,200}/i),
    client: pick(/Client Summary|CLIENT[\s\S]{0,400}/i),
    charge: pick(/Robbery|Affray|Assault|Harassment/i),
    defendant: pick(/Arden Vale/i),
  };
}

(async () => {
  if (!BASE) throw new Error("F167_PREVIEW required");
  if (!PASSWORD) throw new Error("password env required");
  if (!OUT) throw new Error("F167_OUT required");
  fs.mkdirSync(path.join(OUT, "screenshots", LABEL), { recursive: true });
  const report = {
    label: LABEL,
    preview: BASE,
    email: EMAIL,
    caseId: CASE_ID,
    signedIn: false,
    tabs: {},
    records: {},
    errors: [],
  };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    report.signedIn = await signIn(page, BASE);
    await page.screenshot({ path: shot("00-after-signin.png"), fullPage: true });
    if (!report.signedIn) report.errors.push("still_on_sign_in_after_submit");

    for (const tab of TABS) {
      const url = `${BASE}/cases/${CASE_ID}?tab=${tab}&controlRoom=1`;
      const entry = { url, ok: false, title: null, textLen: 0, snippet: null, fullText: null };
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        // Overview can take longer to hydrate
        await page.waitForTimeout(tab === "overview" ? 12000 : 7000);
        // wait for loading to clear if present
        for (let i = 0; i < 15; i++) {
          const t = await page.locator("body").innerText();
          if (!/Loading case overview/i.test(t) && t.length > 800) break;
          await page.waitForTimeout(2000);
        }
        const body = await page.locator("body").innerText();
        entry.ok = !/Sign in to CaseBrain/i.test(body);
        entry.title = await page.title();
        entry.textLen = body.length;
        entry.snippet = body.slice(0, 3500);
        entry.fullText = body.slice(0, 20000);
        report.records[tab] = extractRecord(body);
        await page.screenshot({ path: shot(`${LABEL}-${tab}.png`), fullPage: true });
        fs.writeFileSync(path.join(OUT, `${LABEL}-${tab}.txt`), body, "utf8");
      } catch (e) {
        entry.error = String(e.message || e);
        report.errors.push(`${tab}:${entry.error}`);
        try {
          await page.screenshot({ path: shot(`${LABEL}-${tab}-ERROR.png`), fullPage: true });
        } catch {}
      }
      // strip fullText from json later — keep in txt dumps
      const { fullText, ...rest } = entry;
      report.tabs[tab] = { ...rest, hasFullTextDump: Boolean(fullText) };
    }
  } catch (e) {
    report.errors.push(String(e.message || e));
  } finally {
    await browser.close();
  }

  const json = JSON.stringify(report, null, 2);
  if (PASSWORD && json.includes(PASSWORD)) throw new Error("refusing to write password into artefact");
  fs.writeFileSync(path.join(OUT, `${LABEL.toUpperCase()}-AUTH-BROWSER-CAPTURE.json`), json);
  console.log("SIGNED_IN=" + report.signedIn);
  console.log("ERRORS=" + report.errors.length);
  console.log("TABS=" + Object.keys(report.tabs).join(","));
})().catch((e) => {
  console.error("RUN_FAIL", e && e.message ? e.message : e);
  process.exit(1);
});
