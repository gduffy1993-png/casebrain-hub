import fs from "node:fs";
import path from "node:path";

const oldPath =
  "artifacts/casebrain-qa/assurance/master-auditor-v1/detector-remediation-stage20/old-findings.jsonl";
const newPath =
  "artifacts/casebrain-qa/assurance/master-auditor-v1/maa-20-2026-07-29T02-06-10-674Z/findings.jsonl";
const outDir =
  "artifacts/casebrain-qa/assurance/master-auditor-v1/detector-remediation-stage20";

type F = {
  findingId: string;
  controlId: string;
  caseId: string;
  verdict: string;
  code?: string | null;
  plainEnglish: string;
  exactWording?: string;
  expectedWording?: string | null;
  wordingHash?: string;
  rootCauseFamily?: string;
};

function load(p: string): F[] {
  return fs
    .readFileSync(p, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l) as F);
}

function tally(arr: F[]) {
  const t: Record<string, number> = {};
  for (const f of arr) t[f.verdict] = (t[f.verdict] ?? 0) + 1;
  return t;
}

/** Stable semantic key across code-in-ID churn. */
function semanticKey(f: F): string {
  return [
    f.caseId,
    f.controlId,
    f.wordingHash ?? "",
    (f.exactWording ?? "").slice(0, 80),
    (f.expectedWording ?? "").slice(0, 80),
  ].join("|");
}

const oldF = load(oldPath);
const newF = load(newPath);
const oldMap = new Map(oldF.map((f) => [f.findingId, f]));
const newMap = new Map(newF.map((f) => [f.findingId, f]));
const retainedIds = [...oldMap.keys()].filter((id) => newMap.has(id));
const addedIds = [...newMap.keys()].filter((id) => !oldMap.has(id));
const removedIds = [...oldMap.keys()].filter((id) => !newMap.has(id));

const verdictChangesOnRetainedIds = retainedIds
  .filter((id) => oldMap.get(id)!.verdict !== newMap.get(id)!.verdict)
  .map((id) => {
    const o = oldMap.get(id)!;
    const n = newMap.get(id)!;
    return {
      findingId: id,
      caseId: o.caseId,
      controlId: o.controlId,
      from: o.verdict,
      to: n.verdict,
    };
  });

const oldBySem = new Map<string, F[]>();
for (const f of oldF) {
  const k = semanticKey(f);
  const arr = oldBySem.get(k) ?? [];
  arr.push(f);
  oldBySem.set(k, arr);
}
const newBySem = new Map<string, F[]>();
for (const f of newF) {
  const k = semanticKey(f);
  const arr = newBySem.get(k) ?? [];
  arr.push(f);
  newBySem.set(k, arr);
}

const oldDefects = oldF.filter((f) => f.verdict === "defect");
const newDefects = newF.filter((f) => f.verdict === "defect");

type DefectDisposition =
  | "genuine_candidate"
  | "detector_fp_now_pass"
  | "detector_fp_suppressed_removed"
  | "unresolved_reclass"
  | "other";

function classifyPriorDefect(d: F): {
  disposition: DefectDisposition;
  matchedNew: F | null;
  note: string;
} {
  const k = semanticKey(d);
  const news = newBySem.get(k) ?? [];
  // Prefer same wordingHash match among new findings for this case+control
  const sameCaseControl = newF.filter(
    (n) =>
      n.caseId === d.caseId &&
      n.controlId === d.controlId &&
      (n.wordingHash === d.wordingHash ||
        (n.exactWording && n.exactWording === d.exactWording)),
  );
  const matched =
    sameCaseControl.find((n) => n.verdict === "defect") ??
    sameCaseControl.find((n) => n.verdict === "pass") ??
    sameCaseControl[0] ??
    news[0] ??
    null;

  if (matched?.verdict === "defect") {
    const isCandidate =
      matched.code === "candidate_pending_source" ||
      /candidate_pending_source/.test(matched.findingId) ||
      /Candidate defect pending source/.test(matched.plainEnglish);
    return {
      disposition: isCandidate ? "genuine_candidate" : "other",
      matchedNew: matched,
      note: isCandidate
        ? "Retained as candidate_pending_source"
        : "Still defect (non-candidate)",
    };
  }
  if (matched?.verdict === "pass") {
    return {
      disposition: "detector_fp_now_pass",
      matchedNew: matched,
      note: `Now pass (${matched.code ?? matched.findingId})`,
    };
  }
  if (matched?.verdict === "unresolved") {
    return {
      disposition: "unresolved_reclass",
      matchedNew: matched,
      note: "Reclassified unresolved",
    };
  }
  // Cross-exit / cross-surface FPs often lose the exact finding and gain a pass sibling
  if (d.controlId === "MAA-CROSS-EXIT") {
    const passSibling = newF.find(
      (n) =>
        n.caseId === d.caseId &&
        n.controlId === "MAA-CROSS-EXIT" &&
        (n.code === "honest_sibling_served_missing" ||
          n.code === "no_cross_exit_hit" ||
          n.verdict === "pass"),
    );
    if (passSibling) {
      return {
        disposition: "detector_fp_now_pass",
        matchedNew: passSibling,
        note: "Unit-bound filter / honest sibling — no longer defect",
      };
    }
  }
  if (d.controlId === "MAA-CROSS-SURFACE") {
    const passSibling = newF.find(
      (n) =>
        n.caseId === d.caseId &&
        n.controlId === "MAA-CROSS-SURFACE" &&
        (n.code === "distinct_unit_chase_allowed" ||
          n.code === "cross_surface_aligned" ||
          n.verdict === "pass"),
    );
    if (passSibling && !newDefects.some((n) => n.caseId === d.caseId && n.controlId === d.controlId && n.wordingHash === d.wordingHash)) {
      return {
        disposition: "detector_fp_now_pass",
        matchedNew: passSibling,
        note: "Canonical identity — extract≠full chase FP cleared",
      };
    }
  }
  if (d.controlId === "MAA-EVIDENCE-STATE" && /not_safely_confirmed/.test(d.exactWording ?? "")) {
    const domainPass = newF.find(
      (n) =>
        n.caseId === d.caseId &&
        n.controlId === "MAA-EVIDENCE-STATE" &&
        n.code === "state_domain_equivalent" &&
        n.wordingHash === d.wordingHash,
    );
    if (domainPass) {
      return {
        disposition: "detector_fp_now_pass",
        matchedNew: domainPass,
        note: "Domain equivalence not_safely_confirmed↔incomplete",
      };
    }
  }
  return {
    disposition: "detector_fp_suppressed_removed",
    matchedNew: null,
    note: "Prior defect ID removed; no longer emitted as defect",
  };
}

const priorDispositions = oldDefects.map((d) => {
  const c = classifyPriorDefect(d);
  return {
    oldFindingId: d.findingId,
    caseId: d.caseId,
    controlId: d.controlId,
    oldPlain: d.plainEnglish.slice(0, 140),
    exactWording: (d.exactWording ?? "").slice(0, 100),
    ...c,
    newFindingId: c.matchedNew?.findingId ?? null,
    newVerdict: c.matchedNew?.verdict ?? null,
    newCode: c.matchedNew?.code ?? null,
  };
});

const genuineCandidates = priorDispositions.filter(
  (d) => d.disposition === "genuine_candidate",
);
const detectorFps = priorDispositions.filter(
  (d) =>
    d.disposition === "detector_fp_now_pass" ||
    d.disposition === "detector_fp_suppressed_removed",
);
const other = priorDispositions.filter(
  (d) =>
    d.disposition !== "genuine_candidate" &&
    d.disposition !== "detector_fp_now_pass" &&
    d.disposition !== "detector_fp_suppressed_removed",
);

const fpDenominator = oldDefects.length;
const detectorFpCount = detectorFps.length;
const genuineCandidateCount = newDefects.filter(
  (f) =>
    f.code === "candidate_pending_source" ||
    /candidate_pending_source/.test(f.findingId),
).length;

// Semantic verdict flips (same wordingHash+case+control)
const semanticVerdictFlips: Array<{
  caseId: string;
  controlId: string;
  wordingHash: string | undefined;
  from: string;
  to: string;
  oldId: string;
  newId: string;
  note: string;
}> = [];
for (const d of priorDispositions) {
  if (d.matchedNew && d.matchedNew.verdict !== "defect" && d.newVerdict) {
    // only count when we matched the same semantic unit
    if (
      d.matchedNew.caseId === d.caseId &&
      d.matchedNew.controlId === d.controlId &&
      (d.matchedNew.wordingHash ===
        oldDefects.find((x) => x.findingId === d.oldFindingId)?.wordingHash ||
        d.disposition === "detector_fp_now_pass")
    ) {
      semanticVerdictFlips.push({
        caseId: d.caseId,
        controlId: d.controlId,
        wordingHash: oldDefects.find((x) => x.findingId === d.oldFindingId)
          ?.wordingHash,
        from: "defect",
        to: d.newVerdict,
        oldId: d.oldFindingId,
        newId: d.newFindingId ?? "",
        note: d.note,
      });
    }
  }
}

const addedExplanation = {
  count: addedIds.length,
  byCode: addedIds.reduce(
    (a, id) => {
      const f = newMap.get(id)!;
      const code = f.code ?? f.findingId.split("-")[2] ?? "unknown";
      a[code] = (a[code] ?? 0) + 1;
      return a;
    },
    {} as Record<string, number>,
  ),
  rationale:
    "New passes for state_domain_equivalent, honest_sibling_served_missing, distinct_unit_chase_allowed, incomplete_disclaimer_*; candidate_pending_source IDs replace state_mismatch for the six retained candidates (code embedded in findingId).",
};

const removedExplanation = {
  count: removedIds.length,
  priorDefectsRemoved: priorDispositions.filter(
    (d) => !newMap.has(d.oldFindingId),
  ).length,
  rationale:
    "Removed detector-FP defect IDs (domain mismatch, naive cross-exit, broad-token chase) and IDs that churned because code changed from state_mismatch → candidate_pending_source or state_domain_equivalent.",
};

const report = {
  oldRun: "maa-20-2026-07-29T01-17-19-470Z",
  newRun: "maa-20-2026-07-29T02-06-10-674Z",
  oldTally: tally(oldF),
  newTally: tally(newF),
  idChurn: {
    retainedExactIds: retainedIds.length,
    addedIds: addedIds.length,
    removedIds: removedIds.length,
    verdictChangesOnExactRetainedIds: verdictChangesOnRetainedIds,
  },
  semanticPriorDefectDispositions: {
    genuine_candidate: genuineCandidates.length,
    detector_fp: detectorFpCount,
    other: other.length,
    rows: priorDispositions,
  },
  semanticVerdictFlips: semanticVerdictFlips.slice(0, 80),
  counts: {
    genuineCandidates: genuineCandidateCount,
    detectorFp: detectorFpCount,
    unresolved: tally(newF).unresolved ?? 0,
    newDefects: newDefects.length,
  },
  fpAccounting: {
    denominator: fpDenominator,
    denominatorBasis:
      "Codex-reviewed defect findings from prior stage-20 run (n=31)",
    detectorFalsePositiveCount: detectorFpCount,
    detectorFalsePositiveRate: detectorFpCount / fpDenominator,
    genuineCandidateCount,
    note: "Not a human-blinded disposition rate. reviewed=false; no invented reviewer/legal sign-off.",
  },
  addedExplanation,
  removedExplanation,
  genuineCandidateFindings: newDefects.map((f) => ({
    findingId: f.findingId,
    caseId: f.caseId,
    code: f.code,
    plainEnglish: f.plainEnglish.slice(0, 200),
    exactWording: (f.exactWording ?? "").slice(0, 120),
    expectedWording: f.expectedWording,
  })),
  knownFnRegister: {
    id: "FN-INCOMPLETE-DISCLAIMER",
    reviewed: false,
    reviewer: null,
    disposition:
      "open; contracts cover complete/truncated/absent/non-copyable; knownSafetyCriticalFn=null",
  },
};

fs.writeFileSync(
  path.join(outDir, "old-vs-new.json"),
  JSON.stringify(report, null, 2) + "\n",
);

const md = `# Stage-20 detector remediation — old vs new

| | Old | New |
|---|---:|---:|
| Run | ${report.oldRun} | ${report.newRun} |
| Findings | ${oldF.length} | ${newF.length} |
| pass | ${report.oldTally.pass ?? 0} | ${report.newTally.pass ?? 0} |
| defect | ${report.oldTally.defect ?? 0} | ${report.newTally.defect ?? 0} |
| unresolved | ${report.oldTally.unresolved ?? 0} | ${report.newTally.unresolved ?? 0} |
| not_exercised | ${report.oldTally.not_exercised ?? 0} | ${report.newTally.not_exercised ?? 0} |
| containment | ${report.oldTally.containment ?? 0} | ${report.newTally.containment ?? 0} |

## Counts

| Metric | Value |
|---|---:|
| genuine-candidate defects | **${genuineCandidateCount}** |
| detector-FP (of prior 31) | **${detectorFpCount}** |
| unresolved | ${report.counts.unresolved} |
| FP denominator | **${fpDenominator}** (Codex-reviewed prior defects) |
| explicit FP rate | **${detectorFpCount}/${fpDenominator} = ${(
  (detectorFpCount / fpDenominator) *
  100
).toFixed(1)}%** |

## Retained-ID verdict changes (exact findingId)

${
  verdictChangesOnRetainedIds.length
    ? verdictChangesOnRetainedIds
        .map((c) => `- \`${c.findingId}\`: **${c.from} → ${c.to}**`)
        .join("\n")
    : "- **None** — defect remediation changes the \`code\` segment inside findingId (\`state_mismatch\` → \`candidate_pending_source\` / \`state_domain_equivalent\`), so cleared FPs and candidates appear as removed+added IDs rather than same-ID flips."
}

## Semantic prior-defect dispositions (Codex 31)

${priorDispositions
  .map(
    (d) =>
      `- ${d.caseId} / ${d.controlId}: **${d.disposition}** — ${d.note} (\`${d.oldFindingId}\`${d.newFindingId ? ` → \`${d.newFindingId}\`` : ""})`,
  )
  .join("\n")}

## Added / removed ID explanation

- **Added (${addedIds.length}):** ${addedExplanation.rationale}
  - By code: ${JSON.stringify(addedExplanation.byCode)}
- **Removed (${removedIds.length}):** ${removedExplanation.rationale}

## Genuine candidates retained (pending source)

${newDefects
  .map(
    (f) =>
      `- **${f.caseId}**: ${f.plainEnglish.slice(0, 160)}`,
  )
  .join("\n")}

## Known-FN register disposition

- \`FN-INCOMPLETE-DISCLAIMER\`: **open**, \`reviewed=false\`, \`reviewer=null\`
- Contracts: complete pass · mid-truncation defect · absent defect · non-copyable containment separate
- \`knownSafetyCriticalFn\` remains **null** (unknown) — **no invented human reviewer or legal sign-off**

## Do not

commit / push / merge / deploy / claim programme PASS / start stage 50+
`;

fs.writeFileSync(path.join(outDir, "old-vs-new.md"), md);
console.log(
  JSON.stringify(
    {
      genuineCandidates: genuineCandidateCount,
      detectorFp: detectorFpCount,
      other: other.length,
      fpRate: `${detectorFpCount}/${fpDenominator}`,
      exactIdVerdictFlips: verdictChangesOnRetainedIds.length,
      dispositionBreakdown: priorDispositions.reduce(
        (a, d) => {
          a[d.disposition] = (a[d.disposition] ?? 0) + 1;
          return a;
        },
        {} as Record<string, number>,
      ),
    },
    null,
    2,
  ),
);
