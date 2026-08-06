/**
 * Foundational shared-contract regression tests (generic; no matter-specific conditions).
 * Run: npx tsx scripts/foundational-shared-contracts.test.ts
 */
import assert from "node:assert/strict";

import {
  assessBundleReadiness,
  resolveAnalysisStatusLabel,
} from "@/lib/criminal/bundle-readiness";
import { formatCaseBundleHealthLabel } from "@/lib/criminal/format-case-bundle-health";
import {
  allocateDefendantsFromChargeText,
  chargeConfirmationLabel,
  inferChargeDocumentRole,
  parseCountNumber,
  sanitizeChargeLocation,
  summarizeChargeConfirmations,
} from "@/lib/criminal/structured-charge-state";
import {
  inferEvidenceModality,
  reconcileEvidenceState,
  shouldSuppressChaseAsAlreadyOnFile,
  materialSafelyServedForRequest,
} from "@/lib/criminal/evidence-state-reconcile";
import {
  assertFindingProvenanceOrLimitation,
  attachFindingProvenance,
  buildFindingProvenance,
  formatFindingProvenanceLine,
  isProvenanceSufficient,
} from "@/lib/criminal/finding-provenance";
import {
  beginSurfaceLoad,
  initialSurfaceLoadState,
  isSurfaceLoading,
  resolveSurfaceLoadError,
  resolveSurfaceLoadSuccess,
  surfaceLoadErrorMessage,
} from "@/lib/criminal/surface-load-contract";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import { mapSourceStateToExistence } from "@/lib/criminal/five-answers/types";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { reconcileChaseItemsAgainstServedMaterial } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";

let passed = 0;
function check(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

// ---------------------------------------------------------------- WU1
console.log("WU1 — canonical matter and bundle state");

check("one large single PDF is one document, never 0 docs / thin", () => {
  const r = assessBundleReadiness({
    documentCount: 1,
    combinedTextLength: 260_000,
    pageCount: 150,
  });
  assert.equal(r.effectiveDocumentCount, 1);
  assert.equal(r.isThinPack, false);
  assert.equal(r.isLargeBundle, true);
  assert.equal(r.extractionOk, true);
});

check("single PDF with page metadata but no doc row still counts as one document", () => {
  const r = assessBundleReadiness({
    documentCount: 0,
    combinedTextLength: 90_000,
    pageCount: 200,
  });
  assert.equal(r.effectiveDocumentCount, 1);
  assert.equal(r.isLargeBundle, true);
});

check("bundle health label reflects real size, not 'Thin (0 docs)'", () => {
  const label = formatCaseBundleHealthLabel({
    documentCount: 1,
    combinedTextLength: 260_000,
    capabilityTier: "thin",
  });
  assert.ok(!/thin\s*\(0\s*docs?\)/i.test(label), label);
  assert.ok(/large bundle/i.test(label), label);
});

check("genuinely thin pack is still reported as thin", () => {
  const r = assessBundleReadiness({ documentCount: 1, combinedTextLength: 400 });
  assert.equal(r.isLargeBundle, false);
  assert.equal(r.extractionOk, false);
  assert.equal(r.isThinPack, true);
});

check("analysis is never simultaneously complete and gated thin pack", () => {
  const thin = assessBundleReadiness({ documentCount: 1, combinedTextLength: 300 });
  const s = resolveAnalysisStatusLabel({
    canShowStrategyOutputs: true,
    analysisMode: "complete",
    hasVersion: true,
    hasRenderableStrategy: true,
    readiness: thin,
  });
  assert.equal(s.contradiction, true);
  assert.ok(!/^Complete$/.test(s.label), s.label);

  const large = assessBundleReadiness({
    documentCount: 1,
    combinedTextLength: 260_000,
    pageCount: 150,
  });
  const s2 = resolveAnalysisStatusLabel({
    canShowStrategyOutputs: false,
    analysisMode: "preview",
    hasVersion: true,
    hasRenderableStrategy: false,
    readiness: large,
  });
  assert.ok(!/thin pack/i.test(s2.label), s2.label);
});

check("failed extraction stays unresolved (no corrupted defence prose)", () => {
  const corrupted = extractBundleCaseMetadata(
    [
      "CASE SUMMARY",
      "Defence position positions Stone denies taking",
      "Court: Example Magistrates' Court",
    ].join("\n"),
  );
  assert.equal(corrupted.defencePosition, null);
  assert.equal(corrupted.defencePositionSource, "unavailable");

  const clean = extractBundleCaseMetadata(
    [
      "CASE SUMMARY",
      "Defence position: Not guilty — self-defence is advanced on the served papers.",
    ].join("\n"),
  );
  assert.ok(clean.defencePosition, "clean defence position should still be extracted");
  assert.ok(/not guilty/i.test(clean.defencePosition!));
});

// ---------------------------------------------------------------- WU2
console.log("WU2 — structured charges");

check("cannot report CONFIRMED while every charge is pending", () => {
  const charges = [
    { status: "pending", extracted: true, confidence: 0.95, offence: "Offence A wording here" },
    { status: "pending", extracted: true, confidence: 0.9, offence: "Offence B wording here" },
    { status: "pending", extracted: true, confidence: 0.88, offence: "Offence C wording here" },
  ].map((c) => ({
    confirmationLabel: chargeConfirmationLabel({ ...c, hasChargeSheet: true }),
  }));
  const counts = summarizeChargeConfirmations(charges);
  assert.equal(counts.confirmed, 0);
  assert.equal(counts.pending, 3);
});

check("non-pending DB-backed charge with complete wording can be confirmed", () => {
  const label = chargeConfirmationLabel({
    status: "proceeding",
    extracted: false,
    offence: "Robbery contrary to section 8(1) Theft Act 1968",
    particulars: "On 1 January 2024 at High Street stole a wallet from V",
    count: 1,
    defendants: ["Alex Stone"],
    documentRole: "operative",
  });
  assert.equal(label, "confirmed");
});

check("incomplete recorded wording never counts as confirmed", () => {
  const label = chargeConfirmationLabel({ status: "proceeding", extracted: false, offence: "s18" });
  assert.equal(label, "unconfirmed");
});

check("long offence line cannot substitute as its own particulars", () => {
  const longOffence =
    "Wounding with intent contrary to section 18 Offences Against the Person Act 1861";
  const label = chargeConfirmationLabel({
    status: "proceeding",
    extracted: false,
    offence: longOffence,
    particulars: longOffence,
    count: 1,
    defendants: ["Alex Stone"],
    documentRole: "operative",
  });
  assert.equal(label, "unconfirmed");
});

check("truncated wording remains unconfirmed", () => {
  const label = chargeConfirmationLabel({
    status: "proceeding",
    extracted: false,
    offence: "Wounding with intent contrary to section 18...",
    particulars: "Struck the complainant to the head with a...",
    count: 1,
    defendants: ["Alex Stone"],
    documentRole: "operative",
  });
  assert.equal(label, "unconfirmed");
});

check("missing defendant or count allocation remains unconfirmed", () => {
  const noDefendant = chargeConfirmationLabel({
    status: "proceeding",
    extracted: false,
    offence: "Robbery contrary to section 8(1) Theft Act 1968",
    particulars: "On 1 January 2024 at High Street stole a wallet from V",
    count: 1,
    defendants: [],
    documentRole: "operative",
  });
  assert.equal(noDefendant, "unconfirmed");
  const noCount = chargeConfirmationLabel({
    status: "proceeding",
    extracted: false,
    offence: "Robbery contrary to section 8(1) Theft Act 1968",
    particulars: "On 1 January 2024 at High Street stole a wallet from V",
    count: null,
    defendants: ["Alex Stone"],
    documentRole: "operative",
  });
  assert.equal(noCount, "unconfirmed");
});

check("count numbers are parsed, not hard-coded to 1", () => {
  assert.equal(parseCountNumber("Count 3", 0), 3);
  assert.equal(parseCountNumber("Count 2", 5), 2);
  assert.equal(parseCountNumber(null, 4), 5);
});

check("defendant allocation per count", () => {
  const known = ["Alex Stone", "Robin Vale"];
  assert.deepEqual(
    allocateDefendantsFromChargeText("Alex Stone is charged with an offence", known),
    ["Alex Stone"],
  );
  assert.deepEqual(
    allocateDefendantsFromChargeText("Robin Vale had with him a bladed article", known),
    ["Robin Vale"],
  );
  assert.deepEqual(allocateDefendantsFromChargeText("Unallocated offence line", known), []);
});

check("operative and superseded charge documents stay distinct", () => {
  assert.equal(inferChargeDocumentRole("Amended indictment"), "amended");
  assert.equal(inferChargeDocumentRole("Operative charge sheet"), "operative");
  assert.equal(inferChargeDocumentRole("Original indictment (superseded)"), "superseded");
  assert.equal(inferChargeDocumentRole("Case papers"), "unknown");
});

check("corrupted location strings cannot render", () => {
  assert.equal(sanitizeChargeLocation("positions Vale denies taking"), null);
  assert.equal(sanitizeChargeLocation("undefined"), null);
  assert.equal(sanitizeChargeLocation("pending"), null);
  assert.equal(sanitizeChargeLocation("  "), null);
  assert.equal(sanitizeChargeLocation("High Street, Northgate"), "High Street, Northgate");
});

// ---------------------------------------------------------------- WU3
console.log("WU3 — evidence-state reconciliation");

check("partial/incomplete never collapses into missing", () => {
  assert.equal(
    reconcileEvidenceState({ label: "Interview transcript", baseStatus: "partial" }),
    "incomplete",
  );
  assert.equal(
    inferChaseItemSourceState({
      label: "Interview transcript",
      source: "MG6C",
      baseStatus: "partial",
    }),
    "incomplete",
  );
  assert.equal(mapSourceStateToExistence("incomplete"), "incomplete");
});

check("served recording with incomplete transcript is not a missing recording", () => {
  const rows = [
    { label: "Interview recording", state: "served" as const },
    { label: "Interview transcript", state: "incomplete" as const },
  ];
  const r = shouldSuppressChaseAsAlreadyOnFile("Interview recording", rows);
  assert.equal(r.suppress, true);
  // transcript chase still allowed
  const t = shouldSuppressChaseAsAlreadyOnFile("Interview transcript", rows);
  assert.equal(t.suppress, false);
});

check("clips do not prove the master is served", () => {
  const rows = [{ label: "CCTV clip", state: "served" as const }];
  const r = shouldSuppressChaseAsAlreadyOnFile("Master CCTV export", rows);
  assert.equal(r.suppress, false);
  assert.equal(
    materialSafelyServedForRequest(
      [{ label: "CCTV clip", status: "served" }],
      /cctv/i,
      { requireModality: "master_media" },
    ),
    false,
  );
});

check("served BWV / 999-CAD / custody / interview are not chased as absent", () => {
  const families = [
    { req: "Body-worn video", row: "BWV footage" },
    { req: "999 call recording", row: "CAD / 999 log" },
    { req: "Custody record", row: "Custody record" },
    { req: "PACE interview", row: "PACE interview recording" },
  ];
  for (const f of families) {
    const r = shouldSuppressChaseAsAlreadyOnFile(f.req, [
      { label: f.row, state: "served" as const },
    ]);
    assert.equal(r.suppress, true, f.req);
  }
});

check("genuinely missing material remains visible", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("Medical report", [
    { label: "Medical report", state: "missing" as const },
  ]);
  assert.equal(r.suppress, false);
  assert.equal(reconcileEvidenceState({ label: "Medical report", baseStatus: "outstanding" }), "missing");
});

check("alias-equivalent requests reconcile", () => {
  const r = shouldSuppressChaseAsAlreadyOnFile("Custody record", [
    { label: "Detention log", state: "served" as const, aliases: ["Custody record"] },
  ]);
  assert.equal(r.suppress, true);
});

check("chase brief reconciliation drops served items and keeps missing ones", () => {
  const base = {
    familyId: "other" as const,
    whyItMatters: "why",
    source: "MG6C",
    baseStatus: "Outstanding" as const,
    urgency: "medium" as const,
    deadlineLabel: "",
    evidenceAnchor: null,
    linkedRoute: null,
    draftChaseWording: "",
    courtLine: "",
    mergedFrom: [] as string[],
  };
  const items = [
    { ...base, id: "1", label: "Body-worn video" },
    { ...base, id: "2", label: "Medical report" },
  ];
  const out = reconcileChaseItemsAgainstServedMaterial(items as never, {
    materials: [
      { label: "BWV footage", detail: null, status: "served" },
      { label: "Medical report", detail: null, status: "outstanding" },
    ],
  });
  const labels = out.map((i) => i.label);
  assert.ok(!labels.includes("Body-worn video"), "served BWV must not be chased as absent");
  assert.ok(labels.includes("Medical report"), "genuinely missing material stays visible");
});

check("modality inference is generic", () => {
  assert.equal(inferEvidenceModality("Master CCTV export"), "master_media");
  assert.equal(inferEvidenceModality("CCTV still"), "clip_or_still");
  assert.equal(inferEvidenceModality("Interview transcript"), "transcript");
  assert.equal(inferEvidenceModality("Unclassified item"), "generic");
  assert.equal(inferEvidenceModality("Medical report"), "medical");
});

check("generic evidence cannot suppress master CCTV / medical / BWV / interview requests", () => {
  const genericServed = [{ label: "Evidence on file", state: "served" as const }];
  const requests = [
    "Master CCTV export",
    "Medical report",
    "Body-worn video",
    "PACE interview",
    "Custody record",
  ];
  for (const req of requests) {
    const r = shouldSuppressChaseAsAlreadyOnFile(req, genericServed);
    assert.equal(r.suppress, false, `generic must not satisfy: ${req}`);
  }
  // Unrelated specific modalities also must not cross-satisfy
  assert.equal(
    shouldSuppressChaseAsAlreadyOnFile("Master CCTV export", [
      { label: "Medical report", state: "served" },
    ]).suppress,
    false,
  );
  assert.equal(
    shouldSuppressChaseAsAlreadyOnFile("Medical report", [
      { label: "BWV footage", state: "served" },
    ]).suppress,
    false,
  );
  assert.equal(
    shouldSuppressChaseAsAlreadyOnFile("Body-worn video", [
      { label: "PACE interview recording", state: "served" },
    ]).suppress,
    false,
  );
});

// ---------------------------------------------------------------- WU4
console.log("WU4 — provenance");

check("filename-only provenance is insufficient", () => {
  const p = buildFindingProvenance({ sourceFilename: "bundle.pdf" });
  assert.equal(isProvenanceSufficient(p), false);
});

check("full provenance carries doc, page, state, defendant/count", () => {
  const p = buildFindingProvenance({
    sourceDocumentTitle: "Charge sheet",
    sourceDocumentType: "charge_sheet",
    compiledPage: "12",
    evidenceState: "served",
    defendant: "Alex Stone",
    countNumber: 2,
  });
  assert.equal(isProvenanceSufficient(p), true);
  const line = formatFindingProvenanceLine(p);
  assert.ok(line.includes("Charge sheet"));
  assert.ok(line.includes("p.12"));
  assert.ok(line.includes("served"));
  assert.ok(line.includes("count 2"));
});

check("insufficient provenance yields an explicit limitation, not silence", () => {
  const p = assertFindingProvenanceOrLimitation({ sourceFilename: "scan.pdf" });
  assert.ok(p.unresolvedConflictOrLimitation);
  assert.ok(/filename alone/i.test(p.unresolvedConflictOrLimitation!));
});

check("shared surfaces keep findings unresolved when provenance is incomplete", () => {
  const attached = attachFindingProvenance({ evidenceState: "missing" });
  assert.equal(attached.sufficient, false);
  assert.equal(attached.unresolved, true);
  assert.ok(/limitation/i.test(attached.line) || attached.provenance.unresolvedConflictOrLimitation);
});

// ---------------------------------------------------------------- WU5
console.log("WU5 — loading/error contracts");

check("surface load resolves to ready or explicit error, never stuck loading", () => {
  let s = initialSurfaceLoadState<string>();
  assert.equal(isSurfaceLoading(s), false);
  s = beginSurfaceLoad(s);
  assert.equal(isSurfaceLoading(s), true);
  const ok = resolveSurfaceLoadSuccess("content");
  assert.equal(ok.phase, "ready");
  assert.equal(isSurfaceLoading(ok), false);
  const err = resolveSurfaceLoadError("Timed out after 25s — retry.", s);
  assert.equal(err.phase, "error");
  assert.equal(isSurfaceLoading(err), false);
  assert.ok(surfaceLoadErrorMessage(err));
});

check("error message is always actionable (never empty)", () => {
  const err = resolveSurfaceLoadError("   ");
  assert.ok((err.error ?? "").length > 10);
});

console.log(`\nfoundational-shared-contracts: ${passed} checks passed`);
