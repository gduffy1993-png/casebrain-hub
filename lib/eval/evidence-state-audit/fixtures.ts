import fs from "node:fs";
import path from "node:path";

import { adaptCaseBrainOutput } from "./output-adapter";
import { parseTruthKeyJson } from "./truth-key-parse";
import type { CaseBrainAuditOutput, EvidenceStateTruthKey } from "./types";

export type AuditFixture = {
  id: string;
  truthKeyPath: string;
  outputPath: string;
  kind: "proof_pack" | "internal" | "simulator_v2";
};

export const PROOF_PACK_FIXTURE: AuditFixture = {
  id: "proof-pack-01",
  truthKeyPath: "content/casebrain-proof/simulator-bundle-01/truth-key.json",
  outputPath: "content/casebrain-proof/simulator-bundle-01/casebrain-output.json",
  kind: "proof_pack",
};

function repoRoot(): string {
  return path.resolve(__dirname, "../../..");
}

export function resolveFixturePath(relative: string): string {
  return path.join(repoRoot(), relative);
}

export function loadJsonFile<T>(absolutePath: string): T {
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as T;
}

export function loadTruthKeyFromFile(absolutePath: string): EvidenceStateTruthKey {
  return parseTruthKeyJson(loadJsonFile(absolutePath));
}

export function loadCaseBrainOutputFromFile(absolutePath: string): CaseBrainAuditOutput {
  return adaptCaseBrainOutput(loadJsonFile(absolutePath));
}

export function loadFixture(fixture: AuditFixture): {
  truthKey: EvidenceStateTruthKey;
  output: CaseBrainAuditOutput;
} {
  const truthKey = loadTruthKeyFromFile(resolveFixturePath(fixture.truthKeyPath));
  const output = loadCaseBrainOutputFromFile(resolveFixturePath(fixture.outputPath));
  return { truthKey, output };
}

export function listInternalAuditCases(rootRelative = "artifacts/evidence-state-audit-local/cases"): AuditFixture[] {
  const root = resolveFixturePath(rootRelative);
  if (!fs.existsSync(root)) return [];

  const fixtures: AuditFixture[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const caseDir = path.join(root, entry.name);
    const truthKeyPath = path.join(caseDir, "truth-key.json");
    const outputPath = path.join(caseDir, "casebrain-output.json");
    if (!fs.existsSync(truthKeyPath) || !fs.existsSync(outputPath)) continue;
    fixtures.push({
      id: entry.name,
      truthKeyPath: path.relative(repoRoot(), truthKeyPath).replace(/\\/g, "/"),
      outputPath: path.relative(repoRoot(), outputPath).replace(/\\/g, "/"),
      kind: "internal",
    });
  }
  return fixtures.sort((a, b) => a.id.localeCompare(b.id));
}

export function defaultFixtures(): AuditFixture[] {
  const byId = new Map<string, AuditFixture>();
  for (const f of [PROOF_PACK_FIXTURE, ...listInternalAuditCases()]) {
    const existing = byId.get(f.id);
    if (!existing || f.kind === "internal") byId.set(f.id, f);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}
