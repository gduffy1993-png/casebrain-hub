import fs from "node:fs";
import path from "node:path";
import type {
  ContradictionBlock,
  ExplanationBlock,
  ExplanationMaterialStatus,
} from "./explanation-fidelity-types";
import {
  generateExplanationFidelity,
  sourceBasisInBundle,
  sourceSectionTermsPresent,
} from "./explanation-fidelity-generate";

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const GOLD_EXPECT_DIR = path.join(REPO_ROOT, "docs", "bundle-fidelity-set", "explanation", "gold");

export type ExplanationExpectIssue = {
  issueContains: string;
  status: ExplanationMaterialStatus;
  sourceBasisContains: string[];
  doNotOverstateRequired?: boolean;
};

export type ExplanationExpectContradiction = {
  issueContains: string;
  reconciliationStatus: "conflicting" | "unclear";
  sourceBasisContains: string[];
};

export type ExplanationGoldExpect = {
  bundleId: string;
  missingMaterial: ExplanationExpectIssue[];
  contradictions?: ExplanationExpectContradiction[];
  custodyInterview?: ExplanationExpectIssue[];
  disclosureDependencies?: ExplanationExpectIssue[];
};

export function loadGoldExplanationExpect(bundleId: string): ExplanationGoldExpect | null {
  const file = path.join(GOLD_EXPECT_DIR, `${bundleId}.expect.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as ExplanationGoldExpect;
}

/** Gitignored: `artifacts/bundle-fidelity-local/cases/<case>/explanation-expect.json` */
export function loadLocalExplanationExpect(caseDir: string): ExplanationGoldExpect | null {
  const file = path.join(caseDir, "explanation-expect.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as ExplanationGoldExpect;
}

export function loadExplanationExpect(bundleId: string, caseDir?: string): ExplanationGoldExpect | null {
  if (caseDir) {
    const local = loadLocalExplanationExpect(caseDir);
    if (local) return local;
  }
  return loadGoldExplanationExpect(bundleId);
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function findBlock(blocks: ExplanationBlock[], issueContains: string): ExplanationBlock | undefined {
  const needle = norm(issueContains);
  return blocks.find((b) => norm(b.issue).includes(needle) || needle.includes(norm(b.issue)));
}

function findContradiction(
  blocks: ContradictionBlock[],
  issueContains: string,
): ContradictionBlock | undefined {
  const needle = norm(issueContains);
  return blocks.find((b) => norm(b.issue).includes(needle) || needle.includes(norm(b.issue)));
}

function lintGeneratedBlock(bundleText: string, block: ExplanationBlock): string[] {
  const errs: string[] = [];
  if (!block.issue?.trim()) errs.push("empty issue");
  if (!block.sourceBasis?.trim()) errs.push(`empty sourceBasis for ${block.issue}`);
  if (!sourceBasisInBundle(bundleText, block.sourceBasis)) {
    errs.push(`sourceBasis not traceable in bundle: ${block.issue}`);
  }
  if (!sourceSectionTermsPresent(bundleText, block.sourceSection)) {
    errs.push(`sourceSection cites absent document type: ${block.issue} (${block.sourceSection})`);
  }
  if (
    (block.status === "outstanding" || block.status === "conflicting") &&
    !block.doNotOverstate?.trim()
  ) {
    errs.push(`doNotOverstate required for ${block.status}: ${block.issue}`);
  }
  return errs;
}

function checkExpectIssue(
  bundleText: string,
  blocks: ExplanationBlock[],
  exp: ExplanationExpectIssue,
  label: string,
): string[] {
  const failures: string[] = [];
  const block = findBlock(blocks, exp.issueContains);
  if (!block) {
    failures.push(`${label}: no block matching issue "${exp.issueContains}"`);
    return failures;
  }
  if (block.status !== exp.status) {
    failures.push(`${label}: "${exp.issueContains}" status ${block.status} !== expected ${exp.status}`);
  }
  const basis = norm(block.sourceBasis);
  for (const frag of exp.sourceBasisContains) {
    if (!basis.includes(norm(frag)) && !norm(bundleText).includes(norm(frag))) {
      failures.push(`${label}: "${exp.issueContains}" missing basis fragment "${frag}"`);
    }
  }
  if (exp.doNotOverstateRequired !== false && (exp.status === "outstanding" || exp.status === "conflicting")) {
    if (!block.doNotOverstate?.trim()) {
      failures.push(`${label}: "${exp.issueContains}" missing doNotOverstate`);
    }
  }
  failures.push(...lintGeneratedBlock(bundleText, block).map((e) => `${label}: ${e}`));
  return failures;
}

export function evaluateExplanationAgainstExpect(
  bundleText: string,
  sections: ReturnType<typeof generateExplanationFidelity>,
  expect: ExplanationGoldExpect,
): string[] {
  const failures: string[] = [];
  const missingSection = sections.find((s) => s.key === "missing-material");
  const contraSection = sections.find((s) => s.key === "contradictions");
  const custodySection = sections.find((s) => s.key === "custody-interview");
  const disclosureSection = sections.find((s) => s.key === "disclosure-dependencies");

  for (const exp of expect.missingMaterial) {
    failures.push(
      ...checkExpectIssue(bundleText, missingSection?.blocks ?? [], exp, "missing-material"),
    );
  }
  for (const exp of expect.contradictions ?? []) {
    const block = findContradiction(contraSection?.contradictions ?? [], exp.issueContains);
    if (!block) {
      failures.push(`contradictions: no block matching "${exp.issueContains}"`);
      continue;
    }
    if (block.reconciliationStatus !== exp.reconciliationStatus) {
      failures.push(
        `contradictions: "${exp.issueContains}" reconciliation ${block.reconciliationStatus} !== ${exp.reconciliationStatus}`,
      );
    }
    const basis = norm(block.sourceBasis);
    for (const frag of exp.sourceBasisContains) {
      if (!basis.includes(norm(frag)) && !norm(bundleText).includes(norm(frag))) {
        failures.push(`contradictions: "${exp.issueContains}" missing fragment "${frag}"`);
      }
    }
    failures.push(...lintGeneratedBlock(bundleText, block).map((e) => `contradictions: ${e}`));
  }
  for (const exp of expect.custodyInterview ?? []) {
    failures.push(
      ...checkExpectIssue(bundleText, custodySection?.blocks ?? [], exp, "custody-interview"),
    );
  }
  for (const exp of expect.disclosureDependencies ?? []) {
    failures.push(
      ...checkExpectIssue(
        bundleText,
        disclosureSection?.blocks ?? [],
        exp,
        "disclosure-dependencies",
      ),
    );
  }

  for (const section of sections) {
    for (const block of section.blocks) {
      failures.push(...lintGeneratedBlock(bundleText, block).map((e) => `${section.key}: ${e}`));
    }
    for (const block of section.contradictions) {
      failures.push(...lintGeneratedBlock(bundleText, block).map((e) => `${section.key}: ${e}`));
    }
  }

  return [...new Set(failures)];
}

export type ExplanationCaseEvaluation = {
  expect: ExplanationGoldExpect | null;
  failures: string[];
  generatedBlockCount: number;
};

export function evaluateExplanationCase(
  bundleId: string,
  bundleText: string,
  caseDir?: string,
): ExplanationCaseEvaluation {
  const sections = generateExplanationFidelity(bundleText);
  const expect = loadExplanationExpect(bundleId, caseDir);
  const generatedBlockCount =
    sections.reduce((n, s) => n + s.blocks.length + s.contradictions.length, 0) ?? 0;

  if (!expect) {
    return {
      expect: null,
      failures: caseDir ? ["no local explanation-expect.json in case folder"] : ["no gold explanation expect file"],
      generatedBlockCount,
    };
  }

  return {
    expect,
    failures: evaluateExplanationAgainstExpect(bundleText, sections, expect),
    generatedBlockCount,
  };
}
