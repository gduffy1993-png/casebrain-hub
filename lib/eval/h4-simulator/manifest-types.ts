/**
 * Shared H4 simulator manifest case shape (v1 locked + v1.1 supplement).
 */
export type SimulatorManifestCase = {
  caseId: string;
  title: string;
  fakeDefendant: string;
  fakeCourt: string;
  offenceWording: string;
  offenceFamily: string;
  profile: string;
  mainIssue: string;
  servedEvidence: string[];
  referredOnlyEvidence: string[];
  missingEvidence: string[];
  uncertainEvidence: string[];
  expectedTodayIssue: string;
  expectedChaseItems: string[];
  expectedSummaryRisk: string;
  expectedSourceStateBadges: string[];
  expectedSendability: string;
  mustNotSay: string[];
  blockingFailPatterns: string[];
  polishOnlyWarnings: string[];
  pdfLayoutType: string;
  redTeamTrapType: string;
  bundleStatus: "manifest_only" | "generated";
};

export type SimulatorManifestCaseInput = Partial<SimulatorManifestCase> & {
  caseId: string;
  title: string;
  profile: string;
  offenceFamily: string;
  mainIssue: string;
  redTeamTrapType: string;
  pdfLayoutType: string;
};

export function buildManifestCase(input: SimulatorManifestCaseInput): SimulatorManifestCase {
  const n = input.caseId.replace("sim-", "");
  return {
    caseId: input.caseId,
    title: input.title,
    fakeDefendant: input.fakeDefendant ?? `Defendant ${n}`,
    fakeCourt: input.fakeCourt ?? "Northgate Magistrates' Court",
    offenceWording: input.offenceWording ?? input.title,
    offenceFamily: input.offenceFamily,
    profile: input.profile,
    mainIssue: input.mainIssue,
    servedEvidence: input.servedEvidence ?? [],
    referredOnlyEvidence: input.referredOnlyEvidence ?? [],
    missingEvidence: input.missingEvidence ?? [],
    uncertainEvidence: input.uncertainEvidence ?? [],
    expectedTodayIssue: input.expectedTodayIssue ?? input.mainIssue,
    expectedChaseItems: input.expectedChaseItems ?? [],
    expectedSummaryRisk: input.expectedSummaryRisk ?? "Provisional pending disclosure",
    expectedSourceStateBadges: input.expectedSourceStateBadges ?? ["missing", "provisional"],
    expectedSendability: input.expectedSendability ?? "provisional_check_source",
    mustNotSay: input.mustNotSay ?? [],
    blockingFailPatterns: input.blockingFailPatterns ?? [
      "we win",
      "case collapses",
      "BWV shows",
      "CCTV shows",
      "ask the court to record",
    ],
    polishOnlyWarnings: input.polishOnlyWarnings ?? [],
    pdfLayoutType: input.pdfLayoutType,
    redTeamTrapType: input.redTeamTrapType,
    bundleStatus: input.bundleStatus ?? "manifest_only",
  };
}
