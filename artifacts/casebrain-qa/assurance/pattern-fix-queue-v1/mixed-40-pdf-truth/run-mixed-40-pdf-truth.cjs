/**
 * Mixed-40 PDF-truth walk: every live tab dump scored against that case's PDF text.
 * Fills to 40 with offline Court/Chase projection vs local tip PDFs.
 *
 *   F167_PREVIEW=... F167_OUT=... SMOKE_PASSWORD=... node run-mixed-40-pdf-truth.cjs
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const base = (process.env.F167_PREVIEW || "").replace(/\/$/, "");
const out = process.env.F167_OUT;
const email = process.env.F167_EMAIL || "gduffy1993+casebrain@gmail.com";
const password = process.env.SMOKE_PASSWORD || "";
const ROOT = process.cwd();
const TABS = ["overview", "papers", "disclosure-chase", "client-summary", "court", "file"];

/** Prefer pilot/fresh PDFs for known live caseIds */
const PDF_BY_CASE_ID = {
  "99090c69-5d78-41e3-946d-119b4bc335ba": // Arden Vale robbery live
    "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-1915_Arden.pdf",
  "ce5bc9f2-f570-411e-bcab-5004d80acf4c":
    "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TRAP-2026-0030.pdf",
  "2dcdc59d-ff44-4bc8-ac31-bd11a954a59e":
    "C:/Users/gduff/Downloads/CB-FRESH-001_Taylor_Brookes_Digital_Attribution.pdf",
  "a81a0cf3-c7c8-4b23-99fc-be6ed82a7e01":
    "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-343_Dunn.pdf",
  "e2841289-1ed2-4dc4-9acf-dd22a03b63fc":
    "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-1681_Grant.pdf",
  "ba22e8bb-832c-43b8-8986-20ea5f5bf7c4":
    "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-1573_Ahmed.pdf",
  "ed3c9806-3227-4ee9-ad86-9784e6000084":
    "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-546_Patel.pdf",
  "a42cb20a-017b-4dfb-b8a5-1dc5b11a3b27":
    "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-1925_Tobin.pdf",
  "687cf5a6-0000-0000-0000-000000000000": null, // placeholder
};

const LABEL_PDF_HINTS = [
  [/Brookes/i, "C:/Users/gduff/Downloads/CB-FRESH-001_Taylor_Brookes_Digital_Attribution.pdf"],
  [/Dunn/i, "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-343_Dunn.pdf"],
  [/Grant/i, "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-1681_Grant.pdf"],
  [/Ahmed/i, "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-1573_Ahmed.pdf"],
  [/Patel/i, "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-546_Patel.pdf"],
  [/Tobin/i, "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-1925_Tobin.pdf"],
  [/Davies/i, "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-439_Davies.pdf"],
  [/Patterson/i, "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-014_James_Patterson.pdf"],
  [/Jordan Hale|LIVE 03/i, "C:/Users/gduff/Downloads/CB-FRESH-002_Jordan_Hale_Custody_BWV_Conflict.pdf"],
  [/Marcus Vale|Priya Vale|Vale/i, "C:/Users/gduff/Downloads/00-CASEBRAIN-PILOT-20/CB-TB-039_Vale.pdf"],
  [/Leon Hale|Murder/i, null],
  [/Robbery|Arden/i, "C:/Users/gduff/Downloads/cb-tb-1601-2200-v5-factory-run/pdfs/CB-TB-1915_Arden.pdf"],
  [/Taylor Reed|Phone Negation/i, "C:/Users/gduff/Downloads/cb-tb-001-030-v4/pdfs/CB-TB-025_Reed.pdf"],
];

function resolvePdf(caseId, label) {
  if (PDF_BY_CASE_ID[caseId] && fs.existsSync(PDF_BY_CASE_ID[caseId])) return PDF_BY_CASE_ID[caseId];
  for (const [re, p] of LABEL_PDF_HINTS) {
    if (!p) continue;
    if (re.test(label || "") && fs.existsSync(p)) return p;
  }
  return null;
}

function scoreUiVsPdf(uiBlob, pdfText) {
  const ui = uiBlob || "";
  const pdf = (pdfText || "").slice(0, 400_000);
  const flags = [];
  const note = [];

  const has = (re, hay) => re.test(hay);
  // Invent: UI claims modality family, PDF lacks establishment-ish tokens
  const checks = [
    {
      id: "invent_export_log",
      ui: /\bexport\s+log\b/i,
      pdf: /\bexport\s*log\b/i,
    },
    {
      id: "invent_cctv_master",
      ui: /CCTV master|full CCTV master|CCTV full window|master footage/i,
      pdf: /CCTV master|full CCTV|full window|master footage|full master/i,
      // strip not-full negation from UI before invent call
      uiClean: (s) => s.replace(/not\s+the\s+full\s+CCTV[^.!\n]{0,80}/gi, " "),
    },
    {
      id: "invent_phone_download",
      ui: /Full phone download|phone download|source extraction|phone extraction/i,
      pdf: /phone download|source export|digital extraction|phone extraction|handset download/i,
      uiClean: (s) =>
        s
          .replace(/not\s+(?:a\s+)?full\s+phone\s+download[^.!\n]{0,100}/gi, " ")
          .replace(/stolen\s+phone|phone\s+from\s+property/gi, " "),
    },
    {
      id: "invent_interview_recording",
      ui: /Interview recording/i,
      pdf: /interview recording|PACE recording|ROTI|full recording(?:\/transcript)? outstanding|summary only\s*\/\s*full recording/i,
    },
    {
      id: "invent_bwv_full_export",
      ui: /full BWV export|full export and continuity/i,
      pdf: /full BWV|BWV export|BWV clip|body[- ]worn[^.\n]{0,40}(export|outstanding|not served)/i,
    },
  ];

  for (const c of checks) {
    const uiHay = c.uiClean ? c.uiClean(ui) : ui;
    if (c.ui.test(uiHay) && !c.pdf.test(pdf)) flags.push(c.id);
  }

  // Mute soft: PDF outstanding family, Chase/Overview UI missing (only flag if chase+overview both empty)
  const muteChecks = [
    {
      id: "mute_phone_download_soft",
      pdfOut: /phone download|source export/i.test(pdf) && /outstanding|not served|referred/i.test(pdf),
      uiHas: /phone download|Full phone|source extraction/i.test(ui),
    },
    {
      id: "mute_cctv_master_soft",
      pdfOut: /CCTV master|full CCTV|full window/i.test(pdf) && /outstanding|not served/i.test(pdf),
      uiHas: /CCTV master|full window|master footage/i.test(ui),
    },
  ];
  for (const m of muteChecks) {
    if (m.pdfOut && !m.uiHas) flags.push(m.id);
  }

  // Chrome / glue
  if (/Hearing date passed/i.test(ui) && /Hearing\d{1,2}\s+\w+\s+20\d{2}|Hearing\d{2}\/\d{2}/i.test(ui)) {
    flags.push("chrome_hearing_glue_or_passed");
    note.push("hearing_passed_or_glue_present");
  }
  if (/Crown Court at [A-Za-z ]+Hearing\b/i.test(ui)) flags.push("glue_court_hearing");

  // Positive anchors
  const ok = [];
  if (/\bMG\s?5\b|\bMG5\b/i.test(pdf) && /\bMG\s?5\b|\bMG5\b|case summary/i.test(ui)) ok.push("mg5_seen");
  if (/\bMG6/i.test(pdf) && /MG6|unused|schedule/i.test(ui)) ok.push("mg6_seen");

  return { flags: [...new Set(flags)], ok, note };
}

async function extractPdfViaTsx(pdfPath) {
  const helper = path.join(out, "_extract-one.ts");
  if (!fs.existsSync(helper)) {
    fs.writeFileSync(
      helper,
      `import fs from "node:fs";
import path from "node:path";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";
const p = process.argv[2];
const text = await extractTextFromFileBuffer(path.basename(p), "application/pdf", fs.readFileSync(p));
process.stdout.write(JSON.stringify({ len: (text||"").length, text: text || "" }));
`,
    );
  }
  const r = spawnSync("npx", ["tsx", helper, pdfPath], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    shell: true,
  });
  if (r.status !== 0) return { len: 0, text: "", error: (r.stderr || r.stdout || "").slice(0, 300) };
  try {
    return JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
  } catch (e) {
    return { len: 0, text: "", error: String(e) };
  }
}

function pickOfflineFill(nNeeded) {
  const indexPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/court-criminal-sweep-v1/tip-resweep-d2-e20e0b1da/CRIMINAL-UNIQUE-INDEX.csv",
  );
  if (!fs.existsSync(indexPath)) return [];
  const lines = fs.readFileSync(indexPath, "utf8").split(/\n/).filter(Boolean);
  const h = lines[0].split(",");
  const iCase = h.indexOf("case_key");
  const iSrc = h.indexOf("source_id");
  const iPdf = h.indexOf("pdf_path");
  const iRoute = h.indexOf("route");
  const rows = [];
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    if (c[iRoute] !== "OFFLINE_COURT_PROJECTION") continue;
    const pdf = c[iPdf];
    if (!pdf || !fs.existsSync(pdf)) continue;
    const src = c[iSrc] || "";
    // prefer named strata
    const strata =
      /Trap|Arden|Brookes|Dunn|Grant|Mercer|Patel|Ahmed|Tobin|BWV|CCTV|phone|fraud|theft|murder/i.test(src)
        ? "named"
        : "other";
    rows.push({ case_key: c[iCase], source_id: src, pdf_path: pdf, strata });
  }
  const named = rows.filter((r) => r.strata === "named");
  const other = rows.filter((r) => r.strata === "other");
  const pick = [];
  for (const pool of [named, other]) {
    for (let i = 0; i < pool.length && pick.length < nNeeded; i += Math.max(1, Math.floor(pool.length / (nNeeded + 3)))) {
      pick.push(pool[i]);
    }
  }
  return pick.slice(0, nNeeded);
}

(async () => {
  if (!base || !out || !password) throw new Error("need F167_PREVIEW F167_OUT SMOKE_PASSWORD");
  fs.mkdirSync(path.join(out, "cases"), { recursive: true });
  fs.mkdirSync(path.join(out, "screenshots"), { recursive: true });

  const catalog = JSON.parse(fs.readFileSync(path.join(out, "live-case-catalog.json"), "utf8"));
  const asOf = new Date().toISOString().slice(0, 10);

  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(base + "/sign-in", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(800);
  await page.locator("input[type=email], #email, input[name=email]").first().fill(email);
  await page.locator("input[type=password], #password, input[name=password]").first().fill(password);
  await page.locator("button[type=submit]").first().click();
  await page.waitForTimeout(7000);
  if (page.url().includes("sign-in")) throw new Error("sign-in failed");

  const board = [];
  const liveWithPdf = [];
  for (const c of catalog.cases) {
    const pdf = resolvePdf(c.caseId, c.label);
    if (pdf) liveWithPdf.push({ ...c, pdf_path: pdf, mode: "live+pdf" });
  }
  console.log("live_with_pdf", liveWithPdf.length, "/", catalog.cases.length);

  for (const c of liveWithPdf) {
    const dir = path.join(out, "cases", c.caseId);
    fs.mkdirSync(dir, { recursive: true });
    const tabTexts = {};
    for (const tab of TABS) {
      await page.goto(`${base}/cases/${c.caseId}?tab=${tab}&controlRoom=1`, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await page.waitForTimeout(2800);
      const other = page.getByText(/Other source-material items/i).first();
      if (await other.count()) {
        try {
          await other.click({ timeout: 1200 });
          await page.waitForTimeout(200);
        } catch (_) {}
      }
      const t = await page.locator("body").innerText();
      tabTexts[tab] = t;
      fs.writeFileSync(path.join(dir, `${tab}.txt`), t);
    }
    const uiBlob = TABS.map((t) => `===${t}===\n${tabTexts[t] || ""}`).join("\n");
    console.log("extract", c.label.slice(0, 40), path.basename(c.pdf_path));
    const pdf = await extractPdfViaTsx(c.pdf_path);
    fs.writeFileSync(path.join(dir, "pdf-extract-meta.json"), JSON.stringify({ pdf_path: c.pdf_path, len: pdf.len, error: pdf.error || null }));
    if (pdf.text) fs.writeFileSync(path.join(dir, "pdf.txt"), pdf.text.slice(0, 500_000));
    const scored = scoreUiVsPdf(uiBlob, pdf.text || "");
    const row = {
      mode: "live+pdf",
      caseId: c.caseId,
      label: c.label,
      pdf_path: c.pdf_path,
      pdf_len: pdf.len,
      flags: scored.flags,
      ok: scored.ok,
      note: scored.note,
      asOf,
      severity: scored.flags.some((f) => f.startsWith("invent_"))
        ? "INVENT"
        : scored.flags.some((f) => f.startsWith("mute_"))
          ? "MUTE_SOFT"
          : scored.flags.length
            ? "CHROME"
            : "OK",
    };
    board.push(row);
    fs.writeFileSync(path.join(dir, "score.json"), JSON.stringify(row, null, 2));
    console.log(row.severity, c.caseId.slice(0, 8), scored.flags.join("|") || "(none)");
  }

  await browser.close();

  // Offline fill to 40
  const need = Math.max(0, 40 - board.length);
  const offline = pickOfflineFill(need + 5);
  console.log("offline_fill_target", need, "candidates", offline.length);

  // Offline scoring via tsx helper projecting chase+court
  const offlineHelper = path.join(out, "_offline-score.ts");
  fs.writeFileSync(
    offlineHelper,
    `import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";

const meta = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const buf = fs.readFileSync(meta.pdf_path);
const text = await extractTextFromFileBuffer(path.basename(meta.pdf_path), "application/pdf", buf);
const bundleText = (text || "").slice(0, 220000);
const ledger = buildBundleTruthLedger({ bundleText });
const allegation = ledger.charge?.wording || meta.source_id || "Allegation";
const clientLabel = ledger.defendant?.defendant || meta.source_id || "D";
const chase = buildDisclosureChaseBrief({
  caseId: "offline", caseTitle: meta.source_id, clientLabel, allegation, stage: "PTPH",
  hearingStatus: ledger.hearing?.rawLiteral ? "Listed" : "Unknown", hearingDateIso: ledger.hearing?.dateIso ?? null,
  bundleHealth: "ok", positionStatus: "provisional", battleboard: null, bundleText,
});
const war = buildHearingWarRoomBrief({
  caseId: "offline", caseTitle: meta.source_id, clientLabel, allegation, stage: "PTPH",
  hearingStatus: ledger.hearing?.rawLiteral ? "Listed" : "Unknown", bundleHealth: "ok",
  positionStatus: "provisional", readiness: "provisional", hasSavedPosition: false, battleboard: null,
  chaseItems: chase.primaryItems.map(i => i.label), bundleText,
});
const claims = [];
if (chase.safeCourtLine) claims.push("SAFE_COURT | " + chase.safeCourtLine);
if (war.safePositionToday) claims.push("SAFE_POSITION | " + war.safePositionToday);
for (const item of [...chase.primaryItems, ...chase.additionalItems].slice(0, 24)) {
  claims.push("CHASE | " + item.label);
  if (item.courtLine) claims.push("COURT_LINE | " + item.courtLine);
  if (item.whyItMatters) claims.push("WHY | " + item.whyItMatters);
}
const uiBlob = claims.filter(c => !/^DO_NOT/i.test(c)).join("\\n");
process.stdout.write(JSON.stringify({ pdf_len: bundleText.length, uiBlob, pdfText: bundleText }));
`,
  );

  for (const o of offline) {
    if (board.length >= 40) break;
    const metaPath = path.join(out, `_off_${board.length}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(o));
    const r = spawnSync("npx", ["tsx", offlineHelper, metaPath], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      shell: true,
    });
    if (r.status !== 0) {
      console.log("OFFLINE_FAIL", o.source_id, (r.stderr || "").slice(0, 120));
      continue;
    }
    let payload;
    try {
      payload = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
    } catch {
      continue;
    }
    const scored = scoreUiVsPdf(payload.uiBlob, payload.pdfText);
    const row = {
      mode: "offline+pdf",
      caseId: o.case_key,
      label: o.source_id,
      pdf_path: o.pdf_path,
      pdf_len: payload.pdf_len,
      flags: scored.flags,
      ok: scored.ok,
      note: scored.note,
      asOf,
      severity: scored.flags.some((f) => f.startsWith("invent_"))
        ? "INVENT"
        : scored.flags.some((f) => f.startsWith("mute_"))
          ? "MUTE_SOFT"
          : scored.flags.length
            ? "CHROME"
            : "OK",
    };
    board.push(row);
    console.log("OFF", row.severity, o.source_id, scored.flags.join("|") || "(none)");
  }

  const summary = {
    preview: base,
    asOf,
    n: board.length,
    live_pdf: board.filter((b) => b.mode === "live+pdf").length,
    offline_pdf: board.filter((b) => b.mode === "offline+pdf").length,
    by_severity: board.reduce((a, b) => {
      a[b.severity] = (a[b.severity] || 0) + 1;
      return a;
    }, {}),
    invent_flags: board.filter((b) => b.severity === "INVENT"),
    board,
  };
  fs.writeFileSync(path.join(out, "MIXED-40-BOARD.json"), JSON.stringify(summary, null, 2));
  const csv = [
    "mode,caseId,label,severity,flags,pdf_path",
    ...board.map(
      (b) =>
        `${b.mode},${b.caseId},"${(b.label || "").replace(/"/g, "'")}",${b.severity},"${(b.flags || []).join("|")}",${b.pdf_path}`,
    ),
  ].join("\n");
  fs.writeFileSync(path.join(out, "MIXED-40-BOARD.csv"), csv);
  console.log("SUMMARY", JSON.stringify(summary.by_severity), "n=", summary.n);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
