#!/usr/bin/env npx tsx
/**
 * Record solicitor-facing CaseBrain demo video (Playwright → WebM → MP4).
 * Run: npx tsx scripts/record-solicitor-demo-video.ts
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "artifacts", "demo-video");
const RAW_DIR = path.join(OUT_DIR, "raw");
const ASSETS = path.join(OUT_DIR, "assets");
const BASE_URL = (process.env.DEMO_BASE_URL ?? "https://www.casebrain.co.uk").replace(/\/$/, "");
const EMAIL = process.env.DEMO_LOOM_EMAIL ?? "demo.loom.taylor.1782877263@casebrain.qa.smoke";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const CASE_ID = process.env.DEMO_CASE_ID ?? "4e22fb0f-8631-4cda-9aef-fea6a24f6163";
const VIEWPORT = { width: 1920, height: 1080 };
const OVERVIEW_URL = `${BASE_URL}/cases/${CASE_ID}?tab=overview&controlRoom=1`;

type CaptionCue = { atSec: number; endSec: number; text: string };

const CAPTIONS: CaptionCue[] = [
  { atSec: 0, endSec: 5, text: "The papers mention evidence. But can you rely on it?" },
  { atSec: 5, endSec: 14, text: "Jordan Hale — thin bundle. Missing, referred, and provisional badges." },
  { atSec: 14, endSec: 24, text: "Confidence dashboard — needs source review before relying." },
  { atSec: 24, endSec: 36, text: "Hearing mode — safe court line, chase priorities, do-not-overstate." },
  { atSec: 36, endSec: 50, text: "Export pack — CPS chase, court note, and client summary kept separate." },
  { atSec: 50, endSec: 60, text: "Five answers — served, referred, missing, and what not to overstate." },
  { atSec: 60, endSec: 68, text: "500 controlled scenarios · 3,549 items · 0 false-served. Solicitor audit next." },
];

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
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: unknown;
}): { name: string; value: string } {
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  return { name: `sb-${ref}-auth-token`, value: `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}` };
}

async function signIn(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anon = createClient(url, anonKey, { auth: { persistSession: false } });
  const signIn = await anon.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (signIn.error || !signIn.data.session) throw signIn.error ?? new Error("sign in failed");
  (globalThis as { __demoSession?: typeof signIn.data.session }).__demoSession = signIn.data.session;
}

async function attachAuth(context: BrowserContext): Promise<void> {
  const session = (globalThis as { __demoSession?: { access_token: string; refresh_token: string } }).__demoSession;
  if (!session) throw new Error("missing session");
  const cookie = authCookie(session);
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

async function setCaption(page: Page, text: string): Promise<void> {
  await page.evaluate((caption) => {
    let el = document.getElementById("cb-demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "cb-demo-caption";
      Object.assign(el.style, {
        position: "fixed",
        bottom: "56px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        background: "rgba(15, 23, 42, 0.94)",
        color: "#f8fafc",
        padding: "18px 40px",
        borderRadius: "14px",
        fontSize: "28px",
        fontWeight: "600",
        fontFamily: "system-ui, Segoe UI, sans-serif",
        maxWidth: "90%",
        textAlign: "center",
        lineHeight: "1.35",
        boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
        pointerEvents: "none",
        border: "1px solid rgba(148,163,184,0.25)",
      });
      document.body.appendChild(el);
    }
    el.textContent = caption;
  }, text);
}

async function hideCaption(page: Page): Promise<void> {
  await page.evaluate(() => {
    const el = document.getElementById("cb-demo-caption");
    if (el) el.remove();
  });
}

async function demoPolish(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      [class*="trial"], [data-testid*="trial"] { opacity: 0.85 !important; }
      #cb-demo-caption { display: block !important; }
    `,
  });
}

async function waitForOverview(page: Page): Promise<void> {
  await page.goto(OVERVIEW_URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page
    .locator('[data-testid="five-answers-view"], [data-testid="five-answers-case-saying"], [data-testid="case-workflow-shell"]')
    .first()
    .waitFor({ timeout: 90_000 });
  await page.waitForTimeout(2500);
  await demoPolish(page);
}

async function scrollTo(page: Page, selector: string): Promise<void> {
  const loc = page.locator(selector).first();
  await loc.waitFor({ state: "visible", timeout: 60_000 });
  await loc.scrollIntoViewIfNeeded();
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el?.scrollIntoView({ block: "center", behavior: "instant" });
  }, selector);
  await page.waitForTimeout(800);
}

async function pause(page: Page, ms: number, caption?: string): Promise<void> {
  if (caption) await setCaption(page, caption);
  await page.waitForTimeout(ms);
}

function fileUrl(p: string): string {
  return `file:///${p.replace(/\\/g, "/")}`;
}

async function recordDemo(): Promise<string> {
  fs.mkdirSync(RAW_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage", "--no-sandbox"],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    colorScheme: "dark",
  });

  await attachAuth(context);
  const page = await context.newPage();

  // 1. Intro card
  await page.goto(fileUrl(path.join(ASSETS, "intro.html")), { waitUntil: "domcontentloaded" });
  await pause(page, 5000, CAPTIONS[0]!.text);

  // 2. Overview top — badges / thin bundle
  await waitForOverview(page);
  await scrollTo(page, '[data-testid="matter-confidence-header"]');
  await pause(page, 9000, CAPTIONS[1]!.text);

  // 3. Confidence dashboard
  await scrollTo(page, '[data-testid="confidence-dashboard"]');
  await pause(page, 10000, CAPTIONS[2]!.text);

  // 4. Hearing mode
  await scrollTo(page, '[data-testid="hearing-mode-panel"]');
  await pause(page, 12000, CAPTIONS[3]!.text);

  // 5. Export pack — show version + sections
  await scrollTo(page, '[data-testid="export-pack-panel"]');
  await pause(page, 4000, CAPTIONS[4]!.text);
  for (const section of ["cps_chase", "court_note", "client_summary", "evidence_gaps"]) {
    await scrollTo(page, `[data-testid="export-pack-section-${section}"]`);
    await page.waitForTimeout(2000);
  }

  // 6. Five answers
  await scrollTo(page, '[data-testid="five-answers-view"]');
  await pause(page, 10000, CAPTIONS[5]!.text);

  // 7. Outro
  await hideCaption(page);
  await page.goto(fileUrl(path.join(ASSETS, "outro.html")), { waitUntil: "domcontentloaded" });
  await pause(page, 8000, CAPTIONS[6]!.text);

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  if (!video) throw new Error("No video recorded");
  const webmPath = await video.path();
  if (!webmPath || !fs.existsSync(webmPath)) throw new Error("Video file missing");
  return webmPath;
}

function writeCaptionsSrt(): void {
  const lines: string[] = [];
  CAPTIONS.forEach((c, i) => {
    const fmt = (sec: number) => {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const ms = Math.floor((sec % 1) * 1000);
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    };
    lines.push(String(i + 1));
    lines.push(`${fmt(c.atSec)} --> ${fmt(c.endSec)}`);
    lines.push(c.text);
    lines.push("");
  });
  fs.writeFileSync(path.join(OUT_DIR, "casebrain-solicitor-demo.srt"), `${lines.join("\n")}\n`);
}

function writeLinkedInPost(): void {
  const text = `Criminal defence bundles often mention BWV, custody records, and MG6 schedules — but the risk is relying on something the papers do not actually prove.

CaseBrain maps what is served, referred-only, missing, and unsafe to overstate — with separate CPS chase, court, and client wording.

Controlled/anonymised audit: 500 scenarios, 3,549 evidence items, 0 false-served, 0 blocking failures. Independent solicitor-reviewed audit is the next step — not a claim of real-world proof yet.

#LegalTech #CriminalDefence #Solicitor #Disclosure`;

  fs.writeFileSync(path.join(OUT_DIR, "linkedin-post.txt"), `${text}\n`);
}

function convertToMp4(webmPath: string, mp4Path: string): boolean {
  let ffmpegBin: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ffmpegBin = require("ffmpeg-static") as string;
  } catch {
    /* optional */
  }
  if (!ffmpegBin || !fs.existsSync(ffmpegBin)) {
    try {
      execSync("ffmpeg -version", { stdio: "ignore" });
      ffmpegBin = "ffmpeg";
    } catch {
      return false;
    }
  }
  execSync(
    `"${ffmpegBin}" -y -i "${webmPath}" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p -movflags +faststart "${mp4Path}"`,
    { stdio: "inherit" },
  );
  return fs.existsSync(mp4Path);
}

async function main(): Promise<void> {
  loadEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("Signing in to prod demo account…");
  await signIn();

  console.log("Recording demo (1920×1080)…");
  const webmPath = await recordDemo();
  const webmOut = path.join(OUT_DIR, "casebrain-solicitor-demo.webm");
  fs.copyFileSync(webmPath, webmOut);

  writeCaptionsSrt();
  writeLinkedInPost();

  const mp4Path = path.join(OUT_DIR, "casebrain-solicitor-demo.mp4");
  let mp4Ready = convertToMp4(webmOut, mp4Path);

  if (!mp4Ready) {
    console.log("ffmpeg not found — installing ffmpeg-static for conversion…");
    try {
      execSync("npm install ffmpeg-static --no-save", { cwd: ROOT, stdio: "inherit" });
      mp4Ready = convertToMp4(webmOut, mp4Path);
    } catch {
      mp4Ready = false;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    disclaimer: "Controlled/synthetic demo only — not solicitor-reviewed real-world proof.",
    account: { email: EMAIL, caseId: CASE_ID, caseUrl: OVERVIEW_URL },
    outputs: {
      webm: webmOut,
      mp4: mp4Ready ? mp4Path : null,
      captions: path.join(OUT_DIR, "casebrain-solicitor-demo.srt"),
      linkedInPost: path.join(OUT_DIR, "linkedin-post.txt"),
    },
    routeCaptured: [
      "intro hook card",
      "overview — matter confidence / thin bundle badges",
      "confidence dashboard",
      "hearing mode — court line, chase, do-not-overstate",
      "export pack — CPS chase, court note, client summary, evidence gaps, version stamp",
      "five answers",
      "outro proof line card",
    ],
    targetDurationSec: "≈65–68",
    readyToPost: mp4Ready ? "WITH WARNINGS" : "WITH WARNINGS",
    caveats: [
      "Fictional Jordan Hale matter — no real client data.",
      "Do not claim solicitor-reviewed or real-world false-served proof in post copy.",
      "Trial banner may appear on smoke account.",
      mp4Ready ? "MP4 ready for LinkedIn upload." : "MP4 conversion failed — use WebM or install ffmpeg.",
    ],
  };

  fs.writeFileSync(path.join(OUT_DIR, "REPORT.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log("\nDemo video capture complete");
  console.log("WebM:", webmOut);
  if (mp4Ready) console.log("MP4:", mp4Path);
  console.log("Captions:", report.outputs.captions);
  console.log("LinkedIn:", report.outputs.linkedInPost);
  console.log("Report:", path.join(OUT_DIR, "REPORT.json"));
  console.log("Ready to post:", report.readyToPost);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
