import assert from "node:assert/strict";
import { lintWeirdness } from "../lib/criminal/weirdness-detector";

const samOutput = `
Sam Okonkwo
R v Sam Okonkwo - perverting the course of justice
Record what PWITS source material remains outstanding before fixing trial theory.
Record what robbery source material remains outstanding before fixing trial theory.
Please provide banking schedules, device extraction, email/IP logs and account-ownership material.
`;

const samFindings = lintWeirdness({
  caseId: "generic-provisional-sam-okonkwo",
  profile: "mixed_unclear",
  offenceFamily: "generic",
  allegation: "Doing an act tending and intended to pervert the course of justice",
  bundleText: "Background mentions a fraud enquiry but the charge is perverting the course of justice.",
  outputText: samOutput,
  chaseLabels: [
    "Record what PWITS source material remains outstanding before fixing trial theory.",
    "Record what robbery source material remains outstanding before fixing trial theory.",
  ],
  chaseDrafts: [],
});

assert.ok(
  samFindings.some((f) => f.kind === "wrong_family_bleed" && f.severity === "critical"),
  "Sam-style wrong family bleed should be critical",
);

const clarkeOutput = `
Jordan Clarke
Please provide **Win Conditions (Fight Charge):** identification successfully challenged/excluded under Turnbull; prosecution case collapses.
`;

const clarkeFindings = lintWeirdness({
  caseId: "s18-charge-reduction-jordan-clarke",
  profile: "violence_assault",
  offenceFamily: "violence",
  allegation: "Wounding with intent contrary to section 18 OAPA 1861",
  bundleText: "The defence review says if identification fails, case collapses.",
  outputText: clarkeOutput,
  chaseLabels: ["Win Conditions (Fight Charge): prosecution case collapses"],
  chaseDrafts: [clarkeOutput],
});

assert.ok(
  clarkeFindings.some((f) => f.kind === "unsafe_win_language" && f.severity === "critical"),
  "Clarke-style collapse/win language should be critical",
);

const safeFraudMention = lintWeirdness({
  caseId: "background-fraud-mention",
  profile: "mixed_unclear",
  offenceFamily: "generic",
  allegation: "Perverting the course of justice",
  bundleText: "The papers mention an unrelated fraud enquiry.",
  outputText: "The matter remains provisional. Message export and defendant interview remain outstanding.",
  chaseLabels: ["Message export", "Defendant interview"],
  chaseDrafts: ["Please provide the message export.", "Please provide the defendant interview."],
});

assert.equal(
  safeFraudMention.some((f) => f.kind === "wrong_family_bleed"),
  false,
  "Background fraud mention alone should not be treated as fraud-route bleed",
);

const samDontSay = lintWeirdness({
  caseId: "generic-provisional-sam-okonkwo",
  profile: "mixed_unclear",
  offenceFamily: "generic",
  allegation: "Doing an act tending and intended to pervert the course of justice",
  bundleText: "Background mentions a fraud enquiry but the charge is perverting the course of justice.",
  outputText: [
    "Sam Okonkwo",
    "Do not import fraud, PWITS, robbery or violence routes unless the served papers support them.",
    "The defence position remains provisional pending served source material.",
  ].join("\n"),
  chaseLabels: ["Message export", "Defendant interview"],
  chaseDrafts: ["Please provide the message export."],
});

assert.equal(
  samDontSay.some((f) => f.kind === "wrong_family_bleed"),
  false,
  "Don't Say safety warnings mentioning PWITS/fraud should not count as wrong-family bleed",
);

console.log("weirdness-detector.test.ts: ok");
