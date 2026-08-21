/**
 * File criminal corpus sweep — Chunk E0 find-only (File tab: header chrome + raw source extract).
 *
 * Projects File header identity + hearing/court chrome + raw extract presence vs PDF/source text.
 * Read-only w.r.t product behaviour / DB (service-role READ only).
 * Routes:
 *   BACKEND_LIVE              — reuse extracted_text already on eval/QA cases
 *   OFFLINE_FILE_PROJECTION  — extract PDF text + Client claim projectors
 *   SKIP                      — no text, corrupt, non-criminal, duplicate hash
 *
 * Resume:
 *   npx tsx scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts
 *   npx tsx scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts --limit=50
 *   npx tsx scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts --concurrency=6
 *
 * Reuse criminal unique index:
 *   FILE_SWEEP_REUSE_INDEX=1 FILE_SWEEP_INDEX_SRC=artifacts/.../court-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  PILOT_CHARGE_NOT_IDENTIFIED_LABEL,
  PILOT_COURT_NOT_IDENTIFIED_LABEL,
  displayPilotStripClient,
  displayPilotStripCourt,
  displayPilotStripHearing,
  resolvePilotChargeDisplay,
} from "@/components/criminal/workflow/workflowPilotDisplay";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { resolveCaseHeaderMetadata } from "@/lib/criminal/resolve-case-header-metadata";
import { resolveSolicitorHearingDateIso } from "@/lib/criminal/solicitor-hearing-display";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";

const ROOT = process.cwd();
const PRODUCT_SHA = process.env.F167_PRODUCT_SHA?.trim() || "b47ead423";
const PREVIEW =
  process.env.F167_PREVIEW?.replace(/\/$/, "") ||
  "https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app";
const DEFAULT_OUT = path.join(ROOT, "artifacts/casebrain-qa/assurance/file-criminal-sweep-v1");
const OUT_DIR = (() => {
  const raw = process.env.FILE_SWEEP_OUT_DIR?.trim();
  if (!raw) return DEFAULT_OUT;
  return path.isAbsolute(raw) ? raw : path.join(ROOT, raw);
})();
const MASTER_CSV = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/multicase-independent-review-v1/audit-pack/MASTER-CASE-INDEX.csv",
);
const INDEX_CSV = path.join(OUT_DIR, "CRIMINAL-UNIQUE-INDEX.csv");
const NDJSON = path.join(OUT_DIR, "file-sweep.ndjson");
const HITLIST_CSV = path.join(OUT_DIR, "FILE-FAIL-HITLIST.csv");
const STATUS_MD = path.join(OUT_DIR, "FILE-SWEEP-STATUS.md");
const CHECKPOINT = path.join(OUT_DIR, "checkpoint.json");
/** When set, reuse existing CRIMINAL-UNIQUE-INDEX.csv in OUT_DIR (or copy from this path). */
const REUSE_INDEX =
  process.env.FILE_SWEEP_REUSE_INDEX?.trim() === "1" ||
  Boolean(process.env.FILE_SWEEP_INDEX_SRC?.trim());

/** Known eval / legacy org that already holds many criminal docs — READ ONLY. */
const EVAL_ORG = process.env.FILE_SWEEP_EVAL_ORG || "11f3d373-a6d0-4a58-ac72-59b5365dc367";

const MAX_BUNDLE = 220_000;
const DEFAULT_CONCURRENCY = Math.max(1, Number(process.env.FILE_SWEEP_CONCURRENCY || 4));
const DEFAULT_LIMIT = Number(process.env.FILE_SWEEP_LIMIT || 0); // 0 = all remaining

type Route = "BACKEND_LIVE" | "OFFLINE_FILE_PROJECTION" | "SKIP";

type IndexRow = {
  unique_key: string;
  case_key: string;
  source_id: string;
  display_name: string;
  pdf_sha256: string;
  pdf_path: string;
  offence_family: string;
  strata_tags: string;
  gold_tier: string;
  pool: string;
  route: Route;
  skip_reason: string;
  backend_case_id: string;
  match_hint: string;
};

type SweepResult = {
  unique_key: string;
  case_key: string;
  source_id: string;
  pdf_sha256: string;
  route: Route;
  skip_reason?: string;
  backend_case_id?: string | null;
  productSha: string;
  preview: string;
  scoredAt: string;
  sourceChars: number;
  engineMs: number;
  ok: boolean;
  error?: string;
  fileClaims: string[];
  inventFlags: string[];
  muteFlags: string[];
  modalityFlags: string[];
  contradictionFlags: string[];
  dateRoleFlags: string[];
  materialFlags: string[];
  failReasons: string[];
  identityHints: {
    defendant?: string | null;
    offence?: string | null;
  };
  ledgerMeta: {
    materialCount: number;
    hearingRaw: string | null;
    hearingDateIso: string | null;
    charge: string | null;
  };
  evidence: {
    export_log_claim: boolean;
    export_log_source: boolean;
    cctv_master_claim: boolean;
    cctv_master_source: boolean;
    phone_download_claim: boolean;
    phone_download_source: boolean;
    cad_999_claim: boolean;
    cad_999_source: boolean;
    interview_recording_claim: boolean;
    interview_recording_source: boolean;
    subscriber_claim: boolean;
    subscriber_source: boolean;
    bwv_claim: boolean;
    bwv_source: boolean;
    bwv_full_export_claim: boolean;
    bwv_stills_source: boolean;
    mg_forms_source: boolean;
    id_procedure_source: boolean;
    charge_source: boolean;
    hearing_source: boolean;
  };
};

function applyEnvFile(envPath: string, opts?: { overrideKeys?: string[] }): void {
  if (!fs.existsSync(envPath)) return;
  const override = new Set(opts?.overrideKeys ?? []);
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || override.has(key)) process.env[key] = val;
  }
}

function loadLocalEnv(): void {
  // Worktree first (fill gaps), then hub override for service role — worktree key can be stale.
  applyEnvFile(path.join(ROOT, ".env.local"));
  applyEnvFile(path.join(ROOT, ".env"));
  applyEnvFile("C:\\Users\\gduff\\casebrain-hub\\.env.local", {
    overrideKeys: ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_URL"],
  });
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (q && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
      continue;
    }
    if (ch === "," && !q) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !q) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur);
      if (row.some((c) => c.length)) rows.push(row);
      row = [];
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.length || row.length) {
    row.push(cur);
    rows.push(row);
  }
  const header = rows[0] || [];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] || ""])));
}

function csvEscape(v: string): string {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function argFlag(name: string): string | null {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function writeStatus(partial: {
  verdict: string;
  totalUnique: number;
  backendLive: number;
  offline: number;
  skipped: number;
  scored: number;
  inventTotal: number;
  failHits?: number;
  topFamilies: Array<[string, number]>;
  note?: string;
  etaHint?: string;
}) {
  const md = `# FILE CRIMINAL SWEEP — STATUS

**Verdict:** \`${partial.verdict}\`
**Product SHA (frozen):** \`${PRODUCT_SHA}\`
**Preview:** ${PREVIEW}
**Branch tip (docs may be ahead):** recorded by runner at start
**Updated:** ${new Date().toISOString()}

## Counts

| Metric | N |
|--------|--:|
| Criminal unique (hash-deduped) | **${partial.totalUnique}** |
| Routed BACKEND_LIVE | ${partial.backendLive} |
| Routed OFFLINE_FILE_PROJECTION | ${partial.offline} |
| Routed SKIP | ${partial.skipped} |
| File scored (ndjson unique keys) | **${partial.scored}** |
| Invent-flag events (sum) | ${partial.inventTotal} |
| File-fail hitlist rows | ${partial.failHits ?? "—"} |

## Top invent / modality families (so far)

${
  partial.topFamilies.length
    ? partial.topFamilies.map(([k, n]) => `- **${k}**: ${n}`).join("\n")
    : "_none yet_"
}

## Method

1. Tip SHA \`${PRODUCT_SHA}\` — File tab find-only (no product edits)
2. Reuse Overview \`CRIMINAL-UNIQUE-INDEX.csv\` (2600 criminal unique)
3. Route BACKEND_LIVE (eval/legacy extracted_text READ) vs OFFLINE PDF projection vs SKIP
4. Claim surface = File header chrome (defendant/charge/court/hearing/stage) + raw extract presence
5. Cheap invent/mute/modality/date-role flags — **volume = triage, not guilt**
6. Crash-safe NDJSON append; resume skips completed \`unique_key\`
7. Emit \`FILE-FAIL-HITLIST.csv\`

## Resume

\`\`\`bash
FILE_SWEEP_REUSE_INDEX=1 FILE_SWEEP_OFFLINE_ONLY=1 FILE_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/overview-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \\
npx tsx scripts/assurance/file-criminal-sweep/run-file-criminal-sweep.ts --concurrency=6
\`\`\`

Pack: \`artifacts/casebrain-qa/assurance/file-criminal-sweep-v1/\`
Hitlist: \`artifacts/casebrain-qa/assurance/file-criminal-sweep-v1/FILE-FAIL-HITLIST.csv\`

${partial.note ? `\n## Note\n\n${partial.note}\n` : ""}${partial.etaHint ? `\n## ETA\n\n${partial.etaHint}\n` : ""}
`;
  fs.writeFileSync(STATUS_MD, md, "utf8");
}

function loadIndexFromCsv(csvPath: string): IndexRow[] {
  const rows = parseCsv(fs.readFileSync(csvPath, "utf8"));
  return rows.map((r) => ({
    unique_key: r.unique_key || "",
    case_key: r.case_key || "",
    source_id: r.source_id || "",
    display_name: r.display_name || "",
    pdf_sha256: r.pdf_sha256 || "",
    pdf_path: r.pdf_path || "",
    offence_family: r.offence_family || "",
    strata_tags: r.strata_tags || "",
    gold_tier: r.gold_tier || "",
    pool: r.pool || "criminal",
    route: (r.route as Route) || "OFFLINE_FILE_PROJECTION",
    skip_reason: r.skip_reason || "",
    backend_case_id: r.backend_case_id || "",
    match_hint: r.match_hint || "",
  }));
}

function resolveCriminalUniqueIndex(): IndexRow[] {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const src = process.env.FILE_SWEEP_INDEX_SRC?.trim();
  if (src) {
    const abs = path.isAbsolute(src) ? src : path.join(ROOT, src);
    if (!fs.existsSync(abs)) throw new Error(`FILE_SWEEP_INDEX_SRC missing: ${abs}`);
    if (path.resolve(abs) !== path.resolve(INDEX_CSV)) {
      fs.copyFileSync(abs, INDEX_CSV);
    }
    console.log("reusing_index", INDEX_CSV);
    return loadIndexFromCsv(INDEX_CSV);
  }
  if (REUSE_INDEX && fs.existsSync(INDEX_CSV)) {
    console.log("reusing_index", INDEX_CSV);
    return loadIndexFromCsv(INDEX_CSV);
  }
  return buildCriminalUniqueIndex();
}

function buildCriminalUniqueIndex(): IndexRow[] {
  if (!fs.existsSync(MASTER_CSV)) {
    throw new Error(`MASTER-CASE-INDEX missing: ${MASTER_CSV}`);
  }
  const rows = parseCsv(fs.readFileSync(MASTER_CSV, "utf8"));
  const criminal = rows.filter((r) => (r.pool || "").toLowerCase() === "criminal");
  const byHash = new Map<string, (typeof rows)[0]>();
  const noHash: typeof rows = [];
  for (const r of criminal) {
    const h = (r.pdf_sha256 || "").trim().toLowerCase();
    if (!h) {
      noHash.push(r);
      continue;
    }
    if (!byHash.has(h)) byHash.set(h, r);
  }
  // unique by hash + keep no-hash under case_key (still unique keys)
  const out: IndexRow[] = [];
  for (const r of byHash.values()) {
    const pdfPath = (r.pdf_path || "").trim();
    const pdfExists = pdfPath ? fs.existsSync(pdfPath) : false;
    const backend = (r.backend_case_id || "").trim();
    let route: Route = "OFFLINE_FILE_PROJECTION";
    let skip = "";
    if (backend) {
      route = "BACKEND_LIVE";
    } else if (!pdfExists) {
      // may still match backend by title later; provisional offline if path missing
      route = "OFFLINE_FILE_PROJECTION";
      if (!pdfPath) skip = "no_pdf_path";
      else skip = "pdf_path_missing_on_disk";
    }
    out.push({
      unique_key: `sha:${(r.pdf_sha256 || "").toLowerCase()}`,
      case_key: r.case_key || "",
      source_id: r.source_id || "",
      display_name: r.display_name || "",
      pdf_sha256: (r.pdf_sha256 || "").toLowerCase(),
      pdf_path: pdfPath,
      offence_family: r.offence_family || "",
      strata_tags: r.strata_tags || "",
      gold_tier: r.gold_tier || "",
      pool: "criminal",
      route,
      skip_reason: skip,
      backend_case_id: backend,
      match_hint: "",
    });
  }
  for (const r of noHash) {
    out.push({
      unique_key: `key:${r.case_key}`,
      case_key: r.case_key || "",
      source_id: r.source_id || "",
      display_name: r.display_name || "",
      pdf_sha256: "",
      pdf_path: (r.pdf_path || "").trim(),
      offence_family: r.offence_family || "",
      strata_tags: r.strata_tags || "",
      gold_tier: r.gold_tier || "",
      pool: "criminal",
      route: "SKIP",
      skip_reason: "missing_pdf_sha256",
      backend_case_id: (r.backend_case_id || "").trim(),
      match_hint: "",
    });
  }
  out.sort((a, b) => a.case_key.localeCompare(b.case_key));
  const header = [
    "unique_key",
    "case_key",
    "source_id",
    "display_name",
    "pdf_sha256",
    "pdf_path",
    "offence_family",
    "strata_tags",
    "gold_tier",
    "pool",
    "route",
    "skip_reason",
    "backend_case_id",
    "match_hint",
  ];
  const lines = [
    header.join(","),
    ...out.map((r) =>
      header
        .map((h) => csvEscape(String((r as Record<string, string>)[h] ?? "")))
        .join(","),
    ),
  ];
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(INDEX_CSV, lines.join("\n") + "\n", "utf8");
  return out;
}

function loadCompletedKeys(): Set<string> {
  const done = new Set<string>();
  if (!fs.existsSync(NDJSON)) return done;
  for (const line of fs.readFileSync(NDJSON, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as { unique_key?: string };
      if (o.unique_key) done.add(o.unique_key);
    } catch {
      /* skip corrupt line */
    }
  }
  return done;
}

type BackendCase = { id: string; title: string; org_id: string; text: string; chars: number };

async function loadBackendCorpus(
  supabase: SupabaseClient,
  extraCaseIds: string[] = [],
): Promise<{
  byId: Map<string, BackendCase>;
  byNeedle: Map<string, string>; // needle -> caseId
}> {
  const byId = new Map<string, BackendCase>();
  const byNeedle = new Map<string, string>();

  const pageSize = 1000;
  let from = 0;
  const cases: { id: string; title: string; org_id: string }[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("cases")
      .select("id,title,org_id")
      .eq("org_id", EVAL_ORG)
      .eq("is_archived", false)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    cases.push(...(data as any));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  // QA / canary cases referenced by index — READ by id regardless of org.
  const seen = new Set(cases.map((c) => c.id));
  const missingExtra = [...new Set(extraCaseIds.filter(Boolean))].filter((id) => !seen.has(id));
  for (let i = 0; i < missingExtra.length; i += 80) {
    const slice = missingExtra.slice(i, i + 80);
    const { data, error } = await supabase.from("cases").select("id,title,org_id").in("id", slice);
    if (error) throw error;
    for (const c of data ?? []) cases.push(c as any);
  }

  const setNeedle = (needle: string, caseId: string) => {
    const n = needle.toLowerCase().trim();
    if (!n || n.length < 4) return;
    // Prefer first exact registration; do not overwrite with later collisions.
    if (!byNeedle.has(n)) byNeedle.set(n, caseId);
  };

  for (let i = 0; i < cases.length; i += 80) {
    const slice = cases.slice(i, i + 80);
    const ids = slice.map((c) => c.id);
    const { data: docs, error } = await supabase
      .from("documents")
      .select("case_id,raw_text,extracted_text,name")
      .in("case_id", ids);
    if (error) throw error;
    const textByCase = new Map<string, string>();
    const namesByCase = new Map<string, string[]>();
    for (const d of docs ?? []) {
      const t = ((d as any).raw_text || (d as any).extracted_text || "").trim();
      if (t) {
        const prev = textByCase.get((d as any).case_id) || "";
        textByCase.set((d as any).case_id, prev ? `${prev}\n\n${t}` : t);
      }
      const nm = String((d as any).name || "");
      if (nm) {
        const arr = namesByCase.get((d as any).case_id) || [];
        arr.push(nm);
        namesByCase.set((d as any).case_id, arr);
      }
    }
    for (const c of slice) {
      const text = textByCase.get(c.id) || "";
      if (text.length < 200) continue;
      const bc: BackendCase = {
        id: c.id,
        title: c.title || "",
        org_id: c.org_id,
        text,
        chars: text.length,
      };
      byId.set(c.id, bc);
      const title = c.title || "";
      for (const m of title.matchAll(/\b(CB-[A-Z0-9][A-Z0-9\-_]{2,})\b/gi)) setNeedle(m[1], c.id);
      for (const m of title.matchAll(/\b(CB-TB-\d+)\b/gi)) setNeedle(m[1], c.id);
      for (const m of title.matchAll(/\b(RP-\d+)\b/gi)) setNeedle(m[1], c.id);
      for (const nm of namesByCase.get(c.id) || []) {
        for (const m of nm.matchAll(/\b(CB-[A-Z0-9][A-Z0-9\-_]{2,})\b/gi)) setNeedle(m[1], c.id);
        for (const m of nm.matchAll(/\b(CB-TB-\d+)\b/gi)) setNeedle(m[1], c.id);
      }
      // exact title lowercase as needle only if it looks like a case code
      if (/^cb-/i.test(title.trim())) setNeedle(title.trim(), c.id);
    }
  }

  return { byId, byNeedle };
}

function matchBackend(
  row: IndexRow,
  corpus: { byId: Map<string, BackendCase>; byNeedle: Map<string, string> },
): BackendCase | null {
  if (row.backend_case_id && corpus.byId.has(row.backend_case_id)) {
    return corpus.byId.get(row.backend_case_id)!;
  }
  const candidates: string[] = [];
  const sid = (row.source_id || "").trim();
  const key = (row.case_key || "").trim();
  if (sid) candidates.push(sid);
  if (key && /^CB-|^RP-|^ARDEN|^MONSTER|^ISAAC/i.test(key)) candidates.push(key);
  const pathHit = (row.pdf_path || "").match(/\b(CB-[A-Z0-9][A-Z0-9\-_]{2,})\b/i);
  if (pathHit) candidates.push(pathHit[1]);
  const fileHit = (row.pdf_path || "").match(/([^\\\/]+)\.pdf$/i);
  if (fileHit) {
    const stem = fileHit[1];
    const code = stem.match(/\b(CB-[A-Z0-9][A-Z0-9\-_]{2,})\b/i);
    if (code) candidates.push(code[1]);
  }
  for (const c of candidates) {
    const id = corpus.byNeedle.get(c.toLowerCase());
    if (id && corpus.byId.has(id)) return corpus.byId.get(id)!;
  }
  return null;
}

function scoreInvent(
  bundleText: string,
  claimBlob: string,
  materialCount: number,
  hearingRaw: string | null,
): Pick<
  SweepResult,
  | "inventFlags"
  | "muteFlags"
  | "modalityFlags"
  | "contradictionFlags"
  | "dateRoleFlags"
  | "materialFlags"
  | "failReasons"
  | "evidence"
> {
  const inventFlags: string[] = [];
  const muteFlags: string[] = [];
  const modalityFlags: string[] = [];
  const contradictionFlags: string[] = [];
  const dateRoleFlags: string[] = [];
  const materialFlags: string[] = [];

  const evidence = {
    export_log_claim: /\bexport\s+log\b/i.test(claimBlob),
    export_log_source: /\bexport\s*log\b/i.test(bundleText),
    cctv_master_claim: /CCTV master|full CCTV master|master footage|master recording/i.test(claimBlob),
    cctv_master_source: /CCTV master|full CCTV master|master footage|full master|full\s*(?:time\s+)?window|full\s+cctv\s+(?:master|window)/i.test(bundleText),
    phone_download_claim: /phone download|source export referred|digital extraction|original download|phone extraction/i.test(claimBlob),
    phone_download_source:
      /phone download|source export|handset download|digital extraction|extraction report|phone extraction|logical download|download report/i.test(bundleText),
    cad_999_claim: /\bCAD\b|999\s+audio|complete CAD/i.test(claimBlob),
    cad_999_source: /\bCAD\b|999\s+audio|CAD\/999|command and (?:dispatch|control)/i.test(bundleText),
    interview_recording_claim: /interview recording|PACE recording|audio.?visual interview/i.test(claimBlob),
    interview_recording_source:
      /interview recording|PACE recording|audio.?visual interview|\bROTI\b|full recording outstanding|summary only\s*\/\s*full recording|interview summary[^.\n]{0,40}full recording/i.test(
        bundleText,
      ),
    subscriber_claim: /subscriber|account (?:records?|data)/i.test(claimBlob),
    subscriber_source: /subscriber|account (?:records?|data)/i.test(bundleText),
    bwv_claim: /(?:^|[^A-Za-z])BWV(?![A-Za-z])|body[- ]worn/i.test(claimBlob),
    bwv_source: /(?:^|[^A-Za-z])BWV(?![A-Za-z])|body[- ]worn/i.test(bundleText),
    bwv_full_export_claim: /full (?:BWV|body[- ]worn).{0,40}export|BWV (?:clip|footage) export|full digital export/i.test(
      claimBlob,
    ),
    bwv_stills_source: /BWV stills|body[- ]worn.{0,40}stills|stills?.{0,40}BWV/i.test(bundleText),
    mg_forms_source: /\bMG\s?(?:5|6|9|11|12)\b|\bMG5\b|\bMG6\b|\bMG11\b/i.test(bundleText),
    id_procedure_source: /\bVIPER\b|identification parade|ID procedure|video identification/i.test(bundleText),
    charge_source: /\bcharge\b|information\/summons|appeared on charge/i.test(bundleText),
    hearing_source: /\bhearing\b|first appearance|PCM|PTPH|trial date/i.test(bundleText),
  };

  const thin = bundleText.length < 3500;
  const trapThin = /hallucination trap|do not invent|no pace interview transcript or summary/i.test(bundleText);
  const richSource =
    evidence.mg_forms_source ||
    evidence.cctv_master_source ||
    evidence.phone_download_source ||
    evidence.cad_999_source ||
    evidence.interview_recording_source ||
    /\bschedule\b|\bexhibit\b/i.test(bundleText);

  const isFileSurface = /FILE_SURFACE\s*\|\s*RAW_SOURCE_EXTRACT/i.test(claimBlob);

  // Evidence invent/mute only for non-File surfaces. File tab shows raw PDF extract —
  // family invent/mute vs chase labels is noise; score identity chrome instead.
  if (!isFileSurface) {
    if (materialCount === 0 && richSource && bundleText.length > 2500 && claimBlob.trim().length < 40) {
      muteFlags.push("mute_court_claim_collapse");
    }

    if (evidence.export_log_claim && !evidence.export_log_source) inventFlags.push("invent_export_log");
    if (evidence.cctv_master_claim && !evidence.cctv_master_source && (thin || trapThin || !/\bcctv\b/i.test(bundleText))) {
      inventFlags.push("invent_cctv_master");
    }
    if (evidence.phone_download_claim && !evidence.phone_download_source) {
      if (/\bphone\b/i.test(bundleText) && !/download|extraction|subscriber|handset dump/i.test(bundleText)) {
        inventFlags.push("invent_phone_download_from_property");
      } else {
        inventFlags.push("invent_phone_download");
      }
    }
    if (evidence.cad_999_claim && !evidence.cad_999_source) inventFlags.push("invent_cad_999");
    if (evidence.interview_recording_claim && !evidence.interview_recording_source) {
      inventFlags.push("invent_interview_recording");
    }
    if (evidence.subscriber_claim && !evidence.subscriber_source && thin) inventFlags.push("invent_subscriber_thin");
    if (evidence.bwv_claim && !evidence.bwv_source) inventFlags.push("invent_bwv");
    if (
      evidence.bwv_full_export_claim &&
      evidence.bwv_stills_source &&
      !/full (?:BWV|body[- ]worn).{0,40}export|BWV clip outstanding/i.test(bundleText)
    ) {
      inventFlags.push("invent_bwv_full_export_from_stills");
    }

    if (evidence.export_log_source && /outstanding|not attached|not served/i.test(bundleText) && !evidence.export_log_claim) {
      muteFlags.push("mute_export_log");
    }
    if (evidence.cctv_master_source && /outstanding|not served|not yet/i.test(bundleText) && !evidence.cctv_master_claim) {
      muteFlags.push("mute_cctv_master");
    }
    if (
      evidence.phone_download_source &&
      /outstanding|not served|referred/i.test(bundleText) &&
      !evidence.phone_download_claim
    ) {
      muteFlags.push("mute_phone_download");
    }
    if (evidence.cad_999_source && /outstanding|not attached|not served/i.test(bundleText) && !evidence.cad_999_claim) {
      muteFlags.push("mute_cad_999");
    }

    if (/\bstills?\b/i.test(bundleText) && evidence.cctv_master_claim && /CCTV outstanding(?! master)/i.test(claimBlob)) {
      modalityFlags.push("modality_stills_collapsed_to_generic_cctv");
    }
    if (/screenshot/i.test(bundleText) && evidence.phone_download_claim && !/screenshot/i.test(claimBlob)) {
      modalityFlags.push("modality_screenshot_vs_download");
    }
    if (/interview summary/i.test(bundleText) && evidence.interview_recording_claim) {
      modalityFlags.push("modality_summary_vs_recording");
    }
    if (/BLEED \| client_contains_court_control_language/i.test(claimBlob)) {
      materialFlags.push("client_court_language_bleed");
    }
    if (/BLEED \| client_contains_papers_inventory_chrome/i.test(claimBlob)) {
      materialFlags.push("client_papers_inventory_bleed");
    }
    if (/\bproperty\b.{0,40}\bphone\b|\bphone\b.{0,40}\bproperty\b/i.test(bundleText) && evidence.phone_download_claim) {
      modalityFlags.push("modality_property_phone_vs_download");
    }
    if (evidence.bwv_stills_source && evidence.bwv_full_export_claim) {
      modalityFlags.push("modality_bwv_stills_vs_full_export");
    }

    if (evidence.cctv_master_claim && /no CCTV|CCTV not|no master/i.test(claimBlob) && /master outstanding/i.test(claimBlob)) {
      contradictionFlags.push("contradict_cctv_master_present_and_absent");
    }
    if (evidence.export_log_claim && /no export log|export log not/i.test(claimBlob)) {
      contradictionFlags.push("contradict_export_log");
    }
  }

  // Date-role soft detectors (find-only triage — not guilt)
  if (hearingRaw && /deadline|chase by|ops deadline/i.test(claimBlob) && /hearing/i.test(hearingRaw)) {
    dateRoleFlags.push("date_role_hearing_reused_as_deadline_language");
  }
  if (hearingRaw && /\b20\d{2}-\d{2}-\d{2}\b/.test(hearingRaw) === false && /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/.test(hearingRaw)) {
    // informational only when claim also invents ISO — keep soft
    if (/hearing date passed/i.test(claimBlob)) dateRoleFlags.push("date_role_hearing_passed_chrome");
  }

  // File-tab identity mute / invent (header chrome vs PDF)
  const pdfHasDefendant =
    /\b(?:Accused|Defendant|Name of accused)\s*[:\-]?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3}\b/i.test(bundleText) ||
    /\bR\s*v\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/i.test(bundleText);
  const pdfHasCharge =
    /\b(?:Charge|Offence|Allegation|Statement of offence|Particulars of offence)\b/i.test(bundleText) ||
    /\b(?:Robbery|Affray|Theft|Burglary|Harassment|ABH|GBH|Assault|Wounding|Murder)\b/i.test(bundleText);
  const pdfHasCourt = /\b(?:Magistrates(?:'|’)?\s+Court|Crown\s+Court|Youth\s+Court)\b/i.test(bundleText);
  const pdfHasHearing =
    /\b(?:Next\s+hearing|Hearing\s+date|Listed\s+for|First\s+appearance|PCMH|PTPH|trial\s+listed)\b/i.test(bundleText) ||
    (/\bhearing\b/i.test(bundleText) && /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/.test(bundleText));
  const pdfHasStage =
    /\b(?:Stage|Case\s+stage|PTPH|PCMH|First\s+appearance|trial\s+listed|remand)\b/i.test(bundleText);

  if (/HEADER_DEFENDANT_MUTED\b/i.test(claimBlob) && pdfHasDefendant) {
    muteFlags.push("mute_defendant_despite_pdf");
  }
  if (/HEADER_CHARGE_MUTED\b/i.test(claimBlob) && pdfHasCharge) {
    muteFlags.push("mute_charge_despite_pdf");
  }
  if (/HEADER_COURT_MUTED\b/i.test(claimBlob) && pdfHasCourt) {
    muteFlags.push("mute_court_despite_pdf");
  }
  if (/HEADER_HEARING_MUTED\b/i.test(claimBlob) && pdfHasHearing) {
    muteFlags.push("mute_hearing_despite_pdf");
  }
  if (/HEADER_STAGE_MUTED\b/i.test(claimBlob) && pdfHasStage) {
    muteFlags.push("mute_stage_despite_pdf");
  }
  if (/HEADER_HEARING_STATUS\s*\|\s*Hearing date passed/i.test(claimBlob)) {
    dateRoleFlags.push("date_role_hearing_passed_as_ops_chrome");
  }
  // Invent: header shows a concrete identity string that PDF never supports (rare on File)
  const headerDefMatch = claimBlob.match(/HEADER_DEFENDANT\s*\|\s*([^\n]+)/i);
  const headerDefName = headerDefMatch?.[1]?.trim() || "";
  const pdfMentionsHeaderDefendant = (() => {
    if (!headerDefName || /HEADER_DEFENDANT_MUTED/i.test(claimBlob)) return true;
    const parts = headerDefName.split(/\s+/).filter((p) => p.length > 2);
    if (parts.length === 0) return true;
    return parts.every((p) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(bundleText));
  })();
  if (
    headerDefName &&
    !/HEADER_DEFENDANT_MUTED/i.test(claimBlob) &&
    !pdfMentionsHeaderDefendant &&
    !pdfHasDefendant &&
    bundleText.length > 800
  ) {
    inventFlags.push("invent_defendant_header");
  }
  const headerCourtMatch = claimBlob.match(/HEADER_COURT\s*\|\s*([^\n]+)/i);
  const headerCourtName = headerCourtMatch?.[1]?.trim() || "";
  if (
    headerCourtName &&
    !/HEADER_COURT_MUTED/i.test(claimBlob) &&
    !pdfHasCourt &&
    !new RegExp(headerCourtName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 40), "i").test(bundleText) &&
    bundleText.length > 800
  ) {
    inventFlags.push("invent_court_header");
  }

  if (evidence.charge_source) materialFlags.push("src_charge");
  if (evidence.hearing_source) materialFlags.push("src_hearing");
  if (evidence.mg_forms_source) materialFlags.push("src_mg_forms");
  if (evidence.id_procedure_source) materialFlags.push("src_id_procedure");
  if (/\bdefendant\b|\bparties\b|\bcomplainant\b/i.test(bundleText)) materialFlags.push("src_parties");
  if (/\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b|\b20\d{2}-\d{2}-\d{2}\b/.test(bundleText)) materialFlags.push("src_dates");
  if (/\bcctv\b/i.test(bundleText)) materialFlags.push("src_cctv");
  if (/\bstills?\b/i.test(bundleText)) materialFlags.push("src_cctv_stills");
  if (/\bcontinuity\b/i.test(bundleText)) materialFlags.push("src_continuity");
  if (materialCount > 0) materialFlags.push(`file_claims_${Math.min(materialCount, 40)}`);

  const failReasons = [
    ...inventFlags,
    ...muteFlags,
    ...modalityFlags,
    ...contradictionFlags,
    ...dateRoleFlags,
    ...materialFlags.filter((f) => /bleed/i.test(f)),
  ];
  return {
    inventFlags,
    muteFlags,
    modalityFlags,
    contradictionFlags,
    dateRoleFlags,
    materialFlags,
    failReasons,
    evidence,
  };
}

function projectFile(bundleTextRaw: string, title: string): {
  claims: string[];
  claimBlob: string;
  inventClaimBlob: string;
  identity: { defendant?: string | null; offence?: string | null };
  ledgerMeta: SweepResult["ledgerMeta"];
  engineMs: number;
} {
  const bundleText = bundleTextRaw.slice(0, MAX_BUNDLE);
  const t0 = Date.now();
  const ledger = buildBundleTruthLedger({ bundleText });
  const meta = extractBundleCaseMetadata(bundleText);
  const header = resolveCaseHeaderMetadata({
    snapshot: null,
    matter: null,
    bundleMetadata: meta,
    bundleHeader: {
      shortTitle: title || null,
      stage: meta.stage,
      accused: meta.defendantName,
    },
    truthLedger: ledger,
    bundleText,
  });

  const hearingIso = resolveSolicitorHearingDateIso({
    bundleNextHearingIso: meta.nextHearingIso ?? ledger.hearing?.dateIso ?? null,
    nextHearingRaw: meta.nextHearingRaw ?? ledger.hearing?.rawLiteral ?? null,
    bundleHay: bundleText,
  });
  const hearingResolved = resolveSolicitorHearingStatus({
    bundleNextHearingIso: meta.nextHearingIso ?? ledger.hearing?.dateIso ?? null,
    nextHearingRaw: meta.nextHearingRaw ?? ledger.hearing?.rawLiteral ?? null,
    bundleHay: bundleText,
    asOf: new Date("2026-08-21T12:00:00Z"),
  });

  const clientShown = displayPilotStripClient(header.clientLabel);
  const chargeShown = resolvePilotChargeDisplay(header.allegation, ledger.charge?.wording, title);
  const courtShown = displayPilotStripCourt(header.court) || "";
  const hearingLabelCandidate =
    displayPilotStripHearing(hearingResolved.dateLabel) ||
    displayPilotStripHearing(header.nextHearing) ||
    "";
  const hearingIsUnknown =
    hearingResolved.kind === "unknown" ||
    !hearingIso ||
    !hearingLabelCandidate ||
    /not safely|not on papers|no hearing date/i.test(hearingLabelCandidate) ||
    /not safely|not on papers/i.test(hearingResolved.statusLabel);

  const claims: string[] = [];
  if (clientShown) claims.push(`HEADER_DEFENDANT | ${clientShown}`);
  else claims.push(`HEADER_DEFENDANT_MUTED | Client name not safely extracted`);

  if (chargeShown && chargeShown !== PILOT_CHARGE_NOT_IDENTIFIED_LABEL) {
    claims.push(`HEADER_CHARGE | ${chargeShown}`);
  } else {
    claims.push(`HEADER_CHARGE_MUTED | ${PILOT_CHARGE_NOT_IDENTIFIED_LABEL}`);
  }

  if (courtShown) claims.push(`HEADER_COURT | ${courtShown}`);
  else claims.push(`HEADER_COURT_MUTED | ${PILOT_COURT_NOT_IDENTIFIED_LABEL}`);

  if (!hearingIsUnknown && hearingLabelCandidate) {
    claims.push(`HEADER_HEARING | ${hearingLabelCandidate}`);
  } else {
    claims.push(`HEADER_HEARING_MUTED | Hearing not on papers`);
  }

  claims.push(`HEADER_HEARING_STATUS | ${hearingResolved.statusLabel}`);
  if (hearingIso) claims.push(`HEADER_HEARING_ISO | ${hearingIso}`);

  const stage = (header.stage || meta.stage || "").trim();
  if (stage && !/not recorded|unknown|not safely/i.test(stage)) {
    claims.push(`HEADER_STAGE | ${stage}`);
  } else {
    claims.push(`HEADER_STAGE_MUTED | Stage not safely extracted`);
  }

  claims.push(`EXTRACT_CHARS | ${bundleText.length}`);
  claims.push(`FILE_SURFACE | RAW_SOURCE_EXTRACT`);
  // Light extract markers for invent detectors (File shows raw PDF text — invent of families is rare)
  const extractHead = bundleText.slice(0, 2500);
  if (/\bCCTV\b/i.test(extractHead)) claims.push(`EXTRACT_MARK | CCTV`);
  if (/\bBWV\b|body[- ]worn/i.test(extractHead)) claims.push(`EXTRACT_MARK | BWV`);
  if (/\bphone\b/i.test(extractHead)) claims.push(`EXTRACT_MARK | phone`);
  if (/\bCAD\b|999/i.test(extractHead)) claims.push(`EXTRACT_MARK | CAD`);
  if (/interview|PACE|ROTI/i.test(extractHead)) claims.push(`EXTRACT_MARK | interview`);

  const inventClaimBlob = claims.filter((c) => !/^DO_NOT\b/i.test(c)).join("\n");
  const claimBlob = claims.join("\n");
  const defendant = clientShown || ledger.defendant?.defendant || meta.defendantName || null;
  const offence =
    (chargeShown !== PILOT_CHARGE_NOT_IDENTIFIED_LABEL ? chargeShown : null) ||
    ledger.charge?.wording ||
    meta.offenceDisplay ||
    null;

  return {
    claims,
    claimBlob,
    inventClaimBlob,
    identity: { defendant, offence },
    ledgerMeta: {
      materialCount: claims.length,
      hearingRaw: meta.nextHearingRaw ?? ledger.hearing?.rawLiteral ?? null,
      hearingDateIso: hearingIso ?? ledger.hearing?.dateIso ?? null,
      charge: offence,
    },
    engineMs: Date.now() - t0,
  };
}

async function extractPdfText(pdfPath: string): Promise<{ text: string; error?: string }> {
  try {
    const buf = fs.readFileSync(pdfPath);
    const text = await extractTextFromFileBuffer(path.basename(pdfPath), "application/pdf", buf);
    if (!text || text.trim().length < 80) return { text: "", error: "empty_or_short_extract" };
    return { text };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/XRef|Invalid PDF|password|encrypt/i.test(msg)) return { text: "", error: `corrupt_or_protected:${msg.slice(0, 120)}` };
    return { text: "", error: msg.slice(0, 200) };
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, idx: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

function appendNdjson(row: SweepResult): void {
  fs.appendFileSync(NDJSON, JSON.stringify(row) + "\n", "utf8");
}

function tallyFromNdjson(): {
  scored: number;
  inventTotal: number;
  failHits: number;
  topFamilies: Array<[string, number]>;
  byRoute: Record<string, number>;
} {
  const fam = new Map<string, number>();
  const byRoute: Record<string, number> = {};
  const byKey = new Map<string, SweepResult>();
  let inventTotal = 0;
  let failHits = 0;
  if (!fs.existsSync(NDJSON)) return { scored: 0, inventTotal: 0, failHits: 0, topFamilies: [], byRoute };
  for (const line of fs.readFileSync(NDJSON, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as SweepResult;
      if (o.unique_key) byKey.set(o.unique_key, o);
    } catch {
      /* ignore */
    }
  }
  for (const o of byKey.values()) {
    byRoute[o.route] = (byRoute[o.route] || 0) + 1;
    const fails = [
      ...(o.inventFlags || []),
      ...(o.muteFlags || []),
      ...(o.modalityFlags || []),
      ...((o as any).contradictionFlags || []),
      ...((o as any).failReasons || []),
    ];
    const uniq = Array.from(new Set(fails));
    if (uniq.length || o.ok === false) failHits++;
    for (const f of o.inventFlags || []) {
      inventTotal++;
      fam.set(f, (fam.get(f) || 0) + 1);
    }
    for (const f of o.modalityFlags || []) fam.set(f, (fam.get(f) || 0) + 1);
    for (const f of o.muteFlags || []) fam.set(`mute:${f}`, (fam.get(`mute:${f}`) || 0) + 1);
    for (const f of (o as any).contradictionFlags || []) fam.set(`contra:${f}`, (fam.get(`contra:${f}`) || 0) + 1);
    for (const f of o.dateRoleFlags || []) fam.set(`date:${f}`, (fam.get(`date:${f}`) || 0) + 1);
  }
  const topFamilies = [...fam.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  return { scored: byKey.size, inventTotal, failHits, topFamilies, byRoute };
}

/** Emit File-fail hitlist for fix-queue triage. Volume ≠ guilt. */
function writeHitlist(): number {
  const header = [
    "unique_key",
    "case_key",
    "source_id",
    "pdf_sha256",
    "route",
    "backend_case_id",
    "severity",
    "fail_family",
    "fail_flags",
    "mute_flags",
    "modality_flags",
    "contradiction_flags",
    "material_flags",
    "source_chars",
    "error",
    "claim_sample",
  ];
  const rows: string[] = [header.join(",")];
  if (!fs.existsSync(NDJSON)) {
    fs.writeFileSync(HITLIST_CSV, rows.join("\n") + "\n", "utf8");
    return 0;
  }
  let n = 0;
  for (const line of fs.readFileSync(NDJSON, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    let o: SweepResult;
    try {
      o = JSON.parse(line) as SweepResult;
    } catch {
      continue;
    }
    const invent = o.inventFlags || [];
    const mute = o.muteFlags || [];
    const modality = o.modalityFlags || [];
    const contra = o.contradictionFlags || [];
    const dateRole = o.dateRoleFlags || [];
    const fails = Array.from(
      new Set([...(o.failReasons || []), ...invent, ...mute, ...modality, ...contra, ...dateRole]),
    );
    const isFail = fails.length > 0 || o.ok === false;
    if (!isFail) continue;
    n++;
    const family =
      invent[0] || modality[0] || mute[0] || dateRole[0] || contra[0] || (o.ok === false ? "engine_error" : "court_fail");
    rows.push(
      [
        o.unique_key,
        o.case_key,
        o.source_id,
        o.pdf_sha256,
        o.route,
        o.backend_case_id || "",
        o.ok === false
          ? "ERROR"
          : invent.length
            ? "INVENT"
            : modality.length
              ? "MODALITY"
              : mute.length
                ? "MUTE"
                : dateRole.length
                  ? "DATE_ROLE"
                  : contra.length
                    ? "CONTRADICTION"
                    : "FAIL",
        family,
        invent.join("|"),
        mute.join("|"),
        modality.join("|"),
        [...contra, ...dateRole].join("|"),
        (o.materialFlags || []).join("|"),
        String(o.sourceChars ?? ""),
        o.error || "",
        (o.fileClaims || []).slice(0, 3).join(" || ").slice(0, 240),
      ]
        .map((v) => csvEscape(String(v)))
        .join(","),
    );
  }
  fs.writeFileSync(HITLIST_CSV, rows.join("\n") + "\n", "utf8");
  return n;
}

function verdictLabel(complete: boolean, scored: number, total: number, blocked?: boolean): string {
  if (blocked) return "BLOCKED";
  if (complete) return "COMPLETE";
  if (scored > 0 && scored < total) return "PARTIAL";
  return "FILE_SWEEP_RUNNING";
}

async function main() {
  loadLocalEnv();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const indexOnly = hasFlag("index-only");
  const concurrency = Number(argFlag("concurrency") || DEFAULT_CONCURRENCY);
  const limit = Number(argFlag("limit") || DEFAULT_LIMIT);

  console.log(
    JSON.stringify({
      productSha: PRODUCT_SHA,
      preview: PREVIEW,
      outDir: OUT_DIR,
      concurrency,
      limit: limit || "ALL_REMAINING",
      indexOnly,
    }),
  );

  let index = resolveCriminalUniqueIndex();
  console.log("criminal_unique", index.length);

  if (indexOnly) {
    writeStatus({
      verdict: "FILE_SWEEP_RUNNING",
      totalUnique: index.length,
      backendLive: index.filter((r) => r.route === "BACKEND_LIVE").length,
      offline: index.filter((r) => r.route === "OFFLINE_FILE_PROJECTION").length,
      skipped: index.filter((r) => r.route === "SKIP").length,
      scored: 0,
      inventTotal: 0,
      topFamilies: [],
      note: "Index built only (--index-only).",
    });
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    writeStatus({
      verdict: "BLOCKED",
      totalUnique: index.length,
      backendLive: 0,
      offline: index.filter((r) => r.route === "OFFLINE_FILE_PROJECTION").length,
      skipped: index.filter((r) => r.route === "SKIP").length,
      scored: 0,
      inventTotal: 0,
      topFamilies: [],
      note: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — cannot load BACKEND_LIVE corpus. Offline PDF projection can still run if PDFs exist.",
    });
  }

  let corpus = { byId: new Map<string, BackendCase>(), byNeedle: new Map<string, string>() };
  const offlineOnly = process.env.FILE_SWEEP_OFFLINE_ONLY?.trim() === "1";
  if (url && key && !offlineOnly) {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    console.log("loading BACKEND_LIVE corpus (eval org READ)...");
    const extraIds = [
      ...index.map((r) => r.backend_case_id).filter(Boolean),
      // known Friday canaries (QA account) — READ ONLY
      "99090c69-5d78-41e3-946d-119b4bc335ba",
      "2dcdc59d-ff44-4bc8-ac31-bd11a954a59e",
      "ce5bc9f2-f570-411e-bcab-5004d80acf4c",
      "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01",
      "ba22e8bb-832c-43b8-8986-20ea5f5bf7c4",
      "ed3c9806-3227-4ee9-ad86-9784e6000084",
      "a42cb20a-017b-4dfb-b8a5-1dc5b11a3b27",
      "e2841289-1ed2-4dc4-9acf-dd22a03b63fc",
    ];
    try {
      corpus = await loadBackendCorpus(supabase, extraIds);
      console.log("backend_cases_with_text", corpus.byId.size);
    } catch (e: any) {
      console.warn("backend_corpus_load_failed_continuing_offline", String(e?.message || e).slice(0, 200));
    }
  } else if (offlineOnly) {
    console.log("FILE_SWEEP_OFFLINE_ONLY=1 — skipping backend corpus load");
  }

  // Re-route using backend matches
  for (const row of index) {
    if (row.route === "SKIP" && row.skip_reason === "missing_pdf_sha256") continue;
    const hit = matchBackend(row, corpus);
    if (hit) {
      row.route = "BACKEND_LIVE";
      row.backend_case_id = hit.id;
      row.match_hint = hit.title.slice(0, 120);
      row.skip_reason = "";
    } else if (row.route !== "BACKEND_LIVE") {
      const pdfExists = row.pdf_path && fs.existsSync(row.pdf_path);
      if (!pdfExists) {
        row.route = "SKIP";
        row.skip_reason = row.skip_reason || "no_backend_match_and_no_pdf";
      } else {
        row.route = "OFFLINE_FILE_PROJECTION";
        row.skip_reason = "";
      }
    }
  }
  // rewrite index with routes
  {
    const header = [
      "unique_key",
      "case_key",
      "source_id",
      "display_name",
      "pdf_sha256",
      "pdf_path",
      "offence_family",
      "strata_tags",
      "gold_tier",
      "pool",
      "route",
      "skip_reason",
      "backend_case_id",
      "match_hint",
    ];
    fs.writeFileSync(
      INDEX_CSV,
      [
        header.join(","),
        ...index.map((r) =>
          header.map((h) => csvEscape(String((r as Record<string, string>)[h] ?? ""))).join(","),
        ),
      ].join("\n") + "\n",
      "utf8",
    );
  }

  const done = loadCompletedKeys();
  const routeRank = (r: IndexRow) =>
    r.route === "BACKEND_LIVE" ? 0 : r.route === "OFFLINE_FILE_PROJECTION" ? 1 : 2;
  let pending = index
    .filter((r) => !done.has(r.unique_key))
    .sort((a, b) => routeRank(a) - routeRank(b) || a.case_key.localeCompare(b.case_key));
  if (limit > 0) pending = pending.slice(0, limit);

  // In-run guard: mark keys as claimed before work so a second overlapping process
  // (or accidental double-queue) does not append duplicates mid-batch.
  const claimed = new Set(done);

  const routeCounts = {
    backendLive: index.filter((r) => r.route === "BACKEND_LIVE").length,
    offline: index.filter((r) => r.route === "OFFLINE_FILE_PROJECTION").length,
    skipped: index.filter((r) => r.route === "SKIP").length,
  };

  writeStatus({
    verdict: "FILE_SWEEP_RUNNING",
    totalUnique: index.length,
    ...routeCounts,
    scored: done.size,
    inventTotal: tallyFromNdjson().inventTotal,
    topFamilies: tallyFromNdjson().topFamilies,
    note: `Starting batch: ${pending.length} remaining (of ${index.length - done.size} unscored). concurrency=${concurrency}`,
  });

  fs.writeFileSync(
    CHECKPOINT,
    JSON.stringify(
      {
        productSha: PRODUCT_SHA,
        preview: PREVIEW,
        startedAt: new Date().toISOString(),
        totalUnique: index.length,
        alreadyDone: done.size,
        batchSize: pending.length,
        concurrency,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (!fs.existsSync(NDJSON)) fs.writeFileSync(NDJSON, "", "utf8");

  const tBatch = Date.now();
  let processed = 0;

  await mapPool(pending, concurrency, async (row) => {
    if (claimed.has(row.unique_key)) return null as any;
    claimed.add(row.unique_key);

    const base: SweepResult = {
      unique_key: row.unique_key,
      case_key: row.case_key,
      source_id: row.source_id,
      pdf_sha256: row.pdf_sha256,
      route: row.route,
      backend_case_id: row.backend_case_id || null,
      productSha: PRODUCT_SHA,
      preview: PREVIEW,
      scoredAt: new Date().toISOString(),
      sourceChars: 0,
      engineMs: 0,
      ok: false,
      fileClaims: [],
      inventFlags: [],
      muteFlags: [],
      modalityFlags: [],
      contradictionFlags: [],
      dateRoleFlags: [],
      materialFlags: [],
      failReasons: [],
      identityHints: {},
      ledgerMeta: {
        materialCount: 0,
        hearingRaw: null,
        hearingDateIso: null,
        charge: null,
      },
      evidence: {
        export_log_claim: false,
        export_log_source: false,
        cctv_master_claim: false,
        cctv_master_source: false,
        phone_download_claim: false,
        phone_download_source: false,
        cad_999_claim: false,
        cad_999_source: false,
        interview_recording_claim: false,
        interview_recording_source: false,
        subscriber_claim: false,
        subscriber_source: false,
        bwv_claim: false,
        bwv_source: false,
        bwv_full_export_claim: false,
        bwv_stills_source: false,
        mg_forms_source: false,
        id_procedure_source: false,
        charge_source: false,
        hearing_source: false,
      },
    };

    try {
      if (row.route === "SKIP") {
        base.ok = true;
        base.skip_reason = row.skip_reason || "skip";
        appendNdjson(base);
        processed++;
        return base;
      }

      let text = "";
      if (row.route === "BACKEND_LIVE") {
        const bc = row.backend_case_id ? corpus.byId.get(row.backend_case_id) : matchBackend(row, corpus);
        if (!bc || bc.chars < 200) {
          // fallback offline
          if (row.pdf_path && fs.existsSync(row.pdf_path)) {
            const ex = await extractPdfText(row.pdf_path);
            text = ex.text;
            base.route = "OFFLINE_FILE_PROJECTION";
            if (ex.error && !text) throw new Error(ex.error);
          } else {
            base.route = "SKIP";
            base.skip_reason = "backend_text_missing";
            base.ok = true;
            appendNdjson(base);
            processed++;
            return base;
          }
        } else {
          text = bc.text;
          base.backend_case_id = bc.id;
        }
      } else {
        const ex = await extractPdfText(row.pdf_path);
        text = ex.text;
        if (ex.error && !text) throw new Error(ex.error);
      }

      base.sourceChars = text.length;
      if (text.length < 80) {
        base.route = "SKIP";
        base.skip_reason = "empty_extract";
        base.ok = true;
        appendNdjson(base);
        processed++;
        return base;
      }

      const proj = projectFile(text, row.display_name || row.source_id || row.case_key);
      base.engineMs = proj.engineMs;
      base.fileClaims = proj.claims;
      base.identityHints = proj.identity;
      base.ledgerMeta = proj.ledgerMeta;
      const scored = scoreInvent(text, proj.inventClaimBlob, proj.ledgerMeta.materialCount, proj.ledgerMeta.hearingRaw);
      base.inventFlags = scored.inventFlags;
      base.muteFlags = scored.muteFlags;
      base.modalityFlags = scored.modalityFlags;
      base.contradictionFlags = scored.contradictionFlags;
      base.dateRoleFlags = scored.dateRoleFlags;
      base.materialFlags = scored.materialFlags;
      base.failReasons = scored.failReasons;
      base.evidence = scored.evidence;
      base.ok = true;
      appendNdjson(base);
      processed++;
      if (processed % 25 === 0) {
        const tall = tallyFromNdjson();
        const hitlistN = writeHitlist();
        const elapsed = (Date.now() - tBatch) / 1000;
        const rate = processed / Math.max(elapsed, 1);
        const remain = index.length - tall.scored;
        const etaMin = rate > 0 ? Math.round(remain / rate / 60) : null;
        writeStatus({
          verdict: "FILE_SWEEP_RUNNING",
          totalUnique: index.length,
          ...routeCounts,
          scored: tall.scored,
          inventTotal: tall.inventTotal,
          failHits: hitlistN,
          topFamilies: tall.topFamilies,
          etaHint: etaMin != null ? `~${etaMin} min remaining at ${rate.toFixed(2)} cases/sec (this session rate).` : undefined,
        });
        console.log(`progress ${tall.scored}/${index.length} hitlist=${hitlistN} rate=${rate.toFixed(2)}/s`);
      }
      return base;
    } catch (e: any) {
      base.ok = false;
      base.error = String(e?.message || e).slice(0, 300);
      appendNdjson(base);
      processed++;
      return base;
    }
  });

  const tall = tallyFromNdjson();
  const complete = tall.scored >= index.length;
  const hitlistN = writeHitlist();
  const verdict = verdictLabel(complete, tall.scored, index.length);
  writeStatus({
    verdict,
    totalUnique: index.length,
    ...routeCounts,
    scored: tall.scored,
    inventTotal: tall.inventTotal,
    failHits: hitlistN,
    topFamilies: tall.topFamilies,
    note: complete
      ? `All unique criminal index rows have an NDJSON line (including SKIP). Hitlist: ${HITLIST_CSV}`
      : `Batch finished. scored=${tall.scored}/${index.length}. Hitlist rows=${hitlistN}. Re-run the same command to resume.`,
    etaHint: complete
      ? "Complete."
      : (() => {
          const elapsed = (Date.now() - tBatch) / 1000;
          const rate = processed / Math.max(elapsed, 1);
          const remain = index.length - tall.scored;
          return `Session processed ${processed} in ${Math.round(elapsed)}s (${rate.toFixed(2)}/s). Remaining ~${remain}. ETA ~${Math.round(remain / Math.max(rate, 0.01) / 60)} min.`;
        })(),
  });

  fs.writeFileSync(
    CHECKPOINT,
    JSON.stringify(
      {
        productSha: PRODUCT_SHA,
        preview: PREVIEW,
        finishedAt: new Date().toISOString(),
        totalUnique: index.length,
        scored: tall.scored,
        complete,
        hitlistRows: hitlistN,
        topFamilies: tall.topFamilies,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        verdict,
        scored: tall.scored,
        totalUnique: index.length,
        hitlistRows: hitlistN,
        topFamilies: tall.topFamilies.slice(0, 8),
        pack: OUT_DIR,
        hitlist: HITLIST_CSV,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  try {
    writeStatus({
      verdict: "BLOCKED",
      totalUnique: 0,
      backendLive: 0,
      offline: 0,
      skipped: 0,
      scored: tallyFromNdjson().scored,
      inventTotal: tallyFromNdjson().inventTotal,
      topFamilies: tallyFromNdjson().topFamilies,
      note: String(e?.message || e),
    });
  } catch {
    /* ignore */
  }
  process.exit(1);
});


