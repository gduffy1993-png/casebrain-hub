/**
 * Overview-first Wave B harness:
 * 1) list all QA cases on Preview
 * 2) capture Overview-only for selected caseIds
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const password =
  process.env.SMOKE_PASSWORD?.trim() ||
  process.env.CB_QA_PASSWORD?.trim() ||
  process.env.QA_PASSWORD?.trim() ||
  "";
const mode = process.env.F167_MODE || "list"; // list | overview
const caseIds = (process.env.F167_CASE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!base) throw new Error("F167_PREVIEW required");
if (!out) throw new Error("F167_OUT required");
if (!password) throw new Error("password required");

async function signIn(page) {
  await page.goto(base + "/sign-in", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"], #email, input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], #password, input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5000);
  for (let i = 0; i < 25; i++) {
    if (!page.url().includes("sign-in")) break;
    await page.waitForTimeout(1000);
  }
  if (page.url().includes("sign-in")) throw new Error("sign-in failed");
}

function scoreOverview(body) {
  const has = (re) => re.test(body);
  return {
    export_log: has(/\bexport\s+log\b/i),
    phone_download: has(/phone download|source export referred|original download|digital extraction/i),
    cad_999: has(/\bCAD\b|999\s+audio|complete CAD/i),
    cctv_master: has(/CCTV master|full CCTV master|master recording/i),
    cctv_generic: has(/\bCCTV\b/i),
    interview_recording: has(/interview recording|PACE recording|audio.?visual interview/i),
    interview_transcript: has(/interview transcript|full interview transcript/i),
    interview_summary: has(/interview summary|custody\/interview/i),
    subscriber: has(/subscriber|account (?:records?|data)/i),
    bwv: has(/\bBWV\b|body[- ]worn/i),
    invent_advisory_strengthen: has(/strengthen(?:ed|ing)?\s+(?:by\s+)?(?:assuming|invent)/i),
    evidence_state: (body.match(/\b\d+\s+served\b[\s\S]{0,80}?\b\d+\s+missing\b[\s\S]{0,80}?\b\d+\s+incomplete\b/i) || [null])[0],
    disclosure_gaps_block: (() => {
      const m = body.match(/DISCLOSURE GAPS[\s\S]{0,900}/i);
      return m ? m[0].slice(0, 900) : null;
    })(),
    signed_in_ok: !/Sign in to CaseBrain/i.test(body),
    text_len: body.length,
  };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await signIn(page);

  if (mode === "list" || mode === "both") {
    await page.goto(base + "/cases", { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);
    // try scroll to load more
    for (let i = 0; i < 8; i++) {
      await page.mouse.wheel(0, 2400);
      await page.waitForTimeout(600);
    }
    const links = await page.locator('a[href*="/cases/"]').evaluateAll((as) =>
      as
        .map((a) => ({
          href: a.getAttribute("href") || "",
          text: (a.innerText || "").replace(/\s+/g, " ").trim(),
        }))
        .filter((x) => /\/cases\/[0-9a-f-]{36}/i.test(x.href)),
    );
    const byId = {};
    for (const l of links) {
      const m = l.href.match(/cases\/([0-9a-f-]{36})/i);
      if (!m) continue;
      const id = m[1];
      if (!byId[id] || (l.text && l.text.length > (byId[id].text || "").length)) {
        byId[id] = { caseId: id, href: l.href, text: l.text };
      }
    }
    const list = Object.values(byId);
    const trialLine = await page.locator("body").innerText();
    const trial = (trialLine.match(/Trial:[^\n]+/i) || [null])[0];
    const payload = {
      preview: base,
      capturedAt: new Date().toISOString(),
      trial,
      caseCount: list.length,
      cases: list,
    };
    fs.writeFileSync(path.join(out, "QA-ACCOUNT-CASE-LIST.json"), JSON.stringify(payload, null, 2));
    console.log(JSON.stringify({ trial, caseCount: list.length, sample: list.slice(0, 15) }, null, 2));
  }

  if (mode === "overview" || mode === "both") {
    const ids =
      caseIds.length > 0
        ? caseIds
        : JSON.parse(fs.readFileSync(path.join(out, "QA-ACCOUNT-CASE-LIST.json"), "utf8")).cases.map(
            (c) => c.caseId,
          );
    const ndjsonPath = path.join(out, "OVERVIEW-FIRST-DIFFS.ndjson");
    fs.writeFileSync(ndjsonPath, "");
    const results = [];
    for (const caseId of ids) {
      const url = `${base}/cases/${caseId}?tab=overview&controlRoom=1`;
      const entry = {
        caseId,
        url,
        ok: false,
        error: null,
        capturedAt: new Date().toISOString(),
        productSha: process.env.F167_PRODUCT_SHA || null,
        preview: base,
        score: null,
        snippet: null,
      };
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        await page.waitForTimeout(10000);
        for (let i = 0; i < 12; i++) {
          const t = await page.locator("body").innerText();
          if (!/Loading case overview/i.test(t) && t.length > 700) break;
          await page.waitForTimeout(2000);
        }
        const body = await page.locator("body").innerText();
        entry.ok = !/Sign in to CaseBrain/i.test(body);
        entry.score = scoreOverview(body);
        entry.snippet = body.slice(0, 2500);
        const safeName = caseId.slice(0, 8);
        fs.writeFileSync(path.join(out, `overview-${safeName}.txt`), body, "utf8");
      } catch (e) {
        entry.error = String(e.message || e);
      }
      results.push(entry);
      fs.appendFileSync(ndjsonPath, JSON.stringify(entry) + "\n");
      console.log(
        JSON.stringify({
          caseId,
          ok: entry.ok,
          error: entry.error,
          flags: entry.score
            ? {
                export_log: entry.score.export_log,
                phone_download: entry.score.phone_download,
                cad_999: entry.score.cad_999,
                cctv_master: entry.score.cctv_master,
                interview_recording: entry.score.interview_recording,
                subscriber: entry.score.subscriber,
                evidence_state: entry.score.evidence_state,
              }
            : null,
        }),
      );
    }
    fs.writeFileSync(path.join(out, "OVERVIEW-FIRST-CAPTURE.json"), JSON.stringify(results, null, 2));
    console.log("OVERVIEW_DONE", results.length);
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
