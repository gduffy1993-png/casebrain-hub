/**
 * Thin live AUTH after Court invent 13→0 (C4/C5).
 * Canaries: Arden / Trap / Brookes (+ Dunn BWV stills TN).
 *
 *   F167_PREVIEW=... F167_OUT=... SMOKE_PASSWORD=... node run-live-auth-c4c5.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const password = process.env.SMOKE_PASSWORD || "";

const known = {
  Arden: "99090c69-5d78-41e3-946d-119b4bc335ba",
  Trap: "ce5bc9f2-f570-411e-bcab-5004d80acf4c",
  Brookes: "2dcdc59d-ff44-4bc8-ac31-bd11a954a59e",
  Dunn: "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01",
};
const tabs = ["overview", "papers", "disclosure-chase", "client-summary", "court", "file"];

function scan(t) {
  return {
    cctvMaster: /CCTV master|full CCTV master|full window|master footage/i.test(t),
    phoneDownload: /phone download|source extraction|Full phone download|phone extraction/i.test(t),
    inventInterviewBlend: /Interview recording\s*\/\s*transcript/i.test(t),
    interviewRecording: /Interview recording/i.test(t),
    exportLog: /export\s+log/i.test(t),
    bwvFullExportWhy: /full BWV export|full export and continuity/i.test(t),
    subscriber: /subscriber/i.test(t),
  };
}

(async () => {
  if (!base || !out || !password) throw new Error("env missing F167_PREVIEW/F167_OUT/SMOKE_PASSWORD");
  fs.mkdirSync(path.join(out, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(base + "/sign-in", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1200);
  await page.locator("input[type=email], #email, input[name=email]").first().fill(email);
  await page.locator("input[type=password], #password, input[name=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForTimeout(7000);
  if (page.url().includes("sign-in")) throw new Error("sign-in failed: " + page.url());
  fs.writeFileSync(path.join(out, "signin.json"), JSON.stringify({ ok: true, url: page.url(), preview: base }, null, 2));

  const report = {
    preview: base,
    productShaHint: process.env.F167_PRODUCT_SHA || null,
    cases: {},
  };

  for (const [name, id] of Object.entries(known)) {
    const dir = path.join(out, name.toLowerCase());
    fs.mkdirSync(dir, { recursive: true });
    report.cases[name] = { caseId: id, tabs: {} };
    for (const tab of tabs) {
      await page.goto(`${base}/cases/${id}?tab=${tab}&controlRoom=1`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await page.waitForTimeout(3500);
      const other = page.getByText(/Other source-material items/i).first();
      if (await other.count()) {
        try {
          await other.click({ timeout: 1500 });
          await page.waitForTimeout(300);
        } catch (_) {}
      }
      const t = await page.locator("body").innerText();
      fs.writeFileSync(path.join(dir, `${tab}.txt`), t);
      await page.screenshot({
        path: path.join(out, "screenshots", `${name.toLowerCase()}-${tab}.png`),
        fullPage: true,
      });
      report.cases[name].tabs[tab] = { len: t.length, ...scan(t) };
      console.log(name, tab, JSON.stringify(report.cases[name].tabs[tab]));
    }
  }

  const ardenChase = fs.readFileSync(path.join(out, "arden", "disclosure-chase.txt"), "utf8");
  const ardenOverview = fs.readFileSync(path.join(out, "arden", "overview.txt"), "utf8");
  const trapChase = fs.readFileSync(path.join(out, "trap", "disclosure-chase.txt"), "utf8");
  const trapCourt = fs.readFileSync(path.join(out, "trap", "court.txt"), "utf8");
  const brookesChase = fs.readFileSync(path.join(out, "brookes", "disclosure-chase.txt"), "utf8");
  const dunnChase = fs.readFileSync(path.join(out, "dunn", "disclosure-chase.txt"), "utf8");

  const board = {
    ardenExportLogTN: !/export\s+log/i.test(ardenChase) && !/export\s+log/i.test(ardenOverview),
    ardenCctvMasterTP: /CCTV master|full window|master footage/i.test(ardenChase),
    ardenPhonePropertyTN: !/Full phone download|phone download|source extraction/i.test(ardenChase),
    trapCctvInventTN: !/CCTV master|full CCTV master|full window/i.test(trapChase),
    trapInterviewInventTN: !/Interview recording/i.test(trapChase) && !/Interview recording/i.test(trapCourt),
    brookesPhoneTP: /Full phone download|phone download|source extraction|phone extraction/i.test(brookesChase),
    dunnBwvFullExportInventTN: !/full BWV export|full export and continuity/i.test(dunnChase),
  };

  report.canaryBoard = board;
  report.verdict = Object.values(board).every(Boolean) ? "C4C5_LIVE_AUTH_PASS" : "C4C5_LIVE_AUTH_SOFT";
  fs.writeFileSync(path.join(out, "canary-board.json"), JSON.stringify(report, null, 2));
  console.log("BOARD", JSON.stringify(board, null, 2));
  console.log("VERDICT", report.verdict);
  await browser.close();
  if (report.verdict !== "C4C5_LIVE_AUTH_PASS") process.exitCode = 2;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
