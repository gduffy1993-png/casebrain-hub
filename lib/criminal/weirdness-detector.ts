export type WeirdnessSeverity = "critical" | "polish";

export type WeirdnessKind =
  | "unsafe_win_language"
  | "court_line_in_chase_draft"
  | "wrong_family_bleed"
  | "duplicate_chase_label"
  | "raw_fragment_label"
  | "template_debug_leak"
  | "generic_output"
  | "referred_only_as_served";

export type WeirdnessFinding = {
  kind: WeirdnessKind;
  severity: WeirdnessSeverity;
  surface: "today" | "chase" | "summary" | "all";
  message: string;
  detail?: string;
  suggestedArea: string;
};

export type WeirdnessDetectorInput = {
  caseId?: string;
  profile?: string | null;
  offenceFamily?: string | null;
  allegation?: string | null;
  bundleText?: string | null;
  outputText: string;
  chaseLabels?: string[] | null;
  chaseDrafts?: string[] | null;
};

function norm(text: string | null | undefined): string {
  return (text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function add(
  out: WeirdnessFinding[],
  kind: WeirdnessKind,
  severity: WeirdnessSeverity,
  surface: WeirdnessFinding["surface"],
  message: string,
  detail: string | undefined,
  suggestedArea: string,
): void {
  out.push({ kind, severity, surface, message, detail, suggestedArea });
}

function isDrugCase(input: WeirdnessDetectorInput): boolean {
  const text = norm([input.profile, input.offenceFamily, input.allegation].filter(Boolean).join(" "));
  return /\b(drugs?|pwits|controlled drug|intent to supply|possession of drug|cocaine|heroin|cannabis)\b/.test(text);
}

function isFraudCase(input: WeirdnessDetectorInput): boolean {
  const text = norm([input.profile, input.offenceFamily, input.allegation].filter(Boolean).join(" "));
  return /\b(fraud|false representation|account control|bank account|dishonesty)\b/.test(text);
}

function isRobberyCase(input: WeirdnessDetectorInput): boolean {
  const text = norm([input.profile, input.offenceFamily, input.allegation].filter(Boolean).join(" "));
  return /\b(robbery|identification)\b/.test(text);
}

/** Safety warnings that mention forbidden topics — not wrong-family bleed. */
export function isSafetyWarningLine(line: string): boolean {
  const trimmed = line.trim().replace(/^[-*•]\s+/, "");
  return /^(?:do not import|don't say|do not overstate|do not rely on|avoid saying|prohibited(?:\s+topic)?|forbidden(?:\s+topic)?)/i.test(
    trimmed,
  );
}

export function stripSafetyWarningLines(text: string): string {
  return text
    .split(/\n+/)
    .filter((line) => !isSafetyWarningLine(line))
    .join("\n");
}

function repeatedParagraphCount(text: string): number {
  const counts = new Map<string, number>();
  for (const raw of text.split(/\n+/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (line.length < 90) continue;
    const key = norm(line).slice(0, 220);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].filter((n) => n >= 3).length;
}

function duplicateLabels(labels: string[]): string[] {
  const counts = new Map<string, number>();
  for (const label of labels) {
    const key = norm(label);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([label]) => label);
}

function rawFragmentLabels(labels: string[]): string[] {
  return labels.filter((label) =>
    /(^\s*(?:\|?\s*\d+\s*\||#{1,6}\s|mg11\s|mg6c?\/|bundle index|scanned continuation|page\s+\d+)|\|\s*\*\*|particulars of offence)/i.test(
      label,
    ),
  );
}

export function lintWeirdness(input: WeirdnessDetectorInput): WeirdnessFinding[] {
  const findings: WeirdnessFinding[] = [];
  const text = input.outputText;
  const bleedText = stripSafetyWarningLines(text);
  const textNorm = norm(text);
  const labels = input.chaseLabels ?? [];
  const drafts = input.chaseDrafts ?? [];

  if (/\b(case collapses|prosecution case collapses|crown case collapses|this wins|guaranteed|will be acquitted|client acquitted)\b/i.test(text)) {
    add(
      findings,
      "unsafe_win_language",
      "critical",
      "all",
      "Unsafe win/collapse language appears in solicitor-facing output.",
      undefined,
      "pilot visible text sanitizers / disclosure chase builder",
    );
  }

  if (drafts.some((draft) => /please provide\s+the defence asks the court/i.test(draft))) {
    add(
      findings,
      "court_line_in_chase_draft",
      "critical",
      "chase",
      "Court-record wording leaked into CPS chase draft.",
      undefined,
      "disclosure chase draft wording",
    );
  }

  if (!isDrugCase(input) && /\b(pwits|intent to supply|drug continuity|drug\/cash|search bwv|record what pwits)\b/i.test(bleedText)) {
    add(
      findings,
      "wrong_family_bleed",
      "critical",
      "all",
      "Drug/PWITS route language appears in a non-drug case.",
      undefined,
      "brief plan routing / workflow filtering",
    );
  }

  if (
    !isFraudCase(input) &&
    /\b(fraud\/account[-\s]?control|account[-\s]?control route|banking schedules, device extraction|account[-\s]?ownership material|bank\/device\/source material)\b/i.test(
      bleedText,
    )
  ) {
    add(
      findings,
      "wrong_family_bleed",
      "critical",
      "all",
      "Fraud/account-control route language appears in a non-fraud case.",
      undefined,
      "brief plan routing / workflow filtering",
    );
  }

  if (!isRobberyCase(input) && /\b(record what robbery|robbery identification route|robbery id)\b/i.test(bleedText)) {
    add(
      findings,
      "wrong_family_bleed",
      "critical",
      "all",
      "Robbery/ID route language appears in a non-robbery case.",
      undefined,
      "brief plan routing / workflow filtering",
    );
  }

  const duplicate = duplicateLabels(labels);
  if (duplicate.length) {
    add(
      findings,
      "duplicate_chase_label",
      "polish",
      "chase",
      "Duplicate Chase labels remain after grouping.",
      duplicate.slice(0, 3).join("; "),
      "disclosure chase dedupe",
    );
  }

  const rawFragments = rawFragmentLabels(labels);
  if (rawFragments.length) {
    add(
      findings,
      "raw_fragment_label",
      "polish",
      "chase",
      "Raw bundle/index/MG fragment appears as a Chase label.",
      rawFragments.slice(0, 3).join("; "),
      "disclosure chase label filtering",
    );
  }

  if (/\b(REQ-[A-Z0-9-]+|TODO|undefined|null|lorem ipsum|\[insert)\b/.test(text)) {
    add(
      findings,
      "template_debug_leak",
      "critical",
      "all",
      "Template/debug text leaked into solicitor-facing output.",
      undefined,
      "output assembly",
    );
  }

  if (repeatedParagraphCount(text) > 0) {
    add(
      findings,
      "duplicate_chase_label",
      "polish",
      "all",
      "Repeated long output lines detected.",
      undefined,
      "output dedupe/finalization",
    );
  }

  const genericHits = text.match(/\b(source material|full disclosure|solicitor review|required|provisional pending disclosure)\b/gi) ?? [];
  const specificHits =
    text.match(/\b(cctv|bwv|cad|999|mg11|mg6|interview|custody|medical|extraction|metadata|loss|transaction|continuity|particulars|abe)\b/gi) ?? [];
  if (genericHits.length >= 14 && specificHits.length < 4) {
    add(
      findings,
      "generic_output",
      "polish",
      "all",
      "Output leans generic without enough PDF-specific nouns.",
      `generic=${genericHits.length}; specific=${specificHits.length}`,
      "brief plan / partner score",
    );
  }

  const bundleText = input.bundleText ?? "";
  const servedClaim =
    /\b(?:is|are|was|were)\s+served\b/i.test(text) ||
    /\b(?:confirmed|shown)\s+on\s+file\b/i.test(text);
  if (
    servedClaim &&
    !/\b(?:not|until|once|if|when|pending)\s+served\b/i.test(text) &&
    /\b(referred to|listed|mentioned)\b.{0,80}\b(not served|not provided|not attached|to follow|outstanding)\b/i.test(bundleText) &&
    /\b(bwv|cctv|interview|custody|mg11|mg6)\b/i.test(textNorm)
  ) {
    add(
      findings,
      "referred_only_as_served",
      "critical",
      "all",
      "Potential referred-only material is described as served/on file.",
      undefined,
      "source truth guardian / evidence state wording",
    );
  }

  return findings;
}

export function weirdnessRiskScore(findings: WeirdnessFinding[]): number {
  return findings.reduce((sum, finding) => sum + (finding.severity === "critical" ? 10 : 3), 0);
}
