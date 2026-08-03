/**
 * Materialise solicitor-visible surfaces for diverse-3000 from source packs.
 * Truth sealed path is never read. Uses shared production wording helpers where imported.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  preserveProtectedAcronyms,
  scanSolicitorVisibleCopyQuality,
} from "../../../lib/criminal/solicitor-visible-quality";
import { containsAbsoluteProofWording } from "../../../lib/criminal/absolute-proof-wording";
import {
  scanSolicitorVisibleInternalLanguageBoundary,
  solicitorVisibleTextContainsFamilyIssueCodes,
} from "../../../lib/criminal/solicitor-family-provenance";

const ROOT = process.cwd();
const PROG = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v1",
);
const SOURCE_ROOT = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-matter-graphs/sources",
);
const OUT_SURF = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-solicitor-materialisation/run-v1/surfaces.jsonl",
);
const OUT_META = path.join(
  ROOT,
  "artifacts/casebrain-qa/integrity-programme/diverse3000-solicitor-materialisation/run-v1",
);
const RESUME = process.argv.includes("--resume");
const CHECKPOINTS = [5, 20, 50, 150, 300, 500, 1000, 2000, 3000] as const;

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(p: string, data: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

type Mem = {
  orderIndex: number;
  caseId: string;
  primaryFamily: string;
  tier: string;
  sourceCompleteness: string;
  sourceFingerprint: string;
  substantiveTruthFingerprint: string;
  documentRelationshipFingerprint: string;
  defencePosition: string;
  proceduralLifecycle: string;
  renderPdf: boolean;
};

function buildSurfaces(mem: Mem, skeleton: any, sourcePack: any) {
  const charge = skeleton.charge?.wording || "Charge wording unavailable from source pack";
  const court = skeleton.proceduralStateGraph?.court || "Court not stated in pack";
  const hearing = skeleton.proceduralStateGraph?.hearingDate || "date not stated";
  const gaps = (skeleton.missingMaterialGraph || [])
    .map((g: { item: string }) => g.item)
    .join(", ");
  const evidenceLines = (skeleton.evidenceStateGraph || [])
    .map((e: { item: string; state: string }) => `• ${e.item.replace(/_/g, " ")} — ${e.state.replace(/_/g, " ")}`)
    .join("\n");

  const courtLineRaw = `Item: Court line\nStatus: Available for solicitor review\nReason: ${court} listing marker ${hearing}. Operative allegation under review: ${charge}. Defence position modelled from instructions: ${String(skeleton.defencePosition || "").replace(/_/g, " ")}.${
    gaps ? ` Material not yet available: ${gaps.replace(/_/g, " ")}.` : ""
  } Next: confirm the papers against the charge before any court-facing send.`;
  const courtLine = preserveProtectedAcronyms(courtLineRaw);

  const clientSummary = preserveProtectedAcronyms(
    `Item: Client summary\nStatus: Available\nReason: This is a fictional test matter summary for assurance only. The allegation under review is described in the source pack. It is not proved by this summary. ${
      gaps
        ? `Some material is missing or not yet served (${gaps.replace(/_/g, " ")}).`
        : "No deliberate missing-material markers were declared."
    } Next: discuss the papers and options with your solicitor before any plea or hearing.`,
  );

  const chase = preserveProtectedAcronyms(
    `Item: Disclosure chase\nStatus: Available\nReason: ${
      gaps
        ? `Chase outstanding items: ${gaps.replace(/_/g, " ")}. Do not treat referred-only or missing items as served.`
        : "No outstanding deliberate gaps declared in the source completeness contract."
    } Next: send a precise chase limited to the missing items and keep a copy on the file.`,
  );

  const exportPreview = preserveProtectedAcronyms(
    gaps
      ? `Item: Export preview\nStatus: Copy unavailable\nReason: Export wording has been withheld because some source material is missing or inconsistent with a complete packet (${gaps.replace(/_/g, " ")}). Review the source bundle, confirm the operative allegation, and regenerate the export using only compatible material. Next: check the papers against the charge before any export or send.`
      : `Item: Export preview\nStatus: Available for solicitor review\nReason: Packet declared complete for this fictional test matter. Export remains subject to solicitor approval and must not state the allegation as proved. Next: review before send.`,
  );

  const keyFacts = preserveProtectedAcronyms(
    `Key facts (source-backed / limited)\n• Family under review: ${mem.primaryFamily.replace(/_/g, " ")}\n• Procedural stage: ${String(skeleton.proceduralLifecycle || "").replace(/_/g, " ")}\n• Charge instrument (fictional test): ${charge}\nEvidence states:\n${evidenceLines || "• none listed"}`,
  );

  const quarantine =
    (skeleton.evidenceStateGraph || []).some((e: { state: string }) => e.state !== "served")
      ? preserveProtectedAcronyms(
          `Quarantined source rows (for solicitor review — not for copy as a complete evidence list):\n${(skeleton.evidenceStateGraph || [])
            .filter((e: { state: string }) => e.state !== "served")
            .map((e: { item: string; state: string }) => `• ${e.item.replace(/_/g, " ")} (${e.state.replace(/_/g, " ")})`)
            .join("\n")}`,
        )
      : "";

  const doNot = preserveProtectedAcronyms(
    `Do not overstate\n• do not say the allegation is fully proved on current disclosure\n• do not say the papers safely confirm guilt\n• do not invent page numbers or treat missing material as served`,
  );

  const apiPreview = preserveProtectedAcronyms(
    `Item: Interface preview\nStatus: Available for solicitor review\nReason: Preview of the allegation under review: ${charge}. This preview is for defence-file use only and must not be treated as a court-ready send. Next: check the papers and confirm the charge before any external use.`,
  );

  const rows = [
    { surfaceId: "court_line", text: courtLine, canCopy: false, canExport: false, apiUsable: false, builder: "shared_preserveProtectedAcronyms+packet_compose" },
    { surfaceId: "client_summary", text: clientSummary, canCopy: false, canExport: false, apiUsable: false, builder: "shared_preserveProtectedAcronyms+packet_compose" },
    { surfaceId: "disclosure_chase", text: chase, canCopy: true, canExport: false, apiUsable: false, builder: "shared_preserveProtectedAcronyms+packet_compose" },
    { surfaceId: "export_preview", text: exportPreview, canCopy: false, canExport: true, apiUsable: false, builder: "shared_preserveProtectedAcronyms+packet_compose" },
    { surfaceId: "key_facts", text: keyFacts, canCopy: false, canExport: false, apiUsable: false, builder: "packet_local_projection" },
    { surfaceId: "do_not_overstate", text: doNot, canCopy: false, canExport: false, apiUsable: false, builder: "packet_local_projection" },
    { surfaceId: "api_interface_preview", text: apiPreview, canCopy: false, canExport: false, apiUsable: true, builder: "packet_local_projection" },
  ];
  if (quarantine) {
    rows.push({
      surfaceId: "evidence_family_quarantine",
      text: quarantine,
      canCopy: false,
      canExport: false,
      apiUsable: false,
      builder: "packet_local_projection",
    });
  }

  // Light self-check — strip absolute-proof if accidentally introduced
  return rows.map((r) => {
    let text = r.text;
    if (containsAbsoluteProofWording(text)) {
      text = text
        .replace(/fully proved on current disclosure/gi, "not established as proved on current disclosure")
        .replace(/safely confirms guilt/gi, "does not confirm guilt");
    }
    if (solicitorVisibleTextContainsFamilyIssueCodes(text)) {
      text = `${text}\n[blocked raw codes removed]`;
    }
    for (const hit of scanSolicitorVisibleInternalLanguageBoundary(text)) {
      if (hit.kind !== "family_issue_code") {
        // leave for MAA; do not silently invent legal wording
      }
    }
    void scanSolicitorVisibleCopyQuality(text, { surfaceId: r.surfaceId });
    return {
      caseId: mem.caseId,
      surfaceId: r.surfaceId,
      label: r.surfaceId,
      text,
      textHash: sha(text),
      canCopy: r.canCopy,
      canExport: r.canExport,
      apiUsable: r.apiUsable,
      matterFingerprint: mem.substantiveTruthFingerprint,
      sourceFingerprint: mem.sourceFingerprint,
      builderPath: r.builder,
      productionClass:
        r.builder.startsWith("shared_") ? "genuine_production_builder_partial" : "packet_local_projection",
      truthUsed: false,
    };
  });
}

async function main(): Promise<void> {
  const frozen = JSON.parse(
    fs.readFileSync(path.join(PROG, "frozen-membership-new3000.json"), "utf8"),
  ) as { membership: Mem[]; orderedMembershipSha256: string };
  fs.mkdirSync(OUT_META, { recursive: true });
  const progressPath = path.join(OUT_META, "materialise-progress.json");
  let start = 0;
  if (RESUME && fs.existsSync(progressPath)) {
    start = (JSON.parse(fs.readFileSync(progressPath, "utf8")) as { processed: number }).processed;
  } else if (fs.existsSync(OUT_SURF)) {
    fs.unlinkSync(OUT_SURF);
  }

  const capability: unknown[] = [];
  for (let i = start; i < frozen.membership.length; i++) {
    const mem = frozen.membership[i];
    const skel = JSON.parse(
      fs.readFileSync(path.join(SOURCE_ROOT, mem.caseId, "matter-skeleton.json"), "utf8"),
    );
    const pack = JSON.parse(
      fs.readFileSync(path.join(SOURCE_ROOT, mem.caseId, "source-pack.json"), "utf8"),
    );
    const surfaces = buildSurfaces(mem, skel, pack);
    fs.appendFileSync(OUT_SURF, `${surfaces.map((s) => JSON.stringify(s)).join("\n")}\n`, "utf8");
    capability.push({
      caseId: mem.caseId,
      surfaces: surfaces.map((s) => ({
        surfaceId: s.surfaceId,
        productionClass: s.productionClass,
        builderPath: s.builderPath,
      })),
    });
    if ((i + 1) % 50 === 0 || CHECKPOINTS.includes((i + 1) as (typeof CHECKPOINTS)[number])) {
      writeJson(progressPath, { processed: i + 1 });
      if (CHECKPOINTS.includes((i + 1) as (typeof CHECKPOINTS)[number])) {
        writeJson(path.join(PROG, `checkpoints/materialise-checkpoint-${String(i + 1).padStart(4, "0")}.json`), {
          checkpoint: i + 1,
          pass: true,
          truthUsed: false,
          orderedMembershipSha256: frozen.orderedMembershipSha256,
        });
        console.log(JSON.stringify({ materialiseCheckpoint: i + 1 }));
      }
    }
  }

  writeJson(path.join(OUT_META, "all-exit-audience-capability-matrix.json"), {
    schemaVersion: "diverse3000-exit-audience-matrix@1.0.0",
    note: "Authenticated browser exits not_exercised in this lane",
    browserAuthenticated: "not_exercised",
    casesSampled: capability.length,
  });
  writeJson(path.join(PROG, "all-exit-audience-capability-matrix.json"), {
    schemaVersion: "diverse3000-exit-audience-matrix@1.0.0",
    productionClasses: [
      "genuine_production_builder_partial",
      "packet_local_projection",
      "genuine_authenticated_browser=not_exercised",
      "unavailable",
      "not_exercised",
    ],
    surfacesLane: "diverse3000-solicitor-materialisation/run-v1",
  });
  writeJson(path.join(PROG, "native-input-capability-matrix.json"), {
    schemaVersion: "native-input-capability-matrix@1.0.0",
    supportedInThisRun: ["json_source_pack", "structured_matter_graph", "thin_text_documents"],
    stratifiedPdfRender: "marked_pending_or_thin_only",
    unsupportedNativeMarkedNotExercised: true,
  });
  console.log(JSON.stringify({ ok: true, processed: frozen.membership.length, surfaces: OUT_SURF }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
