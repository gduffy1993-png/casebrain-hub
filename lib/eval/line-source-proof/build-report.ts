import fs from "node:fs";
import path from "node:path";

import { auditAllLines } from "./audit-lines";
import { buildH5CaseModelsWithLedger } from "./build-case-models";
import { buildProofLedger } from "./build-proof-ledger";
import {
  attachProofChainToLine,
  buildCaseProofChainAppendix,
  discoverCaseProofChainContext,
  writeProofChainPageStubs,
} from "./proof-chain";
import { buildReportSummary, renderLineByLineMarkdown } from "./render-markdown";
import { renderSolicitorProofPacket } from "./render-solicitor-proof-packet";
import type { LineSourceProofReport } from "./types";

const DISCLAIMER =
  "Controlled/anonymised audit only unless solicitor-reviewed real bundles are used. Do not claim real-world false-served rate or solicitor-reviewed accuracy from controlled data.";

const DEFAULT_OUT_ROOT = path.join(process.cwd(), "artifacts", "casebrain-qa", "line-source-proof");

export function buildLineSourceProof(caseDir: string, outRoot = DEFAULT_OUT_ROOT): LineSourceProofReport {
  const { models, raw, session } = buildH5CaseModelsWithLedger(caseDir);
  const chainCtx = discoverCaseProofChainContext(caseDir, models.caseId, models.bundleText, models.truthKey);
  const audited = auditAllLines(models);
  const lines = audited.map((line) => attachProofChainToLine(line, chainCtx, models.bundleText, outRoot));
  const proofChainAppendix = buildCaseProofChainAppendix(lines, chainCtx);
  writeProofChainPageStubs(proofChainAppendix, chainCtx, lines, outRoot);

  const bundleRel = path.relative(process.cwd(), path.join(caseDir, "bundle-text.md")).replace(/\\/g, "/");

  const summary = buildReportSummary(lines, proofChainAppendix);

  const proofLedger = buildProofLedger(
    {
      caseId: models.caseId,
      caseTitle: models.truthKey.title ?? models.caseId,
      defendant: models.clientLabel,
      allegation: models.allegation,
      bundleText: models.bundleText,
      truthKey: models.truthKey,
      emittedLines: lines,
      proofChainAppendix,
      sessionSuppressions: session.getSuppressions(),
      sessionRewrites: session.getRewrites(),
    },
    raw,
  );

  return {
    caseId: models.caseId,
    caseTitle: models.truthKey.title ?? models.caseId,
    defendant: models.clientLabel,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
    bundleSourcePath: bundleRel,
    bundleText: models.bundleText,
    method:
      "Runs live H5 builders on bundle text, maps each meaningful output line to extracted bundle snippets, records proof-chain status (PDF/page vs text only), and builds solicitor-readable proof ledgers. No Brain 1 mutation.",
    lines,
    proofChainAppendix,
    summary,
    proofLedger,
  };
}

export function writeLineSourceProofArtifacts(
  report: LineSourceProofReport,
  outRoot = DEFAULT_OUT_ROOT,
): { mdPath: string; jsonPath: string; ledgerPath: string; packetPath: string } {
  const outDir = path.join(outRoot, report.caseId);
  fs.mkdirSync(outDir, { recursive: true });
  const mdPath = path.join(outDir, "line-by-line-proof.md");
  const jsonPath = path.join(outDir, "line-by-line-proof.json");
  const ledgerPath = path.join(outDir, "proof-ledger.json");
  const packetPath = path.join(outDir, "SOLICITOR-PROOF-PACKET.md");
  fs.writeFileSync(mdPath, renderLineByLineMarkdown(report));
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(ledgerPath, JSON.stringify(report.proofLedger, null, 2));
  fs.writeFileSync(packetPath, renderSolicitorProofPacket(report));
  return { mdPath, jsonPath, ledgerPath, packetPath };
}
