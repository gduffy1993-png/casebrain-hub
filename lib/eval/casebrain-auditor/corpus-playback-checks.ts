import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";
import type { CorpusCasePlayback, PlaybackFinding, PlaybackSection } from "./corpus-playback-types";
import type { AuditorFamilyProfile } from "./types";
import { redactPlaybackSnippet } from "./corpus-playback-redact";

function finding(
  section: PlaybackSection,
  checkId: string,
  severity: PlaybackFinding["severity"],
  raw: string,
  message: string,
): PlaybackFinding {
  return {
    section,
    checkId,
    severity,
    snippet: redactPlaybackSnippet(raw),
    message,
  };
}

export function inferFamilyFromRouteTitle(title: string | null | undefined): AuditorFamilyProfile | null {
  const t = (title ?? "").toLowerCase();
  if (!t.trim()) return null;
  if (/\bfraud|account[-\s]?control|dishonest\b/.test(t)) return "fraud_account_control";
  if (/\bpwit|pwits|possession|supply|class a|class b|drug\b/.test(t)) return "pwits_phone_attribution";
  if (/\bviolence|complainant|gbh|abh|assault|affray|domestic|public[-\s]?order|injury|arson\b/.test(t)) {
    return "violence_domestic_assault";
  }
  if (/\brobbery|snatch|mugging\b/.test(t)) return "robbery_identification";
  if (/\bidentification\b/.test(t) && /\brobbery|snatch|mugging\b/.test(t)) return "robbery_identification";
  return null;
}

function lineLooksOverconfident(line: string): boolean {
  if (/do not overstate|provisional|conditional on served|may\b|appears outstanding/i.test(line)) {
    return false;
  }
  if (/\b(proves|establishes guilt|confirms participation|definitely shows|narrows the defence route)\b/i.test(line)) {
    return true;
  }
  if (/\b(confirms|establishes|admitted)\b/i.test(line) && !/\bmay\b/i.test(line)) {
    return true;
  }
  return false;
}

function solicitorVisibleLeakageTexts(playback: CorpusCasePlayback): string[] {
  return [
    playback.primaryRouteTitle ?? "",
    playback.solicitorSafeSummary ?? "",
    ...playback.courtLines,
    ...playback.hearingLines,
    ...playback.disclosureChaseLabels,
    ...playback.evidenceAnchors.slice(0, 4),
  ].filter(Boolean);
}

function familiesConflict(a: AuditorFamilyProfile | null, b: AuditorFamilyProfile | null): boolean {
  if (!a || !b) return false;
  return a !== b;
}

const FRAUD_LEAK = /\b(fraud|bank|account[-\s]?control|poca|device login)\b/i;
const PWITS_LEAK = /\b(pwits|pwit|class a|phone extraction|mg11 is consistent)\b/i;
const ROBBERY_LEAK = /\b(robbery identification|second[-\s]?male|viper|id parade)\b/i;
const VIOLENCE_LEAK = /\b(complainant account|gbh|abh|domestic|bwv)\b/i;
const CCTV_STRONG = /\b(full cctv confirms|cctv confirms)\b/i;
const CAD_STRONG = /\b(cad\/999 timing supports|999\/cad timing supports)\b/i;
const INTERVIEW_ADMISSION = /interview admission narrows/i;
const EVAL_JUNK = /\b(CB-TRAP|eval pack|date-control)\b/i;
const OVERCONFIDENT = /\b(proves|establishes guilt|confirms participation|definitely shows|narrows the defence route)\b/i;
const COURT_OVERCONFIDENT = /\b(proves|confirms|establishes|admitted)\b/i;
const POLICE_UNSUPPORTED = /\b(interview admission|confirms guilt|custody record confirms)\b/i;

function leakageFindings(
  playback: CorpusCasePlayback,
  profile: WorkflowProfile,
  text: string,
  section: PlaybackSection,
): PlaybackFinding[] {
  const out: PlaybackFinding[] = [];
  const push = (checkId: string, severity: PlaybackFinding["severity"], re: RegExp, msg: string) => {
    const m = text.match(re);
    if (m) out.push(finding(section, checkId, severity, m[0], msg));
  };

  if (profile === "fraud_account_control") {
    push("profile_leakage.fraud_cctv", "unsafe", CCTV_STRONG, "Fraud profile must not state CCTV as confirmed.");
    push("profile_leakage.fraud_cad999", "unsafe", CAD_STRONG, "Fraud profile must not foreground CAD/999 as Crown fact.");
    push("profile_leakage.fraud_violence", "needs_review", VIOLENCE_LEAK, "Possible violence-family leakage on fraud matter.");
    push("profile_leakage.fraud_pwits", "needs_review", PWITS_LEAK, "Possible PWITS leakage on fraud matter.");
  }
  if (profile === "pwits_phone_attribution") {
    push("profile_leakage.pwits_fraud", "needs_review", FRAUD_LEAK, "Possible fraud leakage on PWITS matter.");
    push("profile_leakage.pwits_robbery", "needs_review", ROBBERY_LEAK, "Possible robbery-ID leakage on PWITS matter.");
    push("profile_leakage.pwits_cctv", "unsafe", CCTV_STRONG, "PWITS must not state full CCTV confirms timing.");
  }
  if (profile === "robbery_identification") {
    push("profile_leakage.robbery_fraud", "needs_review", FRAUD_LEAK, "Possible fraud leakage on robbery matter.");
    push("profile_leakage.robbery_pwits", "needs_review", PWITS_LEAK, "Possible PWITS leakage on robbery matter.");
  }
  if (profile === "violence_domestic_assault") {
    push("profile_leakage.violence_fraud", "needs_review", FRAUD_LEAK, "Possible fraud leakage on violence matter.");
    push("profile_leakage.violence_pwits", "needs_review", PWITS_LEAK, "Possible PWITS leakage on violence matter.");
  }

  if (EVAL_JUNK.test(text) && (playback.corpusBucket === "A" || playback.corpusBucket === "B")) {
    out.push(finding(section, "wording.internal_debug_visible", "unsafe", text.match(EVAL_JUNK)![0], "Eval/dev label in pilot-visible bucket."));
  }

  return out;
}

export function runCorpusPlaybackChecks(playback: CorpusCasePlayback): PlaybackFinding[] {
  const findings: PlaybackFinding[] = [];
  const chargeFamily = playback.inferredChargeFamily;
  const routeFamily = playback.routeFamily;
  const profile = playback.workflowProfile;

  if (playback.inferenceText.trim() && !chargeFamily) {
    findings.push(
      finding(
        "routing_mismatch",
        "routing.unknown_with_metadata",
        "needs_review",
        playback.inferenceText.slice(0, 120),
        "Charge/offence text present but no inferred family (motoring/procedural or unmapped).",
      ),
    );
  }

  if (chargeFamily && profile === "generic") {
    findings.push(
      finding(
        "routing_mismatch",
        "routing.generic_with_charge_family",
        "needs_review",
        playback.inferenceText.slice(0, 120),
        `Charge implies ${chargeFamily} but workflow profile is generic.`,
      ),
    );
  }

  if (chargeFamily && routeFamily && familiesConflict(chargeFamily, routeFamily)) {
    findings.push(
      finding(
        "routing_mismatch",
        "routing.charge_vs_route_family",
        "unsafe",
        `${playback.primaryRouteTitle ?? ""}`,
        `Charge family ${chargeFamily} vs route family ${routeFamily}.`,
      ),
    );
  }

  if (chargeFamily && profile !== "generic" && familiesConflict(chargeFamily, profile as AuditorFamilyProfile)) {
    findings.push(
      finding(
        "routing_mismatch",
        "routing.charge_vs_workflow_profile",
        "unsafe",
        playback.inferenceText.slice(0, 120),
        `Charge family ${chargeFamily} vs workflow profile ${profile}.`,
      ),
    );
  }

  const allLines = [
    ...playback.courtLines,
    ...playback.hearingLines,
    ...playback.solicitorSafeSummary ? [playback.solicitorSafeSummary] : [],
    ...playback.collapseRisks,
    ...playback.evidenceAnchors,
  ].join("\n");

  for (const line of playback.courtLines) {
    if (lineLooksOverconfident(line)) {
      findings.push(
        finding(
          "court_and_hearing",
          "court.overconfident_wording",
          playback.thinBundleStatus ? "unsafe" : "needs_review",
          line,
          "Court/safe line uses proof/confirm language — should stay conditional.",
        ),
      );
    }
  }

  for (const line of playback.hearingLines) {
    if (lineLooksOverconfident(line)) {
      findings.push(
        finding(
          "court_and_hearing",
          "hearing.overconfident_wording",
          playback.thinBundleStatus ? "unsafe" : "needs_review",
          line,
          "Hearing line overconfident for served material.",
        ),
      );
    }
  }

  for (const line of playback.policeStationAdjacentLines) {
    if (POLICE_UNSUPPORTED.test(line) || INTERVIEW_ADMISSION.test(line)) {
      findings.push(
        finding(
          "court_and_hearing",
          "police.unsupported_interview",
          "unsafe",
          line,
          "Police/interview wording not supported without served interview record.",
        ),
      );
    }
  }

  if (playback.thinBundleStatus) {
    for (const line of allLines.split(/\n/).filter(Boolean)) {
      if (lineLooksOverconfident(line)) {
        findings.push(
          finding(
            "thin_bundle_honesty",
            "thin_bundle.overconfident",
            "unsafe",
            line,
            "Thin bundle but confident/proof language on surface.",
          ),
        );
      }
    }
  }

  const seenChase = new Set<string>();
  for (const label of playback.disclosureChaseLabels) {
    const key = label.toLowerCase().trim();
    if (seenChase.has(key)) {
      findings.push(
        finding(
          "disclosure_chase",
          "chase.duplicate_label",
          "needs_review",
          label,
          "Duplicate disclosure chase label after normalisation.",
        ),
      );
    }
    seenChase.add(key);
  }

  if (playback.disclosureChaseLabels.length > 0 && profile !== "generic") {
    const wrongFamily = playback.disclosureChaseLabels.some((l) => {
      if (profile === "fraud_account_control") return ROBBERY_LEAK.test(l) || VIOLENCE_LEAK.test(l);
      if (profile === "pwits_phone_attribution") return FRAUD_LEAK.test(l) || ROBBERY_LEAK.test(l);
      if (profile === "robbery_identification") return FRAUD_LEAK.test(l) || PWITS_LEAK.test(l);
      if (profile === "violence_domestic_assault") return FRAUD_LEAK.test(l) || PWITS_LEAK.test(l);
      return false;
    });
    if (wrongFamily) {
      findings.push(
        finding(
          "disclosure_chase",
          "chase.wrong_family_label",
          "needs_review",
          playback.disclosureChaseLabels[0]!,
          "Chase label may not match workflow family.",
        ),
      );
    }
  }

  for (const anchor of playback.malformedLineCandidates) {
    findings.push(
      finding(
        "profile_leakage",
        "anchor.malformed",
        "needs_review",
        anchor,
        "Malformed or cut-off evidence anchor candidate.",
      ),
    );
  }

  if (profile !== "generic") {
    for (const text of solicitorVisibleLeakageTexts(playback)) {
      findings.push(...leakageFindings(playback, profile, text, "profile_leakage"));
    }
  }

  const dedupe = new Map<string, PlaybackFinding>();
  for (const f of findings) {
    dedupe.set(`${f.section}|${f.checkId}|${f.snippet}`, f);
  }
  return [...dedupe.values()];
}
