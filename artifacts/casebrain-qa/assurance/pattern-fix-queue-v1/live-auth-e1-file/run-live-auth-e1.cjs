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
  Dunn: "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01",
  Grant: "e2841289-1ed2-4dc4-9acf-dd22a03b63fc",
  Brookes: "2dcdc59d-ff44-4bc8-ac31-bd11a954a59e",
  Ahmed: "ba22e8bb-832c-43b8-8986-20ea5f5bf7c4",
  Patel: "ed3c9806-3227-4ee9-ad86-9784e6000084",
};
const tabs = ["overview", "papers", "disclosure-chase", "client-summary", "file"];

function scan(t) {
  return {
    bwvFullExportWhy: /full BWV export|full export and continuity/i.test(t),
    cctvMaster: /CCTV master|full window|master footage/i.test(t),
    phoneDownload: /phone download|source extraction|Full phone download|phone extraction/i.test(t),
    inventInterviewBlend: /Interview recording\s*\/\s*transcript/i.test(t),
    exportLog: /export\s+log/i.test(t),
    hearingPassed: /Hearing date passed/i.test(t),
    courtHearingGlue: /Crown Court at [A-Za-z ]+ Hearing\b/i.test(t),
    chargeMute: /Charge not safely identified/i.test(t),
    hearingMuted: /Hearing not on papers|Hearing date not safely extracted/i.test(t),
    defendantMuted: /Client name not safely extracted/i.test(t),
    northshire: /Northshire Magistrates/i.test(t),
    ardenVale: /Arden Vale/i.test(t),
    leoGreene: /Leo Greene/i.test(t),
  };
}

(async () => {
  if (!base || !out || !password) throw new Error("env missing F167_PREVIEW/F167_OUT/SMOKE_PASSWORD");
  fs.mkdirSync(path.join(out, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(base + "/sign-in", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.locator("input[type=email], #email, input[name=email]").first().fill(email);
  await page.locator("input[type=password], #password, input[name=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForTimeout(6000);
  if (page.url().includes("sign-in")) throw new Error("sign-in failed");
  fs.writeFileSync(path.join(out, "signin.json"), JSON.stringify({ ok: true, url: page.url(), preview: base }));

  const report = { preview: base, productShaHint: process.env.F167_PRODUCT_SHA || null, cases: {} };
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
  const trapChase = fs.readFileSync(path.join(out, "trap", "disclosure-chase.txt"), "utf8");
  const brookesChase = fs.readFileSync(path.join(out, "brookes", "disclosure-chase.txt"), "utf8");
  const grantChase = fs.readFileSync(path.join(out, "grant", "disclosure-chase.txt"), "utf8");
  const dunnChase = fs.readFileSync(path.join(out, "dunn", "disclosure-chase.txt"), "utf8");
  const trapFile = fs.readFileSync(path.join(out, "trap", "file.txt"), "utf8");
  const ardenFile = fs.readFileSync(path.join(out, "arden", "file.txt"), "utf8");

  const board = {
    grantCctvMasterInventTN: !/CCTV master|full window|CCTV Continuity/i.test(grantChase),
    ardenCctvMasterTP: /CCTV master|full window|master footage/i.test(ardenChase),
    trapInventTN:
      !/CCTV master|full window/i.test(trapChase) &&
      !/Interview recording\s*\/\s*transcript/i.test(trapChase),
    brookesPhoneTP: /Full phone download|phone download|source extraction|phone extraction/i.test(brookesChase),
    dunnBwvFullExportInventTN:
      !/full BWV export|full export and continuity/i.test(dunnChase),
    trapFileNoCourtHearingGlue: !/Crown Court at [A-Za-z ]+ Hearing\b/i.test(trapFile),
    trapFileHearingOrCourt:
      /Northshire Magistrates/i.test(trapFile) || /18\/08\/2026|18 Aug 2026/i.test(trapFile),
    ardenFileDefendant: /Arden Vale/i.test(ardenFile),
  };
  report.canaryBoard = board;
  report.verdict = Object.values(board).every(Boolean) ? "E1_LIVE_AUTH_PASS" : "E1_LIVE_AUTH_SOFT";
  fs.writeFileSync(path.join(out, "canary-board.json"), JSON.stringify(report, null, 2));
  console.log("BOARD", JSON.stringify(board, null, 2));
  console.log("VERDICT", report.verdict);
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
