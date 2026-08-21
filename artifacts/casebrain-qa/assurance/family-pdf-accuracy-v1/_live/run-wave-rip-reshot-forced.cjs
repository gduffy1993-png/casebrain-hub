const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const password = process.env.SMOKE_PASSWORD || process.env.CB_QA_PASSWORD || "";

// Known gym IDs (not hardcodes in product — capture harness only)
const FORCE = {
  Arden: "99090c69-5d78-41e3-946d-119b4bc335ba",
  Brookes: "2dcdc59d-ff44-4bc8-ac31-bd11a954a59e",
  Trap: "ce5bc9f2-f570-411e-bcab-5004d80acf4c",
  Dunn: "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01",
  Patel: "ed3c9806-3227-4ee9-ad86-9784e6000084",
  Ahmed: "ba22e8bb-832c-43b8-8986-20ea5f5bf7c4",
  Tobin: "a42cb20a-017b-4dfb-b8a5-1dc5b11a3b27",
  Grant: "e2841289-1ed2-4dc4-9acf-dd22a03b63fc",
};

if (!base) throw new Error("F167_PREVIEW required");
if (!out) throw new Error("F167_OUT required");
if (!password) throw new Error("password required");

function gates(body) {
  return {
    exportLog: /\bexport\s+log\b/i.test(body),
    phoneDownload: /phone download|source export|original download|full download report not in section|Phone extraction summary only/i.test(body),
    phoneMid: /Phone extraction summary only|full download report not in section|logical download/i.test(body),
    phoneFull: /Full phone download/i.test(body),
    subscriber: /\bsubscriber\b/i.test(body),
    interviewBlend: /Interview recording\s*\/\s*transcript/i.test(body),
    interviewRec: /Interview recording(?!\s*\/\s*transcript)/i.test(body),
    interviewTranscript: /Interview transcript/i.test(body),
    interviewAnd: /Interview recording and transcript/i.test(body),
    cctvMaster: /CCTV.*master|master footage|full window/i.test(body),
    cad999: /\bCAD\b|999 audio/i.test(body),
    morePapers: /MORE PAPERS DETAIL UNAVAILABLE|Deep output unavailable|More papers detail|papers inventory|Papers inventory/i.test(body),
    controlRoom: /Control Room/i.test(body),
    papersInventory: /Papers inventory|document \/ schedule inventory|Material/i.test(body),
    clientFacts: /What the papers show|Client-facing factual update/i.test(body),
    hearingDeadline: /Hearing date passed/i.test(body),
    assuming: /\bassuming\b/i.test(body),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(base + "/sign-in", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.locator("input[type=email], #email, input[name=email]").first().fill(email);
  await page.locator("input[type=password], #password, input[name=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForTimeout(6000);
  if (page.url().includes("sign-in")) throw new Error("sign-in failed");

  fs.mkdirSync(out, { recursive: true });
  const found = {};
  for (const [name, caseId] of Object.entries(FORCE)) {
    found[name] = { caseId, href: `/cases/${caseId}`, label: name, forced: true };
  }
  fs.writeFileSync(path.join(out, "canary-case-ids.json"), JSON.stringify({ preview: base, found }, null, 2));

  const scoreboard = {};
  for (const [name, info] of Object.entries(found)) {
    const dir = path.join(out, name.toLowerCase());
    fs.mkdirSync(dir, { recursive: true });
    scoreboard[name] = { caseId: info.caseId, tabs: {} };
    for (const tab of ["overview", "disclosure-chase", "papers", "today", "summary"]) {
      const url = `${base}/cases/${info.caseId}?tab=${tab}&controlRoom=1`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
        await page.waitForTimeout(3500);
        const body = await page.locator("body").innerText();
        fs.writeFileSync(path.join(dir, `${tab}.txt`), body);
        const g = gates(body);
        scoreboard[name].tabs[tab] = g;
        console.log(name, tab, JSON.stringify(g));
      } catch (e) {
        console.log(name, tab, "ERR", String(e.message).slice(0, 120));
        scoreboard[name].tabs[tab] = { error: String(e.message).slice(0, 200) };
      }
    }
  }
  fs.writeFileSync(path.join(out, "gate-scoreboard.json"), JSON.stringify(scoreboard, null, 2));
  await browser.close();
  console.log("RESHOT_DONE");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
