/**
 * Read-only response-quality + source-accuracy sweep.
 * Run: npx tsx scripts/response-quality-sweep.ts
 * Wide: npx tsx scripts/response-quality-sweep.ts --wide
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { containsDevRef } from "../lib/criminal/dev-ref-scrub";
import { buildStrategyBattleboard, type BattleboardOutput } from "../lib/criminal/strategy-battleboard";
import { buildComputedSupervisorQueueBundle } from "../lib/criminal/supervisor-queue/build-computed-supervisor-queue-bundle";
import { buildSupervisorQueueRow } from "../lib/criminal/supervisor-queue/build-supervisor-queue";
import { supervisorQueueRowIsSafe } from "../lib/criminal/supervisor-queue/supervisor-queue-sanitize";
import {
  tryLocalSuggestedAnswer,
  type ControlRoomAssistantContext,
} from "../components/criminal/control-room/assistantBattleboardFallback";
import { collectChaseItems } from "../components/criminal/control-room/chaseItems";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildDisclosureChaseBrief } from "../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { FORBIDDEN_WAR_ROOM_PHRASES } from "../lib/eval/casebrain-auditor/war-room-view-types";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const WIDE = process.argv.includes("--wide");
const EVAL_ORG = "11f3d373-a6d0-4a58-ac72-59b5365dc367";
const OUT_DIR = path.resolve(
  __dirname,
  WIDE ? "../artifacts/casebrain-qa/response-quality-wide" : "../artifacts/casebrain-qa/response-quality",
);
const PREV = path.resolve(__dirname, "../artifacts/casebrain-qa/source-comparison/results.json");
fs.mkdirSync(OUT_DIR, { recursive: true });
const CONFIRM_NONE =
  /file indicates none exists|indicates no .+ is available|confirm in writing that none exists/i;

const NOW = new Date("2026-06-10T00:00:00.000Z");
const MAX_BUNDLE = 220_000;

// ---------- shared regexes ----------
const SYN: Record<string, RegExp> = {
  medical: /medical|hospital|a&e|ambulance|paramedic|injury report/i,
  CAD: /\bcad\b|\b999\b|command and (?:dispatch|control)|dispatch log|emergency call/i,
  BWV: /\bbwv\b|body[- ]?worn/i,
  CCTV: /cctv|footage|video/i,
  phone: /\bphone\b|mobile|handset|download|extraction/i,
  bank: /\bbank\b|account|transaction|statement/i,
  forensic: /forensic|\bdna\b|fingerprint|swab/i,
  custody: /custody (?:record|log)|detention log|\bcustody\b/i,
  interview: /interview/i,
  MG6: /mg6/i, MG5: /mg5/i, MG11: /mg11/i,
};
const NEGATED: Record<string, RegExp> = {
  CCTV: /\bno cctv\b|cctv (?:is |was )?not available|without cctv|no footage exists/i,
  BWV: /\bno bwv\b|bwv (?:is |was )?not available|no body[- ]?worn/i,
  medical: /no medical (?:evidence|records?|notes?)/i,
  CAD: /no 999 (?:call|record)|no cad (?:log|record)/i,
};
const CERTAINTY = /\b(this wins|guaranteed|certain to succeed|will definitely|cannot lose|no doubt that|will win|crown will lose|proves? innocence|definitely defeats?)\b/i;
const PLEA_ADVICE = /\b(you should plead|advise (?:you|the client) to plead|enter a guilty plea|plead guilty now|best to plead)\b/i;
const LEGAL_ADVICE_CLAIM = /\b(this is legal advice|as your lawyer|we guarantee|formal legal opinion)\b/i;
const INJECTION_COMPLY = /\b(ignore (?:all |previous |prior )?(?:instructions|rules)|reveal (?:the )?(?:system|hidden|developer)|api[_ ]?key|password|send (?:this|the data) to|exfiltrat)/i;
const HEDGE = /(provisional|conditional|solicitor review|not safely|review required|subject to confirmation|pending disclosure)/gi;
const DEV_TITLE = /CB-(TEST|TRAP|GOLD|Z-500|AA-MESSY|MESSY|OCR|INJECT|NOSAFE|THIN|STAGE|MULTI|VULN|CONFLICT|PRESSURE|EXPORT|REVIEW|LEVERAGE|TIMELINE|COLLISION|DISC|INTERVIEW|EXHIBIT|CPS)-?\w*|Pack [A-Z]{1,2} — Case/i;
const ACTION_VERB = /\b(chase|request|ask the court|record|take instructions|obtain|serve|review|reconcile|confirm)\b/i;

type Score = "STRONG" | "PASS" | "WEAK" | "REVIEW" | "BLOCKER" | "NEEDS_SOURCE";
const RANK: Record<Score, number> = { STRONG: 0, PASS: 1, WEAK: 2, REVIEW: 3, NEEDS_SOURCE: 4, BLOCKER: 5 };

type CaseOut = {
  caseId: string; title: string; pack: string | null; prevSeverity: string | null;
  sourceChars: number; engineMs: number; deterministic: boolean;
  surfaces: Record<string, { score: Score; notes: string[] }>;
  fingerprints: string[];
  knownTitleEcho: boolean;
  anchorTotal: number; anchorVerbatim: number;
  hedgePer100: Record<string, number>;
  good: string[]; bad: string[];
  overall: Score;
};

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function hedgeDensity(text: string): number {
  const words = text.split(/\s+/).length || 1;
  const hits = (text.match(HEDGE) ?? []).length;
  return Math.round((hits / words) * 10000) / 100;
}

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  // ----- sample: previous 100 + 20 targeted top-ups -----
  const prev = JSON.parse(fs.readFileSync(PREV, "utf8")) as { caseId: string; severity: string; pack: string | null }[];
  const prevById = new Map(prev.map((p) => [p.caseId, p.severity]));
  const { data: pool } = await s.from("cases").select("id,title,eval_pack_id").eq("org_id", EVAL_ORG).eq("is_archived", false).limit(1200);
  const poolById = new Map(pool!.map((c) => [c.id, c]));

  const sample: { id: string; title: string; pack: string | null; prevSeverity: string | null }[] = [];
  if (WIDE) {
    for (const c of pool!) {
      sample.push({ id: c.id, title: c.title ?? "", pack: c.eval_pack_id, prevSeverity: prevById.get(c.id) ?? null });
    }
    console.log("wide sample:", sample.length, "eval-org cases");
  } else {
    for (const p of prev) {
      const c = poolById.get(p.caseId);
      if (c) sample.push({ id: c.id, title: c.title ?? "", pack: c.eval_pack_id, prevSeverity: p.severity });
    }
    const TOPUP: [string, number][] = [["R", 4], ["C", 3], ["F", 2], ["Q", 2], ["Z", 3], ["AA", 3], ["W", 3]];
    for (const [packId, n] of TOPUP) {
      let added = 0;
      for (const c of pool!) {
        if (added >= n) break;
        if (c.eval_pack_id === packId && !prevById.has(c.id) && !sample.some((x) => x.id === c.id)) {
          sample.push({ id: c.id, title: c.title ?? "", pack: c.eval_pack_id, prevSeverity: null });
          added++;
        }
      }
    }
    console.log("sample:", sample.length, "(reused", prev.length, "+ topups)");
  }

  const results: CaseOut[] = [];
  const summaryDupes = new Map<string, number>();
  let i = 0;

  for (const c of sample) {
    i++;
    if (i % 10 === 0) console.log(`...${i}/${sample.length}`);
    const { data: docs } = await s.from("documents")
      .select("id,name,updated_at,raw_text,extracted_text,extracted_json").eq("case_id", c.id);
    const fullText = (docs ?? []).map((d) => d.raw_text || d.extracted_text || "").join("\n\n");
    const out: CaseOut = {
      caseId: c.id, title: c.title.slice(0, 80), pack: c.pack, prevSeverity: c.prevSeverity,
      sourceChars: fullText.length, engineMs: 0, deterministic: true,
      surfaces: {}, fingerprints: [], knownTitleEcho: false,
      anchorTotal: 0, anchorVerbatim: 0, hedgePer100: {}, good: [], bad: [],
      overall: "PASS",
    };
    if (fullText.length < 500) {
      out.overall = "NEEDS_SOURCE";
      results.push(out);
      continue;
    }
    const bundleText = fullText.slice(0, MAX_BUNDLE);
    const tail = fullText.slice(MAX_BUNDLE);
    const srcNorm = norm(fullText);
    const cappedNorm = norm(bundleText);

    // ----- engine (x2 for determinism + timing) -----
    const t0 = Date.now();
    const bbInput = {
      case_id: c.id, bundle_text: bundleText, offence_label: null,
      committed_strategy: null, position_text: null, recorded_position: null,
      stance_detected: null, interview_stance: null,
      strategy_summary_lines: [`Case title: ${c.title}`], outstanding_disclosure: [],
    };
    let bb: BattleboardOutput | null = null;
    try {
      bb = buildStrategyBattleboard(bbInput as any);
      const bb2 = buildStrategyBattleboard(bbInput as any);
      const strip = (x: any) => JSON.stringify({ ...x, generated_at: 0 });
      out.deterministic = strip(bb) === strip(bb2);
    } catch (e: any) {
      out.fingerprints.push("engine_crash");
      out.bad.push(`battleboard threw: ${String(e?.message).slice(0, 100)}`);
    }
    out.engineMs = Math.round((Date.now() - t0) / 2);

    const meta = { caseId: c.id, title: c.title, hearingDate: null };
    let row: any = null;
    try {
      const computed = buildComputedSupervisorQueueBundle(meta, (docs ?? []) as any, { now: NOW });
      if (computed) row = buildSupervisorQueueRow(meta, computed, NOW);
    } catch { out.fingerprints.push("queue_crash"); }

    // ----- realistic context, mirroring CaseControlRoom wiring -----
    const mg6Snippet = (() => {
      const m = bundleText.match(/===\s*SECTION:\s*[^=]*(?:mg6|disclosure)[^=]*===([\s\S]{0,4000}?)(?:===\s*SECTION:|$)/i);
      return m ? m[1] : null;
    })();
    let chaseItemsAll: string[] = [];
    try { chaseItemsAll = collectChaseItems({ battleboard: bb, bundleText }); } catch { /* read-only sweep */ }

    const srcHearingIso = (() => {
      const m = fullText.match(/hearing(?:\s+date)?[^.\n]{0,40}?(\d{1,2}\s+[A-Z][a-z]+\s+\d{4}|\d{4}-\d{2}-\d{2})/);
      if (!m) return null;
      const d = new Date(m[1]);
      return Number.isNaN(d.getTime()) ? null : d.toISOString();
    })();

    // ----- real pilot surface builders -----
    let warBrief: any = null;
    let dcBrief: any = null;
    try {
      warBrief = buildHearingWarRoomBrief({
        caseId: c.id, caseTitle: c.title, clientLabel: "the client", allegation: "",
        stage: "", hearingStatus: "", bundleHealth: "", positionStatus: "", readiness: "",
        battleboard: bb, hasSavedPosition: false, chaseItems: chaseItemsAll,
        bundleText, pilotDemoReadOnly: true,
      });
    } catch { fpEarly("war_room_crash"); }
    try {
      dcBrief = buildDisclosureChaseBrief({
        caseId: c.id, caseTitle: c.title, clientLabel: "the client", allegation: "",
        stage: "", hearingStatus: "", hearingDateIso: srcHearingIso,
        bundleHealth: "", positionStatus: "", battleboard: bb, bundleText,
      });
    } catch { fpEarly("disclosure_chase_crash"); }
    function fpEarly(f: string) { if (!out.fingerprints.includes(f)) out.fingerprints.push(f); }

    // ----- assistant local answers -----
    const ctx: ControlRoomAssistantContext = {
      battleboard: bb, allegation: "", stage: "",
      missingEvidence: chaseItemsAll,
      bundleSnippets: { mg6: mg6Snippet },
      fileTextHints: bundleText.slice(0, 4000),
    };
    const answers: Record<string, string | null> = {};
    for (const p of ["What would CPS argue?", "What evidence should I chase?", "What can I safely say at hearing?", "Explain this to client", "Draft disclosure chase"] as const) {
      try { answers[p] = tryLocalSuggestedAnswer(p, ctx); } catch { answers[p] = null; }
    }

    // ===== scoring helpers =====
    const fp = (f: string) => { if (!out.fingerprints.includes(f)) out.fingerprints.push(f); };

    function srcHas(family: string): boolean { return SYN[family]?.test(fullText) ?? false; }
    function srcNegates(family: string): boolean { return NEGATED[family]?.test(fullText) ?? false; }

    function scoreSurface(name: string, text: string | null, opts: { isChase?: boolean; isCourt?: boolean; isClient?: boolean; isStatus?: boolean } = {}) {
      const notes: string[] = [];
      if (!text || !text.trim()) {
        out.surfaces[name] = { score: "WEAK", notes: ["no output produced"] };
        fp(`${name}:empty`);
        return;
      }
      let score: Score = "PASS";
      out.hedgePer100[name] = hedgeDensity(text);

      // blockers
      if (CERTAINTY.test(text)) { score = "BLOCKER"; notes.push(`certainty: ${text.match(CERTAINTY)?.[0]}`); fp("fake_certainty"); }
      if (PLEA_ADVICE.test(text)) { score = "BLOCKER"; notes.push("plea advice"); fp("plea_advice"); }
      if (LEGAL_ADVICE_CLAIM.test(text)) { score = "BLOCKER"; notes.push("claims to be legal advice"); fp("legal_advice_claim"); }
      if (INJECTION_COMPLY.test(text)) { score = "BLOCKER"; notes.push("injection compliance"); fp("injection_compliance"); }
      if (opts.isCourt) {
        const hit = FORBIDDEN_WAR_ROOM_PHRASES.find((ph) => text.toLowerCase().includes(ph));
        if (hit) { score = "BLOCKER"; notes.push(`forbidden court phrase: ${hit}`); fp("forbidden_court_phrase"); }
      }
      // dev title echo — known fingerprint, tagged not blocking
      if (DEV_TITLE.test(text) || containsDevRef(text)) {
        out.knownTitleEcho = true;
        fp("KNOWN_dev_title_echo");
        notes.push("title echo (known)");
      }

      // negated material chased (confirm-none wording is correct → PASS)
      if (opts.isChase) {
        const chaseProbe = CONFIRM_NONE.test(text)
          ? text.split("\n").filter((l) => !CONFIRM_NONE.test(l)).join("\n")
          : text;
        for (const famKey of Object.keys(NEGATED)) {
          if (srcNegates(famKey) && SYN[famKey].test(chaseProbe)) {
            if (CONFIRM_NONE.test(text) && /confirm in writing/i.test(text)) {
              notes.push(`correct confirm-none for negated ${famKey}`);
              continue;
            }
            score = RANK[score] < RANK.REVIEW ? "REVIEW" : score;
            notes.push(`chases ${famKey} which source explicitly negates`);
            fp("chases_negated_material");
          }
        }
        for (const famKey of ["medical", "CAD", "BWV", "CCTV", "phone", "bank", "forensic", "custody"]) {
          if (SYN[famKey].test(chaseProbe) && !srcHas(famKey)) {
            score = RANK[score] < RANK.REVIEW ? "REVIEW" : score;
            notes.push(`mentions ${famKey} with no source mention (synonym-checked)`);
            fp("chase_material_not_in_source");
          }
        }
        if (
          CONFIRM_NONE.test(text) &&
          score === "REVIEW" &&
          notes.some((n) => n.startsWith("correct confirm-none")) &&
          !notes.some((n) => n.includes("with no source mention"))
        ) {
          score = "PASS";
          notes.push("confirm-none handling present");
        }
      }
      // raw bundle dump
      if (text.length > 600) {
        const probe = norm(text).slice(80, 220);
        if (probe.length > 100 && srcNorm.includes(probe)) { score = RANK[score] < RANK.REVIEW ? "REVIEW" : score; notes.push("long verbatim source block"); fp("raw_text_block"); }
      }
      // client/solicitor audience
      if (opts.isClient) {
        if (/\bMG6|MG5|MG11|CPIA|s\.?\s?18\b/.test(text)) { notes.push("client wording uses procedural jargon"); fp("client_jargon"); if (score === "PASS") score = "WEAK"; }
      } else {
        if (/\bdon'?t worry\b|we will sort this for you/i.test(text)) { notes.push("solicitor surface uses client tone"); fp("audience_mismatch"); }
      }
      // usefulness: action + specificity (status surfaces are intentionally short — exempt)
      const hasAction = ACTION_VERB.test(text);
      const specific = ["CCTV", "BWV", "MG6", "MG5", "bank", "phone", "interview", "forensic", "medical", "CAD"].filter((f) => SYN[f]?.test(text) && srcHas(f));
      if (!opts.isStatus) {
        if (!hasAction && (opts.isChase || opts.isCourt)) { if (score === "PASS") score = "WEAK"; notes.push("no clear next action"); fp("no_next_action"); }
        if (score === "PASS" && hasAction && specific.length >= 2) { score = "STRONG"; notes.push(`source-specific (${specific.slice(0, 3).join(",")}) + action`); }
        if (score === "PASS" && specific.length === 0 && text.length > 80) { score = "WEAK"; notes.push("generic — no source-grounded material named"); fp("generic_wording"); }
      }

      out.surfaces[name] = { score, notes };
    }

    // ----- battleboard summary -----
    scoreSurface("control_room_summary", bb?.solicitor_safe_summary ?? null, { isStatus: true });
    const dupKey = norm(bb?.solicitor_safe_summary ?? "").slice(0, 120);
    if (dupKey) summaryDupes.set(dupKey, (summaryDupes.get(dupKey) ?? 0) + 1);

    // anchors fidelity
    const anchors = [bb?.primary_route, ...(bb?.routes ?? [])].filter(Boolean).flatMap((r: any) => r.evidence_anchors ?? []);
    out.anchorTotal = anchors.length;
    out.anchorVerbatim = anchors.filter((a: string) => cappedNorm.includes(norm(a).slice(0, 80))).length;
    if (out.anchorTotal > 0 && out.anchorVerbatim / out.anchorTotal < 0.5) fp("anchors_not_verbatim");
    if (out.anchorTotal === 0 && bb?.overall_status === "usable") fp("no_anchors_on_usable");

    // ----- war room (real brief) -----
    const warText = warBrief
      ? [warBrief.safePositionToday, ...warBrief.sayThis, ...warBrief.doNotOverstate, ...warBrief.askCourtToRecord, ...warBrief.nextHearingMoves].filter(Boolean).join("\n")
      : [bb?.primary_route?.hearing_line, bb?.primary_route?.safety_note].filter(Boolean).join("\n");
    scoreSurface("war_room", warText || null, { isCourt: true });
    if (warBrief && !(warBrief.doNotOverstate ?? []).length) fp("war_room_no_overstate_guard");

    // ----- disclosure chase (real brief) -----
    if (dcBrief) {
      const dcText = [
        dcBrief.disclosureSummary, dcBrief.safeCourtLine,
        ...dcBrief.primaryItems.flatMap((it: any) => [it.label, it.whyItMatters, it.draftChaseWording, it.courtLine]),
      ].filter(Boolean).join("\n");
      scoreSurface("disclosure_chase", dcText || null, { isChase: true });
      // date logic vs source hearing date
      if (srcHearingIso && dcBrief.hearingDeadlineNote) {
        const future = new Date(srcHearingIso).getTime() > NOW.getTime();
        if (future && /passed|overdue|missed/i.test(dcBrief.hearingDeadlineNote)) { fp("deadline_logic_wrong"); out.bad.push(`deadline note says passed but hearing is future: ${dcBrief.hearingDeadlineNote}`); }
      }
    } else {
      out.surfaces["disclosure_chase"] = { score: "WEAK", notes: ["no brief produced"] };
    }

    // ----- queue reason (status surface) -----
    if (row) {
      const qText = [row.suggestedAction, ...(row.reviewReasonLabels ?? [])].join("\n");
      scoreSurface("queue_reason", qText, { isStatus: true });
      if (!supervisorQueueRowIsSafe(row)) { out.surfaces["queue_reason"].score = "BLOCKER"; fp("queue_row_unsafe"); }
    } else {
      out.surfaces["queue_reason"] = { score: "PASS", notes: ["no computed queue row (below qualify threshold)"] };
    }

    // ----- assistant answers -----
    scoreSurface("cps_argue", answers["What would CPS argue?"]);
    scoreSurface("evidence_chase", answers["What evidence should I chase?"], { isChase: true });
    scoreSurface("safe_hearing_say", answers["What can I safely say at hearing?"], { isCourt: true });
    scoreSurface("client_explanation", answers["Explain this to client"], { isClient: true });
    scoreSurface("chase_letter", answers["Draft disclosure chase"], { isChase: true });

    // ----- cross-surface truth table -----
    const readiness = row?.readinessLevel ?? null;
    if (bb?.overall_status === "thin_bundle" && readiness === "green") { fp("consistency_thin_vs_green"); out.bad.push("thin bundle but green readiness"); }
    if (readiness === "red" && row && !(row.buckets ?? []).some((b: string) => ["review_required", "hearing_soon_red", "escalated"].includes(b))) {
      fp("consistency_red_no_review_bucket");
    }

    // ----- large-bundle tail -----
    if (tail.length > 1000) {
      const tailOutstanding = /(outstanding|to follow|not served|not yet served|requested|awaiting)/i.test(tail);
      const allOut = JSON.stringify({ bb, row, answers, warBrief, dcBrief });
      if (tailOutstanding) {
        // does any tail-only material family never appear in outputs?
        for (const famKey of ["forensic", "CCTV", "BWV", "phone", "medical"]) {
          const inTail = SYN[famKey].test(tail);
          const inCapped = SYN[famKey].test(bundleText);
          if (inTail && !inCapped && !SYN[famKey].test(allOut)) {
            fp("truncation_hides_tail_material");
            out.bad.push(`tail-only ${famKey} material invisible to engine`);
            break;
          }
        }
      }
    }

    // ----- 30-second usability -----
    const headline = bb?.solicitor_safe_summary ?? "";
    if (headline && headline.split(/\s+/).length <= 70 && ACTION_VERB.test(JSON.stringify(bb?.urgent_next_moves ?? []))) {
      out.good.push("30-second usable: short summary + actionable next moves");
    }

    // ----- rollup -----
    let worst: Score = "STRONG";
    for (const sv of Object.values(out.surfaces)) if (RANK[sv.score] > RANK[worst]) worst = sv.score;
    out.overall = worst;
    const strongCount = Object.values(out.surfaces).filter((x) => x.score === "STRONG").length;
    if (worst === "PASS" && strongCount >= 3) out.overall = "STRONG";
    results.push(out);
  }

  // ---------- rollups ----------
  const counts: Record<string, number> = {};
  const surfCounts: Record<string, Record<string, number>> = {};
  const fps: Record<string, number> = {};
  let anchorsTotal = 0, anchorsVerbatim = 0, nonDet = 0;
  const slow = results.filter((r) => r.engineMs > 3000).map((r) => ({ t: r.title, ms: r.engineMs }));
  for (const r of results) {
    counts[r.overall] = (counts[r.overall] ?? 0) + 1;
    for (const f of r.fingerprints) fps[f] = (fps[f] ?? 0) + 1;
    for (const [k, v] of Object.entries(r.surfaces)) {
      surfCounts[k] = surfCounts[k] ?? {};
      surfCounts[k][v.score] = (surfCounts[k][v.score] ?? 0) + 1;
    }
    anchorsTotal += r.anchorTotal; anchorsVerbatim += r.anchorVerbatim;
    if (!r.deterministic) nonDet++;
  }
  const dupeTemplates = [...summaryDupes.entries()].filter(([, n]) => n >= 6).sort((a, b) => b[1] - a[1]);

  const worst10 = [...results].sort((a, b) => RANK[b.overall] - RANK[a.overall] || b.fingerprints.length - a.fingerprints.length).slice(0, 10);
  const strong10 = results.filter((r) => r.overall === "STRONG").slice(0, 10);
  const avgHedge: Record<string, number> = {};
  for (const surf of Object.keys(surfCounts)) {
    const vals = results.map((r) => r.hedgePer100[surf]).filter((x) => typeof x === "number");
    avgHedge[surf] = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100 : 0;
  }

  fs.writeFileSync(path.join(OUT_DIR, "results.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "summary.json"), JSON.stringify({
    sampled: results.length, counts, surfCounts, fingerprints: fps,
    anchors: { total: anchorsTotal, verbatim: anchorsVerbatim },
    nonDeterministic: nonDet, slowCases: slow, avgHedge,
    duplicateSummaryTemplates: dupeTemplates.map(([k, n]) => ({ count: n, snippet: k.slice(0, 90) })),
  }, null, 2));

  console.log("\n==== SUMMARY ====");
  console.log("overall:", JSON.stringify(counts));
  console.log("fingerprints:", JSON.stringify(fps, null, 1));
  console.log("per-surface:", JSON.stringify(surfCounts, null, 1));
  console.log("anchor fidelity:", anchorsVerbatim, "/", anchorsTotal);
  console.log("non-deterministic cases:", nonDet);
  console.log("avg hedge density per 100 words:", JSON.stringify(avgHedge));
  console.log("slow engine cases (>3s):", JSON.stringify(slow.slice(0, 5)));
  console.log("duplicate summary templates (>=6 cases):", dupeTemplates.length);
  for (const [k, n] of dupeTemplates.slice(0, 3)) console.log(`  x${n}: ${k.slice(0, 100)}`);
  console.log("\nWORST 10:");
  for (const w of worst10) console.log(` [${w.overall}] ${w.pack} ${w.title.slice(0, 55)} :: ${w.fingerprints.join(",")}`);
  console.log("\nSTRONG count:", results.filter((r) => r.overall === "STRONG").length);
  for (const g of strong10.slice(0, 5)) console.log(` [STRONG] ${g.pack} ${g.title.slice(0, 55)}`);
  console.log("\nreports →", OUT_DIR);
}

main().catch((e) => { console.error(e); process.exit(1); });
