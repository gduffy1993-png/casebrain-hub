/**
 * Client criminal corpus sweep — Chunk D0 find-only (Client Summary / client-safe export).
 *
 * Projects Client-safe summary + matter-brief client section + export client_summary vs PDF/source text.
 * Read-only w.r.t product behaviour / DB (service-role READ only).
 * Routes:
 *   BACKEND_LIVE              — reuse extracted_text already on eval/QA cases
 *   OFFLINE_CLIENT_PROJECTION  — extract PDF text + Client claim projectors
 *   SKIP                      — no text, corrupt, non-criminal, duplicate hash
 *
 * Resume:
 *   npx tsx scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts
 *   npx tsx scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts --limit=50
 *   npx tsx scripts/assurance/client-criminal-sweep/run-client-criminal-sweep.ts --concurrency=6
 *
 * Reuse criminal unique index:
 *   CLIENT_SWEEP_REUSE_INDEX=1 CLIENT_SWEEP_INDEX_SRC=artifacts/.../court-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv
 */
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildMatterBrief } from "@/components/criminal/workflow/buildMatterBrief";
import { buildCriminalBriefPlan } from "@/lib/criminal/brief-plan";
import { buildClientSafeExplanation } from "@/lib/criminal/build-client-safe-explanation";
import { buildContradictionActions } from "@/lib/criminal/contradiction-actions";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { buildExportPack } from "@/lib/criminal/export-pack";
import { extractAllBundleContradictions } from "@/lib/criminal/merge-bundle-contradictions";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";

const ROOT = process.cwd();
const PRODUCT_SHA = process.env.F167_PRODUCT_SHA?.trim() || "7b900de22";
const PREVIEW =
  process.env.F167_PREVIEW?.replace(/\/$/, "") ||
  "https://casebrain-76gk8vbwk-gduffy1993-pngs-projects.vercel.app";
const DEFAULT_OUT = path.join(ROOT, "artifacts/casebrain-qa/assurance/client-criminal-sweep-v1");
const OUT_DIR = (() => {
  const raw = process.env.CLIENT_SWEEP_OUT_DIR?.trim();
  if (!raw) return DEFAULT_OUT;
  return path.isAbsolute(raw) ? raw : path.join(ROOT, raw);
})();
const MASTER_CSV = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/multicase-independent-review-v1/audit-pack/MASTER-CASE-INDEX.csv",
);
const INDEX_CSV = path.join(OUT_DIR, "CRIMINAL-UNIQUE-INDEX.csv");
const NDJSON = path.join(OUT_DIR, "client-sweep.ndjson");
const HITLIST_CSV = path.join(OUT_DIR, "CLIENT-FAIL-HITLIST.csv");
const STATUS_MD = path.join(OUT_DIR, "CLIENT-SWEEP-STATUS.md");
const CHECKPOINT = path.join(OUT_DIR, "checkpoint.json");
/** When set, reuse existing CRIMINAL-UNIQUE-INDEX.csv in OUT_DIR (or copy from this path). */
const REUSE_INDEX =
  process.env.CLIENT_SWEEP_REUSE_INDEX?.trim() === "1" ||
  Boolean(process.env.CLIENT_SWEEP_INDEX_SRC?.trim());

/** Known eval / legacy org that already holds many criminal docs — READ ONLY. */
const EVAL_ORG = process.env.CLIENT_SWEEP_EVAL_ORG || "11f3d373-a6d0-4a58-ac72-59b5365dc367";

const MAX_BUNDLE = 220_000;
const DEFAULT_CONCURRENCY = Math.max(1, Number(process.env.CLIENT_SWEEP_CONCURRENCY || 4));
const DEFAULT_LIMIT = Number(process.env.CLIENT_SWEEP_LIMIT || 0); // 0 = all remaining

type Route = "BACKEND_LIVE" | "OFFLINE_CLIENT_PROJECTION" | "SKIP";

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
  clientClaims: string[];
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
  const md = `# CLIENT CRIMINAL SWEEP — STATUS

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
| Routed OFFLINE_CLIENT_PROJECTION | ${partial.offline} |
| Routed SKIP | ${partial.skipped} |
| Client scored (ndjson unique keys) | **${partial.scored}** |
| Invent-flag events (sum) | ${partial.inventTotal} |
| Client-fail hitlist rows | ${partial.failHits ?? "—"} |

## Top invent / modality families (so far)

${
  partial.topFamilies.length
    ? partial.topFamilies.map(([k, n]) => `- **${k}**: ${n}`).join("\n")
    : "_none yet_"
}

## Method

1. Tip SHA \`${PRODUCT_SHA}\` — Client Summary find-only (no product edits)
2. Reuse Overview \`CRIMINAL-UNIQUE-INDEX.csv\` (2600 criminal unique)
3. Route BACKEND_LIVE (eval/legacy extracted_text READ) vs OFFLINE PDF projection vs SKIP
4. Claim surface = Disclosure Chase labels/courtLines + safe court line + war-room position
5. Cheap invent/mute/modality/date-role flags — **volume = triage, not guilt**
6. Crash-safe NDJSON append; resume skips completed \`unique_key\`
7. Emit \`CLIENT-FAIL-HITLIST.csv\`

## Resume

\`\`\`bash
CLIENT_SWEEP_REUSE_INDEX=1 CLIENT_SWEEP_INDEX_SRC=artifacts/casebrain-qa/assurance/overview-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv \\
npx tsx scripts/assurance/court-criminal-sweep/run-court-criminal-sweep.ts --concurrency=6
\`\`\`

Pack: \`artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/\`
Hitlist: \`artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/CLIENT-FAIL-HITLIST.csv\`

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
    route: (r.route as Route) || "OFFLINE_CLIENT_PROJECTION",
    skip_reason: r.skip_reason || "",
    backend_case_id: r.backend_case_id || "",
    match_hint: r.match_hint || "",
  }));
}

function resolveCriminalUniqueIndex(): IndexRow[] {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const src = process.env.CLIENT_SWEEP_INDEX_SRC?.trim();
  if (src) {
    const abs = path.isAbsolute(src) ? src : path.join(ROOT, src);
    if (!fs.existsSync(abs)) throw new Error(`CLIENT_SWEEP_INDEX_SRC missing: ${abs}`);
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
    let route: Route = "OFFLINE_CLIENT_PROJECTION";
    let skip = "";
    if (backend) {
      route = "BACKEND_LIVE";
    } else if (!pdfExists) {
      // may still match backend by title later; provisional offline if path missing
      route = "OFFLINE_CLIENT_PROJECTION";
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
    cctv_master_source: /CCTV master|full CCTV master|master footage|full master/i.test(bundleText),
    phone_download_claim: /phone download|source export referred|digital extraction|original download|phone extraction/i.test(claimBlob),
    phone_download_source:
      /phone download|source export|handset download|digital extraction|extraction report|phone extraction|logical download|download report/i.test(
        bundleText,
      ),
    cad_999_claim: /\bCAD\b|999\s+audio|complete CAD/i.test(claimBlob),
    cad_999_source: /\bCAD\b|999\s+audio|CAD\/999|command and (?:dispatch|control)/i.test(bundleText),
    interview_recording_claim: /interview recording|PACE recording|audio.?visual interview/i.test(claimBlob),
    interview_recording_source: /interview recording|PACE recording|audio.?visual interview|\bROTI\b/i.test(bundleText),
    subscriber_claim: /subscriber|account (?:records?|data)/i.test(claimBlob),
    subscriber_source: /subscriber|account (?:records?|data)/i.test(bundleText),
    bwv_claim: /\bBWV\b|body[- ]worn/i.test(claimBlob),
    bwv_source: /\bBWV\b|body[- ]worn/i.test(bundleText),
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

  // Court empty claim surface on rich file (soft mute of court/chase projection)
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
  if (evidence.bwv_full_export_claim && evidence.bwv_stills_source && !/full (?:BWV|body[- ]worn).{0,40}export|BWV clip outstanding/i.test(bundleText)) {
    inventFlags.push("invent_bwv_full_export_from_stills");
  }

  if (evidence.export_log_source && /outstanding|not attached|not served/i.test(bundleText) && !evidence.export_log_claim) {
    muteFlags.push("mute_export_log");
  }
  if (evidence.cctv_master_source && /outstanding|not served|not yet/i.test(bundleText) && !evidence.cctv_master_claim) {
    muteFlags.push("mute_cctv_master");
  }
  if (evidence.phone_download_source && /outstanding|not served|referred/i.test(bundleText) && !evidence.phone_download_claim) {
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

  // Date-role soft detectors (find-only triage — not guilt)
  if (hearingRaw && /deadline|chase by|ops deadline/i.test(claimBlob) && /hearing/i.test(hearingRaw)) {
    dateRoleFlags.push("date_role_hearing_reused_as_deadline_language");
  }
  if (hearingRaw && /\b20\d{2}-\d{2}-\d{2}\b/.test(hearingRaw) === false && /\b\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}\b/.test(hearingRaw)) {
    // informational only when claim also invents ISO — keep soft
    if (/hearing date passed/i.test(claimBlob)) dateRoleFlags.push("date_role_hearing_passed_chrome");
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
  if (materialCount > 0) materialFlags.push(`client_claims_${Math.min(materialCount, 40)}`);

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

function projectClient(bundleTextRaw: string, title: string): {
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
  const allegation = ledger.charge?.wording || title || "Criminal allegation";
  const clientLabel = ledger.defendant?.defendant || title || "Defendant";

  const chase = buildDisclosureChaseBrief({
    caseId: "client-sweep",
    caseTitle: title || "Client sweep case",
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: ledger.hearing?.rawLiteral ? "Listed" : "Unknown",
    hearingDateIso: ledger.hearing?.dateIso ?? null,
    bundleHealth: "ok",
    positionStatus: "provisional",
    battleboard: null,
    bundleText,
  });

  const war = buildHearingWarRoomBrief({
    caseId: "client-sweep",
    caseTitle: title || "Client sweep case",
    clientLabel,
    allegation,
    stage: "PTPH",
    hearingStatus: ledger.hearing?.rawLiteral ? "Listed" : "Unknown",
    bundleHealth: "ok",
    positionStatus: "provisional",
    readiness: "provisional",
    hasSavedPosition: false,
    battleboard: null,
    chaseItems: chase.primaryItems.map((i) => i.label),
    bundleText,
  });

  const briefPlan = buildCriminalBriefPlan({
    allegation,
    bundleText,
    ledger,
  });

  const contradictions = extractAllBundleContradictions(bundleText);
  const contradictionActions = buildContradictionActions(contradictions);
  const clientSafe = buildClientSafeExplanation({
    clientLabel,
    allegation,
    contradictions,
    contradictionActionLines: contradictionActions.map((a) => a.clientSafeLine),
    hasOutstandingDisclosure: chase.primaryItems.length > 0,
    fallback: war.draftWording?.clientExplanation ?? null,
  });

  const matter = buildMatterBrief({
    warRoom: war,
    chase,
    primaryRouteTitle: null,
    briefPlan,
  });
  const clientSection = matter.sections.find((s) => s.id === "client");

  const exportPack = buildExportPack({
    caseId: "client-sweep",
    allegation,
    warRoom: war,
    chase,
    briefPlan,
    matterConfidence: null,
    doNotOverstate: war.doNotOverstate ?? [],
    primaryRouteTitle: null,
    urnCandidateTexts: [bundleText.slice(0, 4000)],
    bundleText,
  });
  const exportClient = exportPack.sections.find((s) => s.id === "client_summary");
  const exportGaps = exportPack.sections.find((s) => s.id === "evidence_gaps");

  const claims: string[] = [];
  if (clientSafe) claims.push(`CLIENT_SAFE | ${clientSafe}`);
  if (war.draftWording?.clientExplanation) {
    claims.push(`CLIENT_EXPLAIN | ${war.draftWording.clientExplanation}`);
  }
  if (clientSection?.paragraph) claims.push(`MATTER_CLIENT | ${clientSection.paragraph}`);
  for (const b of clientSection?.bullets ?? []) {
    if (b) claims.push(`MATTER_CLIENT_BULLET | ${b}`);
  }
  if (exportClient?.textForClipboard) {
    claims.push(`EXPORT_CLIENT | ${exportClient.textForClipboard.slice(0, 1200)}`);
  }
  // Evidence-gaps export is client-facing bleed of chase invents (gym CLIENT≈Court risk).
  if (exportGaps?.textForClipboard) {
    claims.push(`EXPORT_GAPS | ${exportGaps.textForClipboard.slice(0, 1600)}`);
  }
  for (const item of chase.primaryItems.slice(0, 12)) {
    claims.push(`CHASE_BLEED | ${item.label} | ${item.baseStatus}`);
  }
  if (ledger.defendant?.defendant) claims.push(`IDENTITY_DEFENDANT | ${ledger.defendant.defendant}`);
  if (ledger.charge?.wording) claims.push(`IDENTITY_CHARGE | ${ledger.charge.wording}`);
  for (const line of war.doNotOverstate ?? []) {
    if (line) claims.push(`DO_NOT | ${line}`);
  }

  // Court language bleed into client-safe surfaces (gym CLIENT_TAB_EQUALS_COURT hop).
  const clientCore = [
    clientSafe,
    war.draftWording?.clientExplanation ?? "",
    clientSection?.paragraph ?? "",
    exportClient?.textForClipboard ?? "",
  ].join("\n");
  if (
    /asks the court to record|defence asks the court|safe court line|PTPH|adjournment application/i.test(
      clientCore,
    )
  ) {
    claims.push("BLEED | client_contains_court_control_language");
  }
  if (/PAPERS INVENTORY|Document \/ schedule inventory/i.test(clientCore)) {
    claims.push("BLEED | client_contains_papers_inventory_chrome");
  }

  const inventClaimBlob = claims.filter((c) => !/^DO_NOT\b/i.test(c)).join("\n");
  const claimBlob = claims.join("\n");
  const defendant =
    ledger.defendant?.defendant ||
    (title.match(/\b(?:R\s*v\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/)?.[1] ?? null) ||
    null;
  const offence =
    ledger.charge?.wording ||
    bundleText.match(/\b(Robbery|Affray|Theft|Burglary|Harassment|ABH|GBH|Assault)\b/i)?.[1] ||
    null;

  return {
    claims,
    claimBlob,
    inventClaimBlob,
    identity: { defendant, offence },
    ledgerMeta: {
      materialCount: claims.length,
      hearingRaw: ledger.hearing?.rawLiteral ?? null,
      hearingDateIso: ledger.hearing?.dateIso ?? null,
      charge: ledger.charge?.wording ?? null,
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

/** Emit Client-fail hitlist for fix-queue triage. Volume ≠ guilt. */
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
        (o.clientClaims || []).slice(0, 3).join(" || ").slice(0, 240),
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
  return "CLIENT_SWEEP_RUNNING";
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
      verdict: "CLIENT_SWEEP_RUNNING",
      totalUnique: index.length,
      backendLive: index.filter((r) => r.route === "BACKEND_LIVE").length,
      offline: index.filter((r) => r.route === "OFFLINE_CLIENT_PROJECTION").length,
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
      offline: index.filter((r) => r.route === "OFFLINE_CLIENT_PROJECTION").length,
      skipped: index.filter((r) => r.route === "SKIP").length,
      scored: 0,
      inventTotal: 0,
      topFamilies: [],
      note: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — cannot load BACKEND_LIVE corpus. Offline PDF projection can still run if PDFs exist.",
    });
  }

  let corpus = { byId: new Map<string, BackendCase>(), byNeedle: new Map<string, string>() };
  const offlineOnly = process.env.CLIENT_SWEEP_OFFLINE_ONLY?.trim() === "1";
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
    console.log("CLIENT_SWEEP_OFFLINE_ONLY=1 — skipping backend corpus load");
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
        row.route = "OFFLINE_CLIENT_PROJECTION";
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
    r.route === "BACKEND_LIVE" ? 0 : r.route === "OFFLINE_CLIENT_PROJECTION" ? 1 : 2;
  let pending = index
    .filter((r) => !done.has(r.unique_key))
    .sort((a, b) => routeRank(a) - routeRank(b) || a.case_key.localeCompare(b.case_key));
  if (limit > 0) pending = pending.slice(0, limit);

  // In-run guard: mark keys as claimed before work so a second overlapping process
  // (or accidental double-queue) does not append duplicates mid-batch.
  const claimed = new Set(done);

  const routeCounts = {
    backendLive: index.filter((r) => r.route === "BACKEND_LIVE").length,
    offline: index.filter((r) => r.route === "OFFLINE_CLIENT_PROJECTION").length,
    skipped: index.filter((r) => r.route === "SKIP").length,
  };

  writeStatus({
    verdict: "CLIENT_SWEEP_RUNNING",
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
      clientClaims: [],
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
            base.route = "OFFLINE_CLIENT_PROJECTION";
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

      const proj = projectClient(text, row.display_name || row.source_id || row.case_key);
      base.engineMs = proj.engineMs;
      base.clientClaims = proj.claims;
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
          verdict: "CLIENT_SWEEP_RUNNING",
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

