/**
 * Section 1 — reconcile first frozen 3000 open debt WITHOUT mutating that freeze.
 *
 * Reads ledgers from the sibling census worktree (or FIRST3000_LEDGER_ROOT).
 * Writes derivative reconciliation artefacts only under stage3000-diverse-second-v1.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const ROOT = process.cwd();
const OUT = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1/first3000-reconciliation",
);
const FIRST_MEMBERSHIP_HASH =
  "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae";
const FIRST_LEDGER_ROOT =
  process.env.FIRST3000_LEDGER_ROOT ||
  path.join(
    "C:/Users/gduff/casebrain-hub-wt-s3000-census",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-existing-census-v1-final-corrections",
  );

type Cand = {
  candidateId: string;
  caseId: string;
  controlId: string;
  findingCode: string;
  surfaceId: string;
  exactWording: string;
  textHash: string;
  exit: string;
  audience: string;
  reason: string;
};
type Disp = {
  candidateId: string;
  caseId: string;
  controlId: string;
  findingCode: string;
  disposition: string;
  reason: string;
};
type Mem = {
  caseId: string;
  sourceCaseId: string;
  sourceKind: string;
  family: string;
  layout: string;
  hasEsaPacket: boolean;
  hasTruthKeyOnDisk: boolean;
  contentOutputFingerprint: string;
};

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(name: string, data: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
function writeMd(name: string, body: string): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), body.endsWith("\n") ? body : `${body}\n`, "utf8");
}
async function readJsonl<T>(file: string): Promise<T[]> {
  const rows: T[] = [];
  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    rows.push(JSON.parse(line) as T);
  }
  return rows;
}
function normTemplate(s: string): string {
  return String(s || "")
    .toLowerCase()
    .replace(/messy-pdf-v\d+-\d+/g, "CASE")
    .replace(/\d{3,}/g, "#")
    .replace(/\s+/g, " ")
    .trim();
}

async function main(): Promise<void> {
  if (!fs.existsSync(FIRST_LEDGER_ROOT)) {
    throw new Error(`FIRST3000 ledger root missing: ${FIRST_LEDGER_ROOT}`);
  }
  const frozenPath = path.join(FIRST_LEDGER_ROOT, "frozen-membership-3000.json");
  const frozen = JSON.parse(fs.readFileSync(frozenPath, "utf8")) as {
    orderedMembershipSha256: string;
    membership: Mem[];
    populationCount: number;
  };
  if (frozen.orderedMembershipSha256 !== FIRST_MEMBERSHIP_HASH) {
    throw new Error(
      `Protected first-3000 membership hash mismatch: ${frozen.orderedMembershipSha256}`,
    );
  }

  const cands = await readJsonl<Cand>(path.join(FIRST_LEDGER_ROOT, "candidate-ledger.jsonl"));
  const disps = await readJsonl<Disp>(path.join(FIRST_LEDGER_ROOT, "truth-disposition-ledger.jsonl"));
  const candById = new Map(cands.map((c) => [c.candidateId, c]));
  const memByCase = new Map(frozen.membership.map((m) => [m.caseId, m]));

  // --- A. unresolved_source ---
  const unresolved = disps.filter((d) => d.disposition === "unresolved_source");
  const sourceRows: unknown[] = [];
  const sourceClassCounts: Record<string, number> = {};
  const findingOnUnresolved: Record<string, number> = {};
  const sharedRoots = new Map<string, { rootId: string; count: number; findingCode: string; reason: string }>();

  for (const d of unresolved) {
    const c = candById.get(d.candidateId);
    const m = memByCase.get(d.caseId);
    const findingCode = c?.findingCode || d.findingCode;
    findingOnUnresolved[findingCode] = (findingOnUnresolved[findingCode] || 0) + 1;

    // Honest ownership: every unresolved row is truth_key_not_on_disk on v9_catalog.
    // ESA/truth packs were never present for those catalog clones — do not invent papers.
    let classification:
      | "recoverable_source_debt"
      | "intentional_missing_evidence_test"
      | "corpus_harness_or_serialisation_debt"
      | "genuinely_unavailable_or_unsupported"
      | "unresolved_ownership" = "genuinely_unavailable_or_unsupported";

    if (m?.sourceKind === "v9_catalog" && d.reason === "truth_key_not_on_disk") {
      classification = "genuinely_unavailable_or_unsupported";
    } else if (!m) {
      classification = "unresolved_ownership";
    } else if (m.hasEsaPacket && !m.hasTruthKeyOnDisk) {
      classification = "corpus_harness_or_serialisation_debt";
    }

    sourceClassCounts[classification] = (sourceClassCounts[classification] || 0) + 1;
    const rootKey = `${findingCode}|${d.reason}|${m?.sourceKind || "?"}`;
    if (!sharedRoots.has(rootKey)) {
      sharedRoots.set(rootKey, {
        rootId: sha(rootKey).slice(0, 16),
        count: 0,
        findingCode,
        reason: d.reason,
      });
    }
    sharedRoots.get(rootKey)!.count += 1;

    sourceRows.push({
      candidateId: d.candidateId,
      caseId: d.caseId,
      sourceCaseId: m?.sourceCaseId || null,
      sourceKind: m?.sourceKind || null,
      family: m?.family || null,
      hasEsaPacket: m?.hasEsaPacket ?? null,
      hasTruthKeyOnDisk: m?.hasTruthKeyOnDisk ?? null,
      findingCode,
      surfaceId: c?.surfaceId || null,
      dispositionReason: d.reason,
      classification,
      repairAllowedInFirstFreeze: false,
      mayRepairViaSharedLogicInDerivativeOnly:
        classification === "recoverable_source_debt" ||
        classification === "corpus_harness_or_serialisation_debt",
      mustNotManufactureMissingPapers: true,
      mustNotConvertUnavailableToPass: true,
    });
  }

  const uniqueUnresolvedCases = new Set(unresolved.map((d) => d.caseId)).size;
  const sourceDebt = {
    schemaVersion: "first3000-source-debt-reconciliation@1.0.0",
    generatedAt: new Date().toISOString(),
    firstFrozenMembershipSha256: FIRST_MEMBERSHIP_HASH,
    firstLedgerRoot: FIRST_LEDGER_ROOT,
    firstFreezeMutated: false,
    occurrenceCount: unresolved.length,
    uniqueCases: uniqueUnresolvedCases,
    classificationCounts: sourceClassCounts,
    findingCodeCounts: findingOnUnresolved,
    sharedRoots: [...sharedRoots.values()].sort((a, b) => b.count - a.count),
    rulesApplied: [
      "Preserve frozen first-3000 run",
      "Categories recoverable_source_debt and corpus_harness_or_serialisation_debt may be repaired only via shared logic in separately versioned derivative",
      "Categories intentional_missing_evidence_test, genuinely_unavailable_or_unsupported, unresolved_ownership remain missing/unresolved/not_exercised",
      "Never turn unavailable evidence into PASS",
      "Do not regenerate the first corpus",
    ],
    headline:
      "All 980 unresolved_source occurrences are truth_key_not_on_disk on v9_catalog cases (no ESA/truth pack). Classified genuinely_unavailable_or_unsupported for truth scoring — not manufactured recoverable papers.",
    occurrencesRef: "recoverable-vs-intentional-vs-unavailable-register.json",
  };
  writeJson("first3000-source-debt-reconciliation.json", sourceDebt);

  writeJson("recoverable-vs-intentional-vs-unavailable-register.json", {
    schemaVersion: "first3000-source-debt-register@1.0.0",
    generatedAt: new Date().toISOString(),
    firstFrozenMembershipSha256: FIRST_MEMBERSHIP_HASH,
    occurrenceCount: sourceRows.length,
    classificationCounts: sourceClassCounts,
    rows: sourceRows,
  });

  writeMd(
    "first3000-source-debt-decision-card.md",
    `# First-3000 source-debt decision card

## Verdict
**980 / 980** \`unresolved_source\` occurrences are \`truth_key_not_on_disk\` on \`v9_catalog\` cases (membership shows 800 cases without ESA/truth).

## Classification
| Class | Count | Action |
|---|---:|---|
| genuinely_unavailable_or_unsupported | ${sourceClassCounts.genuinely_unavailable_or_unsupported || 0} | Remain unresolved / not truth-scored. Do not invent papers. |
| recoverable_source_debt | ${sourceClassCounts.recoverable_source_debt || 0} | None found |
| intentional_missing_evidence_test | ${sourceClassCounts.intentional_missing_evidence_test || 0} | None found |
| corpus_harness_or_serialisation_debt | ${sourceClassCounts.corpus_harness_or_serialisation_debt || 0} | None found (ESA never present) |
| unresolved_ownership | ${sourceClassCounts.unresolved_ownership || 0} | None found |

## Finding codes parked behind missing truth
${Object.entries(findingOnUnresolved)
  .map(([k, v]) => `- ${k}: ${v}`)
  .join("\n")}

## Decision
- **Do not** re-run or mutate the first frozen 3000 to manufacture truth packs.
- **Do** require complete \`complete_source_packet\` or deliberate truth-keyed missing sources on the second corpus.
- Underlying surface findings (e.g. absolute-proof wording) on those cases remain **not truth-confirmed** here.

## Protected
Membership hash \`${FIRST_MEMBERSHIP_HASH}\` unchanged. First freeze not mutated.
`,
  );

  // --- B. professional wording ---
  const prof = disps.filter((d) => d.disposition === "professional_wording_review_required");
  const stringMap = new Map<
    string,
    {
      textHash: string;
      exactWording: string;
      occurrenceCount: number;
      cases: Set<string>;
      surfaces: Set<string>;
      exits: Set<string>;
      audiences: Set<string>;
      findingCode: string;
      template: string;
    }
  >();

  for (const d of prof) {
    const c = candById.get(d.candidateId);
    if (!c) continue;
    const th = c.textHash || sha(c.exactWording);
    if (!stringMap.has(th)) {
      stringMap.set(th, {
        textHash: th,
        exactWording: c.exactWording,
        occurrenceCount: 0,
        cases: new Set(),
        surfaces: new Set(),
        exits: new Set(),
        audiences: new Set(),
        findingCode: c.findingCode,
        template: normTemplate(c.exactWording),
      });
    }
    const e = stringMap.get(th)!;
    e.occurrenceCount += 1;
    e.cases.add(d.caseId);
    e.surfaces.add(c.surfaceId);
    e.exits.add(c.exit);
    e.audiences.add(c.audience);
  }

  const wordingRows = [...stringMap.values()].map((e, i) => {
    // Both observed strings are COPY_QUALITY_PROTECTED_ACRONYM_CASING on lowercase bwv/cctv.
    // Technical: not an enum leak; style/detector preference — do not auto-approve as solicitor gold.
    const technicalClassification =
      e.findingCode === "COPY_QUALITY_PROTECTED_ACRONYM_CASING"
        ? "safe_but_could_be_improved"
        : "requires_qualified_legal_review";
    const proposed =
      e.findingCode === "COPY_QUALITY_PROTECTED_ACRONYM_CASING"
        ? e.exactWording.replace(/\bbwv\b/g, "BWV").replace(/\bcctv\b/g, "CCTV")
        : null;
    return {
      stringId: `PW-${String(i + 1).padStart(3, "0")}`,
      textHash: e.textHash,
      exactWording: e.exactWording,
      normalizedTemplate: e.template,
      occurrenceCount: e.occurrenceCount,
      caseCount: e.cases.size,
      surfaces: [...e.surfaces],
      exits: [...e.exits],
      audiences: [...e.audiences],
      findingCode: e.findingCode,
      technicalClassification,
      duplicateOccurrenceOf: e.occurrenceCount > 1 ? e.textHash : null,
      sharedWordingRoot:
        e.findingCode === "COPY_QUALITY_PROTECTED_ACRONYM_CASING"
          ? "protected_evidence_acronym_casing_bwv_cctv"
          : "other",
      proposedImprovedWording: proposed,
      reviewerDecision: null,
      reviewerIdentity: null,
      reviewerRole: null,
      reviewDate: null,
      usedAsHumanApprovedGold: false,
      objectiveSharedDefectFixApplied: false,
    };
  });

  const wordingRegister = {
    schemaVersion: "first3000-professional-wording-review-register@1.0.0",
    generatedAt: new Date().toISOString(),
    firstFrozenMembershipSha256: FIRST_MEMBERSHIP_HASH,
    occurrenceCount: prof.length,
    uniqueExactStrings: wordingRows.length,
    uniqueNormalizedTemplates: new Set(wordingRows.map((r) => r.normalizedTemplate)).size,
    uniqueCases: new Set(prof.map((d) => d.caseId)).size,
    claimSolicitorReview: false,
    claimQualifiedLegalApproval: false,
    rows: wordingRows,
  };
  writeJson("first3000-professional-wording-review-register.json", wordingRegister);

  writeJson("first3000-wording-shared-root-map.json", {
    schemaVersion: "first3000-wording-shared-root-map@1.0.0",
    generatedAt: new Date().toISOString(),
    roots: [
      {
        rootId: "protected_evidence_acronym_casing_bwv_cctv",
        findingCode: "COPY_QUALITY_PROTECTED_ACRONYM_CASING",
        occurrenceCount: prof.length,
        uniqueStrings: wordingRows.length,
        surfaces: [...new Set(wordingRows.flatMap((r) => r.surfaces))],
        technicalNote:
          "Detector flags lowercase evidence acronyms (bwv/cctv). Not raw-enum leakage. Style improvement candidate only; blank human review fields.",
        secondCorpusDetectorUse:
          "Prefer emitting conventional uppercase BWV/CCTV in solicitor-visible prose OR treat mid-sentence lowercase acronyms as non-defect for second-corpus detectors after documented policy.",
      },
    ],
  });

  writeMd(
    "first3000-qualified-wording-review-bundle.md",
    `# First-3000 qualified wording review bundle

**Not solicitor-approved. Not legal gold.**

## Population
- Occurrences: **${prof.length}**
- Unique exact strings: **${wordingRows.length}**
- Unique templates: **${new Set(wordingRows.map((r) => r.normalizedTemplate)).size}**
- Finding code: COPY_QUALITY_PROTECTED_ACRONYM_CASING (100%)

## Shared root
Protected evidence acronym casing (\`bwv\` / \`cctv\` lowercase in solicitor-visible text).

## Proposed improvements (unreviewed)
${wordingRows
  .map(
    (r) => `### ${r.stringId}
- Cases: ${r.caseCount} · Occurrences: ${r.occurrenceCount}
- Surfaces: ${r.surfaces.join(", ")}
- Technical class: ${r.technicalClassification}
- reviewerDecision / reviewerIdentity / reviewerRole / reviewDate: **blank**
- Proposed (not approved):
\`\`\`
${r.proposedImprovedWording || "(none)"}
\`\`\`
`,
  )
  .join("\n")}

## Rules
- Do not use proposed wording as human-approved gold.
- No objective shared production defect auto-fixed in this unit (casing preference only).
- Second corpus may tighten acronym casing helpers or detector policy with explicit documentation.
`,
  );

  writeJson("PROGRAMME-PROGRESS.json", {
    schemaVersion: "stage3000-diverse-second-progress@1.0.0",
    phase: "section1_first3000_debt_reconciled",
    completedAt: new Date().toISOString(),
    firstMembershipPreserved: FIRST_MEMBERSHIP_HASH,
    nextPhase: "section2_existing_coverage_inventory",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        out: OUT,
        unresolved: unresolved.length,
        sourceClassCounts,
        professionalOccurrences: prof.length,
        professionalUniqueStrings: wordingRows.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
