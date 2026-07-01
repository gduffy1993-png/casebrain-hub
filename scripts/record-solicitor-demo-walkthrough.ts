#!/usr/bin/env npx tsx
/**
 * Real product walkthrough — live prod CaseBrain, Jordan Hale demo matter.
 * No intro cards, slow scroll, 135% zoom, minimal captions.
 * Run: npx tsx scripts/record-solicitor-demo-walkthrough.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "demo-video");
const RAW_DIR = path.join(OUT_DIR, "raw-walkthrough");
const BASE_URL = (process.env.DEMO_BASE_URL ?? "https://www.casebrain.co.uk").replace(/\/$/, "");
const EMAIL = process.env.DEMO_LOOM_EMAIL ?? "demo.loom.taylor.1782877263@casebrain.qa.smoke";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const CASE_ID = process.env.DEMO_CASE_ID ?? "4e22fb0f-8631-4cda-9aef-fea6a24f6163";
const ZOOM = Number(process.env.DEMO_ZOOM ?? "1.35");
const VIEWPORT = { width: 1920, height: 1080 };
const OVERVIEW_URL = `${BASE_URL}/cases/${CASE_ID}?tab=overview&controlRoom=1`;
const MP4_OUT = path.join(OUT_DIR, "casebrain-solicitor-demo-walkthrough.mp4");
const WEBM_OUT = path.join(OUT_DIR, "casebrain-solicitor-demo-walkthrough.webm");

const CAPTIONS = {
  overview: "The papers mention evidence. But can you rely on it?",
  confidence: "CaseBrain caps the matter at source review while material is outstanding.",
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

function authCookie(session: {
  access_token: string;
  refresh_token: string;
}): { name: string; value: string } {
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
        bottom: 32px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483647 !important;
        background: rgba(0, 0, 0, 0.78) !important;
        color: #f1f5f9 !important;
        padding: 12px 28px !important;
        border-radius: 6px !important;
        font-size: 22px !important;
        font-weight: 500 !important;
        font-family: system-ui, Segoe UI, sans-serif !important;
        max-width: 88% !important;
        text-align: center !important;
        line-height: 1.4 !important;
        pointer-events: none !important;
        box-shadow: none !important;
        border: none !important;
      }
    `,
  });
  await page.evaluate((zoom) => {
    document.documentElement.style.zoom = String(zoom);
  }, ZOOM);
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
  await page.evaluate(() => {
    const el = document.getElementById("cb-walk-caption");
    if (el) el.remove();
  });
}

async function waitUntilOverviewReady(page: Page): Promise<void> {
  await page.goto(OVERVIEW_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const body = document.body?.innerText ?? "";
      if (/loading case overview/i.test(body)) return false;
      if (body.length < 800) return false;
      return Boolean(
        document.querySelector('[data-testid="five-answers-view"]') ||
          document.querySelector('[data-testid="five-answers-case-saying"]') ||
          document.querySelector('[data-testid="matter-confidence-header"]'),
      );
    },
    { timeout: 120_000 },
  );
  await page.waitForTimeout(1200);
}

async function smoothScrollTo(page: Page, selector: string, durationMs = 2800): Promise<void> {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 60_000 });
  await page.evaluate(
    async ({ sel, duration }) => {
      const el = document.querySelector(sel);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - window.innerHeight * 0.22;
      const startY = window.scrollY;
      const distance = targetY - startY;
      if (Math.abs(distance) < 8) return;
      const steps = Math.max(24, Math.floor(duration / 45));
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        window.scrollTo({ top: startY + distance * eased, behavior: "instant" });
        await new Promise((r) => setTimeout(r, duration / steps));
      }
    },
    { sel: selector, duration: durationMs },
  );
  await page.waitForTimeout(400);
}

async function scrollToTop(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const start = window.scrollY;
    const steps = 20;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      window.scrollTo({ top: start * (1 - t), behavior: "instant" });
      await new Promise((r) => setTimeout(r, 40));
    }
  });
  await page.waitForTimeout(500);
}

async function hold(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

async function warmupOverview(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<void> {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  await attachAuth(ctx);
  const page = await ctx.newPage();
  console.log("Warming up overview (off recording)…");
  await waitUntilOverviewReady(page);
  await ctx.close();
}

async function recordWalkthrough(): Promise<string> {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox", "--font-render-hinting=medium"],
  });

  await warmupOverview(browser);

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    colorScheme: "dark",
  });

  await attachAuth(context);
  const page = await context.newPage();

  console.log("Loading overview for recording…");
  await waitUntilOverviewReady(page);
  await applyWalkthroughChrome(page);

  // 1. Overview top — badges visible
  await scrollToTop(page);
  await smoothScrollTo(page, '[data-testid="matter-confidence-header"]', 1000);
  await setCaption(page, CAPTIONS.overview);
  await hold(page, 8_500);

  // 2. Confidence dashboard
  await smoothScrollTo(page, '[data-testid="confidence-dashboard"]', 2400);
  await setCaption(page, CAPTIONS.confidence);
  await hold(page, 7_500);

  // 3. Hearing mode
  await smoothScrollTo(page, '[data-testid="hearing-mode-panel"]', 2400);
  await smoothScrollTo(page, '[data-testid="hearing-mode-court-line"]', 1400);
  await setCaption(page, CAPTIONS.hearing);
  await hold(page, 8_500);

  // 4. Export pack — separate surfaces
  await smoothScrollTo(page, '[data-testid="export-pack-panel"]', 2200);
  await setCaption(page, CAPTIONS.export);
  await hold(page, 2800);
  for (const section of ["cps_chase", "court_note", "client_summary"] as const) {
    await smoothScrollTo(page, `[data-testid="export-pack-section-${section}"]`, 1800);
    await hold(page, 2_800);
  }

  // 5. Five answers
  await smoothScrollTo(page, '[data-testid="five-answers-view"]', 2200);
  await smoothScrollTo(page, '[data-testid="five-answers-case-saying"]', 1400);
  await setCaption(page, CAPTIONS.fiveAnswers);
  await hold(page, 8_500);

  // 6. Back to top — proof line over real app
  await clearCaption(page);
  await scrollToTop(page);
  await smoothScrollTo(page, '[data-testid="matter-confidence-header"]', 1600);
  await setCaption(page, CAPTIONS.proof);
  await hold(page, 8_000);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (!video) throw new Error("No video recorded");
  const webmPath = await video.path();
  if (!webmPath || !fs.existsSync(webmPath)) throw new Error("Video file missing");
  return webmPath;
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

function convertAndTrim(webmPath: string, mp4Path: string): void {
  const ff = ffmpegBin();
  const trimmed = path.join(OUT_DIR, "_walkthrough-trim.mp4");
  // Drop first ~2s (shell paint), light sharpen for text legibility
  execSync(
    `"${ff}" -y -ss 2 -i "${webmPath}" -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p -movflags +faststart -vf "unsharp=5:5:0.4:5:5:0.0" "${trimmed}"`,
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
    const out = execSync(
      `"${ff}" -i "${mp4Path}" 2>&1`,
      { encoding: "utf8" },
    );
    const m = out.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  } catch (e) {
    const msg = String(e);
    const m = msg.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
    if (!m) return null;
    return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
}

async function main(): Promise<void> {
  loadEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Signing in…");
  await signIn();

  console.log(`Recording walkthrough (${Math.round(ZOOM * 100)}% zoom, 1920×1080)…`);
  const webmPath = await recordWalkthrough();
  fs.copyFileSync(webmPath, WEBM_OUT);

  console.log("Converting to MP4…");
  convertAndTrim(webmPath, MP4_OUT);

  const duration = probeDurationSec(MP4_OUT);
  const durationOk = duration !== null && duration >= 55 && duration <= 95;

  const report = {
    generatedAt: new Date().toISOString(),
    style: "real product walkthrough — no intro card, slow scroll, minimal captions",
    disclaimer:
      "Controlled/synthetic demo matter only. Not legal advice. Does not replace solicitors. Not solicitor-reviewed real-world proof.",
    account: { email: EMAIL, caseId: CASE_ID, caseUrl: OVERVIEW_URL },
    outputs: { mp4: MP4_OUT, webm: WEBM_OUT },
    settings: { zoom: ZOOM, viewport: VIEWPORT },
    durationSec: duration,
    routeCaptured: [
      "overview top — thin bundle / missing / referred / provisional badges",
      "confidence dashboard",
      "hearing mode — court line + chase",
      "export pack — CPS chase, court note, client summary",
      "five answers",
      "overview top — proof caption overlay",
    ],
    readyToPost: durationOk ? "READY WITH WARNINGS" : "READY WITH WARNINGS",
    caveats: [
      "Fictional Jordan Hale matter — no real client data.",
      "Trial banner may appear on smoke account.",
      "Not legal advice; does not replace solicitors.",
      "Controlled/anonymised audit only — solicitor-reviewed audit is next.",
      duration && duration > 90 ? "Slightly long — trim in editor if needed." : null,
      duration && duration < 55 ? "Short — may feel rushed; re-run if needed." : null,
    ].filter(Boolean),
    missedOrOptional: [
      "Evidence Trace panel not isolated — visible within Five Answers cards.",
      "Re-run Diff / Advice Change Radar not highlighted — optional for a longer cut.",
      "No voiceover — captions only; add VO in editor if desired.",
      "LinkedIn native captions: upload SRT or use platform auto-captions.",
    ],
  };

  fs.writeFileSync(path.join(OUT_DIR, "WALKTHROUGH_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log("\nWalkthrough complete");
  console.log("MP4:", MP4_OUT);
  console.log("Duration:", duration ? `${duration.toFixed(1)}s` : "unknown");
  console.log("Verdict:", report.readyToPost);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
