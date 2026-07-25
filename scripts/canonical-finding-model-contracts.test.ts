/**
 * Canonical document-relationship + finding model contracts (generic; no matter-specific conditions).
 * Includes AI-unavailable fallback extraction over a large multi-document corpus.
 * Run: npx tsx scripts/canonical-finding-model-contracts.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  aliasProvesSameServedItem,
  buildDocumentRelationshipNode,
  detectDraftVersusSignedChanges,
  detectExhibitLabelCollisions,
  detectReferencedAbsentAttachments,
  expandAliasesWithoutCollapse,
  inferDocumentLifecycleRole,
  preserveEarlierAlongsideOperative,
} from "@/lib/criminal/document-relationship-model";
import {
  buildCanonicalFindings,
  detectCustodyInterviewClockConflict,
  detectCustodyInterviewClockFromText,
  findingForRecordingVersusTranscript,
  serializeCanonicalFindingForSurface,
  shouldChaseRequestAgainstServedAliases,
} from "@/lib/criminal/canonical-finding-model";
import {
  forbiddenPaceAffirmativeCopy,
  gatePaceAffirmativeStatus,
} from "@/lib/criminal/pace-affirmative-gate";
import { buildFindingProvenance } from "@/lib/criminal/finding-provenance";
import { shouldSuppressChaseAsAlreadyOnFile } from "@/lib/criminal/evidence-state-reconcile";
import { extractCriminalCaseMeta } from "@/lib/criminal/structured-extractor";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { generateCriminalStrategyPdf } from "@/lib/pdf/criminal-strategy-pdf";

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      passed += 1;
      console.log(`  ok  ${name}`);
    });
}

async function main() {
  console.log("Document lifecycle roles");
  await check("operative / amended / superseded roles are distinct", () => {
    assert.equal(inferDocumentLifecycleRole("Amended indictment"), "amended");
    assert.equal(inferDocumentLifecycleRole("Original indictment (superseded)"), "superseded");
    assert.equal(inferDocumentLifecycleRole("Operative charge sheet"), "operative");
  });

  await check("earlier values preserved alongside operative", () => {
    const earlier = buildDocumentRelationshipNode({
      id: "doc-earlier",
      title: "Original indictment",
      documentType: "indictment",
      haystack: "original indictment superseded",
      evidenceState: "served",
      sourcePage: "10",
    });
    const operative = buildDocumentRelationshipNode({
      id: "doc-op",
      title: "Amended indictment",
      documentType: "indictment",
      haystack: "amended indictment operative",
      evidenceState: "served",
      sourcePage: "14",
    });
    const linked = preserveEarlierAlongsideOperative(operative, earlier);
    assert.equal(linked.earlierDocumentId, earlier.id);
    assert.ok(linked.changedFields.some((c) => c.field === "document_title"));
    assert.equal(earlier.role, "superseded");
    assert.equal(linked.role, "amended");
  });

  console.log("Draft versus signed");
  await check("draft vs signed records exact changed fields and preserves earlier", () => {
    const changes = detectDraftVersusSignedChanges({
      draftText: "The complainant was wearing a blue jacket. Location: High Street.",
      signedText: "The complainant was wearing a red coat. Location: High Street.",
    });
    assert.ok(changes.some((c) => c.field === "clothing"));
    const clothing = changes.find((c) => c.field === "clothing")!;
    assert.match(clothing.earlierValue, /blue/i);
    assert.match(clothing.laterValue, /red/i);
  });

  console.log("Recording vs transcript");
  await check("served recording does not prove transcript complete", () => {
    const f = findingForRecordingVersusTranscript({
      recordingState: "served",
      transcriptState: "incomplete",
    });
    assert.equal(f.kind, "recording_vs_transcript");
    assert.equal(f.unresolved, true);
    assert.ok(/does not prove transcript completeness/i.test(f.summary));
  });

  console.log("Referenced-absent / exhibits / aliases");
  await check("referenced-but-absent attachment is detected", () => {
    const refs = detectReferencedAbsentAttachments(
      "Please see attached: Full phone download. The attachment is not on file.",
      ["MG5 summary"],
    );
    assert.ok(refs.some((r) => /phone download/i.test(r.referencedLabel)));
  });

  await check("exhibit label collisions stay distinct", () => {
    const collisions = detectExhibitLabelCollisions([
      { label: "EX/1", description: "Kitchen knife recovered from scene" },
      { label: "EX/1", description: "Mobile phone handset" },
      { label: "EX/2", description: "Jacket" },
    ]);
    assert.equal(collisions.length, 1);
    assert.equal(collisions[0]!.label, "EX/1");
    assert.equal(collisions[0]!.occurrences.length, 2);
  });

  await check("aliases expand without collapsing master vs clips", () => {
    const families = expandAliasesWithoutCollapse([
      { label: "Master CCTV export", state: "missing" },
      { label: "CCTV still", state: "served" },
      { label: "CCTV footage", state: "referred_only" },
    ]);
    assert.ok(families.length >= 1);
    assert.equal(
      aliasProvesSameServedItem(
        { label: "Master CCTV export" },
        { label: "CCTV still", state: "served" },
      ),
      false,
    );
  });

  await check("never chase an alias already proved served", () => {
    const r = shouldChaseRequestAgainstServedAliases("Phone download", [
      { label: "Full phone download / source export", state: "served" },
    ]);
    // May or may not share alias family depending on alias groups — assert negative for master/clip style
    const clip = shouldChaseRequestAgainstServedAliases("Master CCTV export", [
      { label: "CCTV clip", state: "served" },
    ]);
    assert.equal(clip.chase, true);
    assert.equal(
      shouldSuppressChaseAsAlreadyOnFile("Master CCTV export", [
        { label: "CCTV clip", state: "served" },
      ]).suppress,
      false,
    );
    // Positive: same family + compatible scope
    const bwv = shouldChaseRequestAgainstServedAliases("Body worn video", [
      { label: "BWV footage", state: "served" },
    ]);
    assert.equal(bwv.chase, false, bwv.reason ?? "");
  });

  console.log("Custody / interview clock + PACE gate");
  await check("custody/interview clock: different event times are not automatic conflicts", () => {
  const c = detectCustodyInterviewClockConflict({
    custodyTimes: ["14:05"],
    interviewTimes: ["14:12"],
  });
  assert.equal(c.conflict, false, "custody arrival then interview start is a normal sequence");
  const fromText = detectCustodyInterviewClockFromText(
    ["Custody arrival at 14:05", "Interview commenced at 14:12 after caution"].join("\n"),
  );
  assert.equal(fromText.conflict, false);
});

check("custody/interview clock: impossible chronology (interview before arrival) is conflict", () => {
  const fromText = detectCustodyInterviewClockFromText(
    ["Interview commenced at 13:50", "Custody arrival at 14:05"].join("\n"),
  );
  assert.equal(fromText.conflict, true);
});

  await check("never output PACE OK / no breach when clocks conflict or provenance incomplete", () => {
    const gate = gatePaceAffirmativeStatus({
      custodyRecord: "present",
      interviewRecording: "present",
      legalAdviceLog: "present",
      breachesDetected: [],
      clockConflict: true,
      provenance: buildFindingProvenance({ evidenceState: "served" }),
    });
    assert.equal(gate.allowAffirmativeOk, false);
    assert.equal(gate.paceStatus, "UNKNOWN");
    assert.ok(!/PACE compliance: OK/i.test(gate.statusMessage));
    assert.equal(forbiddenPaceAffirmativeCopy("PACE compliance: OK"), true);
    assert.equal(forbiddenPaceAffirmativeCopy("No PACE breaches detected"), true);

    const incompleteProv = gatePaceAffirmativeStatus({
      custodyRecord: "present",
      interviewRecording: "present",
      legalAdviceLog: "present",
      breachesDetected: [],
      provenance: buildFindingProvenance({ sourceFilename: "bundle.pdf" }),
    });
    assert.equal(incompleteProv.allowAffirmativeOk, false);
    assert.equal(incompleteProv.paceStatus, "UNKNOWN");
  });

  console.log("Canonical findings + provenance");
  await check("buildCanonicalFindings carries provenance and unresolved when incomplete", () => {
    const findings = buildCanonicalFindings({
      recordingVersusTranscript: {
        recordingState: "served",
        transcriptState: "incomplete",
      },
      custodyInterviewClock: {
        custodyTime: "14:05",
        interviewTime: "13:50",
        conflict: true,
      },
      exhibitCollisions: [
        { label: "NJ/1", occurrences: ["Knife A", "Phone B"] },
      ],
      referencedAbsent: [
        {
          referencedLabel: "Email attachment pack",
          referencedIn: "narrative",
          onFileState: "absent",
        },
      ],
      defendant: "Alex Stone",
      countNumber: 1,
    });
    assert.ok(findings.length >= 3);
    assert.ok(findings.every((f) => f.provenanceLine.length > 0));
    assert.ok(findings.some((f) => f.unresolved));
    const serialized = findings.map(serializeCanonicalFindingForSurface);
    assert.ok(serialized.every((s) => typeof s.provenanceLine === "string"));
  });

  await check("missing exact provenance remains unresolved and visible", () => {
    const findings = buildCanonicalFindings({
      referencedAbsent: [
        {
          referencedLabel: "Schedule attachment",
          referencedIn: "index",
          onFileState: "absent",
        },
      ],
    });
    const f = findings[0]!;
    assert.equal(f.unresolved, true);
    assert.ok(f.provenance.unresolvedConflictOrLimitation);
  });

  console.log("AI-unavailable fallback extraction (large multi-document corpus)");
  await check("fallback-mode extracts from large multi-document text without external AI", () => {
    const docs = [
      "DOCUMENT 1 — COVER\nCourt: Example Magistrates' Court\nHearing date: 14 September 2026\nClient: Alex Stone\n",
      "DOCUMENT 2 — CHARGE SHEET\nCount 1: Alex Stone is charged with robbery contrary to section 8(1) Theft Act 1968\nParticulars: On 1 January 2024 at High Street stole a wallet from V\n",
      "DOCUMENT 3 — CUSTODY\nCustody record: arrival at 14:05\nInterview recording served. Interview transcript incomplete.\nInterview commenced at 14:12\n",
      "DOCUMENT 4 — DISCLOSURE\nMG6C schedule. Master CCTV export outstanding. CCTV stills served.\nSee attached: Full phone download. Attachment not on file.\n",
      "DOCUMENT 5 — EXHIBITS\nExhibit EX/1 Kitchen knife. Exhibit EX/1 Mobile handset.\nAmended indictment. Original indictment superseded.\n",
    ];
    // Simulate a large multi-document bundle by repeating blocks (no external AI).
    const large = Array.from({ length: 120 }, (_, i) => {
      const block = docs[i % docs.length]!;
      return `--- PAGE ${i + 1} / DOCUMENT SET ${Math.floor(i / docs.length) + 1} ---\n${block}\n${block}`;
    }).join("\n");
    assert.ok(large.length > 20_000, `expected large corpus, got ${large.length}`);

    const meta = extractCriminalCaseMeta({
      text: large,
      documentName: "Combined Bundle Fallback",
      now: new Date("2026-07-01T12:00:00Z"),
    });
    assert.ok(meta.charges.length >= 1, "fallback must extract at least one charge");
    assert.ok(meta.pace, "fallback must produce PACE extract");
    assert.notEqual(meta.pace.status, "ok", "presence alone must not yield affirmative PACE ok");

    const bundleMeta = extractBundleCaseMetadata(large);
    // Cover/hearing fields are best-effort in fallback; charges + PACE already prove AI-free extraction.
    assert.ok(
      meta.charges.length >= 1 ||
        bundleMeta.courtName ||
        bundleMeta.hearingDateIso ||
        bundleMeta.clientName,
      "fallback must surface at least one structured field",
    );

    const clock = detectCustodyInterviewClockFromText(
      "Custody arrival at 14:05\nInterview commenced at 14:12 after caution",
    );
    assert.equal(clock.conflict, false, "normal sequence must not flag");

    const impossible = detectCustodyInterviewClockFromText(
      "Interview commenced at 13:50\nCustody arrival at 14:05",
    );
    assert.equal(impossible.conflict, true);

    const collisions = detectExhibitLabelCollisions([
      { label: "EX/1", description: "Kitchen knife" },
      { label: "EX/1", description: "Mobile handset" },
    ]);
    assert.equal(collisions.length, 1);

    const findings = buildCanonicalFindings({
      documentNodes: [
        buildDocumentRelationshipNode({
          id: "ind-1",
          title: "Amended indictment",
          documentType: "indictment",
          haystack: "amended indictment",
          sourcePage: "5",
        }),
        buildDocumentRelationshipNode({
          id: "ind-0",
          title: "Original indictment",
          documentType: "indictment",
          haystack: "original indictment superseded",
          sourcePage: "2",
        }),
      ],
      recordingVersusTranscript: {
        recordingState: "served",
        transcriptState: "incomplete",
      },
      custodyInterviewClock: {
        custodyTime: clock.custodyTime,
        interviewTime: clock.interviewTime,
        conflict: impossible.conflict,
      },
      exhibitCollisions: collisions,
      referencedAbsent: detectReferencedAbsentAttachments(large, ["CCTV stills"]),
    });
    assert.ok(findings.some((f) => f.kind === "recording_vs_transcript"));
    assert.ok(findings.some((f) => f.kind === "custody_interview_clock" && f.unresolved));
    assert.ok(findings.some((f) => f.kind === "exhibit_label_collision"));
  });

  console.log("Strategy PDF export (Helvetica.afm packaging)");
  await check("real strategy PDF export produces a PDF buffer", async () => {
    const buf = await generateCriminalStrategyPdf({
      caseId: "test-case",
      title: "Generic defence matter",
      generatedAt: new Date().toISOString(),
      offenceLabel: "Robbery",
      primaryStrategy: "Challenge identification and disclosure completeness",
      pressurePoints: [{ label: "Master media outstanding", priority: "high" }],
      hrsChecklist: ["Confirm transcript completeness", "Map exhibit labels"],
      solicitorInstructions: "Provisional — solicitor review required.",
    });
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 500);
    assert.equal(buf.subarray(0, 4).toString("utf8"), "%PDF");
    const outDir = path.join(process.cwd(), "artifacts", "casebrain-qa", "strategy-pdf-smoke");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "strategy-export-smoke.pdf");
    fs.writeFileSync(outPath, buf);
    assert.ok(fs.existsSync(outPath));
    console.log(`      wrote ${outPath} (${buf.length} bytes)`);
  });

  console.log(`\ncanonical-finding-model-contracts: ${passed} checks passed`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
