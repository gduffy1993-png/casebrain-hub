#!/usr/bin/env npx tsx
/** Capture Overview product screenshots for Patel + phone proof matters. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "artifacts/casebrain-qa/assurance/legal-intelligence-recovery-v1");
const BASE = (process.env.H5_SMOKE_BASE_URL ?? "").replace(/\/$/, "");
const EMAIL = process.env.H5_SMOKE_EMAIL?.trim() || "gduffy1993+casebrain@gmail.com";
const PASSWORD =
  process.env.SMOKE_PASSWORD?.trim() ||
  process.env.CB_QA_PASSWORD?.trim() ||
  "ProdSmokeOnly!Jun2026";

const CASES = [
  { id: "LIVE-01-patel", caseId: "ed3c9806-3227-4ee9-ad86-9784e6000084" },
  { id: "LIVE-02-phone", caseId: "91d42617-1aae-4b4e-b15b-1ded55e3dc74" },
];

function loadLocalEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(ROOT, name);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const eq = line.indexOf("=");
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      v = v.replace(/(?:\\r\\n|\\n|\\r|\r|\n)+$/g, "").replace(/\\r/g, "").replace(/\\n/g, "");
      if (!process.env[k] || /\\r|\\n|\r|\n/.test(process.env[k]!)) process.env[k] = v;
    }
  }
}

async function main() {
  loadLocalEnv();
  if (!BASE) throw new Error("H5_SMOKE_BASE_URL required");
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/sign-in"), { timeout: 60_000 }).catch(() => undefined);
  await page.waitForTimeout(2000);

  for (const c of CASES) {
    const url = `${BASE}/cases/${c.caseId}?tab=overview&controlRoom=1`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      const confirmBtn = page.getByRole("button", { name: /confirm|continue|start|open matter|i confirm/i }).first();
      if (await confirmBtn.isVisible().catch(() => false)) {
        await confirmBtn.click().catch(() => undefined);
      }
      if ((await page.getByTestId("overview-what-needs-attention").count()) > 0) break;
      if ((await page.getByTestId("five-answers-view").count()) > 0) break;
      await page.waitForTimeout(1500);
    }
    await page.waitForTimeout(2500);
    const shot = path.join(OUT, `${c.id}-overview-product.png`);
    await page.screenshot({ path: shot, fullPage: true });
    console.log(
      "wrote",
      shot,
      "attention",
      await page.getByTestId("overview-what-needs-attention").count(),
      "selected",
      await page.getByTestId("overview-selected-issue").count(),
    );
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
