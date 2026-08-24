/**
 * Solicitor-signal live lick:
 * list cases, then capture Overview + Chase (+ File) text for each selected case.
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
const mode = process.env.F167_MODE || "both"; // list | capture | both
const caseIds = (process.env.F167_CASE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const tabs = (process.env.F167_TABS || "overview,disclosure-chase,file")
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

function slugFromText(text) {
  const t = (text || "").replace(/\s+/g, " ").trim();
  const m = t.match(/^([A-Za-z][A-Za-z'\-]+(?:\s+[A-Za-z][A-Za-z'\-]+){0,2})/);
  if (m) return m[1].toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return "case";
}

function extractSignals(body) {
  const pick = (re) => {
    const m = body.match(re);
    return m ? m[0].replace(/\s+/g, " ").trim().slice(0, 240) : null;
  };
  const block = (re, n = 1200) => {
    const m = body.match(re);
    return m ? m[0].slice(0, n) : null;
  };
  const lines = body
    .split(/\n+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const attentionish = lines.filter((l) =>
    /needs attention|missing|incomplete|unclear|referred|confirm none|MG6|MG5|CCTV|BWV|phone|digital|interview|PACE|CAD|999|subscriber|export log|chase/i.test(
      l,
    ),
  );
  return {
    evidenceState: pick(/\b\d+\s+served\b[\s\S]{0,80}?\b\d+\s+missing\b[\s\S]{0,80}?\b\d+\s+incomplete\b/i),
    openChase: pick(/Open Chase\s*\(\d+\)/i),
    chaseItems: pick(/Source-material chase\s*\(\d+\s*items?\)/i),
    courtLine: pick(/SAFE COURT LINE[\s\S]{0,300}/i),
    actions: pick(/NEXT 3 SOLICITOR ACTIONS[\s\S]{0,400}/i),
    disclosureGaps: block(/DISCLOSURE GAPS[\s\S]{0,900}/i, 900),
    attentionSample: attentionish.slice(0, 40),
    textLen: body.length,
  };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await signIn(page);

  let list = [];
  if (mode === "list" || mode === "both") {
    await page.goto(base + "/cases", { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(3000);
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, 2400);
      await page.waitForTimeout(500);
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
        byId[id] = { caseId: id, href: l.href, text: l.text, slug: slugFromText(l.text) };
      }
    }
    list = Object.values(byId);
    const body = await page.locator("body").innerText();
    const trial = (body.match(/Trial:[^\n]+/i) || [null])[0];
    const payload = {
      preview: base,
      capturedAt: new Date().toISOString(),
      trial,
      caseCount: list.length,
      cases: list,
    };
    fs.writeFileSync(path.join(out, "QA-ACCOUNT-CASE-LIST.json"), JSON.stringify(payload, null, 2));
    console.log(JSON.stringify({ trial, caseCount: list.length, sample: list.slice(0, 20) }, null, 2));
  }

  if (mode === "capture" || mode === "both") {
    if (!list.length && fs.existsSync(path.join(out, "QA-ACCOUNT-CASE-LIST.json"))) {
      list = JSON.parse(fs.readFileSync(path.join(out, "QA-ACCOUNT-CASE-LIST.json"), "utf8")).cases;
    }
    const ids = caseIds.length ? caseIds : list.map((c) => c.caseId);
    const byId = Object.fromEntries(list.map((c) => [c.caseId, c]));
    const summary = [];
    for (const id of ids) {
      const meta = byId[id] || { caseId: id, text: id, slug: id.slice(0, 8) };
      const slug = meta.slug || slugFromText(meta.text) || id.slice(0, 8);
      const caseDir = path.join(out, "cases", slug + "__" + id.slice(0, 8));
      fs.mkdirSync(caseDir, { recursive: true });
      const caseReport = {
        caseId: id,
        slug,
        label: meta.text,
        preview: base,
        capturedAt: new Date().toISOString(),
        tabs: {},
      };
      for (const tab of tabs) {
        const url = `${base}/cases/${id}?tab=${tab}&controlRoom=1`;
        try {
          await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
          await page.waitForTimeout(tab === "overview" ? 10000 : 6500);
          for (let i = 0; i < 12; i++) {
            const t = await page.locator("body").innerText();
            if (!/Loading case overview/i.test(t) && t.length > 600) break;
            await page.waitForTimeout(1500);
          }
          const body = await page.locator("body").innerText();
          fs.writeFileSync(path.join(caseDir, `${tab}.txt`), body, "utf8");
          const signals = extractSignals(body);
          caseReport.tabs[tab] = {
            ok: !/Sign in to CaseBrain/i.test(body),
            textLen: body.length,
            signals,
          };
        } catch (e) {
          caseReport.tabs[tab] = { ok: false, error: String(e.message || e) };
        }
      }
      fs.writeFileSync(path.join(caseDir, "signals.json"), JSON.stringify(caseReport, null, 2));
      summary.push({
        caseId: id,
        slug,
        label: (meta.text || "").slice(0, 80),
        overviewOk: caseReport.tabs.overview?.ok,
        chaseOk: caseReport.tabs["disclosure-chase"]?.ok,
        evidenceState: caseReport.tabs.overview?.signals?.evidenceState,
        openChase: caseReport.tabs.overview?.signals?.openChase,
        attentionCount: caseReport.tabs.overview?.signals?.attentionSample?.length || 0,
      });
      console.log(
        JSON.stringify({
          licked: slug,
          evidenceState: caseReport.tabs.overview?.signals?.evidenceState,
          openChase: caseReport.tabs.overview?.signals?.openChase,
          attention: caseReport.tabs.overview?.signals?.attentionSample?.length,
        }),
      );
    }
    fs.writeFileSync(path.join(out, "LICK-SUMMARY.json"), JSON.stringify({ preview: base, summary }, null, 2));
  }

  await browser.close();
})().catch((e) => {
  console.error("RUN_FAIL", e && e.message ? e.message : e);
  process.exit(1);
});
