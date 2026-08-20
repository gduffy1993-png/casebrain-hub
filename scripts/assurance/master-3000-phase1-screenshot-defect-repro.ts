/**
 * Master 3000 Release Assurance — Phase 1
 * Reproduce screenshot-derived defect classes against frozen product HEAD.
 * Seed matter: Isaac Patel (live ID via env). Do NOT hard-code into production.
 *
 *   npx tsx scripts/assurance/master-3000-phase1-screenshot-defect-repro.ts
 *
 * Env:
 *   CB_PREVIEW_BASE_URL
 *   CB_QA_EMAIL / CB_QA_PASSWORD
 *   CB_ISAAC_CASE_ID (default known workspace id)
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const OUT_DIR = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-release-assurance",
);

const DEFAULT_BASE =
  "https://casebrain-hub-git-programme-rea-33bd05-gduffy1993-pngs-projects.vercel.app";
const DEFAULT_CASE_ID = "7e763777-94a8-4958-a190-a35ef6ddb259";

type Classification =
  | "CONFIRMED_LIVE_SHARED_DEFECT"
  | "STALE_HISTORICAL_OUTPUT_ONLY"
  | "AUDITOR_FALSE_POSITIVE"
  | "TRUTH_AMBIGUOUS_REQUIRES_REVIEW"
  | "EXPECTED_ACCEPTABLE_BEHAVIOUR"
  | "COVERAGE_GAP_ONLY"
  | "NOT_OBSERVED";

type Finding = {
  id: string;
  title: string;
  invariantId: string;
  severity: "P0" | "P1" | "P2";
  classification: Classification;
  sourceTruth: string;
  observed: Record<string, unknown>;
  evidenceSnippets: string[];
  notes: string;
};

function loadLocalEnv(): void {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(ROOT, name);
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

function gitHead(): string {
  try {
    const { execFileSync } = require("node:child_process") as typeof import("node:child_process");
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function snippet(text: string, re: RegExp, max = 220): string[] {
  const out: string[] = [];
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  const g = new RegExp(re.source, flags);
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) && out.length < 6) {
    const start = Math.max(0, m.index - 60);
    const end = Math.min(text.length, m.index + m[0].length + 80);
    out.push(text.slice(start, end).replace(/\s+/g, " ").trim());
  }
  return out;
}

function countMatches(text: string, re: RegExp): number {
  const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
  return [...text.matchAll(new RegExp(re.source, flags))].length;
}

async function pageText(page: Page): Promise<string> {
  return page.evaluate(() => document.body?.innerText ?? "");
}

function authCookieForSession(
  supabaseUrl: string,
  session: { access_token: string; refresh_token: string },
): { name: string; value: string } {
  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return { name: `sb-${ref}-auth-token`, value: `base64-${payload}` };
}

const TAB_MAP: Record<string, string> = {
  overview: "overview",
  court: "today",
  papers: "papers",
  client: "summary",
  "cps-chase": "chase",
  file: "papers",
};

async function gotoSurface(page: Page, base: string, caseId: string, surface: string): Promise<string> {
  const tab = TAB_MAP[surface] ?? surface;
  const url = `${base}/cases/${caseId}?tab=${tab}&controlRoom=1`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const text = await pageText(page);
    const loading =
      /Loading case overview|Building matter brief|Loading papers|Loading (court-prep|disclosure chase|matter|workspace)/i.test(
        text,
      );
    if (!loading && text.length > 600) return text;
    await page.waitForTimeout(2000);
  }
  return pageText(page);
}

function inspectCanonical(canonical: any) {
  const items =
    canonical?.evidenceState?.items ??
    canonical?.evidenceState?.rows ??
    canonical?.evidenceRows ??
    [];
  const rows = Array.isArray(items) ? items : [];
  const interviewish = rows.filter((r: any) =>
    /interview|transcript|recording|pace/i.test(JSON.stringify(r)),
  );
  const cctv = rows.filter((r: any) => /cctv/i.test(JSON.stringify(r)));
  const audio999 = rows.filter((r: any) =>
    /\b999\b|control[- ]?room|bwv/i.test(JSON.stringify(r)),
  );
  const mg11 = rows.filter((r: any) => /mg11/i.test(JSON.stringify(r)));
  const continuity = rows.filter((r: any) => /continuit/i.test(JSON.stringify(r)));
  return {
    rowCount: rows.length,
    interviewish: interviewish.map((r: any) => ({
      label: r.label ?? r.title ?? r.displayLabel ?? r.family,
      existence: r.existence ?? r.state ?? r.serviceState ?? r.status,
      modality: r.modality ?? r.modalityKind,
      family: r.family ?? r.evidenceFamily,
    })),
    cctv: cctv.slice(0, 12).map((r: any) => ({
      label: r.label ?? r.title ?? r.displayLabel,
      existence: r.existence ?? r.state ?? r.serviceState,
    })),
    audio999: audio999.slice(0, 12).map((r: any) => ({
      label: r.label ?? r.title ?? r.displayLabel,
      existence: r.existence ?? r.state ?? r.serviceState,
    })),
    mg11: mg11.slice(0, 12).map((r: any) => ({
      label: r.label ?? r.title ?? r.displayLabel,
      existence: r.existence ?? r.state ?? r.serviceState,
      role: r.entityRole ?? r.role ?? r.speakerRole,
    })),
    continuity: continuity.slice(0, 8).map((r: any) => ({
      label: r.label ?? r.title ?? r.displayLabel,
      existence: r.existence ?? r.state ?? r.serviceState,
    })),
  };
}

async function main() {
  loadLocalEnv();
  mkdirSync(OUT_DIR, { recursive: true });

  const base = (process.env.CB_PREVIEW_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  const caseId = process.env.CB_ISAAC_CASE_ID?.trim() || DEFAULT_CASE_ID;
  const email = process.env.CB_QA_EMAIL?.trim();
  const password = process.env.CB_QA_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("CB_QA_EMAIL and CB_QA_PASSWORD are required");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing Supabase public env");

  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const signIn = await sb.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session) {
    throw new Error(`signIn failed: ${signIn.error?.message ?? "no session"}`);
  }
  const session = signIn.data.session;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const cookie = authCookieForSession(url, session);
  await context.addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      domain: new URL(base).hostname,
      path: "/",
      httpOnly: false,
      secure: base.startsWith("https"),
      sameSite: "Lax",
    },
  ]);

  const page = await context.newPage();
  await page.goto(`${base}/cases`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);

  // API pull with bearer
  const bundleRes = await page.request.get(`${base}/api/criminal/${caseId}/bundle-source`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const bundleStatus = bundleRes.status();
  const bundleJson = bundleStatus >= 200 && bundleStatus < 300 ? await bundleRes.json() : null;
  const canonical = bundleJson?.canonical ?? bundleJson?.data?.canonical ?? bundleJson;
  const canonInspect = inspectCanonical(canonical);

  const surfaces: Record<string, string> = {};
  for (const tab of ["overview", "court", "papers", "client", "cps-chase"]) {
    try {
      surfaces[tab] = await gotoSurface(page, base, caseId, tab);
    } catch (e) {
      surfaces[tab] = `ERROR: ${(e as Error).message}`;
    }
  }
  // File surface: same shell, papers tab is closest structured inventory exit for this seed.
  surfaces.file = surfaces.papers ?? "";

  const allText = Object.values(surfaces).join("\n---\n");
  const client = surfaces.client ?? "";
  const chase = surfaces["cps-chase"] ?? "";
  const court = surfaces.court ?? "";
  const overview = surfaces.overview ?? "";

  const findings: Finding[] = [];

  // 1A interview modality inversion
  {
    const transcriptServedUi =
      /transcript[^\n.]{0,40}served|recording state missing[^\n.]{0,40}transcript state served|transcript\s*:\s*served/i.test(
        allText,
      );
    const recordingMissingUi = /recording[^\n.]{0,40}missing|recording state missing/i.test(allText);
    const canonTranscript = canonInspect.interviewish.filter((r) => /transcript/i.test(String(r.label)));
    const canonRecording = canonInspect.interviewish.filter((r) =>
      /recording|audio/i.test(String(r.label)),
    );
    const transcriptServedCanon = canonTranscript.some((r) => /served/i.test(String(r.existence)));
    const transcriptOutstandingCanon = canonTranscript.some((r) =>
      /missing|outstanding|not.?served|absent/i.test(String(r.existence)),
    );
    const interviewTranscriptRowServed = canonInspect.interviewish.some(
      (r) =>
        /^Interview transcript$/i.test(String(r.label ?? "")) &&
        /served/i.test(String(r.existence)),
    );
    const mg6TranscriptOutstanding = canonInspect.interviewish.some(
      (r) =>
        /interview transcript/i.test(String(r.label ?? "")) &&
        /outstanding|missing/i.test(String(r.label ?? "") + String(r.existence ?? "")),
    );
    // Source truth: full transcript not served. Canonical row "Interview transcript"=served is inversion.
    const inverted =
      interviewTranscriptRowServed ||
      (transcriptServedCanon && mg6TranscriptOutstanding) ||
      (transcriptServedUi && (mg6TranscriptOutstanding || transcriptOutstandingCanon)) ||
      (recordingMissingUi && transcriptServedUi);
    findings.push({
      id: "1A",
      title: "Interview modality/state inversion",
      invariantId: "CB-HIST-INTERVIEW-MODALITY-STATE-CANNOT-INVERT",
      severity: "P0",
      classification: inverted
        ? "CONFIRMED_LIVE_SHARED_DEFECT"
        : transcriptServedUi
          ? "TRUTH_AMBIGUOUS_REQUIRES_REVIEW"
          : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth:
        "Source: interview summary available; full interview recording/transcript not served.",
      observed: {
        transcriptServedUi,
        recordingMissingUi,
        transcriptServedCanon,
        transcriptOutstandingCanon,
        interviewTranscriptRowServed,
        mg6TranscriptOutstanding,
        interviewish: canonInspect.interviewish,
      },
      evidenceSnippets: [
        ...snippet(client, /transcript|recording/i),
        ...snippet(overview, /transcript|recording|interview/i),
      ],
      notes: inverted
        ? "Canonical Interview transcript marked served while MG6/source requires outstanding/not served."
        : "No clear live inversion observed on current HEAD, or not present on exercised surfaces.",
    });
  }

  // 1B CAD → 999
  {
    const compoundCad999Label =
      /CAD\s*\/\s*999\s+audio\s*\/\s*control-room material/i.test(overview + chase + court);
    const has999Chase = /999.{0,60}(audio|recording).{0,40}(outstanding|missing|request)/i.test(
      chase + overview,
    );
    const cadCreates999 =
      compoundCad999Label ||
      (/(999|control[- ]?room).{0,40}(outstanding|missing|chase)/i.test(allText) &&
        /CAD/i.test(allText) &&
        !/\b999\b.{0,40}(outstanding|not\s+attached|missing)/i.test(
          // Prefer not to treat CAD-only compound as stale.
          "",
        ));
    findings.push({
      id: "1B",
      title: "CAD mention must not create 999/control-room material",
      invariantId: "CB-HIST-CAD-MENTION-NOT-999-OUTSTANDING",
      severity: "P1",
      classification: compoundCad999Label || has999Chase
        ? "CONFIRMED_LIVE_SHARED_DEFECT"
        : cadCreates999 && canonInspect.audio999.length > 0
          ? "CONFIRMED_LIVE_SHARED_DEFECT"
          : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth: "CAD timing mention ≠ 999/control-room audio outstanding.",
      observed: {
        compoundCad999Label,
        cadCreates999,
        has999Chase,
        audio999Canon: canonInspect.audio999,
      },
      evidenceSnippets: [
        ...snippet(allText, /999|control[- ]?room|CAD/i),
      ],
      notes: "Flag compound CAD/999 Overview/chase labels and invented 999 outstanding from CAD timing alone.",
    });
  }

  // 1C witness MG11 → complainant
  {
    const complainantMg11 = /complainant.{0,40}MG11|MG11.{0,40}complainant/i.test(allText);
    findings.push({
      id: "1C",
      title: "Witness/MG11 role firewall",
      invariantId: "CB-HIST-WITNESS-MG11-NOT-COMPLAINANT-WITHOUT-ROLE",
      severity: "P1",
      classification: complainantMg11
        ? "CONFIRMED_LIVE_SHARED_DEFECT"
        : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth: "Signed final MG11 outstanding ≠ complainant MG11 without role source.",
      observed: { complainantMg11, mg11Canon: canonInspect.mg11 },
      evidenceSnippets: snippet(allText, /MG11|complainant/i),
      notes: "Confirmed only when complainant attribution appears without role source.",
    });
  }

  // 1D offence-family invent evidence
  {
    const bwvHits = [
      ...allText.matchAll(/\b(?:CCTV\/BWV|BWV)\b[^.\n]{0,80}/gi),
    ].map((m) => m[0]);
    const inventingBwv = bwvHits.some(
      (s) =>
        /(outstanding|missing|chase|remain)/i.test(s) &&
        !/does not invent|only where the papers support|conditional on served/i.test(s),
    );
    const invented = {
      bwv: inventingBwv,
      phone: /phone download|full phone.{0,30}(outstanding|missing)/i.test(allText),
      medical: /medical (report|records).{0,40}(outstanding|missing)/i.test(allText),
    };
    const any = invented.bwv || invented.phone || invented.medical;
    findings.push({
      id: "1D",
      title: "Media expectation firewall",
      invariantId: "CB-HIST-OFFENCE-FAMILY-CANNOT-INVENT-EVIDENCE-FAMILY",
      severity: "P1",
      classification: any ? "CONFIRMED_LIVE_SHARED_DEFECT" : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth: "Affray/violence shape cannot invent BWV/999/phone/medical without source.",
      observed: { ...invented, bwvHits: bwvHits.slice(0, 6) },
      evidenceSnippets: snippet(allText, /\bBWV\b|CCTV\/BWV|phone download|medical/i),
      notes: "Ignore safety copy that says CaseBrain does not invent BWV.",
    });
  }

  // 1E referred/to-check ≠ missing
  {
    const continuityMissing = /continuit[^\n.]{0,50}(missing|outstanding)/i.test(allText);
    const continuityCheck = /continuit[^\n.]{0,50}(check|referred|verif)/i.test(allText);
    findings.push({
      id: "1E",
      title: "Referred/to-check ≠ missing/outstanding",
      invariantId: "CB-HIST-REFERRED-OR-TO-CHECK-NOT-MISSING",
      severity: "P1",
      classification:
        continuityMissing && continuityCheck
          ? "CONFIRMED_LIVE_SHARED_DEFECT"
          : continuityMissing
            ? "TRUTH_AMBIGUOUS_REQUIRES_REVIEW"
            : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth: "Continuity note to be checked may be verification, not missing.",
      observed: { continuityMissing, continuityCheck, continuityCanon: canonInspect.continuity },
      evidenceSnippets: snippet(allText, /continuit/i),
      notes: "",
    });
  }

  // 1F practitioner consideration → case theory
  {
    const liveDefence = /self-defence remains live|self-defence is live|injury\/causation is a live/i.test(
      allText,
    );
    const considerOnly = /consider whether self-defence|self-defence may arise/i.test(allText);
    findings.push({
      id: "1F",
      title: "Practitioner consideration ≠ case theory",
      invariantId: "CB-HIST-PRACTITIONER-CONSIDERATION-NOT-CASE-THEORY",
      severity: "P1",
      classification: liveDefence
        ? "CONFIRMED_LIVE_SHARED_DEFECT"
        : considerOnly
          ? "EXPECTED_ACCEPTABLE_BEHAVIOUR"
          : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth: "No source establishing self-defence/injury/causation/first contact as live.",
      observed: { liveDefence, considerOnly },
      evidenceSnippets: snippet(allText, /self-defence|causation|first contact/i),
      notes: "",
    });
  }

  // 1G hearing date as chase deadline
  {
    const deadlineHearing =
      /Deadline[^\n]{0,40}25\s*Aug(ust)?\s*2026|Deadline:\s*Upcoming[^\n]{0,30}25/i.test(
        chase + overview,
      );
    const nextHearingLabel = /Next hearing[^\n]{0,40}25\s*Aug/i.test(chase + overview);
    findings.push({
      id: "1G",
      title: "Hearing date ≠ chase deadline",
      invariantId: "CB-HIST-HEARING-DATE-NOT-CHASE-DEADLINE",
      severity: "P1",
      classification: deadlineHearing
        ? "CONFIRMED_LIVE_SHARED_DEFECT"
        : nextHearingLabel
          ? "EXPECTED_ACCEPTABLE_BEHAVIOUR"
          : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth: "25 Aug 2026 is hearing date, not an established chase deadline.",
      observed: { deadlineHearing, nextHearingLabel },
      evidenceSnippets: snippet(chase + overview, /Deadline|Next hearing|25\s*Aug/i),
      notes: "",
    });
  }

  // 1H chase identity dedupe
  {
    const cctvHits = countMatches(chase, /master CCTV|CCTV master|full CCTV master/i);
    findings.push({
      id: "1H",
      title: "Chase identity dedupe",
      invariantId: "CB-HIST-CHASE-IDENTITY-DEDUP",
      severity: "P1",
      classification: cctvHits >= 2 ? "CONFIRMED_LIVE_SHARED_DEFECT" : "STALE_HISTORICAL_OUTPUT_ONLY",
      observed: { cctvMasterMentionsOnChase: cctvHits },
      sourceTruth: "One canonical CCTV-master requirement → one active chase identity.",
      evidenceSnippets: snippet(chase, /CCTV master|master CCTV|full CCTV/i),
      notes: "Heuristic: ≥2 Master CCTV mentions on chase surface suggests duplicate cards.",
    });
  }

  // 1I provenance degradation
  {
    const genericProv = /Crown\s*\/\s*disclosure officer \(confirm on file\)/i.test(allText);
    const exactCctv = /Full CCTV master/i.test(allText) && /MG6/i.test(allText);
    findings.push({
      id: "1I",
      title: "Exact provenance must not degrade to generic",
      invariantId: "CB-HIST-EXPLICIT-PROVENANCE-MUST-NOT-DEGRADE",
      severity: "P1",
      classification:
        genericProv && exactCctv
          ? "CONFIRMED_LIVE_SHARED_DEFECT"
          : genericProv
            ? "TRUTH_AMBIGUOUS_REQUIRES_REVIEW"
            : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth: "Where MG6/page known for Full CCTV master, retain exact provenance.",
      observed: { genericProv, exactCctv },
      evidenceSnippets: snippet(allText, /Crown\s*\/\s*disclosure|Full CCTV master|MG6/i),
      notes: "",
    });
  }

  // 1J explicit outstanding must survive
  {
    const nscOnExplicit = /full CCTV master[^\n.]{0,80}not safely confirmed/i.test(allText);
    findings.push({
      id: "1J",
      title: "Explicit source state must survive",
      invariantId: "CB-HIST-EXPLICIT-SOURCE-STATE-MUST-SURVIVE",
      severity: "P1",
      classification: nscOnExplicit
        ? "CONFIRMED_LIVE_SHARED_DEFECT"
        : "STALE_HISTORICAL_OUTPUT_ONLY",
      sourceTruth: "MG6 explicit outstanding → outstanding (not NSC absent conflict).",
      observed: { nscOnExplicit, cctvCanon: canonInspect.cctv },
      evidenceSnippets: snippet(allText, /full CCTV master|not safely confirmed/i),
      notes: "",
    });
  }

  const report = {
    programme: "master-3000-release-assurance",
    phase: "1-screenshot-defect-repro",
    recordedAt: new Date().toISOString(),
    productUnderTest: {
      head: gitHead(),
      previewBase: base,
      caseId,
      matterSeedLabel: "Isaac Patel (seed only; not a production branch)",
      bundleStatus,
    },
    canonicalInspect: canonInspect,
    surfaceLengths: Object.fromEntries(
      Object.entries(surfaces).map(([k, v]) => [k, v.length]),
    ),
    surfacePreviews: Object.fromEntries(
      Object.entries(surfaces).map(([k, v]) => [k, v.slice(0, 1200)]),
    ),
    findings,
    summary: {
      confirmed: findings.filter((f) => f.classification === "CONFIRMED_LIVE_SHARED_DEFECT").length,
      stale: findings.filter((f) => f.classification === "STALE_HISTORICAL_OUTPUT_ONLY").length,
      ambiguous: findings.filter((f) => f.classification === "TRUTH_AMBIGUOUS_REQUIRES_REVIEW")
        .length,
      expectedOk: findings.filter((f) => f.classification === "EXPECTED_ACCEPTABLE_BEHAVIOUR")
        .length,
    },
    authNote: "Credentials supplied via env; not stored in artefact.",
  };

  const outPath = path.join(OUT_DIR, "PHASE1-SCREENSHOT-REPRO.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report.summary, null, 2));
  console.log("wrote", outPath);
  for (const f of findings) {
    console.log(`${f.id} ${f.classification} ${f.title}`);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
