/**
 * Live Overview vs Chase/File evidence-state wording sample (Preview).
 * Env: F167_PREVIEW=https://...
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const password = process.env.SMOKE_PASSWORD || "ProdSmokeOnly!Jun2026";
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";

const outDir = __dirname;
const cases = [
  { id: "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01", slug: "dunn", name: /Ellis Dunn|Conspiracy to burgle/i },
  // Brookes — resolve from cases list if ID unknown; try common search
];

function extractEvidenceChips(text) {
  const chips = {};
  const m1 = text.match(/(\d+)\s*Missing/i);
  const m2 = text.match(/(\d+)\s*Incomplete/i);
  const m3 = text.match(/(\d+)\s*Open review/i);
  const m4 = text.match(/(\d+)\s+served\s*[·•]\s*(\d+)\s+(?:referred|missing)/i);
  const chase = text.match(/TOTAL\s+(\d+)/i);
  if (m1) chips.missing = Number(m1[1]);
  if (m2) chips.incomplete = Number(m2[1]);
  if (m3) chips.openReview = Number(m3[1]);
  if (m4) chips.legacyServedLine = m4[0];
  if (chase) chips.chaseTotal = Number(chase[1]);
  // status vocabulary hits
  chips.hasServed = /\bserved\b/i.test(text);
  chips.hasOutstanding = /\boutstanding\b/i.test(text);
  chips.hasIncomplete = /\bincomplete\b/i.test(text);
  chips.hasReferred = /\breferred\b/i.test(text);
  chips.hasNsc = /not safely confirmed|needs confirmation/i.test(text);
  return chips;
}

(async () => {
  if (!base) throw new Error("F167_PREVIEW required");
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await (
    await browser.newContext({ viewport: { width: 1440, height: 900 } })
  ).newPage();

  await page.goto(base + "/sign-in", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.locator("input[type=email], #email, input[name=email]").first().fill(email);
  await page.locator("input[type=password], #password, input[name=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForTimeout(7000);
  if (page.url().includes("sign-in")) throw new Error("signin fail: " + page.url());

  // Find Brookes from cases list
  await page.goto(base + "/cases", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3000);
  const casesText = await page.locator("body").innerText();
  fs.writeFileSync(path.join(outDir, "live-cases-list-head.txt"), casesText.slice(0, 4000), "utf8");

  let brookesHref = null;
  const links = await page.locator("a[href*='/cases/']").all();
  for (const link of links) {
    const t = ((await link.innerText().catch(() => "")) || "").toLowerCase();
    const href = await link.getAttribute("href");
    if (/brookes|taylor/.test(t) && href) {
      brookesHref = href;
      break;
    }
  }
  if (brookesHref) {
    const id = brookesHref.match(/\/cases\/([a-f0-9-]+)/i)?.[1];
    if (id) cases.push({ id, slug: "brookes", name: /Brookes|Harassment/i });
  }

  // Trap / Leo Greene
  for (const link of links) {
    const t = ((await link.innerText().catch(() => "")) || "").toLowerCase();
    const href = await link.getAttribute("href");
    if (/leo greene|trap|assault by beating/.test(t) && href) {
      const id = href.match(/\/cases\/([a-f0-9-]+)/i)?.[1];
      if (id && !cases.some((c) => c.id === id)) {
        cases.push({ id, slug: "trap", name: /Leo Greene|Assault by beating/i });
      }
      break;
    }
  }

  const results = [];
  for (const c of cases) {
    const row = { slug: c.slug, caseId: c.id, surfaces: {} };
    for (const tab of ["overview", "disclosure-chase", "papers"]) {
      const url = `${base}/cases/${c.id}?tab=${tab === "disclosure-chase" ? "disclosure-chase" : tab}&controlRoom=1`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 }).catch(() => {});
      await page.waitForTimeout(4000);
      let text = "";
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        text = await page.locator("body").innerText();
        if (!/Loading case overview|Loading disclosure chase|Loading…/i.test(text) && text.length > 500) break;
        await page.waitForTimeout(2000);
      }
      const outName = `live-${c.slug}-${tab}.txt`;
      fs.writeFileSync(path.join(outDir, outName), text, "utf8");
      row.surfaces[tab] = {
        file: outName,
        chars: text.length,
        chips: extractEvidenceChips(text),
        head: text.replace(/\s+/g, " ").slice(0, 400),
      };
    }
    // Cross-surface check
    const ov = row.surfaces.overview?.chips || {};
    const ch = row.surfaces["disclosure-chase"]?.chips || {};
    row.cross = {
      overviewMissing: ov.missing ?? null,
      overviewIncomplete: ov.incomplete ?? null,
      chaseTotal: ch.chaseTotal ?? null,
      note:
        ov.missing != null && ch.chaseTotal != null && ov.missing > ch.chaseTotal
          ? "WARN overview Missing > chase TOTAL"
          : "ok_or_unparsed",
    };
    results.push(row);
  }

  const report = {
    preview: base,
    generatedAt: new Date().toISOString(),
    results,
  };
  fs.writeFileSync(path.join(outDir, "LIVE-SAMPLE.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
