import { createHash } from "crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { basename, join } from "path";

type Severity = "P0" | "P1" | "P2" | "P3";

type Finding = {
  severity: Severity;
  code: string;
  family: string;
  message: string;
  sourceEvidence?: string;
  appEvidence?: string;
};

type EvidenceState = "served" | "missing" | "referred_only" | "incomplete" | "unclear" | "not_established";

type SourceTruth = {
  caseId: string;
  sourceHash: string;
  defendant?: string;
  charge?: string;
  court?: string;
  hearingDate?: string;
  offenceDate?: string;
  evidence: Record<string, EvidenceState>;
  expectedChaseItems: string[];
};

type CaseComparison = {
  caseId: string;
  caseDir: string;
  sourceTruth: SourceTruth;
  appDigest: {
    outputHash: string | null;
    textLength: number;
    keyEvidenceLabels: string[];
  };
  findings: Finding[];
};

type Cluster = {
  signature: string;
  severity: Severity;
  count: number;
  caseIds: string[];
  examples: Finding[];
};

const SEVERITY_RANK: Record<Severity, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function readText(path: string): string | null {
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

function readJson(path: string): unknown | null {
  const text = readText(path);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normal(text: string): string {
  return compact(text).toLowerCase();
}

function firstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return compact(value.replace(/\*\*/g, "").replace(/^[:\s-]+/, ""));
  }
  return undefined;
}

function cleanDefendantName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = compact(value.replace(/^r\s+v\s+/i, ""));
  const name = cleaned.split(/\s+(?:DOB|D\.O\.B\.|date of birth)\b|[,(|—–]/i)[0]?.trim();
  return name || cleaned;
}

function classifySourceState(sourceText: string, family: string): EvidenceState {
  const lines = sourceText
    .split(/\r?\n/)
    .filter((line) => familyRegex(family).test(line))
    .join("\n");
  if (!lines.trim()) return "not_established";
  if (family === "interviewSummary" && /\b(?:interview summary is on file|summary is on file|custody\/interview summary)\b/i.test(lines)) {
    return "served";
  }
  if (family === "interviewTranscript" && /\b(?:not a full transcript|transcript\s*:\s*not in this (?:section|bundle|file)|transcript (?:not served|not attached|not included|not on (?:file|papers|bundle)))\b/i.test(lines)) {
    return "missing";
  }
  if (/\b(?:served|provided|attached|included|on file|present)\b/i.test(lines) && !/\b(?:not|missing|outstanding|partial|extract only|summary only|unclear|referred)\b/i.test(lines)) {
    return "served";
  }
  if (/\b(?:outstanding|missing|not served|not attached|not included|not on (?:file|papers|bundle)|to follow|awaiting)\b/i.test(lines)) {
    return "missing";
  }
  if (/\b(?:referred only|referred to|mentioned|summary only|extract only)\b/i.test(lines)) return "referred_only";
  if (/\b(?:partial|incomplete|stills|extract)\b/i.test(lines)) return "incomplete";
  if (/\b(?:unclear|unknown|to be checked|needs checking|confirm|not safely confirmed)\b/i.test(lines)) return "unclear";
  return "unclear";
}

function familyRegex(family: string): RegExp {
  switch (family) {
    case "cctvMaster":
      return /\b(?:(?:cctv|video)\s+(?:master|full window|full footage|master footage)|master footage|full cctv|full window|full footage)\b/i;
    case "cctvContinuity":
      return /\b(?:cctv\s+(?:continuity|provenance|export log)|continuity\s+of\s+cctv|continuity label|provenance|export log)\b/i;
    case "cad999Log":
      return /\b(?:cad\s*\/?\s*999|cad log|999 log|control room|dispatch)\b/i;
    case "cad999Audio":
      return /\b(?:999 audio|999 recording|emergency call audio|call recording)\b/i;
    case "interviewSummary":
      return /\b(?:interview summary|summary is on file|custody\/interview summary)\b/i;
    case "interviewTranscript":
      return /\b(?:interview transcript|full transcript|transcript|not a full transcript|not in this (?:section|bundle|file))\b/i;
    case "interviewRecording":
      return /\b(?:interview recording|interview audio|interview video)\b/i;
    case "phoneSubscriber":
      return /\b(?:subscriber data|subscriber|account data)\b/i;
    case "phoneDownload":
      return /\b(?:phone download|handset download|source export|phone extraction|device extraction|metadata)\b/i;
    case "custodyExtract":
      return /\b(?:custody record extract|extract only|custody summary)\b/i;
    case "fullCustodyRecord":
      return /\b(?:full custody record|detention log|custody log|pace material)\b/i;
    case "medicalFinalReport":
      return /\b(?:final medical|final forensic|final report|medical\/forensic|forensic note|medical note)\b/i;
    default:
      return /$a/;
  }
}

function extractSourceTruth(caseId: string, sourceText: string, truthKey: unknown): SourceTruth {
  const expectedChaseItems = Array.isArray((truthKey as { expectedChaseItems?: unknown })?.expectedChaseItems)
    ? ((truthKey as { expectedChaseItems: unknown[] }).expectedChaseItems.filter((x): x is string => typeof x === "string"))
    : [];

  return {
    caseId,
    sourceHash: sha256(sourceText),
    defendant: cleanDefendantName(firstMatch(sourceText, [
      /\bDefendant\s*:\s*([^\n\r]+)/i,
      /\bR\s+v\s+([A-Z][A-Za-z' -]{2,80})/i,
    ])),
    charge: firstMatch(sourceText, [
      /\bCharge\s*:\s*([^\n\r]+)/i,
      /\bStatement of Offence\s*:\s*([^\n\r]+)/i,
      /\bOffence\s*:\s*([^\n\r]+)/i,
    ]),
    court: firstMatch(sourceText, [
      /\bCourt\s*:\s*([^\n\r]+)/i,
      /\bat\s+([A-Z][A-Za-z' -]+(?:Magistrates'|Crown)\s+Court)\b/i,
    ]),
    hearingDate: firstMatch(sourceText, [
      /\b(?:Next hearing|Hearing|Listed)\s*:\s*(?:[A-Za-z ]+)?\s*(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i,
      /\b(?:First Appearance|PTPH|Trial|Mention)\s+on\s+(\d{1,2}\s+[A-Za-z]+\s+20\d{2})/i,
    ]),
    offenceDate: firstMatch(sourceText, [
      /\b(?:On|Between)\s+(\d{1,2}\s+[A-Za-z]+\s+20\d{2}|\d{1,2}\/\d{1,2}\/20\d{2})\b/i,
      /\bdate of offence\s*:\s*([^\n\r]+)/i,
    ]),
    evidence: {
      cctvMaster: classifySourceState(sourceText, "cctvMaster"),
      cctvContinuity: classifySourceState(sourceText, "cctvContinuity"),
      cad999Log: classifySourceState(sourceText, "cad999Log"),
      cad999Audio: classifySourceState(sourceText, "cad999Audio"),
      interviewSummary: classifySourceState(sourceText, "interviewSummary"),
      interviewTranscript: classifySourceState(sourceText, "interviewTranscript"),
      interviewRecording: classifySourceState(sourceText, "interviewRecording"),
      phoneSubscriber: classifySourceState(sourceText, "phoneSubscriber"),
      phoneDownload: classifySourceState(sourceText, "phoneDownload"),
      custodyExtract: classifySourceState(sourceText, "custodyExtract"),
      fullCustodyRecord: classifySourceState(sourceText, "fullCustodyRecord"),
      medicalFinalReport: classifySourceState(sourceText, "medicalFinalReport"),
    },
    expectedChaseItems,
  };
}

function stringifyAppOutput(appOutput: unknown): string {
  return JSON.stringify(appOutput ?? {}, null, 2);
}

function appEvidenceLabels(appText: string): string[] {
  const labels = new Set<string>();
  const regex = /"label"\s*:\s*"([^"]{2,180})"|"title"\s*:\s*"([^"]{2,180})"|"evidenceAnchor"\s*:\s*"([^"]{2,180})"/g;
  for (const match of appText.matchAll(regex)) {
    const label = match[1] ?? match[2] ?? match[3];
    if (label) labels.add(label);
  }
  return [...labels].slice(0, 80);
}

function appMentions(appText: string, re: RegExp): boolean {
  return re.test(appText);
}

function appContexts(appText: string, re: RegExp): string[] {
  const contexts: string[] = [];
  const seen = new Set<string>();
  for (const line of appText.split(/\r?\n/)) {
    if (re.test(line)) {
      const compacted = compact(line);
      if (compacted && !seen.has(compacted)) {
        contexts.push(compacted);
        seen.add(compacted);
      }
    }
  }
  const objectish = appText.match(/\{[^{}]{0,1200}\}/g) ?? [];
  for (const item of objectish) {
    if (re.test(item)) {
      const compacted = compact(item);
      if (compacted && !seen.has(compacted)) {
        contexts.push(compacted);
        seen.add(compacted);
      }
    }
  }
  return contexts;
}

function contextHas(appText: string, needle: RegExp, stateWords: RegExp): boolean {
  return appContexts(appText, needle).some((ctx) => stateWords.test(ctx));
}

function sourceIs(state: EvidenceState, ...states: EvidenceState[]): boolean {
  return states.includes(state);
}

function finding(severity: Severity, code: string, family: string, message: string, sourceEvidence?: string, appEvidence?: string): Finding {
  return { severity, code, family, message, sourceEvidence, appEvidence };
}

function hasCurrentAuditOutputSchema(appOutput: unknown): boolean {
  if (!appOutput || typeof appOutput !== "object") return false;
  return Object.prototype.hasOwnProperty.call(appOutput, "caseIdentity");
}

function compareTruthToApp(sourceTruth: SourceTruth, appOutput: unknown): { digest: CaseComparison["appDigest"]; findings: Finding[] } {
  if (!appOutput) {
    return {
      digest: {
        outputHash: null,
        textLength: 0,
        keyEvidenceLabels: [],
      },
      findings: [
        finding("P3", "APP_OUTPUT_NOT_ON_DISK", "coverage", "Case has source text but no casebrain-output.json for automated comparison."),
      ],
    };
  }

  const appText = stringifyAppOutput(appOutput);
  if (!hasCurrentAuditOutputSchema(appOutput)) {
    return {
      digest: {
        outputHash: sha256(appText),
        textLength: appText.length,
        keyEvidenceLabels: appEvidenceLabels(appText),
      },
      findings: [
        finding(
          "P3",
          "APP_OUTPUT_STALE_SCHEMA",
          "coverage",
          "casebrain-output.json is present but predates the current audit schema; rerun the case before treating it as a live defect.",
        ),
      ],
    };
  }

  const appLower = normal(appText);
  const findings: Finding[] = [];
  const ev = sourceTruth.evidence;

  const appSaysMissing = (needle: RegExp) =>
    contextHas(appText, needle, /\b(?:missing|outstanding|overdue|due soon|please provide|chase)\b/i);
  const appSaysServed = (needle: RegExp) =>
    contextHas(appText, needle, /\b(?:served|on file|received|provided|complete)\b/i);

  if (sourceTruth.defendant && !appMentions(appLower, new RegExp(escapeRegExp(sourceTruth.defendant), "i"))) {
    findings.push(finding("P1", "DEFENDANT_NOT_SHOWN_OR_CHANGED", "identity", "Source defendant is not plainly present in app output.", sourceTruth.defendant));
  }
  if (sourceTruth.hearingDate && sourceTruth.offenceDate && sourceTruth.hearingDate === sourceTruth.offenceDate) {
    findings.push(finding("P1", "SOURCE_DATE_ROLE_COLLISION", "dates", "Source extraction found the same text as hearing and offence date; requires review.", sourceTruth.hearingDate));
  }

  if (sourceIs(ev.phoneSubscriber, "missing", "referred_only", "incomplete", "unclear") && sourceIs(ev.phoneDownload, "not_established") && appSaysMissing(/\b(?:phone download|source export|phone extraction|device extraction)\b/i)) {
    findings.push(finding("P0", "UNSUPPORTED_EVIDENCE_FAMILY", "phoneDownload", "App promotes subscriber/account material into a phone download/source-export chase.", `subscriber=${ev.phoneSubscriber}; download=${ev.phoneDownload}`, "phone download/source export"));
  }

  if (sourceIs(ev.cad999Log, "missing", "referred_only", "incomplete", "unclear") && sourceIs(ev.cad999Audio, "not_established") && appSaysMissing(/\b(?:999 audio|999 recording|control-room material|control room material)\b/i)) {
    findings.push(finding("P0", "UNSUPPORTED_EVIDENCE_FAMILY", "cad999Audio", "App promotes CAD/999 log material into 999 audio/control-room audio.", `cad999Log=${ev.cad999Log}; audio=${ev.cad999Audio}`, "999 audio/control-room"));
  }

  if (sourceIs(ev.interviewSummary, "served", "referred_only", "incomplete", "unclear") && sourceIs(ev.interviewTranscript, "missing") && appSaysServed(/\b(?:interview transcript|full transcript)\b/i)) {
    findings.push(finding("P0", "SUMMARY_TREATED_AS_FULL_RECORD", "interviewTranscript", "App treats interview summary/partial record as served transcript.", `summary=${ev.interviewSummary}; transcript=${ev.interviewTranscript}`));
  }

  if (sourceIs(ev.interviewSummary, "served", "referred_only", "incomplete", "unclear") && sourceIs(ev.interviewRecording, "not_established") && appSaysMissing(/\binterview recording\b/i)) {
    findings.push(finding("P1", "UNSUPPORTED_EVIDENCE_FAMILY", "interviewRecording", "App asks for interview recording when source only supports summary/transcript distinction.", `summary=${ev.interviewSummary}; recording=${ev.interviewRecording}`));
  }

  if (sourceIs(ev.custodyExtract, "served", "referred_only", "incomplete", "unclear") && sourceIs(ev.fullCustodyRecord, "not_established", "unclear") && appSaysMissing(/\bfull custody record\b/i)) {
    findings.push(finding("P1", "EXTRACT_TREATED_AS_FULL_RECORD", "fullCustodyRecord", "App promotes custody extract/completeness review into full custody record outstanding.", `extract=${ev.custodyExtract}; full=${ev.fullCustodyRecord}`));
  }

  if (sourceIs(ev.cctvContinuity, "unclear", "referred_only", "incomplete") && appSaysMissing(/\bcctv\s+(?:continuity|provenance)|continuity\s+of\s+cctv/i)) {
    findings.push(finding("P1", "UNCLEAR_PROMOTED_TO_MISSING_OR_DEADLINE", "cctvContinuity", "App promotes unclear/review-only CCTV continuity into missing/outstanding/deadline chase.", ev.cctvContinuity));
  }

  if (sourceIs(ev.medicalFinalReport, "missing") && !appMentions(appLower, /\bfinal\s+(?:medical|forensic|medical\/forensic)\s+report\b/i)) {
    findings.push(finding("P1", "EXPECTED_MISSING_NOT_CHASED", "medicalFinalReport", "Source says final medical/forensic report is missing, but app output does not surface that exact missing item.", ev.medicalFinalReport));
  }

  if (sourceIs(ev.cctvMaster, "missing") && !appMentions(appLower, /\b(?:cctv master|master footage|full window|full cctv|cctv export|premises cctv|street cctv)\b/i)) {
    findings.push(finding("P1", "EXPECTED_MISSING_NOT_CHASED", "cctvMaster", "Source says CCTV master/full window is missing, but app output does not surface it.", ev.cctvMaster));
  }

  for (const expected of sourceTruth.expectedChaseItems) {
    const key = expected.split(/[—-]/)[0]?.trim() ?? expected;
    if (key.length >= 5 && !appMentions(appLower, new RegExp(escapeRegExp(key.slice(0, Math.min(key.length, 28))), "i"))) {
      findings.push(finding("P2", "TRUTH_EXPECTED_CHASE_MISSING", "truthKey", "Truth key expected a chase item that was not visible in app output.", expected));
    }
  }

  for (const phrase of ["case collapses", "we win", "guaranteed", "proves guilt", "you are shown on cctv"]) {
    if (appLower.includes(phrase)) {
      findings.push(finding("P0", "UNSAFE_CERTAINTY_OR_ADMISSION", "wording", `Unsafe solicitor-visible phrase: ${phrase}`, undefined, phrase));
    }
  }

  return {
    digest: {
      outputHash: appOutput ? sha256(appText) : null,
      textLength: appText.length,
      keyEvidenceLabels: appEvidenceLabels(appText),
    },
    findings,
  };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function compareCaseFolder(caseDir: string): CaseComparison | null {
  const caseId = basename(caseDir);
  const sourceText = readText(join(caseDir, "bundle-text.md")) ?? readText(join(caseDir, "source-extract.txt"));
  if (!sourceText) return null;
  const truthKey = readJson(join(caseDir, "truth-key.json"));
  const appOutput = readJson(join(caseDir, "casebrain-output.json"));
  const sourceTruth = extractSourceTruth(caseId, sourceText, truthKey);
  const compared = compareTruthToApp(sourceTruth, appOutput);
  return {
    caseId,
    caseDir,
    sourceTruth,
    appDigest: compared.digest,
    findings: compared.findings,
  };
}

function clusterFindings(comparisons: CaseComparison[]): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const comparison of comparisons) {
    for (const f of comparison.findings) {
      const signature = `${f.severity}:${f.code}:${f.family}`;
      const existing = map.get(signature);
      if (!existing) {
        map.set(signature, {
          signature,
          severity: f.severity,
          count: 1,
          caseIds: [comparison.caseId],
          examples: [f],
        });
      } else {
        existing.count += 1;
        if (!existing.caseIds.includes(comparison.caseId)) existing.caseIds.push(comparison.caseId);
        if (existing.examples.length < 5) existing.examples.push(f);
      }
    }
  }
  return [...map.values()].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.count - a.count);
}

function runCorpus(casesRoot: string, outRoot: string): void {
  const dirs = readdirSync(casesRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(casesRoot, d.name));
  const comparisons = dirs.map(compareCaseFolder).filter((c): c is CaseComparison => Boolean(c));
  const clusters = clusterFindings(comparisons);
  const summary = {
    generatedAt: new Date().toISOString(),
    casesRoot,
    totalCaseFolders: dirs.length,
    comparedCases: comparisons.length,
    casesWithAppOutput: comparisons.filter((c) => c.appDigest.outputHash).length,
    totalFindings: comparisons.reduce((sum, c) => sum + c.findings.length, 0),
    bySeverity: (["P0", "P1", "P2", "P3"] as Severity[]).reduce<Record<Severity, number>>((acc, sev) => {
      acc[sev] = comparisons.flatMap((c) => c.findings).filter((f) => f.severity === sev).length;
      return acc;
    }, { P0: 0, P1: 0, P2: 0, P3: 0 }),
    clusterCount: clusters.length,
  };
  mkdirSync(outRoot, { recursive: true });
  writeFileSync(join(outRoot, "comparison-summary.json"), JSON.stringify(summary, null, 2));
  writeFileSync(join(outRoot, "case-comparisons.json"), JSON.stringify(comparisons, null, 2));
  writeFileSync(join(outRoot, "finding-clusters.json"), JSON.stringify(clusters, null, 2));
  writeFileSync(
    join(outRoot, "README.md"),
    [
      "# PDF/App output comparator",
      "",
      "Automated source-text vs CaseBrain-output mismatch ledger.",
      "",
      `- Compared cases: ${summary.comparedCases}`,
      `- Cases with app output: ${summary.casesWithAppOutput}`,
      `- Findings: ${summary.totalFindings}`,
      `- P0/P1/P2/P3: ${summary.bySeverity.P0}/${summary.bySeverity.P1}/${summary.bySeverity.P2}/${summary.bySeverity.P3}`,
      "",
      "This is an audit ledger, not solicitor approval. Findings are clustered so shared roots can be fixed once.",
    ].join("\n"),
  );
}

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

if (require.main === module) {
  const casesRoot = arg("--cases-root") ?? "artifacts/evidence-state-audit-local/cases";
  const outRoot = arg("--out") ?? "artifacts/casebrain-qa/assurance/pdf-output-comparator-v1";
  runCorpus(casesRoot, outRoot);
}

export {
  classifySourceState,
  clusterFindings,
  compareCaseFolder,
  compareTruthToApp,
  extractSourceTruth,
  runCorpus,
  type CaseComparison,
  type Finding,
  type SourceTruth,
};
