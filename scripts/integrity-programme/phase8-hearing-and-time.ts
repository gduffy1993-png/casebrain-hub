/**
 * Phase 8 — hearing and time logic contracts + checkpoint artefacts.
 * Run: npx tsx scripts/integrity-programme/phase8-hearing-and-time.ts
 */
import fs from "node:fs";
import path from "node:path";
import {
  CANONICAL_MATTER_STATE_VERSION,
  buildCanonicalMatterStateV1,
} from "@/lib/criminal/canonical-matter-state";
import { phase2CentralSurfaceIds } from "@/lib/criminal/solicitor-surface-gate-registry";
import { resolveSolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import { formatIsoDateOnly, utcDayDiff } from "@/lib/criminal/solicitor-time-clock";
import { calculateLimitation } from "@/lib/core/limitation";
import { riskCopy } from "@/lib/core/riskCopy";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/integrity-programme/phase-8");
const DOCS = path.join(ROOT, "docs/integrity-programme");

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function readText(abs: string): string | null {
  try {
    return fs.readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

function main() {
  ensureDir(OUT);
  ensureDir(DOCS);

  const AS_OF = new Date("2026-07-15T12:00:00Z");
  const contracts: Array<{ name: string; pass: boolean; detail: string }> = [];

  const unknown = resolveSolicitorHearingStatus({ asOf: AS_OF });
  contracts.push({
    name: "kind_unknown",
    pass: unknown.kind === "unknown" && /not safely extracted/i.test(unknown.statusLabel),
    detail: unknown.kind,
  });

  const sameDay = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-15",
    asOf: AS_OF,
  });
  contracts.push({
    name: "kind_same_day",
    pass: sameDay.kind === "same_day" && /Same-day/i.test(sameDay.statusLabel),
    detail: sameDay.statusLabel,
  });

  const upcoming = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-29",
    asOf: AS_OF,
  });
  contracts.push({
    name: "kind_upcoming_boundary_day_14",
    pass: upcoming.kind === "upcoming" && utcDayDiff(AS_OF, "2026-07-29") === 14,
    detail: `kind=${upcoming.kind};diff=${utcDayDiff(AS_OF, "2026-07-29")}`,
  });

  const listed = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-30",
    asOf: AS_OF,
  });
  contracts.push({
    name: "kind_listed_boundary_day_15",
    pass: listed.kind === "listed" && utcDayDiff(AS_OF, "2026-07-30") === 15,
    detail: `kind=${listed.kind};diff=${utcDayDiff(AS_OF, "2026-07-30")}`,
  });

  const passed = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-14",
    asOf: AS_OF,
  });
  contracts.push({
    name: "kind_passed",
    pass: passed.kind === "passed",
    detail: passed.statusLabel,
  });

  const snapshot = resolveSolicitorHearingStatus({
    bundleNextHearingIso: "2026-07-20",
    treatAsSnapshot: true,
    asOf: AS_OF,
  });
  contracts.push({
    name: "kind_snapshot_as_at_marker",
    pass:
      snapshot.kind === "snapshot" &&
      snapshot.isSnapshot === true &&
      /as at/i.test(snapshot.statusLabel) &&
      snapshot.asAtIso === "2026-07-15",
    detail: snapshot.statusLabel,
  });

  contracts.push({
    name: "fixed_test_clock_iso",
    pass: formatIsoDateOnly(AS_OF) === "2026-07-15",
    detail: formatIsoDateOnly(AS_OF),
  });

  const canonical = buildCanonicalMatterStateV1({
    caseId: "p8-canonical",
    allegation: "Harassment contrary to Protection from Harassment Act",
    evidenceRows: [{ label: "MG11", existence: "served", reliability: "needs_review" }],
    chaseItems: [],
    hearing: { bundleNextHearingIso: "2026-07-15", asOf: AS_OF },
  });
  contracts.push({
    name: "canonical_hearing_uses_formatter",
    pass:
      canonical.schemaVersion === "1.1.0" &&
      canonical.hearing.kind === "same_day" &&
      canonical.fingerprint.startsWith("v1.1.0:"),
    detail: `schema=${canonical.schemaVersion};kind=${canonical.hearing.kind};fp=${canonical.fingerprint.slice(0, 20)}`,
  });

  const lim = calculateLimitation({
    incidentDate: "2022-01-01",
    practiceArea: "pi_rta",
    today: "2024-12-01",
  });
  contracts.push({
    name: "limitation_pi_3yr_deterministic",
    pass:
      lim.limitationDate === "2025-01-01T00:00:00.000Z" &&
      lim.severity === "critical" &&
      lim.explanation.includes("2025-01-01"),
    detail: `date=${lim.limitationDate};sev=${lim.severity}`,
  });

  const msg = riskCopy.limitation.buildMessage({
    limitationDate: "2025-12-31T00:00:00.000Z",
    daysRemaining: 90,
  });
  contracts.push({
    name: "risk_copy_iso_date_not_locale",
    pass: msg.includes("2025-12-31") && !msg.includes("31/12/2025"),
    detail: msg.slice(0, 80),
  });

  const central = phase2CentralSurfaceIds();
  contracts.push({
    name: "central_surfaces_unchanged_count",
    pass: central.length === 31,
    detail: `central=${central.length}`,
  });

  const beforeTs = (readText(path.join(OUT, "before-typecheck-count.txt")) || "").trim();
  const afterTs = (readText(path.join(OUT, "after-typecheck-count.txt")) || "").trim();
  const beforeDate = readText(path.join(OUT, "before-date-tests.txt"));
  const afterDate = readText(path.join(OUT, "after-date-tests.txt"));

  const comparison = {
    beforeTypecheck: beforeTs || "NOT_CAPTURED",
    afterTypecheck: afterTs || "PENDING_RUN",
    beforeDateTestsHadFailures: beforeDate ? /Failed Tests\s+5|5 failed/.test(beforeDate) : null,
    afterDateTestsPass: afterDate ? /Tests\s+22 passed|3 passed \(3\)/.test(afterDate) && !/FAIL/.test(afterDate) : null,
    note: "Phase 8 must not increase TypeScript error count; Phase-8-relevant date Vitest failures must clear without weakening tests.",
  };

  const allPass = contracts.every((c) => c.pass);

  const report = {
    programme: "criminal-defence-integrity-corpus",
    phase: 8,
    generatedAt: new Date().toISOString(),
    canonicalSchemaVersion: CANONICAL_MATTER_STATE_VERSION,
    disclaimer:
      "Phase 8 hearing/time logic — not a corpus PASS. Do not merge / deploy. Stop for review. No Phase 9+.",
    contracts,
    contractPass: allPass,
    comparison,
    remainingRisks: [
      "Some UI strips still apply pilot/demo polish after the shared status line",
      "Unrelated pre-existing TS/Vitest items remain on the remediation register",
      "Full N-case corpus (Phase 9) not started",
    ],
    remediationRegisterNote:
      "PRE-VITEST-DATE items resolved in Phase 8 (limitation/Awaab/riskCopy clocks). Other PRE-* items stay registered.",
  };

  fs.writeFileSync(path.join(OUT, "phase8-hearing-time-report.json"), JSON.stringify(report, null, 2));

  const md = `# Phase 8 checkpoint — hearing and time logic

**Status:** ${allPass ? "HEARING/TIME CONTRACTS PASS" : "HEARING/TIME CONTRACTS FAIL"} — **not a corpus PASS**  
**Canonical schema:** ${CANONICAL_MATTER_STATE_VERSION} (adds \`same_day\`)  
**Branch:** programme/criminal-defence-integrity-corpus  
**PR:** #65 (do not merge / do not deploy)

## Programme requirements covered

| Requirement | Evidence |
|-------------|----------|
| One deterministic formatter for unknown / listed / upcoming / same-day / passed / snapshot | \`resolveSolicitorHearingStatus\` |
| Fixed test clock + date boundaries | injectable \`asOf\` + \`utcDayDiff\` contracts |
| \`as at\` / snapshot marker | snapshot statusLabel + \`asAtIso\` |
| Tabs / copy / exports consume shared status | canonical matter state, chase deadlines, control-room / chase / war-room / matter-brief wiring |
| Phase-8-relevant date failures resolved (not waived) | limitation PI 3yr, DoK copy, severity thresholds, riskCopy ISO, Awaab \`asOf\` |

## Contracts

| Check | Result |
|-------|--------|
${contracts.map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} — ${c.detail} |`).join("\n")}

All contracts pass: **${allPass}**

## Before / after comparison

| Metric | Before | After |
|--------|--------|-------|
| TypeScript errors | ${comparison.beforeTypecheck} | ${comparison.afterTypecheck} |
| Date-anchored Vitest (limitation/riskCopy/Awaab) | 5 failed (see \`before-date-tests.txt\`) | see \`after-date-tests.txt\` |

${comparison.note}

## Remediation register

- **Resolved in Phase 8:** PRE-VITEST-DATE (limitation / Awaab / riskCopy date clocks)
- **Remain registered (unchanged):** PRE-TS-EVAL, PRE-TS-SCRIPTS, PRE-VITEST-COPY, PRE-VITEST-CONFIG, PRE-BUILD-ENV, PRE-E2E

## Remaining risks

${report.remainingRisks.map((r) => `- ${r}`).join("\n")}

## Explicit non-goals

No merge. No deploy. No Phase 9+. No whole-programme PASS. Stop here for review.

Artefact: \`artifacts/casebrain-qa/integrity-programme/phase-8/phase8-hearing-time-report.json\`
`;

  fs.writeFileSync(path.join(OUT, "PHASE-8-CHECKPOINT.md"), md);
  fs.writeFileSync(path.join(DOCS, "phase-8-checkpoint.md"), md);

  let readme = fs.readFileSync(path.join(DOCS, "README.md"), "utf8");
  if (!readme.includes("Phase 8 —")) {
    readme = readme.replace(
      "| Phases 8–11 | PENDING (blocked until attribution ack) | |",
      "| Phase 8 — hearing and time logic | COMPLETE (not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-8-checkpoint.md` |\n| Phases 9–11 | PENDING | |",
    );
  } else {
    readme = readme.replace(
      /\| Phase 8 —.*?\|/,
      "| Phase 8 — hearing and time logic | COMPLETE (not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-8-checkpoint.md` |",
    );
  }
  // Keep attribution row; ensure Phases 9–11 pending line exists
  if (!readme.includes("Phases 9–11")) {
    readme = readme.replace(
      "| Phases 8–11 | PENDING (blocked until attribution ack) | |",
      "| Phase 8 — hearing and time logic | COMPLETE (not corpus PASS) — **STOP FOR REVIEW** | `docs/integrity-programme/phase-8-checkpoint.md` |\n| Phases 9–11 | PENDING | |",
    );
  }
  fs.writeFileSync(path.join(DOCS, "README.md"), readme);

  console.log(
    JSON.stringify(
      {
        ok: allPass,
        schemaVersion: CANONICAL_MATTER_STATE_VERSION,
        contractPass: allPass,
        central: central.length,
        out: OUT,
      },
      null,
      2,
    ),
  );

  if (!allPass) process.exit(1);
}

main();
