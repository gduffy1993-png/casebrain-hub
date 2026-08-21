/**
 * Tip sample: re-project Client invent_phone cases after D1 armour.
 */
import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildMatterBrief } from "@/components/criminal/workflow/buildMatterBrief";
import { buildCriminalBriefPlan } from "@/lib/criminal/brief-plan";
import { buildClientSafeExplanation } from "@/lib/criminal/build-client-safe-explanation";
import { buildContradictionActions } from "@/lib/criminal/contradiction-actions";
import { buildBundleTruthLedger } from "@/lib/criminal/bundle-truth-ledger";
import { buildExportPack } from "@/lib/criminal/export-pack";
import { extractAllBundleContradictions } from "@/lib/criminal/merge-bundle-contradictions";
import { extractTextFromFileBuffer } from "@/lib/upload/extract-text-from-file";

const ROOT = process.cwd();
const INDEX = path.join(ROOT, "artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/CRIMINAL-UNIQUE-INDEX.csv");
const ND = path.join(ROOT, "artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/client-sweep.ndjson");
const OUT = path.join(ROOT, "artifacts/casebrain-qa/assurance/client-criminal-sweep-v1/tip-sample-d1-phone.json");

function parseCsv(p: string): Map<string, { pdf_path: string; case_key: string }> {
  const lines = fs.readFileSync(p, "utf8").split(/\n/).filter(Boolean);
  const header = lines[0]!.split(",");
  const iKey = header.indexOf("unique_key");
  const iPdf = header.indexOf("pdf_path");
  const iCase = header.indexOf("case_key");
  const map = new Map<string, { pdf_path: string; case_key: string }>();
  for (const line of lines.slice(1)) {
    // naive CSV — paths rarely have commas in this index
    const cols = line.split(",");
    map.set(cols[iKey]!, { pdf_path: cols[iPdf] || "", case_key: cols[iCase] || "" });
  }
  return map;
}

function scoresPhoneInvent(claimBlob: string, bundleText: string): boolean {
  const claim = /phone download|source export referred|digital extraction|original download|phone extraction/i.test(claimBlob);
  const source = /phone download|source export|handset download|digital extraction|extraction report|phone extraction/i.test(bundleText);
  return claim && !source;
}

async function main() {
  const index = parseCsv(INDEX);
  const inventKeys: string[] = [];
  for (const line of fs.readFileSync(ND, "utf8").split(/\n/).filter(Boolean)) {
    const o = JSON.parse(line) as { unique_key?: string; inventFlags?: string[] };
    if ((o.inventFlags || []).includes("invent_phone_download") && o.unique_key) inventKeys.push(o.unique_key);
  }
  const sample = inventKeys.slice(0, 40);
  let still = 0;
  let cleared = 0;
  let errors = 0;
  const residual: string[] = [];

  for (const key of sample) {
    const row = index.get(key);
    if (!row?.pdf_path || !fs.existsSync(row.pdf_path)) {
      errors++;
      continue;
    }
    try {
      const buf = fs.readFileSync(row.pdf_path);
      const text = await extractTextFromFileBuffer(path.basename(row.pdf_path), "application/pdf", buf);
      if (!text || text.length < 80) {
        errors++;
        continue;
      }
      const bundleText = text.slice(0, 220_000);
      const ledger = buildBundleTruthLedger({ bundleText });
      const allegation = ledger.charge?.wording || row.case_key || "Allegation";
      const clientLabel = ledger.defendant?.defendant || "Defendant";
      const chase = buildDisclosureChaseBrief({
        caseId: "tip",
        caseTitle: row.case_key,
        clientLabel,
        allegation,
        stage: "PTPH",
        hearingStatus: "Unknown",
        hearingDateIso: null,
        bundleHealth: "ok",
        positionStatus: "provisional",
        battleboard: null,
        bundleText,
      });
      const war = buildHearingWarRoomBrief({
        caseId: "tip",
        caseTitle: row.case_key,
        clientLabel,
        allegation,
        stage: "PTPH",
        hearingStatus: "Unknown",
        bundleHealth: "ok",
        positionStatus: "provisional",
        readiness: "provisional",
        hasSavedPosition: false,
        battleboard: null,
        chaseItems: chase.primaryItems.map((i) => i.label),
        bundleText,
      });
      const briefPlan = buildCriminalBriefPlan({ allegation, bundleText, ledger });
      const contradictions = extractAllBundleContradictions(bundleText);
      const contradictionActions = buildContradictionActions(contradictions);
      const clientSafe = buildClientSafeExplanation({
        clientLabel,
        allegation,
        contradictions,
        contradictionActionLines: contradictionActions.map((a) => a.clientSafeLine),
        hasOutstandingDisclosure: chase.primaryItems.length > 0,
        fallback: war.draftWording?.clientExplanation ?? null,
      });
      const matter = buildMatterBrief({ warRoom: war, chase, primaryRouteTitle: null, briefPlan });
      const clientSection = matter.sections.find((s) => s.id === "client");
      const exportPack = buildExportPack({
        caseId: "tip",
        allegation,
        warRoom: war,
        chase,
        briefPlan,
        matterConfidence: null,
        doNotOverstate: war.doNotOverstate ?? [],
        primaryRouteTitle: null,
        urnCandidateTexts: [bundleText.slice(0, 4000)],
        bundleText,
      });
      const claims = [
        clientSafe ? `CLIENT_SAFE | ${clientSafe}` : "",
        war.draftWording?.clientExplanation ? `CLIENT_EXPLAIN | ${war.draftWording.clientExplanation}` : "",
        clientSection?.paragraph ? `MATTER_CLIENT | ${clientSection.paragraph}` : "",
        exportPack.sections.find((s) => s.id === "client_summary")?.textForClipboard
          ? `EXPORT_CLIENT | ${exportPack.sections.find((s) => s.id === "client_summary")!.textForClipboard.slice(0, 1200)}`
          : "",
        exportPack.sections.find((s) => s.id === "evidence_gaps")?.textForClipboard
          ? `EXPORT_GAPS | ${exportPack.sections.find((s) => s.id === "evidence_gaps")!.textForClipboard.slice(0, 1600)}`
          : "",
        ...chase.primaryItems.slice(0, 12).map((i) => `CHASE_BLEED | ${i.label}`),
      ]
        .filter(Boolean)
        .join("\n");
      if (scoresPhoneInvent(claims, bundleText)) {
        still++;
        residual.push(row.case_key);
      } else cleared++;
    } catch {
      errors++;
    }
  }

  const out = {
    tip: "d1-phone-truth-map",
    sampled: sample.length,
    cleared,
    stillInvent: still,
    errors,
    residualCaseKeys: residual.slice(0, 12),
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
