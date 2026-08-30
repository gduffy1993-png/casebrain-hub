/**
 * Sign in as the owner account and check cases already on the desk.
 * Does not upload.
 *
 *   MIXED_LIVE_EMAIL=gduffy1993@gmail.com npx tsx scripts/owner-existing-pdfs-check.ts
 */
import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "@playwright/test";

const ROOT = process.cwd();
const BASE = (process.env.MIXED_LIVE_BASE_URL ?? "https://www.casebrain.co.uk").replace(/\/$/, "");
const EMAIL = process.env.MIXED_LIVE_EMAIL?.trim() || "gduffy1993@gmail.com";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "ProdSmokeOnly!Jun2026";
const OUT_DIR = path.join(ROOT, "artifacts", "as-is-freeze", "owner-existing-pdfs");
const REPORT = path.join(ROOT, "artifacts", "as-is-freeze", "owner-existing-pdfs-check.md");
const ARTIFACT_SHOTS = "/opt/cursor/artifacts/screenshots";

type CaseRow = {
  id?: string;
  title?: string | null;
  client_name?: string | null;
  allegation?: string | null;
  court?: string | null;
  practice_area?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

async function fillAuth(page: Page): Promise<void> {
  const emailBox = page.getByLabel(/work email/i);
  const passBox = page.getByLabel(/password/i);
  await emailBox.waitFor({ timeout: 20_000 });
  await emailBox.click();
  await emailBox.fill("");
  await emailBox.pressSequentially(EMAIL, { delay: 12 });
  await passBox.click();
  await passBox.fill("");
  await passBox.pressSequentially(PASSWORD, { delay: 8 });
}

async function signIn(page: Page): Promise<void> {
  await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await fillAuth(page);
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

async function shot(page: Page, name: string): Promise<string> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_SHOTS, { recursive: true });
  const dest = path.join(OUT_DIR, name);
  await page.screenshot({ path: dest, fullPage: true }).catch(() => undefined);
  const copy = path.join(ARTIFACT_SHOTS, name);
  try {
    fs.copyFileSync(dest, copy);
  } catch {
    /* ignore */
  }
  return dest;
}

async function listCases(page: Page): Promise<CaseRow[]> {
  const raw = await page.evaluate(async () => {
    const res = await fetch("/api/cases", { credentials: "include", cache: "no-store" });
    const text = await res.text();
    return { status: res.status, text };
  });
  if (raw.status !== 200) throw new Error(`GET /api/cases ${raw.status} ${raw.text.slice(0, 200)}`);
  const parsed = JSON.parse(raw.text) as { cases?: CaseRow[] } | CaseRow[];
  return Array.isArray(parsed) ? parsed : parsed.cases ?? [];
}

async function listDocs(page: Page, caseId: string): Promise<{ name?: string; id?: string }[]> {
  const raw = await page.evaluate(async (id) => {
    const res = await fetch(`/api/cases/${id}/documents`, { credentials: "include", cache: "no-store" });
    const text = await res.text();
    return { status: res.status, text };
  }, caseId);
  if (raw.status !== 200) return [];
  const parsed = JSON.parse(raw.text) as { documents?: { name?: string; id?: string }[] } | { name?: string }[];
  return Array.isArray(parsed) ? parsed : parsed.documents ?? [];
}

async function collectOverview(page: Page, caseId: string): Promise<string> {
  await page.goto(`${BASE}/cases/${caseId}?tab=overview&controlRoom=1`, { waitUntil: "domcontentloaded" });
  const deadline = Date.now() + 45_000;
  let last = "";
  while (Date.now() < deadline) {
    last = await page.locator("body").innerText();
    const loading = /loading case overview|case overview will appear/i.test(last);
    if (!loading && /charge|court|hearing|on the file|not safely|overview/i.test(last)) return last;
    await page.waitForTimeout(800);
  }
  return last || page.locator("body").innerText();
}

function guessKnown(hay: string, title: string, docs: string): string {
  const blob = `${title}\n${docs}\n${hay}`;
  if (/taylor brookes|protection from harassment act 1997|s\.?\s*2.*harassment/i.test(blob)) return "taylor-harassment";
  if (/jordan hale|assault an emergency worker|assaults on emergency workers/i.test(blob)) return "jordan-aew";
  if (/amara okafor|class b|misuse of drugs act 1971/i.test(blob)) return "okafor-drugs";
  if (/daniel clarke|road traffic act 1988|prescribed limit/i.test(blob)) return "clarke-motoring";
  if (/ashleigh merritt|theft act 1968/i.test(blob)) return "merritt-theft";
  if (/\bpike\b|section 20.*oapa|grievous bodily harm/i.test(blob)) return "pike-gbh";
  if (/priya nguyen|common assault.*criminal justice act/i.test(blob)) return "nguyen-assault";
  return "unknown";
}

function scoreKnown(kind: string, hay: string): { charge: string; hearing: string; leak: string; notes: string } {
  if (kind === "jordan-aew") {
    const charge = /assault an emergency worker/i.test(hay) ? "MATCH" : "MISS";
    const hearing = /22 Jul|22 July/i.test(hay) ? "MATCH listing" : /12 Mar/i.test(hay) ? "OFFENCE DATE not listing" : "MISS";
    const leak = /\bpwits\b|intent to supply|theft act/i.test(hay) ? "LEAK" : "clean";
    return { charge, hearing, leak, notes: "File lists PTPH 22 Jul 2026." };
  }
  if (kind === "okafor-drugs") {
    return {
      charge: /class b|possession of a controlled drug/i.test(hay) ? "MATCH" : "MISS",
      hearing: /3 Oct/i.test(hay) ? "MATCH" : "MISS",
      leak: /\bpwits\b|intent to supply/i.test(hay) ? "LEAK" : "clean",
      notes: "Must stay possession, not PWITS.",
    };
  }
  if (kind === "clarke-motoring") {
    return {
      charge: /road traffic|prescribed limit|drink.?driv/i.test(hay) ? "MATCH" : "MISS",
      hearing: /12 Sep/i.test(hay) ? "MATCH" : "MISS",
      leak: /\bpwits\b|gbh|section 20/i.test(hay) ? "LEAK" : "clean",
      notes: "Charge is on the source file.",
    };
  }
  if (kind === "merritt-theft") {
    return {
      charge: /theft act 1968|theft,? contrary/i.test(hay) ? "MATCH" : "MISS",
      hearing: /14 May 2024/i.test(hay) ? "MATCH" : "MISS",
      leak: /\bpwits\b|gbh/i.test(hay) ? "LEAK" : "clean",
      notes: "",
    };
  }
  if (kind === "taylor-harassment") {
    return {
      charge: /harassment|protection from harassment/i.test(hay) ? "MATCH" : "MISS",
      hearing: /15 Jul/i.test(hay) ? "MATCH" : "other",
      leak: /\bpwits\b|gbh|class a/i.test(hay) ? "LEAK" : "clean",
      notes: "",
    };
  }
  return { charge: "n/a", hearing: "n/a", leak: /\bpwits\b.*gbh/i.test(hay) ? "?" : "n/a", notes: "Not one of the mixed QA files." };
}

async function main(): Promise<void> {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const lines: string[] = [
    "# Owner account — existing PDFs, no new upload",
    "",
    `Account: ${EMAIL}`,
    `Base: ${BASE}`,
    "",
  ];

  try {
    await signIn(page);
    await page.goto(`${BASE}/court-today`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await shot(page, "owner_court_today.png");

    const cases = await listCases(page);
    fs.writeFileSync(
      path.join(OUT_DIR, "cases.json"),
      JSON.stringify(
        cases.map((c) => ({
          id: c.id,
          title: c.title,
          client_name: c.client_name,
          allegation: c.allegation,
          court: c.court,
          updated_at: c.updated_at,
        })),
        null,
        2,
      ),
    );
    lines.push(`Cases on desk: **${cases.length}**`);
    lines.push("");
    lines.push("| Title / client | Docs | Guess | Charge | Hearing | Leak | Case id |");
    lines.push("|---|---|---|---|---|---|---|");

    const cap = Math.min(cases.length, 12);
    for (let i = 0; i < cap; i++) {
      const c = cases[i];
      const id = c.id;
      if (!id) continue;
      const docs = await listDocs(page, id);
      const docNames = docs.map((d) => d.name).filter(Boolean).join(", ");
      const hay = await collectOverview(page, id);
      await shot(page, `owner_case_${i + 1}_${id.slice(0, 8)}.png`);
      const kind = guessKnown(hay, `${c.title ?? ""} ${c.client_name ?? ""}`, docNames);
      const scored = scoreKnown(kind, hay);
      const label = (c.title || c.client_name || "untitled").replace(/\|/g, "/");
      lines.push(
        `| ${label} | ${docNames || docs.length || "—"} | ${kind} | ${scored.charge} | ${scored.hearing} | ${scored.leak} | ${id} |`,
      );
      console.log(`${i + 1}/${cap} ${label} docs=${docNames || docs.length} guess=${kind} charge=${scored.charge}`);
    }
    if (cases.length > cap) lines.push("", `Only first ${cap} cases opened.`);
  } finally {
    await browser.close();
  }

  fs.writeFileSync(REPORT, `${lines.join("\n")}\n`);
  console.log(lines.join("\n"));
  console.log(`Wrote ${REPORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
