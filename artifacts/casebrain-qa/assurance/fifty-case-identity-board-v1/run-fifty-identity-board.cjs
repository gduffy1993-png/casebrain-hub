/**
 * 50-case PDF (bundle-text) vs CaseBrain output identity + evidence board.
 * No product code changes — audit only.
 */
const fs = require("fs");
const path = require("path");

const CASES_ROOT = path.resolve(
  __dirname,
  "../../../evidence-state-audit-local/cases",
);
const OUT = __dirname;
const LIMIT = Number(process.env.BOARD_LIMIT || 50);

const PREFERRED = [
  /brookes/i,
  /hale/i,
  /trap|hallucin/i,
  /dunn|ellis/i,
  /ahmed/i,
  /grant/i,
  /tobin/i,
  /patel/i,
  /arden/i,
  /mercer/i,
  /vale/i,
  /davies/i,
  /fresh/i,
  /found/i,
  /sc-000/i,
];

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}
function readJson(p) {
  const t = read(p);
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}
function compact(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/\*\*/g, "")
    .trim();
}
function normal(s) {
  return compact(s)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' /.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function firstMatch(text, patterns) {
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) return compact(m[1].replace(/^[:\s-]+/, ""));
  }
  return null;
}
function cleanName(v) {
  if (!v) return null;
  const cleaned = compact(v.replace(/^r\s+v\s+/i, ""));
  return cleaned.split(/\s+(?:DOB|D\.O\.B\.|date of birth)\b|[,(|—–]/i)[0]?.trim() || cleaned;
}

function extractPdfIdentity(bundle) {
  const defendant = cleanName(
    firstMatch(bundle, [
      /\bDefendant\s*:\s*([^\n\r]+)/i,
      /\bR\s+v\s+([A-Z][A-Za-z'’\- ]{2,80})/i,
    ]),
  );
  const charge = firstMatch(bundle, [
    /\bStatement of Offence\s*:\s*([^\n\r]+)/i,
    /\bCharge\s*:\s*([^\n\r]+)/i,
    /\bOffence\s*:\s*([^\n\r]+)/i,
  ]);
  const court = firstMatch(bundle, [
    /\bCourt\s*:\s*([^\n\r]+)/i,
    /\blisted[^\n]{0,40}at\s+([A-Z][^\n,]{4,80}(?:Court|Magistrates|Crown)[^\n,]*)/i,
    /,?\s*([A-Z][A-Za-z'’\- ]{2,60}(?:Magistrates'|Magistrates|Crown)\s*Court)/i,
  ]);
  const hearingRaw = firstMatch(bundle, [
    /\b(?:PTPH|PCM|PTR|Trial|First appearance|Next hearing|Hearing|Listed)\s*(?:listed\s*)?[—–:-]?\s*([0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2}[^.\n]{0,40})/i,
    /\b([0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2})\s*(?:,?\s*[0-9]{1,2}:[0-9]{2})?/i,
    /\b(20[0-9]{2}-[0-9]{2}-[0-9]{2})(?:[T ][0-9:]{4,8})?/i,
  ]);
  const offenceDate = firstMatch(bundle, [
    /\bBetween\s+([0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2}\s+and\s+[0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2})/i,
    /\bOn\s+([0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2})\b/i,
    /\bOffence date\s*:\s*([^\n\r]+)/i,
  ]);

  const families = {
    cctv: /\bcctv\b/i.test(bundle),
    bwv: /\b(?:bwv|body[- ]worn)\b/i.test(bundle),
    cad999: /\b(?:\bcad\b|999|dispatch)\b/i.test(bundle),
    interview: /\binterview\b/i.test(bundle),
    phone: /\b(?:phone|handset|subscriber|download|extraction|whatsapp|sms)\b/i.test(bundle),
    medical: /\b(?:medical|forensic|hospital|sarc)\b/i.test(bundle),
  };

  return { defendant, charge, court, hearingRaw, offenceDate, families, unclear: !defendant && !charge };
}

function extractAppIdentity(app) {
  if (!app || typeof app !== "object") {
    return { present: false, text: "", identity: null, evidenceLabels: [], inventHints: {} };
  }
  const identity = app.caseIdentity || {};
  const text = JSON.stringify(app);
  const evidenceLabels = [
    ...(app.evidenceStates || []).map((e) => e.label),
    ...(app.fiveAnswersEvidenceRows || []).map((e) => e.label),
    ...((app.warningsAndGaps && app.warningsAndGaps.chaseItems) || []).map((e) => e.label),
  ]
    .filter(Boolean)
    .map(String);

  const inventHints = {
    cctv: evidenceLabels.some((l) => /\bcctv\b/i.test(l)) || /\bcctv\b/i.test(text),
    bwv: evidenceLabels.some((l) => /\bbwv|body[- ]worn/i.test(l)),
    cad999: evidenceLabels.some((l) => /\bcad\b|999|dispatch/i.test(l)),
    interview: evidenceLabels.some((l) => /\binterview\b/i.test(l)),
    phone: evidenceLabels.some((l) => /\bphone|subscriber|download|extraction/i.test(l)),
    medical: evidenceLabels.some((l) => /\bmedical|forensic/i.test(l)),
  };

  const courtFromIdentity = identity.court || null;
  const courtFromText = firstMatch(text, [
    /\bCourt\s*:\s*([^\\"\n]{4,80})/i,
    /([A-Za-z][A-Za-z'’\- ]{2,50}(?:Magistrates'|Magistrates|Crown)\s*Court)/i,
  ]);
  const hearingFromIdentity = identity.hearingDateRaw || identity.hearingDateIso || null;
  const hearingFromText = firstMatch(text, [
    /\b(20[0-9]{2}-[0-9]{2}-[0-9]{2})(?:[T ][0-9:]{4,8})?/,
    /\b([0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2})\b/,
  ]);

  return {
    present: true,
    text,
    identity,
    defendant: cleanName(identity.clientLabel || identity.caseTitle),
    charge: identity.allegation || null,
    stage: identity.stage || null,
    court: courtFromIdentity || courtFromText,
    hearingRaw: hearingFromIdentity || hearingFromText,
    evidenceLabels,
    inventHints,
    truthKeyComparison: Array.isArray(app.truthKeyComparison) ? app.truthKeyComparison : [],
    hasCaseIdentity: Boolean(app.caseIdentity),
  };
}

function tokens(name) {
  return normal(name)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !["the", "and", "of", "v", "r"].includes(t));
}

function nameMatch(pdf, app) {
  if (!pdf && !app) return "BOTH_MISSING";
  if (!pdf) return "PDF_UNCLEAR";
  if (!app) return "APP_MISSING";
  const a = tokens(pdf);
  const b = tokens(app);
  if (!a.length || !b.length) return "UNCLEAR";
  const hit = a.filter((t) => b.includes(t)).length;
  if (hit >= Math.min(2, a.length) || (a.length === 1 && b.includes(a[0]))) return "MATCH";
  // surname-only ok
  if (a.slice(-1)[0] && b.includes(a.slice(-1)[0])) return "MATCH_WEAK";
  return "MISMATCH";
}

function softContains(hay, needle) {
  if (!needle) return false;
  const h = normal(hay);
  const n = normal(needle);
  if (!n || n.length < 4) return false;
  if (h.includes(n)) return true;
  const parts = n.split(/\s+/).filter((p) => p.length > 3);
  return parts.length > 0 && parts.filter((p) => h.includes(p)).length >= Math.ceil(parts.length * 0.6);
}

function chargeMatch(pdf, app) {
  if (!pdf) return "PDF_UNCLEAR";
  if (!app) return "APP_MISSING";
  if (softContains(app, pdf) || softContains(pdf, app)) return "MATCH";
  // keyword overlap
  const keys = ["harassment", "affray", "theft", "burglary", "assault", "abh", "gbh", "wounding", "bladed", "knife", "murder", "fraud", "drugs", "possession", "robbery", "criminal damage"];
  const p = normal(pdf);
  const a = normal(app);
  const pk = keys.filter((k) => p.includes(k));
  const ak = keys.filter((k) => a.includes(k));
  if (pk.length && ak.length && pk.some((k) => ak.includes(k))) return "MATCH_WEAK";
  return "MISMATCH";
}

function courtMatch(pdf, app, appText) {
  if (!pdf) return "PDF_UNCLEAR";
  const surfaced = app || (softContains(appText, pdf) ? pdf : null);
  if (!surfaced) {
    // PDF clear court but not in app output identity or text
    if (/court|magistrates|crown/i.test(pdf)) return "APP_MISSING_CLEAR_PDF";
    return "PDF_UNCLEAR";
  }
  if (softContains(surfaced, pdf) || softContains(pdf, surfaced) || softContains(appText, pdf)) return "MATCH";
  return "MISMATCH";
}

function hearingMatch(pdf, app, appText) {
  if (!pdf) return "PDF_UNCLEAR";
  const day = pdf.match(/([0-9]{1,2}\s+[A-Za-z]+\s+20[0-9]{2}|20[0-9]{2}-[0-9]{2}-[0-9]{2})/);
  const token = day ? day[1] : pdf;
  if (app && softContains(app, token)) return "MATCH";
  if (softContains(appText, token)) return "MATCH_IN_TEXT";
  // convert "15 July 2026" -> check month+year at least
  const m = token.match(/([0-9]{1,2})\s+([A-Za-z]+)\s+(20[0-9]{2})/);
  if (m && softContains(appText, m[2]) && softContains(appText, m[3])) return "MATCH_WEAK";
  return "APP_MISSING_CLEAR_PDF";
}

function compareCase(caseId, dir) {
  const bundle = read(path.join(dir, "bundle-text.md")) || read(path.join(dir, "source-extract.txt"));
  if (!bundle) return null;
  const app = readJson(path.join(dir, "casebrain-output.json"));
  const truth = readJson(path.join(dir, "truth-key.json"));
  const pdf = extractPdfIdentity(bundle);
  const out = extractAppIdentity(app);

  const findings = [];
  const push = (severity, code, family, message, extra = {}) => {
    findings.push({ severity, code, family, message, ...extra });
  };

  if (!out.present) {
    push("P3", "NO_APP_OUTPUT", "coverage", "No casebrain-output.json");
    return {
      caseId,
      pdf,
      app: { defendant: null, charge: null, court: null, hearingRaw: null, stage: null, hasCaseIdentity: false, evidenceLabelCount: 0 },
      verdicts: { name: "APP_MISSING", charge: "APP_MISSING", court: "APP_MISSING", hearing: "APP_MISSING" },
      findings,
      truth,
    };
  }
  if (!out.hasCaseIdentity) {
    push("P3", "STALE_SCHEMA", "coverage", "App output missing caseIdentity schema");
  }

  const nm = nameMatch(pdf.defendant, out.defendant);
  if (nm === "MISMATCH") {
    push("P0", "NAME_MISMATCH", "identity", `PDF defendant "${pdf.defendant}" vs app "${out.defendant}"`, {
      pdf: pdf.defendant,
      app: out.defendant,
    });
  } else if (nm === "APP_MISSING" && pdf.defendant) {
    push("P0", "NAME_MISSING_IN_APP", "identity", `PDF has defendant "${pdf.defendant}" but app identity missing`, {
      pdf: pdf.defendant,
    });
  }

  const cm = chargeMatch(pdf.charge, out.charge);
  if (cm === "MISMATCH") {
    push("P1", "CHARGE_MISMATCH", "identity", `PDF charge vs app allegation diverge`, {
      pdf: pdf.charge,
      app: out.charge,
    });
  } else if (cm === "APP_MISSING" && pdf.charge) {
    push("P1", "CHARGE_MISSING_IN_APP", "identity", `PDF charge not in app identity`, { pdf: pdf.charge });
  }

  const courtV = courtMatch(pdf.court, out.court, out.text);
  if (courtV === "MISMATCH") {
    push("P0", "COURT_MISMATCH", "listing", `PDF court "${pdf.court}" vs app "${out.court}"`, {
      pdf: pdf.court,
      app: out.court,
    });
  } else if (courtV === "APP_MISSING_CLEAR_PDF") {
    push("P0", "COURT_CLEAR_BUT_ABSENT", "listing", `PDF names court "${pdf.court}" but app output does not surface it`, {
      pdf: pdf.court,
    });
  }

  const hv = hearingMatch(pdf.hearingRaw, out.hearingRaw, out.text);
  if (hv === "APP_MISSING_CLEAR_PDF") {
    push("P0", "HEARING_DATE_CLEAR_BUT_ABSENT", "listing", `PDF listing "${pdf.hearingRaw}" not surfaced in app output`, {
      pdf: pdf.hearingRaw,
    });
  } else if (hv === "MISMATCH") {
    push("P0", "HEARING_DATE_MISMATCH", "listing", `Listing date mismatch`, {
      pdf: pdf.hearingRaw,
      app: out.hearingRaw,
    });
  }

  // Invent: app evidence/chase mentions family PDF never established
  for (const [fam, established] of Object.entries(pdf.families)) {
    if (!established && out.inventHints[fam]) {
      // phone often true on digital packs — only invent if PDF has zero phone language
      push("P1", "INVENT_" + fam.toUpperCase(), "evidence", `App surfaces ${fam} but PDF does not establish it`, {
        family: fam,
      });
    }
  }

  // Truth-key misalignments (evidence state)
  for (const row of out.truthKeyComparison) {
    if (row && row.aligned === false) {
      push(
        "P2",
        "EVIDENCE_STATE_MISALIGN",
        "evidence",
        `Truth "${row.truthItem}"=${row.truthState} vs app "${row.casebrainLabel}"=${row.casebrainState}`,
        { truthItem: row.truthItem, truthState: row.truthState, appState: row.casebrainState },
      );
    }
  }

  // Expected chase from truth key not present in chase labels
  const expected = Array.isArray(truth?.expectedChaseItems) ? truth.expectedChaseItems : [];
  for (const item of expected) {
    const hit = out.evidenceLabels.some((l) => softContains(l, item) || softContains(item, l));
    if (!hit) {
      push("P2", "EXPECTED_CHASE_MISSING", "chase", `Truth expected chase "${item}" not visible in app evidence/chase labels`, {
        expected: item,
      });
    }
  }

  return {
    caseId,
    pdf,
    app: {
      defendant: out.defendant,
      charge: out.charge,
      court: out.court,
      hearingRaw: out.hearingRaw,
      stage: out.stage,
      hasCaseIdentity: out.hasCaseIdentity,
      evidenceLabelCount: out.evidenceLabels.length,
    },
    verdicts: {
      name: nm,
      charge: cm,
      court: courtV,
      hearing: hv,
    },
    findings,
  };
}

function pickFifty(dirs) {
  const scored = dirs.map((d, i) => {
    const id = path.basename(d);
    let score = 0;
    PREFERRED.forEach((re, pi) => {
      if (re.test(id)) score += 200 - pi * 5;
    });
    if (/^cb-fresh|^cb-found|^cb-trap/i.test(id)) score += 80;
    if (/^sc-/i.test(id)) score += 20;
    if (/^sim-/i.test(id)) score += 5;
    // prefer folders with both bundle + output
    if (fs.existsSync(path.join(d, "bundle-text.md")) && fs.existsSync(path.join(d, "casebrain-output.json"))) {
      score += 30;
    }
    // diversity: include some without invent-prone digital only
    return { d, id, score, i };
  });
  scored.sort((a, b) => b.score - a.score || a.i - b.i);

  const picked = [];
  const buckets = { preferred: 0, sc: 0, sim: 0, other: 0 };
  for (const row of scored) {
    if (picked.length >= LIMIT) break;
    const isPref = PREFERRED.some((re) => re.test(row.id)) || /^cb-/i.test(row.id);
    const isSc = /^sc-/i.test(row.id);
    const isSim = /^sim-/i.test(row.id);
    if (isPref) {
      picked.push(row);
      buckets.preferred++;
      continue;
    }
    if (isSc && buckets.sc < 15) {
      picked.push(row);
      buckets.sc++;
      continue;
    }
    if (isSim && buckets.sim < 20) {
      picked.push(row);
      buckets.sim++;
      continue;
    }
    if (!isSc && !isSim && buckets.other < 10) {
      picked.push(row);
      buckets.other++;
    }
  }
  // fill
  for (const row of scored) {
    if (picked.length >= LIMIT) break;
    if (!picked.find((p) => p.id === row.id)) picked.push(row);
  }
  return picked.slice(0, LIMIT);
}

function cluster(rows) {
  const map = new Map();
  for (const row of rows) {
    for (const f of row.findings) {
      const sig = `${f.severity}:${f.code}:${f.family}`;
      const cur = map.get(sig) || { signature: sig, severity: f.severity, code: f.code, family: f.family, count: 0, caseIds: [], examples: [] };
      cur.count += 1;
      if (!cur.caseIds.includes(row.caseId)) cur.caseIds.push(row.caseId);
      if (cur.examples.length < 4) cur.examples.push({ caseId: row.caseId, message: f.message, pdf: f.pdf, app: f.app });
      map.set(sig, cur);
    }
  }
  const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
  return [...map.values()].sort((a, b) => rank[a.severity] - rank[b.severity] || b.count - a.count);
}

function main() {
  if (!fs.existsSync(CASES_ROOT)) {
    console.error("Missing cases root", CASES_ROOT);
    process.exit(1);
  }
  const dirs = fs
    .readdirSync(CASES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(CASES_ROOT, d.name));
  const picked = pickFifty(dirs);
  const comparisons = [];
  for (const row of picked) {
    const c = compareCase(row.id, row.d);
    if (c) comparisons.push(c);
  }
  const clusters = cluster(comparisons);
  const bySev = { P0: 0, P1: 0, P2: 0, P3: 0 };
  for (const c of comparisons) for (const f of c.findings) bySev[f.severity]++;

  const summary = {
    generatedAt: new Date().toISOString(),
    casesRoot: CASES_ROOT,
    requested: LIMIT,
    compared: comparisons.length,
    totalFindings: comparisons.reduce((s, c) => s + c.findings.length, 0),
    bySeverity: bySev,
    clusterCount: clusters.length,
    casesWithFindings: comparisons.filter((c) => c.findings.length).length,
    identityFailCases: comparisons.filter((c) =>
      c.findings.some((f) => ["NAME_MISMATCH", "NAME_MISSING_IN_APP", "COURT_CLEAR_BUT_ABSENT", "COURT_MISMATCH", "HEARING_DATE_CLEAR_BUT_ABSENT", "HEARING_DATE_MISMATCH", "CHARGE_MISMATCH"].includes(f.code)),
    ).length,
    inventFailCases: comparisons.filter((c) => c.findings.some((f) => String(f.code).startsWith("INVENT_"))).length,
  };

  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(OUT, "case-board.json"), JSON.stringify(comparisons, null, 2));
  fs.writeFileSync(path.join(OUT, "clusters.json"), JSON.stringify(clusters, null, 2));
  fs.writeFileSync(path.join(OUT, "selected-50.json"), JSON.stringify(picked.map((p) => p.id), null, 2));

  const lines = [];
  lines.push("# 50-case PDF ↔ CaseBrain identity board");
  lines.push("");
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push(`Compared: **${summary.compared}** cases from local audit corpus`);
  lines.push(`Findings: **${summary.totalFindings}** (P0 ${bySev.P0} · P1 ${bySev.P1} · P2 ${bySev.P2} · P3 ${bySev.P3})`);
  lines.push(`Cases with any finding: ${summary.casesWithFindings}`);
  lines.push(`Identity/listing fail cases: **${summary.identityFailCases}**`);
  lines.push(`Invent-family fail cases: **${summary.inventFailCases}**`);
  lines.push("");
  lines.push("## What this checks");
  lines.push("- Defendant name");
  lines.push("- Charge / allegation");
  lines.push("- Court name (when PDF is clear)");
  lines.push("- Hearing / listing date (when PDF is clear)");
  lines.push("- Invented CCTV/BWV/CAD/interview/phone/medical when PDF never establishes them");
  lines.push("- Truth-key evidence state misalignment + missing expected chase items");
  lines.push("");
  lines.push("## Ranked shared-root clusters (fix these, not case-by-case)");
  lines.push("");
  for (const c of clusters.slice(0, 20)) {
    lines.push(`### ${c.severity} · ${c.code} · ×${c.count} cases`);
    lines.push(`Family: \`${c.family}\``);
    lines.push(`Cases: ${c.caseIds.slice(0, 12).join(", ")}${c.caseIds.length > 12 ? "…" : ""}`);
    for (const ex of c.examples.slice(0, 2)) {
      lines.push(`- \`${ex.caseId}\`: ${ex.message}`);
    }
    lines.push("");
  }
  lines.push("## Per-case scorecard (fails only)");
  lines.push("");
  lines.push("| Case | Name | Charge | Court | Hearing | #Findings | Top fail |");
  lines.push("|------|------|--------|-------|---------|-----------|----------|");
  for (const c of comparisons.filter((x) => x.findings.length).sort((a, b) => b.findings.length - a.findings.length)) {
    const top = c.findings[0];
    lines.push(
      `| \`${c.caseId}\` | ${c.verdicts.name} | ${c.verdicts.charge} | ${c.verdicts.court} | ${c.verdicts.hearing} | ${c.findings.length} | ${top.code} |`,
    );
  }
  lines.push("");
  lines.push("## Clean cases (no findings)");
  lines.push("");
  const clean = comparisons.filter((c) => !c.findings.length).map((c) => c.caseId);
  lines.push(clean.length ? clean.map((id) => `- \`${id}\``).join("\n") : "_None_");
  lines.push("");
  lines.push("## Next fix order (recommended)");
  lines.push("1. **Listing identity in audit/UI output** — court + hearing date are clear on many PDFs but absent from `casebrain-output` (snapshot currently forces `hearingDateIso: null`).");
  lines.push("2. **Evidence state alignment** — truth-key vs app misalign / expected chase missing.");
  lines.push("3. **Invent families** — any INVENT_* clusters remaining.");
  lines.push("");
  lines.push("_Audit only. Not committed unless asked._");

  fs.writeFileSync(path.join(OUT, "BOARD.md"), lines.join("\n"));
  console.log(JSON.stringify(summary, null, 2));
  console.log("TOP CLUSTERS:");
  for (const c of clusters.slice(0, 10)) {
    console.log(`- ${c.severity} ${c.code} x${c.count}`);
  }
  console.log("Wrote", path.join(OUT, "BOARD.md"));
}

main();
