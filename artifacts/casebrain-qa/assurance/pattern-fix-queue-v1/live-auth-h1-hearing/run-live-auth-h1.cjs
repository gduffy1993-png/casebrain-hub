const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const password = process.env.SMOKE_PASSWORD || "";
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";

const cases = {
  Dunn: "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01",
  Brookes: "2dcdc59d-ff44-4bc8-ac31-bd11a954a59e",
  Hale: "3d52134b-6251-424a-8688-7c70fea3d379",
};

(async () => {
  if (!base || !out || !password) throw new Error("env missing");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(base + "/sign-in", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.locator("input[type=email], #email, input[name=email]").first().fill(email);
  await page.locator("input[type=password], #password, input[name=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForTimeout(7000);
  if (page.url().includes("sign-in")) throw new Error("signin fail");

  const report = { preview: base, cases: {} };
  for (const [name, id] of Object.entries(cases)) {
    await page.goto(`${base}/cases/${id}?tab=overview&controlRoom=1`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await page.waitForTimeout(3500);
    const t = await page.locator("body").innerText();
    fs.writeFileSync(path.join(out, `${name.toLowerCase()}-overview.txt`), t);
    const header = t.split(/\n/).slice(0, 40).join("\n");
    report.cases[name] = {
      hearingPassedOld: /Hearing date passed/i.test(t),
      listingElapsed: /Listing on papers · .* \(elapsed\)/i.test(t),
      has1415: /14:15/.test(t),
      hasJul7: /7 Jul 2026|07 July 2026/i.test(t),
      phoneTp: /Full phone download|phone download|source extraction/i.test(t),
      interviewRecording: /Interview recording/i.test(t),
      headerSnip: header.replace(/\s+/g, " ").slice(0, 400),
    };
    console.log(name, JSON.stringify(report.cases[name]));
  }

  // Chase for Hale
  await page.goto(`${base}/cases/${cases.Hale}?tab=disclosure-chase&controlRoom=1`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.waitForTimeout(3500);
  const haleChase = await page.locator("body").innerText();
  fs.writeFileSync(path.join(out, "hale-chase.txt"), haleChase);
  report.haleChase = {
    interviewRecordingCard: /Interview recording/i.test(haleChase),
    recordingNotMentioned: /Interview recording not mentioned/i.test(haleChase),
    recordingStateServed: /Recording state served/i.test(haleChase),
  };

  report.board = {
    dunnH1Elapsed: report.cases.Dunn.listingElapsed && !report.cases.Dunn.hearingPassedOld,
    dunnH1Time: report.cases.Dunn.has1415,
    brookesNoOldPassed: !report.cases.Brookes.hearingPassedOld,
  };
  report.verdict = report.board.dunnH1Elapsed && report.board.dunnH1Time ? "H1_LIVE_AUTH_PASS" : "H1_LIVE_AUTH_SOFT";
  fs.writeFileSync(path.join(out, "canary-board.json"), JSON.stringify(report, null, 2));
  console.log("BOARD", JSON.stringify(report.board));
  console.log("HALE", JSON.stringify(report.haleChase));
  console.log("VERDICT", report.verdict);
  await browser.close();
  if (report.verdict !== "H1_LIVE_AUTH_PASS") process.exitCode = 2;
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
