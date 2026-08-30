/**
 * Log in and open live cases. Compare the header you see to the source file.
 * This is production (old mouth) unless MIXED_LIVE_BASE_URL points elsewhere.
 *
 *   MIXED_LIVE_EMAIL=gduffy1993@gmail.com npx tsx scripts/live-physical-pdf-check.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE = (process.env.MIXED_LIVE_BASE_URL ?? "https://www.casebrain.co.uk").replace(/\/$/, "");
const EMAIL = process.env.MIXED_LIVE_EMAIL?.trim() || "gduffy1993@gmail.com";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const OUT_DIR = path.join(process.cwd(), "artifacts", "as-is-freeze", "live-physical-pdf");
const SHOTS = "/opt/cursor/artifacts/screenshots";

type Spec = {
  id: string;
  caseId: string;
  source: string;
  expectName: RegExp;
  expectCharge: RegExp;
  hearingMustNot?: RegExp;
  hearingShould?: RegExp;
};

const CASES: Spec[] = [
  {
    id: "0401-rees",
    caseId: "4cccab6d-aaef-41b6-a6b9-8f33ef076c58",
    source: "docs/fictional-cases-40/NS-CPS-2026-0401.txt",
    expectName: /sam rees/i,
    expectCharge: /robbery|s\.?\s*47/i,
    hearingMustNot: /17 Sept? 1991|17\/09\/1991/,
  },
  {
    id: "0402-frost",
    caseId: "7d790ad7-5415-4cd7-a385-ae5815c90575",
    source: "docs/fictional-cases-40/NS-CPS-2026-0402.txt",
    expectName: /taylor frost/i,
    expectCharge: /s\.?\s*20|gbh|unlawful wounding/i,
    hearingMustNot: /17 Oct 1992|17\/10\/1992/,
  },
  {
    id: "0405-thornton",
    caseId: "a7683250-9df4-4df7-830e-6f2c1deb23ed",
    source: "docs/fictional-cases-40/NS-CPS-2026-0405.txt",
    expectName: /rowan thornton/i,
    expectCharge: /pwits|intent to supply|class b/i,
    hearingMustNot: /18 Nov 1995|18\/11\/1995/,
  },
  {
    id: "0412-reid",
    caseId: "5366fa10-4414-4444-a63f-3a25d40501ab",
    source: "docs/fictional-cases-40/NS-CPS-2026-0412.txt",
    expectName: /kian reid/i,
    expectCharge: /s\.?\s*18|gbh/i,
    hearingMustNot: /20 Mar 2002|20\/03\/2002/,
  },
];

async function signIn(page: Page): Promise<void> {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const emailBox = page.getByLabel(/work email/i);
  const passBox = page.getByLabel(/password/i);
  await emailBox.click();
  await emailBox.fill("");
  await emailBox.pressSequentially(EMAIL, { delay: 12 });
  await passBox.click();
  await passBox.fill("");
  await passBox.pressSequentially(PASSWORD, { delay: 8 });
  await page.getByRole("button", { name: /sign in/i }).click();
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const body = await page.locator("body").innerText();
    if (/invalid login|invalid credentials/i.test(body)) throw new Error("Sign-in failed");
    if (!page.url().includes("/sign-in") && !/sign in to casebrain/i.test(body)) return;
    await page.waitForTimeout(300);
  }
  if (page.url().includes("/sign-in")) throw new Error("Still on sign-in");
}

async function shot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const dest = path.join(OUT_DIR, name);
  await page.screenshot({ path: dest, fullPage: true }).catch(() => undefined);
  fs.copyFileSync(dest, path.join(SHOTS, name));
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const lines = [
    "# Live physical check — logged in, opened cases",
    "",
    `URL: ${BASE}`,
    `Account: ${EMAIL}`,
    `When: ${new Date().toISOString()}`,
    "",
    "This is the **live site**, not the unreleased branch.",
    "",
    "| Case | Name | Charge | Hearing vs file | On the file strip | Verdict |",
    "|---|---|---|---|---|---|",
  ];

  try {
    await signIn(page);
    await page.goto(`${BASE}/court-today`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await shot(page, "physical_01_logged_in_court_today.png");
    console.log("Signed in", page.url());

    for (const spec of CASES) {
      const href = `${BASE}/cases/${spec.caseId}?tab=overview&controlRoom=1`;
      await page.goto(href, { waitUntil: "domcontentloaded", timeout: 45_000 });
      const deadline = Date.now() + 40_000;
      let body = "";
      while (Date.now() < deadline) {
        body = await page.locator("body").innerText();
        if (/sam rees|taylor frost|rowan thornton|kian reid|charge not on papers|client name/i.test(body)) break;
        await page.waitForTimeout(600);
      }
      await shot(page, `physical_${spec.id}.png`);
      const nameOk = spec.expectName.test(body);
      const chargeOk = spec.expectCharge.test(body);
      const dobHearing = spec.hearingMustNot ? spec.hearingMustNot.test(body) : false;
      const listingOk = spec.hearingShould ? spec.hearingShould.test(body) : true;
      const strip = /on the file/i.test(body);
      const ok = nameOk && chargeOk && !dobHearing && listingOk;
      const hearingNote = dobHearing ? "LIVE STILL SHOWS DOB" : listingOk ? "no DOB in header" : "listing miss";
      lines.push(
        `| ${spec.id} | ${nameOk ? "MATCH" : "MISS"} | ${chargeOk ? "MATCH" : "MISS"} | ${hearingNote} | ${strip ? "yes" : "no"} | ${ok ? "PASS" : "FAIL"} |`,
      );
      console.log(spec.id, { nameOk, chargeOk, dobHearing, strip, url: page.url() });
    }
  } finally {
    await browser.close();
  }

  const out = path.join(process.cwd(), "artifacts", "as-is-freeze", "live-physical-pdf-check.md");
  fs.writeFileSync(out, `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
  console.log("Wrote", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
