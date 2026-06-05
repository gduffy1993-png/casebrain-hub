import {
  EXPECTED_PILOT_COURT_TODAY_CASE_COUNT,
  EXPECTED_PILOT_MISSING_EVIDENCE_ITEMS,
  PILOT_COURT_TODAY_ANCHOR_HEADER,
} from "./truth-manifests";
import { ALL_FINGERPRINT_RULES, PROTECTED_FILES_NOTE, type FingerprintRule } from "./issue-fingerprints";
import { runSourceGroundingPatternScan } from "./source-grounding-rubric";
import {
  STRATEGY_FORBIDDEN_PREDICTION,
  STRATEGY_REQUIRED_CONDITIONAL_MARKERS,
} from "./strategy-judge-rubric";
import type {
  AuditorFamilyProfile,
  AuditorIssue,
  AuditorPackId,
  AuditorScreen,
  CaseTruthManifest,
  CollectionStatus,
  ScreenCollection,
  SurfaceSource,
  UserRoleMode,
} from "./types";

const REQUIRED_SCREENS: AuditorScreen[] = [
  "control_room",
  "hearing_war_room",
  "disclosure_chase",
  "documents",
];

function issue(
  partial: Omit<AuditorIssue, "releaseBlocking" | "manifestConfirmed"> & {
    releaseBlocking?: boolean;
    manifestConfirmed?: boolean;
  },
): AuditorIssue {
  const releaseBlocking =
    partial.releaseBlocking ??
    (partial.severity === "CRITICAL" || partial.severity === "HIGH");
  return {
    ...partial,
    releaseBlocking,
    manifestConfirmed: partial.manifestConfirmed ?? true,
  };
}

function auditProfile(manifest: CaseTruthManifest): AuditorFamilyProfile | CaseTruthManifest["profile"] {
  return manifest.auditorFamily ?? manifest.profile;
}

function inferLeakageFingerprint(
  profile: ReturnType<typeof auditProfile>,
  match: string,
): { fingerprint: string; severity: "CRITICAL" | "HIGH"; fix: string } {
  const t = match.toLowerCase();
  if (profile === "violence_domestic_assault") {
    if (/bank|device\/login|account-control|phone extraction|intent to supply/.test(t)) {
      return { fingerprint: "profile_leakage.violence_fraud", severity: "HIGH", fix: "Violence family filter." };
    }
  }
  if (profile === "fraud_account_control") {
    if (/cctv|bwv/.test(t)) return { fingerprint: "profile_leakage.fraud_cctv", severity: "HIGH", fix: "Fraud CCTV/BWV suppress." };
    if (/999|cad/.test(t)) return { fingerprint: "profile_leakage.fraud_cad999", severity: "HIGH", fix: "Fraud CAD/999 suppress." };
    if (/interview admission/.test(t)) return { fingerprint: "source.unsupported_interview_admission", severity: "CRITICAL", fix: "Fraud interview admission wording." };
    if (/expert|against defence/.test(t)) return { fingerprint: "source.expert_against_defence", severity: "HIGH", fix: "Fraud expert/source wording." };
  }
  if (profile === "pwits_phone_attribution") {
    if (/mg11|consistent/.test(t)) return { fingerprint: "profile_leakage.pwits_mg11", severity: "HIGH", fix: "PWITS MG11 suppress." };
    if (/dna|fingerprint/.test(t)) return { fingerprint: "profile_leakage.pwits_dna_fingerprint", severity: "HIGH", fix: "PWITS DNA/fingerprint suppress." };
    if (/cctv|crown timing/.test(t)) return { fingerprint: "profile_leakage.pwits_cctv", severity: "HIGH", fix: "PWITS CCTV suppress." };
  }
  if (profile === "robbery_identification") {
    if (/phone/.test(t)) return { fingerprint: "profile_leakage.robbery_phone", severity: "HIGH", fix: "Robbery phone suppress." };
    if (/pwits|intent to supply|class a/.test(t)) return { fingerprint: "profile_leakage.robbery_pwits", severity: "HIGH", fix: "Robbery PWITS suppress." };
    if (/bank|device|poca/.test(t)) return { fingerprint: "profile_leakage.robbery_bank_device", severity: "HIGH", fix: "Robbery fraud leakage suppress." };
    if (/cad|999.*crown/.test(t)) return { fingerprint: "source.overstated_cad999", severity: "HIGH", fix: "Soften CAD/999 certainty." };
  }
  return { fingerprint: "strategy.wrong_primary_route", severity: "HIGH", fix: "Profile filter in pilot-workflow." };
}

function profileLeakageRuleApplies(
  fingerprint: string,
  profile: ReturnType<typeof auditProfile>,
): boolean {
  if (fingerprint.startsWith("profile_leakage.fraud_")) return profile === "fraud_account_control";
  if (fingerprint.startsWith("profile_leakage.pwits_")) return profile === "pwits_phone_attribution";
  if (fingerprint.startsWith("profile_leakage.robbery_")) return profile === "robbery_identification";
  if (fingerprint.startsWith("profile_leakage.violence_")) return profile === "violence_domestic_assault";
  return true;
}

function matchFingerprintRulesForProfile(
  text: string,
  profile: ReturnType<typeof auditProfile>,
): Array<FingerprintRule & { match: string }> {
  const hits: Array<FingerprintRule & { match: string }> = [];
  for (const rule of ALL_FINGERPRINT_RULES) {
    if (!profileLeakageRuleApplies(rule.fingerprint, profile)) continue;
    if (rule.patterns.length === 0) continue;
    for (const re of rule.patterns) {
      const m = text.match(re);
      if (m) {
        hits.push({ ...rule, match: m[0] });
        break;
      }
    }
  }
  return hits;
}

function fingerprintHits(
  runId: string,
  pack: AuditorPackId,
  manifest: CaseTruthManifest,
  screen: AuditorScreen,
  text: string,
  col: ScreenCollection,
  includeSynthetic: boolean,
): AuditorIssue[] {
  if (col.surfaceSource === "synthetic" && !includeSynthetic) return [];

  const out: AuditorIssue[] = [];
  const seen = new Set<string>();

  for (const hit of matchFingerprintRulesForProfile(text, auditProfile(manifest))) {
    const key = `${hit.fingerprint}|${hit.match}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      issue({
        runId,
        pack,
        caseId: manifest.caseId,
        caseTitle: manifest.caseTitle,
        screen,
        status: hit.severity === "LOW" || hit.severity === "MEDIUM" ? "weak" : "fail",
        severity: hit.severity,
        fingerprint: hit.fingerprint,
        issueFamily: hit.issueFamily,
        badText: hit.match,
        expected: hit.expected,
        surfaceSource: col.surfaceSource,
        collectionStatus: col.collectionStatus,
        suggestedSharedFix: hit.suggestedSharedFix,
        demoBlocker: hit.demoBlocker,
        message: `${hit.fingerprint}: ${hit.match}`,
      }),
    );
  }

  for (const src of runSourceGroundingPatternScan(text)) {
    const key = `${src.fingerprint}|${src.match}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(
      issue({
        runId,
        pack,
        caseId: manifest.caseId,
        caseTitle: manifest.caseTitle,
        screen,
        status: "fail",
        severity: src.severity,
        fingerprint: src.fingerprint,
        issueFamily: "source",
        badText: src.match,
        expected: src.expected,
        surfaceSource: col.surfaceSource,
        collectionStatus: col.collectionStatus,
        suggestedSharedFix: "source-grounding filters in pilot-workflow / brief builders.",
        demoBlocker: true,
        message: `${src.fingerprint}: ${src.match}`,
      }),
    );
  }

  return out;
}

function checkManifestForbidden(
  runId: string,
  pack: AuditorPackId,
  manifest: CaseTruthManifest,
  screen: AuditorScreen,
  text: string,
  col: ScreenCollection,
  skipTexts: Set<string>,
): AuditorIssue[] {
  if (col.surfaceSource === "synthetic") return [];
  const out: AuditorIssue[] = [];

  for (const re of manifest.forbiddenConcepts) {
    const m = text.match(re);
    if (!m || skipTexts.has(m[0].toLowerCase())) continue;
    const fp = inferLeakageFingerprint(auditProfile(manifest), m[0]);
    out.push(
      issue({
        runId,
        pack,
        caseId: manifest.caseId,
        caseTitle: manifest.caseTitle,
        screen,
        status: "fail",
        severity: fp.severity,
        fingerprint: fp.fingerprint,
        issueFamily: "profile_leakage",
        badText: m[0],
        expected: `Forbidden for ${manifest.profile}.`,
        surfaceSource: col.surfaceSource,
        collectionStatus: col.collectionStatus,
        suggestedSharedFix: fp.fix,
        demoBlocker: true,
        message: `${fp.fingerprint}: ${m[0]}`,
      }),
    );
  }

  for (const re of manifest.forbiddenMalformedAnchors) {
    const m = text.match(re);
    if (!m || skipTexts.has(m[0].toLowerCase())) continue;
    const fp = m[0].includes("second male") ? "anchor.cutoff_fragment" : "anchor.malformed_joined_digits";
    out.push(
      issue({
        runId,
        pack,
        caseId: manifest.caseId,
        caseTitle: manifest.caseTitle,
        screen,
        status: "fail",
        severity: "HIGH",
        fingerprint: fp,
        issueFamily: "anchor",
        badText: m[0].slice(0, 120),
        expected: "Clean anchors.",
        surfaceSource: col.surfaceSource,
        collectionStatus: col.collectionStatus,
        suggestedSharedFix: "sanitizePilotEvidenceAnchors.",
        demoBlocker: true,
        message: `${fp}: ${m[0].slice(0, 80)}`,
      }),
    );
  }

  return out;
}

function fieldFail(
  runId: string,
  pack: AuditorPackId,
  manifest: Pick<CaseTruthManifest, "caseId" | "caseTitle" | "profile">,
  screen: AuditorScreen,
  severity: AuditorIssue["severity"],
  fingerprint: string,
  badText: string,
  expected: string,
  col: ScreenCollection,
  demoBlocker = true,
): AuditorIssue {
  return issue({
    runId,
    pack,
    caseId: manifest.caseId,
    caseTitle: manifest.caseTitle,
    screen,
    status: severity === "LOW" || severity === "MEDIUM" ? "weak" : "fail",
    severity,
    fingerprint,
    issueFamily: fingerprint.split(".")[0] ?? "strategy",
    badText,
    expected,
    surfaceSource: col.surfaceSource,
    collectionStatus: col.collectionStatus,
    suggestedSharedFix: `Shared fix for ${fingerprint}. ${PROTECTED_FILES_NOTE}`,
    demoBlocker,
    message: `${fingerprint}: ${badText}`,
  });
}

function scoreScreenFields(
  runId: string,
  pack: AuditorPackId,
  manifest: CaseTruthManifest,
  screen: AuditorScreen,
  col: ScreenCollection,
  userRole: UserRoleMode,
): AuditorIssue[] {
  const issues: AuditorIssue[] = [];
  const p = col.payload;

  if (screen === "control_room") {
    const title = String(p.displayTitle ?? "");
    const route = String(p.primaryRoute ?? "");
    if (title && !title.includes(manifest.expectedDefendant)) {
      issues.push(
        fieldFail(runId, pack, manifest, screen, "CRITICAL", "strategy.wrong_primary_route", title, manifest.expectedDefendant, col),
      );
    }
    if (route) {
      const familyOk =
        (manifest.profile === "fraud_account_control" && /fraud|account|dishonesty/i.test(route)) ||
        (manifest.profile === "pwits_phone_attribution" && /possession|phone|supply/i.test(route)) ||
        (manifest.profile === "robbery_identification" && /identification|participation|attribution/i.test(route));
      if (!familyOk) {
        issues.push(
          fieldFail(runId, pack, manifest, screen, "CRITICAL", "strategy.wrong_primary_route", route, manifest.expectedRouteTitle, col),
        );
      }
    }
    const safeLine = String(p.safeCourtLine ?? "");
    if (safeLine && !STRATEGY_REQUIRED_CONDITIONAL_MARKERS.some((re) => re.test(safeLine))) {
      issues.push(
        fieldFail(runId, pack, manifest, screen, "MEDIUM", "strategy.unsafe_court_line", safeLine, "Conditional court line.", col, false),
      );
    }
    const actions = (p.nextActions as string[]) ?? [];
    if (actions.length < 3) {
      issues.push(
        fieldFail(runId, pack, manifest, screen, "MEDIUM", "strategy.weak_next_actions", String(actions.length), "≥3 next actions.", col, false),
      );
    }
    const reasoningV2 = p.reasoningV2Panel as { lintIssues?: string[] } | undefined;
    if (reasoningV2?.lintIssues?.length) {
      issues.push(
        fieldFail(
          runId,
          pack,
          manifest,
          screen,
          "HIGH",
          "wording.reasoning_v2_internal_leak",
          reasoningV2.lintIssues.join("; "),
          "No internal/eval/corpus text in Reasoning V2 panel when flag is on.",
          col,
        ),
      );
    }
  }

  if (screen === "hearing_war_room") {
    const combined = col.allText;
    if (userRole === "pilot-non-admin" && /Record position before hearing/i.test(combined)) {
      issues.push(
        fieldFail(runId, pack, manifest, screen, "HIGH", "ui.record_position_visible_pilot", "Record position before hearing", "Confirm instructions wording.", col),
      );
    }
    for (const re of STRATEGY_FORBIDDEN_PREDICTION) {
      const m = combined.match(re);
      if (m) issues.push(fieldFail(runId, pack, manifest, screen, "MEDIUM", "strategy.unsafe_court_line", m[0], "No prediction.", col, true));
    }
  }

  if (screen === "disclosure_chase") {
    const count = Number(p.primaryCount ?? 0);
    if (count !== manifest.expectedDisclosureItemCount) {
      issues.push(
        fieldFail(runId, pack, manifest, screen, "HIGH", "strategy.wrong_primary_route", String(count), `${manifest.expectedDisclosureItemCount} items.`, col),
      );
    }
    const labels = ((p.primaryLabels as string[]) ?? []).join("\n");
    if (userRole === "pilot-non-admin" && /Mark chased|Mark received/i.test(labels)) {
      issues.push(
        fieldFail(runId, pack, manifest, screen, "HIGH", "ui.mark_chased_visible_pilot", labels.slice(0, 80), "No admin chase buttons.", col),
      );
    }
  }

  if (screen === "documents") {
    if (!p.hasViewContract) {
      issues.push(
        fieldFail(runId, pack, manifest, screen, "HIGH", "ui.documents_missing_view_button", "no View contract", "View/Open visible.", col),
      );
    }
    if (p.hashOnlyNav && !p.usesTabDocuments) {
      issues.push(
        fieldFail(runId, pack, manifest, screen, "HIGH", "ui.documents_scroll_hack", "#case-files", "?tab=documents nav.", col),
      );
    }
  }

  return issues;
}

export function scoreCaseScreens(
  runId: string,
  pack: AuditorPackId,
  manifest: CaseTruthManifest,
  screens: ScreenCollection[],
  opts: { includeSynthetic: boolean; userRole: UserRoleMode },
): AuditorIssue[] {
  const issues: AuditorIssue[] = [];
  const byScreen = new Map(screens.map((s) => [s.screen, s]));

  for (const name of REQUIRED_SCREENS) {
    const col = byScreen.get(name);
    if (!col) {
      issues.push(
        issue({
          runId,
          pack,
          caseId: manifest.caseId,
          caseTitle: manifest.caseTitle,
          screen: name,
          status: "fail",
          severity: "HIGH",
          fingerprint: "ui.surface_not_collected",
          issueFamily: "ui",
          badText: "",
          expected: `${name} must be collected.`,
          surfaceSource: "live-builder",
          collectionStatus: "missing",
          suggestedSharedFix: `Fix collector for ${name}.`,
          demoBlocker: true,
          message: `Missing screen: ${name}`,
        }),
      );
      continue;
    }

    if (col.collectionStatus === "missing") {
      issues.push(
        issue({
          runId,
          pack,
          caseId: manifest.caseId,
          caseTitle: manifest.caseTitle,
          screen: name,
          status: "fail",
          severity: "HIGH",
          fingerprint: "ui.surface_not_collected",
          issueFamily: "ui",
          badText: String(col.payload.error ?? ""),
          expected: "Collected surface required.",
          surfaceSource: col.surfaceSource,
          collectionStatus: "missing",
          suggestedSharedFix: "Fix surface collector.",
          demoBlocker: true,
          message: `Not collected: ${name}`,
        }),
      );
      continue;
    }

    const fpIssues = fingerprintHits(runId, pack, manifest, name, col.allText, col, opts.includeSynthetic);
    issues.push(...fpIssues);
    const skipTexts = new Set(fpIssues.map((i) => i.badText.toLowerCase()).filter(Boolean));
    issues.push(...checkManifestForbidden(runId, pack, manifest, name, col.allText, col, skipTexts));
    issues.push(...scoreScreenFields(runId, pack, manifest, name, col, opts.userRole));
  }

  return dedupeIssues(issues);
}

export function scorePilotUi(
  runId: string,
  pack: AuditorPackId,
  col: ScreenCollection,
  userRole: UserRoleMode,
): AuditorIssue[] {
  if (userRole !== "pilot-non-admin") return [];
  const stub = { caseId: "_pilot_ui", caseTitle: "Pilot UI", profile: "fraud_account_control" as const };
  const issues: AuditorIssue[] = [];

  if (col.collectionStatus === "partial" || col.collectionStatus === "synthetic") {
    issues.push(
      fieldFail(
        runId,
        pack,
        stub,
        "pilot_ui",
        "MEDIUM",
        "ui.surface_not_collected",
        "NEXT_PUBLIC_CRIMINAL_PILOT_MODE not set",
        "Run auditor with pilot mode env for live pilot UI flags.",
        col,
        false,
      ),
    );
    return issues;
  }

  const p = col.payload;
  if (!p.uploadDisabled) {
    issues.push(fieldFail(runId, pack, stub, "pilot_ui", "HIGH", "ui.upload_visible_pilot", "upload enabled", "Upload hidden.", col));
  }
  if (!p.chaseActionsHidden) {
    issues.push(fieldFail(runId, pack, stub, "pilot_ui", "HIGH", "ui.mark_chased_visible_pilot", "chase visible", "Chase hidden.", col));
  }
  if (!p.routeDetailHidden) {
    issues.push(fieldFail(runId, pack, stub, "pilot_ui", "HIGH", "ui.route_detail_visible_locked_pilot", "route detail visible", "Route detail hidden.", col));
  }
  return issues;
}

export function scoreAggregateCourtToday(
  runId: string,
  pack: AuditorPackId,
  col: ScreenCollection,
  userRole: UserRoleMode,
): AuditorIssue[] {
  if (userRole !== "pilot-non-admin") return [];
  const stub = { caseId: "court_today_agg", caseTitle: "Court Today", profile: "fraud_account_control" as const };
  const issues: AuditorIssue[] = [];
  const p = col.payload;

  if (col.collectionStatus === "missing") {
    return [fieldFail(runId, pack, stub, "court_today", "HIGH", "ui.surface_not_collected", "", "Court Today aggregate.", col)];
  }

  const header = String(p.header ?? "");
  if (!PILOT_COURT_TODAY_ANCHOR_HEADER.test(header)) {
    issues.push(fieldFail(runId, pack, stub, "court_today", "HIGH", "court_today.demo_date_not_locked", header, "Monday, 1 June 2026.", col));
  }

  const todayCount = Number(p.todayCount ?? 0);
  if (todayCount < EXPECTED_PILOT_COURT_TODAY_CASE_COUNT) {
    issues.push(
      fieldFail(runId, pack, stub, "court_today", "CRITICAL", "court_today.demo_cases_missing", String(todayCount), `${EXPECTED_PILOT_COURT_TODAY_CASE_COUNT} cases.`, col),
    );
  }

  const missing = Number(p.missingEvidenceItems ?? 0);
  if (missing !== EXPECTED_PILOT_MISSING_EVIDENCE_ITEMS) {
    issues.push(
      fieldFail(runId, pack, stub, "court_today", "HIGH", "court_today.count_mismatch", String(missing), `${EXPECTED_PILOT_MISSING_EVIDENCE_ITEMS} missing-evidence items.`, col),
    );
  }

  const titles = ((p.visibleTitles as string[]) ?? []).join("\n");
  if (/CB-TRAP|eval pack|date-control/i.test(titles)) {
    issues.push(fieldFail(runId, pack, stub, "court_today", "CRITICAL", "court_today.dev_case_visible", titles.slice(0, 100), "No dev/eval cases.", col));
  }

  return issues;
}

function dedupeIssues(issues: AuditorIssue[]): AuditorIssue[] {
  const seen = new Set<string>();
  return issues.filter((i) => {
    const key = `${i.caseId}|${i.screen}|${i.fingerprint}|${i.badText.slice(0, 60)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function partitionIssues(issues: AuditorIssue[]) {
  const failures = issues.filter((i) => i.status === "fail" && i.releaseBlocking);
  const weak = issues.filter((i) => i.status === "weak" || (i.status === "fail" && !i.releaseBlocking));
  const releaseBlocking = issues.filter((i) => i.releaseBlocking);
  return { failures, weak, releaseBlocking };
}
