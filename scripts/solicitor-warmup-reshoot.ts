#!/usr/bin/env npx tsx
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const CASE = "4e22fb0f-8631-4cda-9aef-fea6a24f6163";
const EMAIL = "demo.loom.taylor.1782877263@casebrain.qa.smoke";
const PASS = "ProdSmokeOnly!Jun2026";
const OUT = path.join("artifacts", "casebrain-qa", "solicitor-warmup-five-tab");

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq <= 0) continue;
  const k = line.slice(0, eq).trim();
  const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[k]) process.env[k] = v;
}

async function signIn(ctx: import("@playwright/test").BrowserContext) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  for (let p = 1; p <= 10; p++) {
    const { data } = await admin.auth.admin.listUsers({ page: p, perPage: 200 });
    const hit = data.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase());
    if (hit) {
      await admin.auth.admin.updateUserById(hit.id, { password: PASS, email_confirm: true });
      break;
    }
    if (data.users.length < 200) break;
  }
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const s = await client.auth.signInWithPassword({ email: EMAIL, password: PASS });
  if (!s.data.session) throw s.error;
  const ref = new URL(url).hostname.split(".")[0]!;
  const payload = Buffer.from(JSON.stringify(s.data.session)).toString("base64url");
  await ctx.addCookies([
    { name: `sb-${ref}-auth-token`, value: `base64-${payload}`, domain: "localhost", path: "/", sameSite: "Lax" },
  ]);
}

async function waitContent(page: import("@playwright/test").Page, testId: string) {
  const mustNot = /Loading case overview|Loading matter|Loading disclosure|Loading papers|Loading court-prep/i;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const vis = await page.getByTestId(testId).first().isVisible().catch(() => false);
    const body = await page.locator("body").innerText();
    if (vis && !mustNot.test(body)) return body;
    await page.waitForTimeout(2000);
  }
  return page.locator("body").innerText();
}

function counts(body: string) {
  return {
    loading: /Loading /i.test(body),
    prePtphDup: /pre\s+ptph\s+pre\s+ptph/i.test(body),
    openChase: [...body.matchAll(/open chase\s*\(\d+\)\s*→/gi)].length,
    addlSource: [...body.matchAll(/additional source[- ]material issues?\s*\(/gi)].length,
    chaseHeading: [...body.matchAll(/disclosure chase\s*·\s*\d+\s*on file/gi)].length,
    caseWide: [...body.matchAll(/case-wide court line/gi)].length,
    mg11: [...body.matchAll(/complainant\s+mg11\s*\/\s*source material/gi)].length,
    refused: [...body.matchAll(/refused to overstate/gi)].length,
    stillNeeds: [...body.matchAll(/still needs review/gi)].length,
    dangerous: /\bBWV\s+(?:shows|confirms|proves)\b|\bdrug\s+continuity\b/i.test(body),
    wrongFamily: /do not import bwv|drug continuity|intoxilyser|motoring calibration/i.test(body),
    liveClaim: /solicitor[- ]validated live|soc\s*2/i.test(body),
    preview: body.replace(/\s+/g, " ").slice(0, 360),
  };
}

const notes: unknown[] = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const dctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await dctx.newPage();
  const mobile = await mctx.newPage();
  await signIn(dctx);
  await signIn(mctx);

  async function capture(tab: string, file: string, testId: string, label: string) {
    const href = `${BASE}/cases/${CASE}?tab=${tab}&controlRoom=1`;
    console.log("capture", label);
    await page.goto(href, { waitUntil: "domcontentloaded", timeout: 180_000 });
    let body = await waitContent(page, testId);
    if (/Loading /i.test(body)) {
      await page.goto(`${BASE}/court-today?case=${CASE}&tab=${tab}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      body = await waitContent(page, testId);
    }
    const fp = path.join(OUT, file);
    await page.screenshot({ path: fp, fullPage: true });
    const note = { label, file: fp, ...counts(body) };
    notes.push(note);
    console.log(JSON.stringify(note));
  }

  await capture("overview", "01-overview.png", "five-answers-view", "overview");
  const toggle = page.getByTestId("overview-proof-depth-toggle");
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, "01b-overview-drawer.png"), fullPage: true });
    notes.push({ label: "overview-drawer", ...counts(await page.locator("body").innerText()) });
  } else {
    notes.push({ label: "overview-drawer", missingToggle: true });
  }

  await capture("summary", "04-summary.png", "pilot-summary-view", "summary");
  await capture("disclosure-chase", "05-chase.png", "disclosure-chase", "chase");

  await mobile.goto(`${BASE}/cases/${CASE}?tab=overview&controlRoom=1`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await waitContent(mobile, "five-answers-view");
  await mobile.screenshot({ path: path.join(OUT, "06-overview-mobile.png"), fullPage: true });
  const mb = await mobile.locator("body").innerText();
  const overlap = await mobile.evaluate(() => {
    const vw = window.innerWidth;
    const ids = [
      "case-workflow-header-strip",
      "case-snapshot-panel",
      "overview-snapshot-boxes",
      "hearing-mode-panel",
      "five-answers-view",
    ];
    type R = { id: string; el: Element; top: number; bottom: number; left: number; right: number };
    const rects: R[] = [];
    for (const id of ids) {
      const el = document.querySelector(`[data-testid="${id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.height < 4) continue;
      rects.push({ id, el, top: r.top, bottom: r.bottom, left: r.left, right: r.right });
    }
    for (const r of rects) {
      if (r.left < -4 || r.right > vw + 4) return `${r.id} overflow`;
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const h = a.left < b.right - 8 && b.left < a.right - 8;
        const v = a.top < b.bottom - 8 && b.top < a.bottom - 8;
        if (h && v) {
          const px = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (px > 24) return `${a.id} overlaps ${b.id}`;
        }
      }
    }
    return null;
  });
  notes.push({ label: "mobile", ...counts(mb), overlap });

  fs.writeFileSync(path.join(OUT, "reshoot-notes.json"), JSON.stringify(notes, null, 2));
  await browser.close();
  console.log("DONE");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
