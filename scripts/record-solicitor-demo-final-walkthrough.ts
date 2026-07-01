#!/usr/bin/env npx tsx
/**
 * Final solicitor walkthrough — real prod, no loading flash, tight crop, 60–75s.
 * Run: npx tsx scripts/record-solicitor-demo-final-walkthrough.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "demo-video");
const RAW_DIR = path.join(OUT_DIR, "raw-final-walkthrough");
const BASE_URL = (process.env.DEMO_BASE_URL ?? "https://www.casebrain.co.uk").replace(/\/$/, "");
const EMAIL = process.env.DEMO_LOOM_EMAIL ?? "demo.loom.taylor.1782877263@casebrain.qa.smoke";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const CASE_ID = process.env.DEMO_CASE_ID ?? "4e22fb0f-8631-4cda-9aef-fea6a24f6163";
const CONTENT_ZOOM = Number(process.env.DEMO_ZOOM ?? "1.28");
const VIEWPORT = { width: 1920, height: 1080 };
const OVERVIEW_URL = `${BASE_URL}/cases/${CASE_ID}?tab=overview&controlRoom=1`;
const MP4_OUT = path.join(OUT_DIR, "casebrain-solicitor-demo-final-walkthrough.mp4");
const WEBM_OUT = path.join(OUT_DIR, "casebrain-solicitor-demo-final-walkthrough.webm");

/** Sidebar crop in post (w-64 ≈ 256px at 1920). */
const CROP_X = 248;
const CROP_W = 1672;

const CAPTIONS = {
  overview: "The papers mention evidence. But can you rely on it?",
  confidence: "CaseBrain maps source state — served, referred, missing — before you rely.",
  hearing: "Court prep view: source-backed, provisional, solicitor review required.",
  export: "CPS chase, court note and client summary are kept separate.",
  fiveAnswers: "What is the case saying? What is served? What is missing? What must not be overstated?",
  proof:
    "500 controlled/anonymised scenarios · 3,549 evidence items · 0 false-served · 0 blocking failures · solicitor-reviewed audit next.",
} as const;

function loadEnv(): void {
  for (const name of [".env.local", ".env", ".env.vercel.prod"]) {
    const p = path.join(ROOT, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const k = t.slice(0, eq).trim();
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

function authCookie(session: { access_token: string; refresh_token: string }): { name: string; value: string } {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return { name: `sb-${ref}-auth-token`, value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}` };
}

let demoSession: { access_token: string; refresh_token: string } | null = null;

async function signIn(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const res = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (res.error || !res.data.session) throw res.error ?? new Error("sign in failed");
  demoSession = res.data.session;
}

async function attachAuth(context: BrowserContext): Promise<void> {
  if (!demoSession) throw new Error("missing session");
  const cookie = authCookie(demoSession);
  await context.addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      domain: new URL(BASE_URL).hostname,
      path: "/",
      httpOnly: false,
      secure: BASE_URL.startsWith("https"),
      sameSite: "Lax",
    },
  ]);
}

async function applyWalkthroughChrome(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      #cb-walk-caption {
        position: fixed !important;
        bottom: 18px !important;
        left: 18px !important;
        right: auto !important;
        transform: none !important;
        z-index: 2147483647 !important;
        background: rgba(0, 0, 0, 0.72) !important;
        color: #e2e8f0 !important;
        padding: 10px 16px !important;
        border-radius: 4px !important;
        font-size: 17px !important;
        font-weight: 500 !important;
        font-family: system-ui, Segoe UI, sans-serif !important;
        max-width: min(520px, 38vw) !important;
        text-align: left !important;
        line-height: 1.35 !important;
        pointer-events: none !important;
        box-shadow: none !important;
        border: none !important;
      }
      aside.flex.h-full.w-64 {
        opacity: 0.72 !important;
      }
    `,
  });
  await page.evaluate((zoom) => {
    const main =
      document.querySelector('[data-testid="pilot-matter-desk"]') ??
      document.querySelector('[data-testid="case-control-room"]') ??
      document.querySelector('[data-layout="control-room"]');
    if (main instanceof HTMLElement) {
      main.style.zoom = String(zoom);
      main.style.transformOrigin = "top left";
    } else {
      document.documentElement.style.zoom = String(zoom);
    }
  }, CONTENT_ZOOM);
}

async function setCaption(page: Page, text: string): Promise<void> {
  await page.evaluate((caption) => {
    let el = document.getElementById("cb-walk-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "cb-walk-caption";
      document.body.appendChild(el);
    }
    el.textContent = caption;
  }, text);
}

async function clearCaption(page: Page): Promise<void> {
  await page.evaluate(() => document.getElementById("cb-walk-caption")?.remove());
}

async function waitUntilOverviewReady(page: Page): Promise<void> {
  await page.goto(OVERVIEW_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const body = document.body?.innerText ?? "";
      if (/loading workspace/i.test(body)) return false;
      if (/loading case overview/i.test(body)) return false;
      if (body.length < 900) return false;
      const header = document.querySelector('[data-testid="case-snapshot-panel"]');
      const answers = document.querySelector('[data-testid="five-answers-view"]');
      const dash = document.querySelector('[data-testid="evidence-truth-map-panel"]');
      return Boolean(header && answers && dash);
    },
    { timeout: 120_000 },
  );
  await page.locator('[data-testid="case-snapshot-panel"]').first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(600);
}

async function smoothScrollTo(page: Page, selector: string, durationMs = 2000): Promise<void> {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 60_000 });
  await page.evaluate(
    async ({ sel, duration }) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - window.innerHeight * 0.2;
      const startY = window.scrollY;
      const distance = targetY - startY;
      if (Math.abs(distance) < 8) return;
      const steps = Math.max(20, Math.floor(duration / 40));
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        window.scrollTo({ top: startY + distance * eased, behavior: "instant" });
        await new Promise((r) => setTimeout(r, duration / steps));
      }
    },
    { sel: selector, duration: durationMs },
  );
  await page.waitForTimeout(250);
}

async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const start = window.scrollY;
    const steps = 16;
    for (let i = 0; i <= steps; i += 1) {
      window.scrollTo({ top: start * (1 - i / steps), behavior: "instant" });
      await new Promise((r) => setTimeout(r, 35));
    }
  });
  await page.waitForTimeout(300);
}

async function hold(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

async function warmup(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<void> {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  await attachAuth(ctx);
  const page = await ctx.newPage();
  console.log("Warming up Jordan Hale overview (off recording)…");
  await waitUntilOverviewReady(page);
  await ctx.close();
}

async function recordWalkthrough(): Promise<{ webmPath: string; trimStartSec: number }> {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--font-render-hinting=medium"],
  });

  await warmup(browser);

  const recordStarted = Date.now();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    colorScheme: "dark",
  });

  await attachAuth(context);
  const page = await context.newPage();

  const loadMark = Date.now();
  console.log("Loading overview — recording starts after ready…");
  await waitUntilOverviewReady(page);
  const trimStartSec = Math.max(0, (Date.now() - recordStarted) / 1000 - 0.15);

  await applyWalkthroughChrome(page);
  await scrollToTop(page);
  await smoothScrollTo(page, '[data-testid="case-snapshot-panel"]', 800);

  // 1. Case snapshot + what matters now
  await setCaption(page, CAPTIONS.overview);
  await hold(page, 7_000);

  // 2. Evidence truth map
  await smoothScrollTo(page, '[data-testid="evidence-truth-map-panel"]', 2200);
  await setCaption(page, CAPTIONS.confidence);
  await hold(page, 6_500);

  // 3. Hearing mode
  await smoothScrollTo(page, '[data-testid="hearing-mode-panel"]', 2200);
  await smoothScrollTo(page, '[data-testid="hearing-mode-court-line"]', 1200);
  await setCaption(page, CAPTIONS.hearing);
  await hold(page, 7_000);

  // 4. Export pack
  await smoothScrollTo(page, '[data-testid="export-pack-panel"]', 2000);
  await setCaption(page, CAPTIONS.export);
  await hold(page, 2_200);
  for (const section of ["cps_chase", "court_note", "client_summary"] as const) {
    await smoothScrollTo(page, `[data-testid="export-pack-section-${section}"]`, 1600);
    await hold(page, 2_400);
  }

  // 5. Five answers
  await smoothScrollTo(page, '[data-testid="five-answers-view"]', 2000);
  await smoothScrollTo(page, '[data-testid="five-answers-case-saying"]', 1200);
  await setCaption(page, CAPTIONS.fiveAnswers);
  await hold(page, 7_000);

  // 6. Proof ending on overview top
  await clearCaption(page);
  await scrollToTop(page);
  await smoothScrollTo(page, '[data-testid="case-snapshot-panel"]', 1400);
  await setCaption(page, CAPTIONS.proof);
  await hold(page, 6_500);

  const walkMs = Date.now() - loadMark;
  console.log(`Walkthrough body: ${(walkMs / 1000).toFixed(1)}s, trim prefix: ${trimStartSec.toFixed(2)}s`);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (!video) throw new Error("No video recorded");
  const webmPath = await video.path();
  if (!webmPath || !fs.existsSync(webmPath)) throw new Error("Video file missing");
  return { webmPath, trimStartSec };
}

function ffmpegBin(): string {
  try {
    const p = require("ffmpeg-static") as string;
    if (p && fs.existsSync(p)) return p;
  } catch {
    /* fall through */
  }
  execSync("ffmpeg -version", { stdio: "ignore" });
  return "ffmpeg";
}

function convertCropTrim(webmPath: string, mp4Path: string, trimStartSec: number): void {
  const ff = ffmpegBin();
  const trimmed = path.join(OUT_DIR, "_final-walkthrough-trim.mp4");
  const vf = [
    `crop=${CROP_W}:1080:${CROP_X}:0`,
    "scale=1920:1080:flags=lanczos",
    "unsharp=5:5:0.35:5:5:0.0",
  ].join(",");
  execSync(
    `"${ff}" -y -ss ${trimStartSec.toFixed(3)} -i "${webmPath}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart -vf "${vf}" "${trimmed}"`,
    { stdio: "inherit" },
  );
  fs.copyFileSync(trimmed, mp4Path);
  try {
    fs.unlinkSync(trimmed);
  } catch {
    /* ignore */
  }
}

function probeDurationSec(mp4Path: string): number | null {
  try {
    const ff = ffmpegBin();
    const out = execSync(`"${ff}" -i "${mp4Path}" 2>&1`, { encoding: "utf8" });
    const m = out.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  } catch (e) {
    const m = String(e).match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
}

async function main(): Promise<void> {
  loadEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Signing in…");
  await signIn();

  console.log(`Recording final walkthrough (content zoom ${CONTENT_ZOOM}, crop sidebar)…`);
  const { webmPath, trimStartSec } = await recordWalkthrough();
  fs.copyFileSync(webmPath, WEBM_OUT);

  console.log("Converting — trim loading, crop main panel…");
  convertCropTrim(webmPath, MP4_OUT, trimStartSec);

  const duration = probeDurationSec(MP4_OUT);
  const durationOk = duration !== null && duration >= 58 && duration <= 78;
  const verdict = durationOk ? "READY WITH WARNINGS" : duration && duration > 78 ? "READY WITH WARNINGS" : "READY WITH WARNINGS";

  const report = {
    generatedAt: new Date().toISOString(),
    style: "real product walkthrough — trimmed start, sidebar crop, slow scroll, corner captions",
    disclaimer:
      "Controlled/synthetic demo matter only. Not legal advice. Does not replace solicitors. Not solicitor-reviewed real-world proof.",
    account: { email: EMAIL, caseId: CASE_ID, caseUrl: OVERVIEW_URL },
    outputs: { mp4: MP4_OUT, webm: WEBM_OUT },
    settings: { contentZoom: CONTENT_ZOOM, viewport: VIEWPORT, crop: { x: CROP_X, w: CROP_W }, trimStartSec },
    durationSec: duration,
    routeCaptured: [
      "Jordan Hale overview top — badges",
      "confidence dashboard",
      "hearing mode — court line + chase",
      "export pack — CPS chase, court note, client summary",
      "five answers",
      "overview top — proof caption",
    ],
    readyToPost: verdict,
    caveats: [
      "Fictional Jordan Hale matter — no real client data.",
      "Trial/smoke banner may appear.",
      "Not legal advice; does not replace solicitors.",
      "Controlled/anonymised audit only — solicitor-reviewed audit is next.",
      duration && duration > 78 ? `Slightly over 75s target (${duration.toFixed(1)}s).` : null,
      duration && duration < 58 ? `Under 60s (${duration?.toFixed(1)}s) — may feel brisk.` : null,
    ].filter(Boolean),
  };

  fs.writeFileSync(path.join(OUT_DIR, "FINAL_WALKTHROUGH_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log("\nFinal walkthrough complete");
  console.log("MP4:", MP4_OUT);
  console.log("Duration:", duration ? `${duration.toFixed(1)}s` : "unknown");
  console.log("Verdict:", verdict);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
