/**
 * Probe: what charge material does the authenticated bundle-source API actually expose
 * for a case, so header charge resolution can be reasoned about from real data.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const password = process.env.SMOKE_PASSWORD?.trim() || "";
const caseIds = (process.env.F167_CASE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (!base) throw new Error("F167_PREVIEW required");
if (!out) throw new Error("F167_OUT required");
if (!password) throw new Error("password required");

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(base + "/sign-in", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.locator('input[type="email"], #email, input[name="email"]').first().fill(email);
  await page.locator('input[type="password"], #password, input[name="password"]').first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  for (let i = 0; i < 25; i++) {
    if (!page.url().includes("sign-in")) break;
    await page.waitForTimeout(1000);
  }
  if (page.url().includes("sign-in")) throw new Error("sign-in failed");

  const report = {};
  for (const id of caseIds) {
    const data = await page.evaluate(async (caseId) => {
      const grab = async (url) => {
        try {
          const res = await fetch(url);
          return { status: res.status, json: await res.json().catch(() => null) };
        } catch (e) {
          return { status: 0, error: String(e) };
        }
      };
      const bundle = await grab(`/api/criminal/${caseId}/bundle-source`);
      const matter = await grab(`/api/criminal/${caseId}`);
      return { bundle, matter };
    }, id);

    const bundleData = data.bundle?.json?.data ?? null;
    report[id] = {
      bundleStatus: data.bundle?.status,
      matterStatus: data.matter?.status,
      matterAllegedOffence:
        data.matter?.json?.allegedOffence ?? data.matter?.json?.data?.allegedOffence ?? null,
      canonicalPresent: Boolean(bundleData?.canonical),
      canonicalKeys: bundleData?.canonical ? Object.keys(bundleData.canonical) : null,
      charges: bundleData?.canonical?.charges ?? null,
      caseMetadataOffence: {
        offenceDisplay: bundleData?.caseMetadata?.offenceDisplay ?? null,
        offenceWording: bundleData?.caseMetadata?.offenceWording ?? null,
        offenceSource: bundleData?.caseMetadata?.offenceSource ?? null,
      },
      headerShortTitle: bundleData?.header?.shortTitle ?? null,
      frontMatterScan: bundleData?.frontMatterScan ?? null,
    };
    const scan = report[id].frontMatterScan ?? "";
    report[id].demoNameHits = {
      marcusVale: /\b(Marcus\s+Vale|R\s*v\.?\s*Marcus\s+Vale)\b/i.test(scan),
      kianDoyle: /\b(Kian\s+Doyle|R\s*v\.?\s*Kian\s+Doyle)\b/i.test(scan),
      leonMarsh: /\b(Leon\s+Marsh|R\s*v\.?\s*Leon\s+Marsh)\b/i.test(scan),
      scanLength: scan.length,
    };
    console.log(
      JSON.stringify({
        caseId: id,
        canonicalPresent: report[id].canonicalPresent,
        chargeCount: Array.isArray(report[id].charges) ? report[id].charges.length : null,
        charges: (report[id].charges || []).map((c) => ({
          offence: c.offence,
          statute: c.statute,
          documentRole: c.documentRole,
          extracted: c.extracted,
          confidence: c.confidence,
          confirmationLabel: c.confirmationLabel,
        })),
        matterAllegedOffence: report[id].matterAllegedOffence,
        caseMetadataOffence: report[id].caseMetadataOffence,
        demoNameHits: report[id].demoNameHits,
      }),
    );
  }
  fs.writeFileSync(path.join(out, "CHARGE-SOURCE-PROBE.json"), JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("RUN_FAIL", e && e.message ? e.message : e);
  process.exit(1);
});
