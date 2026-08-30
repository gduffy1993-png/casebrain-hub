/**
 * Fresh-account attempt + mixed realistic bundles through live production.
 * Compares Overview / Court / Chase text to the source file.
 *
 *   npx tsx scripts/mixed-cases-live-prod-check.ts
 *
 * Env:
 *   MIXED_LIVE_BASE_URL   default https://www.casebrain.co.uk
 *   MIXED_LIVE_EMAIL      skip signup, sign in as this account
 *   SMOKE_PASSWORD        default ProdSmokeOnly!Jun2026
 *   MIXED_LIVE_SKIP_SIGNUP=1  do not try a new account
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { chromium, type Page } from "@playwright/test";

const ROOT = process.cwd();
const BASE = (process.env.MIXED_LIVE_BASE_URL ?? "https://www.casebrain.co.uk").replace(/\/$/, "");
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const SMOKE_EMAIL = process.env.MIXED_LIVE_FALLBACK_EMAIL ?? "demo.loom.taylor.1782877263@casebrain.qa.smoke";
const SKIP_SIGNUP = process.env.MIXED_LIVE_SKIP_SIGNUP === "1" || Boolean(process.env.MIXED_LIVE_EMAIL?.trim());
const PRESET_EMAIL = process.env.MIXED_LIVE_EMAIL?.trim() || null;
const RECHECK = Object.fromEntries(
  (process.env.MIXED_LIVE_RECHECK ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [id, caseId] = part.split(":");
      return [id, caseId];
    })
    .filter((pair): pair is [string, string] => Boolean(pair[0] && pair[1])),
);
const HEADLESS = process.env.CB_FRESH_HEADLESS !== "0";
const UPLOAD_MS = Number(process.env.MIXED_LIVE_UPLOAD_TIMEOUT_MS ?? "180000");
const PDF_DIR = path.join(ROOT, "docs", "cb-fresh-adversarial", "pdfs", "mixed-live");
const OUT_DIR = path.join(ROOT, "artifacts", "as-is-freeze", "mixed-live-prod");
const REPORT = path.join(ROOT, "artifacts", "as-is-freeze", "mixed-cases-live-prod-check.md");

type CaseSpec = {
  id: string;
  source: string;
  pdfName: string;
  title: string;
  accused: string;
  expectCharge: RegExp;
  expectCourt?: RegExp;
  expectHearing?: RegExp;
  forbid: RegExp;
};

const CASES: CaseSpec[] = [
  {
    id: "jordan-aew",
    source: "docs/cb-fresh-adversarial/sources/CB-FRESH-002_Jordan_Hale.txt",
    pdfName: "CB-FRESH-002_Jordan_Hale.pdf",
    title: "MIXED Jordan Hale AEW",
    accused: "Jordan Hale",
    expectCharge: /assault an emergency worker|assaults on emergency workers/i,
    expectCourt: /central park magistrates/i,
    expectHearing: /22 Jul 2026|22 July 2026/,
    forbid: /\bpwits\b|intent to supply|class [ab]\b|theft act 1968/i,
  },
  {
    id: "okafor-drugs",
    source: "docs/bundle-foundation-pack/generated/sources/CB-FOUND-2005_Okafor_Drugs.txt",
    pdfName: "CB-FOUND-2005_Okafor_Drugs.pdf",
    title: "MIXED Amara Okafor Drugs",
    accused: "Amara Okafor",
    expectCharge: /possession of a controlled drug|class b|misuse of drugs act/i,
    expectCourt: /westvale|magistrates/i,
    expectHearing: /3 Oct 2026|3 October 2026|3 Oct\.? 2026/,
    forbid: /\bpwits\b|intent to supply|gbh|section 20|harassment act/i,
  },
  {
    id: "clarke-motoring",
    source: "docs/bundle-foundation-pack/generated/sources/CB-FOUND-2004_Clarke_DrinkDrive.txt",
    pdfName: "CB-FOUND-2004_Clarke_DrinkDrive.pdf",
    title: "MIXED Daniel Clarke Drink Drive",
    accused: "Daniel Clarke",
    expectCharge: /road traffic act|prescribed limit|excess alcohol|drink.?driv/i,
    expectCourt: /westvale magistrates/i,
    expectHearing: /12 Sep(?:t)?\.? 2026|12 September 2026/,
    forbid: /\bpwits\b|intent to supply|gbh|section 20|theft act 1968/i,
  },
  {
    id: "merritt-theft",
    source: "docs/fictional-bundle-theft/FICTIONAL_THEFT_BUNDLE_COPY_PASTE.txt",
    pdfName: "FICTIONAL_THEFT_MERRITT.pdf",
    title: "MIXED Ashleigh Merritt Theft",
    accused: "Ashleigh Merritt",
    expectCharge: /theft act 1968|theft,? contrary to section 1/i,
    expectCourt: /northshire magistrates/i,
    expectHearing: /14 May 2024/,
    forbid: /\bpwits\b|intent to supply|gbh|section 20|harassment act/i,
  },
];

type CaseResult = {
  id: string;
  accused: string;
  caseId: string | null;
  account: string;
  chargeOk: boolean;
  courtOk: boolean;
  hearingOk: boolean;
  leak: boolean;
  onTheFile: boolean;
  verdict: "PASS" | "FAIL" | "SKIP";
  detail: string;
  preview: string;
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function ensurePdf(srcRel: string, pdfName: string): Promise<string> {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const src = path.join(ROOT, srcRel);
  const dest = path.join(PDF_DIR, pdfName);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 800) return dest;
  if (!fs.existsSync(src)) throw new Error(`Missing source ${src}`);
  const text = fs.readFileSync(src, "utf8");
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.4;margin:0}pre{white-space:pre-wrap;font-family:inherit;margin:0}</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.pdf({
      path: dest,
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "16mm", right: "16mm" },
    });
  } finally {
    await browser.close();
  }
  return dest;
}

async function shot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: true }).catch(() => undefined);
}

async function fillAuthForm(page: Page, email: string): Promise<void> {
  const emailBox = page.getByLabel(/work email/i);
  const passBox = page.getByLabel(/password|create password/i);
  await emailBox.waitFor({ timeout: 20_000 });
  await emailBox.click();
  await emailBox.fill("");
  await emailBox.pressSequentially(email, { delay: 15 });
  await passBox.click();
  await passBox.fill("");
  await passBox.pressSequentially(PASSWORD, { delay: 10 });
  const typed = await emailBox.inputValue();
  if (typed !== email) {
    throw new Error(`Email field stayed ${JSON.stringify(typed)} instead of ${email}`);
  }
}

async function trySignUp(page: Page, email: string): Promise<"session" | "confirm" | "error"> {
  await page.goto(`${BASE}/sign-up`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await fillAuthForm(page, email);
  await page.getByRole("button", { name: /create account/i }).click();
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    const body = await page.locator("body").innerText();
    if (/check your email/i.test(body)) return "confirm";
    if (/already registered|already exists|user already/i.test(body)) return "error";
    if (page.url().includes("/sign-up") === false && !/sign-up/i.test(body)) return "session";
    if (/unexpected error|rate limit|invalid/i.test(body) && /create your casebrain account/i.test(body)) {
      return "error";
    }
    await page.waitForTimeout(400);
  }
  const body = await page.locator("body").innerText();
  if (/check your email/i.test(body)) return "confirm";
  return "error";
}

async function signIn(page: Page, email: string): Promise<boolean> {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await fillAuthForm(page, email);
  await page.getByRole("button", { name: /sign in/i }).click();
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const url = page.url();
    const body = await page.locator("body").innerText();
    if (/invalid login|invalid credentials|email not confirmed/i.test(body)) return false;
    if (!/\/sign-in/i.test(url) && !/sign in to casebrain/i.test(body)) return true;
    await page.waitForTimeout(400);
  }
  return !/\/sign-in/i.test(page.url());
}

async function uploadCase(page: Page, spec: CaseSpec, pdfPath: string): Promise<string | null> {
  await page.goto(`${BASE}/upload`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  const blocked = await page.locator("body").innerText();
  if (/upgrade|trial expired|doc limit|case limit|paywall/i.test(blocked) && /drop documents|new upload/i.test(blocked) === false) {
    await shot(page, `${spec.id}-paywall.png`);
    throw new Error(`Upload page blocked: ${blocked.slice(0, 180)}`);
  }
  await page.getByText(/drop documents|new upload/i).first().waitFor({ timeout: 30_000 });
  const select = page.locator("select").first();
  if (await select.count()) await select.selectOption("criminal").catch(() => undefined);
  await page.locator('input[type="file"]').setInputFiles(pdfPath);
  const titleBox = page.getByPlaceholder(/R v Smith/i);
  if (await titleBox.count()) await titleBox.fill(spec.title);
  const uploadResponse = page.waitForResponse(
    (r) => r.url().includes("/api/upload") && (r.status() === 201 || r.status() === 402 || r.status() >= 400),
    { timeout: UPLOAD_MS },
  );
  await page.getByRole("button", { name: /upload and extract/i }).click();
  const res = await uploadResponse;
  if (res.status() === 402) {
    await shot(page, `${spec.id}-paywall-402.png`);
    throw new Error("PAYWALL_402");
  }
  if (res.status() !== 201) {
    const txt = await res.text().catch(() => "");
    await shot(page, `${spec.id}-upload-fail.png`);
    throw new Error(`Upload HTTP ${res.status()} ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { caseId?: string; case_id?: string; id?: string };
  let caseId = json.caseId ?? json.case_id ?? json.id ?? null;
  if (!caseId) {
    await page.waitForURL(/\/cases\/[0-9a-f-]{36}/i, { timeout: 30_000 }).catch(() => undefined);
    caseId = page.url().match(/\/cases\/([0-9a-f-]{36})/i)?.[1] ?? null;
  }
  return caseId;
}

async function collectTab(page: Page, caseId: string, tab: string): Promise<string> {
  await page.goto(`${BASE}/cases/${caseId}?tab=${tab}&controlRoom=1`, { waitUntil: "domcontentloaded" });
  const deadline = Date.now() + 90_000;
  let last = "";
  while (Date.now() < deadline) {
    last = await page.locator("body").innerText();
    const stillLoading = /loading case overview|case overview will appear/i.test(last);
    const hasDesk =
      /what is this case saying|on the file|charge not on papers|five answers|evidence truth/i.test(last);
    if (!stillLoading && hasDesk) return last;
    await page.waitForTimeout(1_000);
  }
  return last || page.locator("body").innerText();
}

function score(spec: CaseSpec, hay: string): Omit<CaseResult, "id" | "accused" | "caseId" | "account"> {
  const chargeOk = spec.expectCharge.test(hay);
  const courtOk = spec.expectCourt ? spec.expectCourt.test(hay) : true;
  const hearingOk = spec.expectHearing ? spec.expectHearing.test(hay) : true;
  const leak = spec.forbid.test(hay);
  const onTheFile = /on the file/i.test(hay);
  const ok = chargeOk && courtOk && !leak;
  const bits: string[] = [];
  if (!chargeOk) bits.push("charge miss");
  if (!courtOk) bits.push("court miss");
  if (!hearingOk) bits.push("hearing miss");
  if (leak) bits.push("wrong-family leak");
  return {
    chargeOk,
    courtOk,
    hearingOk,
    leak,
    onTheFile,
    verdict: ok ? "PASS" : "FAIL",
    detail: bits.join("; ") || "charge/court clean vs file",
    preview: hay.replace(/\s+/g, " ").slice(0, 420),
  };
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const pdfs = new Map<string, string>();
  for (const spec of CASES) {
    pdfs.set(spec.id, await ensurePdf(spec.source, spec.pdfName));
  }

  const freshEmail = `mixed.live.${Date.now()}@casebrain.qa.smoke`;
  let account = PRESET_EMAIL ?? freshEmail;
  let accountNote = "";

  const browser = await chromium.launch({ headless: HEADLESS, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const results: CaseResult[] = [];

  try {
    let signedIn = false;
    if (!SKIP_SIGNUP && !PRESET_EMAIL) {
      console.log(`Trying fresh signup ${freshEmail}`);
      const signup = await trySignUp(page, freshEmail);
      await shot(page, "00-signup.png");
      if (signup === "session") {
        signedIn = true;
        account = freshEmail;
        accountNote = "Fresh UI signup got a session.";
      } else if (signup === "confirm") {
        accountNote = "Fresh signup asked for email confirmation — no inbox on this VM. Fell back to existing smoke account.";
      } else {
        accountNote = "Fresh signup did not complete. Fell back to existing smoke account.";
      }
    } else {
      accountNote = PRESET_EMAIL ? `Used MIXED_LIVE_EMAIL=${PRESET_EMAIL}` : "Signup skipped.";
    }

    if (!signedIn) {
      account = PRESET_EMAIL ?? SMOKE_EMAIL;
      console.log(`Signing in as ${account}`);
      const ok = await signIn(page, account);
      await shot(page, "00-signin.png");
      if (!ok) throw new Error(`Sign-in failed for ${account}`);
    }

    for (const spec of CASES) {
      let caseId: string | null = RECHECK[spec.id] ?? null;
      if (caseId) {
        console.log(`Rechecking ${spec.title} case=${caseId}`);
      } else {
        console.log(`Uploading ${spec.title}…`);
      }
      try {
        if (!caseId) caseId = await uploadCase(page, spec, pdfs.get(spec.id)!);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("PAYWALL") && account !== SMOKE_EMAIL) {
          console.log("Paywall on fresh account — switching to smoke.");
          accountNote += " Fresh account hit paywall; remaining uploads used smoke.";
          const ok = await signIn(page, SMOKE_EMAIL);
          if (!ok) throw new Error("Smoke fallback sign-in failed");
          account = SMOKE_EMAIL;
          caseId = await uploadCase(page, spec, pdfs.get(spec.id)!);
        } else {
          results.push({
            id: spec.id,
            accused: spec.accused,
            caseId: null,
            account,
            chargeOk: false,
            courtOk: false,
            hearingOk: false,
            leak: false,
            onTheFile: false,
            verdict: "FAIL",
            detail: msg,
            preview: "",
          });
          continue;
        }
      }
      if (!caseId) {
        results.push({
          id: spec.id,
          accused: spec.accused,
          caseId: null,
          account,
          chargeOk: false,
          courtOk: false,
          hearingOk: false,
          leak: false,
          onTheFile: false,
          verdict: "FAIL",
          detail: "No caseId after upload",
          preview: "",
        });
        continue;
      }
      const overview = await collectTab(page, caseId, "overview");
      await shot(page, `${spec.id}-overview.png`);
      const court = await collectTab(page, caseId, "court");
      await shot(page, `${spec.id}-court.png`);
      const chase = await collectTab(page, caseId, "chase");
      await shot(page, `${spec.id}-chase.png`);
      const hay = [overview, court, chase].join("\n");
      const scored = score(spec, hay);
      results.push({
        id: spec.id,
        accused: spec.accused,
        caseId,
        account,
        ...scored,
      });
      console.log(`  ${spec.accused} ${scored.verdict} ${scored.detail} case=${caseId}`);
    }
  } finally {
    await browser.close();
  }

  const pass = results.filter((r) => r.verdict === "PASS").length;
  const rows = [
    "# Mixed realistic cases — live production vs file",
    "",
    `Base: ${BASE}`,
    `Account: ${account}`,
    `Account note: ${accountNote || "—"}`,
    "",
    "Opinion: mixed medium files (assault / drugs / drink-drive / theft). Not a 150-page Malik-Price dump.",
    "Production is the current live mouth, not the unreleased fact-record strip unless it already shows **On the file**.",
    "",
    "| Case | Charge | Court | Hearing | Leak | On the file | Verdict | Case id |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const r of results) {
    rows.push(
      `| ${r.accused} (${r.id}) | ${r.chargeOk ? "MATCH" : "MISS"} | ${r.courtOk ? "MATCH" : "MISS"} | ${r.hearingOk ? "MATCH" : "MISS"} | ${r.leak ? "LEAK" : "clean"} | ${r.onTheFile ? "yes" : "no"} | ${r.verdict} | ${r.caseId ?? "—"} |`,
    );
  }
  rows.push("");
  rows.push(`**Score:** ${pass}/${results.length} PASS`);
  rows.push("");
  for (const r of results) {
    rows.push(`## ${r.accused}`);
    rows.push("");
    rows.push(r.detail);
    rows.push("");
    rows.push("```");
    rows.push(r.preview || "(no preview)");
    rows.push("```");
    rows.push("");
  }
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, rows.join("\n"));
  console.log(rows.join("\n"));
  console.log(`\nWrote ${REPORT}`);
  if (results.some((r) => r.verdict === "FAIL")) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
