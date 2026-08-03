/**
 * A–C. Correct V2 control accounting + authority/charge honesty.
 * Does NOT mutate frozen V1/V2 memberships — writes under v2-corrections/ and v2.1/.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

const ROOT = process.cwd();
const V2 = path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-v2");
const OUT = path.join(V2, "corrections");
const FIRST_HASH = "dcf6c382fe1b41ef34624c03764c8dc785de04a13f5344784aee03b9a192d4ae";
const V1_HASH = "273e5f5f3145a8c01be81f8f721dcf7f8e20ea0208b312997f75199276cd69fb";
const V2_HASH = "be4f3bec455c220267aaf3dc265292aa20c1cd763c5d7c5fe5d2df2cb88a25c9";

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(name: string, data: unknown): void {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Registry control IDs for which V2 actually invoked matching versioned detectors. */
const ACTUALLY_INVOKED_WORDING_CONTROLS = new Set([
  // Note: solicitor-visible internal-language/copy-quality probes ran in the harness but are NOT
  // a registry control named MAA2-WRD-01-SOLICITOR-SAFE-WORDING (that ID does not exist).
  // Do not invent registry exercise from non-registry probe labels.
  "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
  "MAA-COMPLETENESS",
]);

const DETECTOR_ENTRYPOINTS: Record<string, string> = {
  "MAA2-WRD-15-NO-ABSOLUTE-PROOF": "lib/criminal/absolute-proof-wording.ts#containsAbsoluteProofWording",
  "MAA-COMPLETENESS": "scripts/assurance/stage3000-diverse-second/v2-materialise-and-maa.ts#detect EMPTY_SURFACE_TEXT",
};

async function loadCandidateControlIds(): Promise<Set<string>> {
  const p = path.join(V2, "ledgers/candidate-ledger-pre-remediation.jsonl");
  const ids = new Set<string>();
  if (!fs.existsSync(p) || fs.statSync(p).size === 0) return ids;
  const rl = readline.createInterface({ input: fs.createReadStream(p), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const o = JSON.parse(line);
    if (o.controlId) ids.add(o.controlId);
  }
  return ids;
}

function mainSyncPrep() {
  const frozen = JSON.parse(fs.readFileSync(path.join(V2, "frozen-membership-new3000-v2.json"), "utf8"));
  if (frozen.orderedMembershipSha256 !== V2_HASH) {
    throw new Error(`V2 membership drift — refusing to proceed: ${frozen.orderedMembershipSha256}`);
  }
  const oldMatrix = JSON.parse(fs.readFileSync(path.join(V2, "per-control-exercise-matrix.json"), "utf8"));
  return { frozen, oldMatrix };
}

async function correctControls(): Promise<void> {
  const { frozen, oldMatrix } = mainSyncPrep();
  const registry = JSON.parse(
    fs.readFileSync(path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json"), "utf8"),
  ) as { controls: any[]; registryVersion?: string };
  const impl = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "artifacts/casebrain-qa/assurance/master-auditor-v2/control-implementation-and-authority-map.json"),
      "utf8",
    ),
  ) as { handlers: Record<string, any> };

  const findingControlIds = await loadCandidateControlIds();
  const surfacesPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/integrity-programme/diverse3000-v2-solicitor-materialisation/run-v1/surfaces.jsonl",
  );
  const surfacesHash = fs.existsSync(surfacesPath) ? sha(fs.readFileSync(surfacesPath)) : null;
  const unitCount = frozen.membership.length;

  // Build clean-result receipts only for wording controls actually invoked with 0 findings
  const cleanReceipts: any[] = [];
  for (const controlId of ACTUALLY_INVOKED_WORDING_CONTROLS) {
    if (findingControlIds.has(controlId)) continue;
    const handler = impl.handlers?.[controlId];
    cleanReceipts.push({
      schemaVersion: "maa-v2-clean-result-receipt@1.0.0",
      controlId,
      controlVersion: registry.controls.find((c) => c.controlId === controlId)?.version || null,
      implementationStatus: handler?.implementationStatus || registry.controls.find((c) => c.controlId === controlId)?.implementationStatus || "implementation_status_unknown",
      handlerId: handler?.handlerId || null,
      engineId: handler?.engineId || null,
      detectorEntrypoint: DETECTOR_ENTRYPOINTS[controlId] || null,
      prerequisitesPresent: ["v2_surfaces.jsonl", "packet_local_solicitor_visible_text"],
      applicableUnitCount: unitCount,
      inspectedFieldRefs: ["surfaces[].text", "surfaces[].textHash", "surfaces[].surfaceId"],
      inspectedSourceOutputHash: surfacesHash,
      result: "clean_no_findings",
      findingIds: [],
      contracts: {
        positive: handler?.positiveContract || null,
        negative: handler?.negativeContract || null,
        unavailable: "missing_prereq_or_handler → not_exercised / unresolved — never PASS",
        mutation: "not_exercised_in_v2_bulk_lane",
      },
      note: "Clean result only proves the named wording/completeness detector returned no hits on packet-local surfaces — not that charge/attribution/provenance/chronology/chase/cross-exit controls ran.",
    });
  }
  writeJson("wording-detector-clean-result-receipts.json", { receipts: cleanReceipts });

  const rows = (registry.controls as any[]).map((c) => {
    const handler = impl.handlers?.[c.controlId];
    const implStatus =
      handler?.implementationStatus || c.implementationStatus || "implementation_status_unknown";
    const oldRow = (oldMatrix.controls || []).find((x: any) => x.controlId === c.controlId);
    const wasFalselyEvaluated = oldRow?.exerciseStatus === "evaluated";

    // Potential applicability routing only (regex/prefix) — never establishes exercise
    const nameSuggestsPacket =
      /WRD|COMPLETENESS|CHARGE|EVIDENCE|ATTRIB|CHRON|PROVEN|DOCUMENT|CHASE|CROSS|SOURCE|BOUNDARY|LEAK|WORDING/i.test(
        c.controlId,
      );

    let exerciseStatus:
      | "evaluated"
      | "probe_evaluated_named_control_not_exercised"
      | "potentially_applicable_missing_handler"
      | "unresolved_missing_prerequisite"
      | "not_exercised"
      | "implementation_status_unknown" = "not_exercised";

    let missingPrerequisiteReason: string | null = null;
    let receiptRef: string | null = null;
    let handlerInvoked = false;

    if (!handler && !c.implementationStatus) {
      exerciseStatus = "implementation_status_unknown";
      missingPrerequisiteReason = "no_handler_map_or_registry_implementation_status";
    } else if (ACTUALLY_INVOKED_WORDING_CONTROLS.has(c.controlId)) {
      // Named wording/completeness detectors were invoked against V2 surfaces (receipt-backed).
      // Handler map may be incomplete; detectorEntrypoint + clean/finding receipt still required.
      handlerInvoked = true;
      exerciseStatus = "evaluated";
      receiptRef = findingControlIds.has(c.controlId)
        ? "ledgers/candidate-ledger-pre-remediation.jsonl"
        : "corrections/wording-detector-clean-result-receipts.json";
      missingPrerequisiteReason = null;
    } else if (wasFalselyEvaluated && nameSuggestsPacket) {
      // Previously regex-marked evaluated without named evaluator receipt
      exerciseStatus = "probe_evaluated_named_control_not_exercised";
      missingPrerequisiteReason =
        "generic_wording_probe_ran_but_named_control_evaluator_not_invoked_or_no_receipt";
    } else if (nameSuggestsPacket && (!handler || implStatus === "specified_not_implemented")) {
      exerciseStatus = "potentially_applicable_missing_handler";
      missingPrerequisiteReason = "name_suggests_applicability_but_handler_missing_or_unimplemented";
    } else if (
      implStatus === "browser_required" ||
      implStatus === "human_required" ||
      implStatus === "external_assurance_required" ||
      implStatus === "operational_evidence_required" ||
      implStatus === "engineering_required"
    ) {
      exerciseStatus = "unresolved_missing_prerequisite";
      missingPrerequisiteReason = `implementationStatus=${implStatus}`;
    } else if (nameSuggestsPacket && handler && implStatus === "partially_implemented") {
      exerciseStatus = "unresolved_missing_prerequisite";
      missingPrerequisiteReason = "partial_handler_without_receipt_backed_invocation_in_v2_lane";
    } else {
      exerciseStatus = "not_exercised";
      missingPrerequisiteReason = "lane_or_prerequisites_not_present_in_v2_bulk_run";
    }

    return {
      controlId: c.controlId,
      controlVersion: c.version || null,
      implementationStatus: implStatus,
      handlerId: handler?.handlerId || null,
      engineId: handler?.engineId || null,
      detectorEntrypoint: c.detectorEntrypoint || DETECTOR_ENTRYPOINTS[c.controlId] || null,
      exerciseStatus,
      handlerInvoked,
      receiptRef,
      missingPrerequisiteReason,
      applicableUnitCount: exerciseStatus === "evaluated" ? unitCount : 0,
      potentialApplicabilityRoutedByNameOnly: nameSuggestsPacket,
      previouslyFalselyMarkedEvaluatedByRegex: Boolean(wasFalselyEvaluated),
    };
  });

  const counts = rows.reduce((acc: Record<string, number>, r) => {
    acc[r.exerciseStatus] = (acc[r.exerciseStatus] || 0) + 1;
    return acc;
  }, {});

  writeJson("per-control-exercise-matrix-corrected.json", {
    schemaVersion: "diverse3000-v2-per-control-exercise-matrix-corrected@1.0.0",
    generatedAt: new Date().toISOString(),
    v2MembershipSha256: V2_HASH,
    v2MembershipMutated: false,
    registryControlCount: rows.length,
    statusCounts: counts,
    evaluatedCount: counts.evaluated || 0,
    note: "Regex/name matching routes potential applicability only. evaluated requires receipt-backed named handler invocation.",
    controls: rows,
  });

  writeJson("before-after-73-control-honesty-report.json", {
    schemaVersion: "diverse3000-v2-73-control-honesty@1.0.0",
    before: {
      claimedEvaluated: oldMatrix.evaluatedControlCount,
      method: "control-ID regex/prefix matching in v2-materialise-and-maa.ts",
      invalidBecause: "A control name containing CHARGE/EVIDENCE/PROVENANCE/SOURCE/CROSS does not prove its named evaluator ran",
    },
    after: {
      evaluated: counts.evaluated || 0,
      probe_evaluated_named_control_not_exercised: counts.probe_evaluated_named_control_not_exercised || 0,
      potentially_applicable_missing_handler: counts.potentially_applicable_missing_handler || 0,
      unresolved_missing_prerequisite: counts.unresolved_missing_prerequisite || 0,
      not_exercised: counts.not_exercised || 0,
      implementation_status_unknown: counts.implementation_status_unknown || 0,
      method: "receipt-backed named wording/completeness detectors only",
    },
    genericWordingProbeDoesNotEvidence: [
      "charge controls",
      "attribution controls",
      "provenance controls",
      "chronology controls",
      "chase controls",
      "cross-exit controls",
    ],
    actuallyInvokedControlIds: [...ACTUALLY_INVOKED_WORDING_CONTROLS],
  });

  console.log(JSON.stringify({ controlsCorrected: true, counts }, null, 2));
}

function correctAuthorityAndCharges(): void {
  const research = JSON.parse(
    fs.readFileSync(path.join(V2, "research/official-research-register.json"), "utf8"),
  ) as { records: Array<{ url: string; fetchOk: boolean; title: string }> };

  const failedLegislation = research.records.filter(
    (r) => /legislation\.gov\.uk/i.test(r.url) && r.fetchOk === false,
  );

  const researchFull = research as {
    records: Array<{
      url: string;
      fetchOk: boolean;
      title: string;
      retrievalDate?: string;
      contentHash?: string | null;
      snapshotSha256?: string | null;
      intendedStructuralUse?: string;
    }>;
    retrievalDate?: string;
  };

  const okStructural = researchFull.records.filter((r) => r.fetchOk === true);
  const pinStructural = (use: string) => {
    const hit =
      okStructural.find((r) => (r.intendedStructuralUse || "").includes(use)) ||
      okStructural.find((r) => /cps\.gov\.uk\/prosecution-guidance/i.test(r.url)) ||
      okStructural[0] ||
      null;
    if (!hit) return null;
    return {
      sourceUrl: hit.url,
      sourceTitle: hit.title,
      retrievalDate: hit.retrievalDate || researchFull.retrievalDate || "2026-08-02",
      sectionProvision: hit.intendedStructuralUse || "structural_index_only_not_charge_gold",
      snapshotContentHash: hit.contentHash || hit.snapshotSha256 || null,
      pinKind: "structural_authority_index_not_operative_charge_wording",
      supportsPinnedInventoryChargeWording: false,
    };
  };

  // Inventory-backed charges that were claimed pinned_inventory in V2 builder
  const chargeFamilies = [
    { family: "shoplifting_theft", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/1968/60", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "common_assault_battery", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: null, legislationFetchOk: null, structuralUse: "offence_guidance_index" },
    { family: "abh", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/Vict/24-25/100", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "assault_emergency_worker", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: null, legislationFetchOk: null, structuralUse: "offence_guidance_index" },
    { family: "harassment", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/1997/40", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "stalking", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/1997/40", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "drugs_possession", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/1971/38", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "drugs_pwits", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/1971/38", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "robbery", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/1968/60", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "burglary_dwelling", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/1968/60", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "speeding_sjp", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: null, legislationFetchOk: null, structuralUse: "procedure_and_forms" },
    { family: "excess_alcohol", claimed: "pinned_inventory", inventorySupported: true, legislationUrl: "https://www.legislation.gov.uk/ukpga/1988/52", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "rape", claimed: "awaiting_qualified_review", inventorySupported: false, legislationUrl: "https://www.legislation.gov.uk/ukpga/2003/42", legislationFetchOk: false, structuralUse: "offence_guidance_index" },
    { family: "murder", claimed: "awaiting_qualified_review", inventorySupported: false, legislationUrl: null, legislationFetchOk: null, structuralUse: "offence_guidance_index" },
  ];

  const corrected = chargeFamilies.map((c) => {
    // Failed legislation fetch cannot support pinned_inventory
    let correctedStatus:
      | "pinned_from_corpus_inventory_only"
      | "structural_only"
      | "awaiting_qualified_review"
      | "not_exercised" = "structural_only";
    let note = "";
    const structuralPin = pinStructural(c.structuralUse);
    if (c.claimed === "awaiting_qualified_review") {
      correctedStatus = "awaiting_qualified_review";
      note =
        "Remains awaiting qualified legal review; legislation fetch failed or absent. Structural authority index may be cited but does not pin operative charge wording.";
    } else if (c.inventorySupported) {
      // Can cite corpus inventory specimen as controlled synthetic wording source — NOT legislation pin
      correctedStatus = "pinned_from_corpus_inventory_only";
      note =
        "Wording matches scale3000 CHARGE-WORDING-INVENTORY specimen only. Failed/unfetched legislation.gov.uk URLs do NOT support pinned_inventory legal authority. Structural sources pinned separately where fetchOk. Qualified legal confirmation still required.";
    } else {
      correctedStatus = "structural_only";
      note = "No authoritative charge-wording pin available.";
    }
    return {
      family: c.family,
      previousStatus: c.claimed,
      correctedStatus,
      inventorySource:
        c.inventorySupported
          ? "artifacts/casebrain-qa/integrity-programme/scale3000-charge-wording-inventory/CHARGE-WORDING-INVENTORY.json"
          : null,
      legislationUrl: c.legislationUrl,
      legislationFetchOk: c.legislationFetchOk,
      legislationCannotSupportPinnedInventory: c.legislationFetchOk === false,
      structuralAuthorityPin: structuralPin,
      snapshotContentHash: structuralPin?.snapshotContentHash || null,
      sectionProvisionRecorded: Boolean(structuralPin?.sectionProvision),
      inventWording: false,
      note,
    };
  });

  const statusCounts = corrected.reduce((a: Record<string, number>, r) => {
    a[r.correctedStatus] = (a[r.correctedStatus] || 0) + 1;
    return a;
  }, {});

  writeJson("authority-charge-correction-register.json", {
    schemaVersion: "diverse3000-authority-charge-correction@1.0.0",
    generatedAt: new Date().toISOString(),
    failedLegislationFetches: failedLegislation.map((r) => ({ title: r.title, url: r.url })),
    rule: "Failed sources cannot support pinned_inventory",
    correctedCharges: corrected,
    statusCountsAfterCorrection: statusCounts,
    v2MembershipMutated: false,
    note: "V2 bulk packs retain prior labels on disk as historical; corrected status applies going forward and to V2.1 pilot.",
  });

  // Source-reading honesty rename note for V2 bulk
  writeJson("source-reading-honesty-correction.json", {
    schemaVersion: "diverse3000-v2-source-reading-honesty@1.0.0",
    v2BulkLedger: "ledgers/every-source-reading-ledger.jsonl",
    issue: "Ledger listed documents but did not prove detailed reading; numeric pages fields were synthetic lengths",
    correction: "Rename synthetic lengths to declaredSyntheticLengthNotActualPages; V2.1 pilot requires real page identities",
    v2MembershipMutated: false,
  });

  console.log(JSON.stringify({ authorityCorrected: true, statusCounts, failedLegislation: failedLegislation.length }, null, 2));
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  writeJson("PRESERVE-LOCK.json", {
    doNotMutateV1Membership: V1_HASH,
    doNotMutateV2Membership: V2_HASH,
    doNotMutateFirstCensus: FIRST_HASH,
    lockedAt: new Date().toISOString(),
  });
  await correctControls();
  correctAuthorityAndCharges();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
