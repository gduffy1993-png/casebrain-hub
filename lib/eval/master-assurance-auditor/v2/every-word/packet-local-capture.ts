/**
 * Packet-local actual-output capture — no live builders, no rematerialisation.
 * Truth keys are read only AFTER actual output is hashed.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type PacketHashes = {
  caseId: string;
  packetPath: string;
  actualOutputHash: string;
  truthKeyHash: string | null;
  bundleSourceHash: string | null;
  captureCompletedAt: string;
  proofActualBeforeTruth: true;
};

export type CapturedOccurrence = {
  occurrenceId: string;
  caseId: string;
  sourcePacketId: string;
  packetRelativeFile: string;
  jsonPointer: string;
  arrayIndex: number | null;
  parentObjectIdentity: string;
  originalDataType: string;
  surfaceId: string;
  audience: string | null;
  exit: "view" | "copy" | "export" | "not_evidenced";
  copyable: boolean | null;
  blocked: boolean | null;
  exactFinalWording: string;
  exactStringHash: string;
  normalizedTemplate: string;
  templateHash: string;
  normalizationSlots: Array<{ slot: string; original: string; replacedWith: string }>;
  wordCount: number;
  characterCount: number;
  emptyOrWhitespace: boolean;
  nullWhereExpected: boolean;
  solicitorVisible: boolean;
  inclusion: "included" | "structural_empty_tracked";
};

function sha256(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function wordCount(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/**
 * Conservative normalization: collapse whitespace only; slot map records identity-preserving tokens.
 * Material tokens (negation, names, counts, states, dates, money, exhibits) are NEVER replaced.
 */
export function normalizeTemplate(exact: string): {
  template: string;
  slots: Array<{ slot: string; original: string; replacedWith: string }>;
} {
  // Unicode NFKC in separate comparison field only — exact string untouched by caller.
  const comparison = exact.normalize("NFKC").replace(/\s+/g, " ").trim();
  // Do not replace material content — template === whitespace-normalized exact for this unit.
  return { template: comparison, slots: [] };
}

type WalkHit = {
  jsonPointer: string;
  arrayIndex: number | null;
  parentObjectIdentity: string;
  originalDataType: string;
  surfaceId: string;
  audience: string | null;
  exit: "view" | "copy" | "export" | "not_evidenced";
  copyable: boolean | null;
  blocked: boolean | null;
  value: string | null;
  nullWhereExpected: boolean;
  solicitorVisible: boolean;
};

function pushString(
  hits: WalkHit[],
  opts: Omit<WalkHit, "value" | "nullWhereExpected" | "originalDataType"> & {
    value: unknown;
    expectString?: boolean;
  },
) {
  const { value, expectString, ...rest } = opts;
  if (value === null || value === undefined) {
    if (expectString) {
      hits.push({
        ...rest,
        originalDataType: value === null ? "null" : "undefined",
        value: null,
        nullWhereExpected: true,
      });
    }
    return;
  }
  if (typeof value === "string") {
    hits.push({
      ...rest,
      originalDataType: "string",
      value,
      nullWhereExpected: false,
    });
    return;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    hits.push({
      ...rest,
      originalDataType: typeof value,
      value: String(value),
      nullWhereExpected: false,
    });
  }
}

/**
 * Extract solicitor-visible strings from raw casebrain-output.json only.
 */
export function extractOccurrencesFromOutput(
  caseId: string,
  packetPath: string,
  output: Record<string, unknown>,
): CapturedOccurrence[] {
  const hits: WalkHit[] = [];
  const courtNote = (output.courtNote ?? null) as Record<string, unknown> | null;
  if (courtNote) {
    pushString(hits, {
      jsonPointer: "/courtNote/text",
      arrayIndex: null,
      parentObjectIdentity: "courtNote",
      surfaceId: "court_line",
      audience: "court",
      exit: courtNote.canCopy === true ? "copy" : "view",
      copyable: typeof courtNote.canCopy === "boolean" ? (courtNote.canCopy as boolean) : null,
      blocked: courtNote.blockedReason ? true : false,
      value: courtNote.text,
      expectString: true,
      solicitorVisible: true,
    });
    pushString(hits, {
      jsonPointer: "/courtNote/sendabilityLabel",
      arrayIndex: null,
      parentObjectIdentity: "courtNote",
      surfaceId: "court_line_sendability",
      audience: "court",
      exit: "view",
      copyable: false,
      blocked: null,
      value: courtNote.sendabilityLabel,
      solicitorVisible: true,
    });
    pushString(hits, {
      jsonPointer: "/courtNote/blockedReason",
      arrayIndex: null,
      parentObjectIdentity: "courtNote",
      surfaceId: "court_line_blocked_reason",
      audience: "solicitor",
      exit: "view",
      copyable: false,
      blocked: true,
      value: courtNote.blockedReason,
      solicitorVisible: true,
    });
  }

  const five = Array.isArray(output.fiveAnswersEvidenceRows)
    ? (output.fiveAnswersEvidenceRows as Record<string, unknown>[])
    : [];
  five.forEach((row, i) => {
    const label = String(row.label ?? `row_${i}`);
    for (const field of ["label", "existence", "reliability", "note"] as const) {
      pushString(hits, {
        jsonPointer: `/fiveAnswersEvidenceRows/${i}/${field}`,
        arrayIndex: i,
        parentObjectIdentity: `fiveAnswersEvidenceRows[${label}]`,
        surfaceId: "truth_map_row",
        audience: "solicitor",
        exit: "view",
        copyable: null,
        blocked: null,
        value: row[field],
        expectString: field === "label",
        solicitorVisible: true,
      });
    }
  });

  const states = Array.isArray(output.evidenceStates)
    ? (output.evidenceStates as Record<string, unknown>[])
    : [];
  states.forEach((row, i) => {
    const label = String(row.label ?? `state_${i}`);
    for (const field of [
      "label",
      "inferredSourceState",
      "existenceLabel",
      "sendability",
      "baseStatus",
      "source",
      "evidenceAnchor",
    ] as const) {
      pushString(hits, {
        jsonPointer: `/evidenceStates/${i}/${field}`,
        arrayIndex: i,
        parentObjectIdentity: `evidenceStates[${label}]`,
        surfaceId: "evidence_state_row",
        audience: "solicitor",
        exit: "view",
        copyable: null,
        blocked: null,
        value: row[field],
        expectString: field === "label",
        solicitorVisible: true,
      });
    }
  });

  const gaps = (output.warningsAndGaps ?? null) as Record<string, unknown> | null;
  const chase = Array.isArray(gaps?.chaseItems) ? (gaps!.chaseItems as Record<string, unknown>[]) : [];
  chase.forEach((item, i) => {
    const label = String(item.label ?? `chase_${i}`);
    for (const field of ["label", "sendabilityLabel", "copySuggestion"] as const) {
      pushString(hits, {
        jsonPointer: `/warningsAndGaps/chaseItems/${i}/${field}`,
        arrayIndex: i,
        parentObjectIdentity: `chaseItems[${label}]`,
        surfaceId: "cps_chase_item",
        audience: "cps",
        exit: field === "copySuggestion" ? "copy" : "view",
        copyable: field === "copySuggestion" ? true : null,
        blocked: null,
        value: item[field],
        expectString: field === "label",
        solicitorVisible: true,
      });
    }
  });

  const dno = Array.isArray(gaps?.doNotOverstate) ? (gaps!.doNotOverstate as unknown[]) : [];
  dno.forEach((line, i) => {
    pushString(hits, {
      jsonPointer: `/warningsAndGaps/doNotOverstate/${i}`,
      arrayIndex: i,
      parentObjectIdentity: "doNotOverstate",
      surfaceId: "do_not_overstate",
      audience: "solicitor",
      exit: "view",
      copyable: null,
      blocked: null,
      value: line,
      expectString: true,
      solicitorVisible: true,
    });
  });

  const hardRules = Array.isArray(gaps?.hardRules) ? (gaps!.hardRules as unknown[]) : [];
  hardRules.forEach((line, i) => {
    pushString(hits, {
      jsonPointer: `/warningsAndGaps/hardRules/${i}`,
      arrayIndex: i,
      parentObjectIdentity: "hardRules",
      surfaceId: "hard_rule",
      audience: "solicitor",
      exit: "view",
      copyable: null,
      blocked: null,
      value: line,
      solicitorVisible: true,
    });
  });

  const mc = (output.matterConfidence ?? null) as Record<string, unknown> | null;
  if (mc) {
    for (const field of ["level", "label", "doNotRelyYetReason", "chaseSendability", "summarySendability"] as const) {
      pushString(hits, {
        jsonPointer: `/matterConfidence/${field}`,
        arrayIndex: null,
        parentObjectIdentity: "matterConfidence",
        surfaceId: "matter_confidence",
        audience: "solicitor",
        exit: "view",
        copyable: false,
        blocked: null,
        value: mc[field],
        solicitorVisible: true,
      });
    }
  }

  const out: CapturedOccurrence[] = [];
  let seq = 0;
  for (const h of hits) {
    seq += 1;
    const exact = h.value ?? "";
    const emptyOrWhitespace = h.value !== null && exact.trim().length === 0;
    const { template, slots } = normalizeTemplate(exact);
    const inclusion =
      h.nullWhereExpected || emptyOrWhitespace ? "structural_empty_tracked" : "included";
    out.push({
      occurrenceId: `${caseId}::${h.surfaceId}::${seq}::${sha256(h.jsonPointer + "\0" + exact).slice(0, 12)}`,
      caseId,
      sourcePacketId: caseId,
      packetRelativeFile: "casebrain-output.json",
      jsonPointer: h.jsonPointer,
      arrayIndex: h.arrayIndex,
      parentObjectIdentity: h.parentObjectIdentity,
      originalDataType: h.originalDataType,
      surfaceId: h.surfaceId,
      audience: h.audience,
      exit: h.exit,
      copyable: h.copyable,
      blocked: h.blocked,
      exactFinalWording: exact,
      exactStringHash: sha256(exact),
      normalizedTemplate: template,
      templateHash: sha256(template),
      normalizationSlots: slots,
      wordCount: wordCount(exact),
      characterCount: exact.length,
      emptyOrWhitespace,
      nullWhereExpected: h.nullWhereExpected,
      solicitorVisible: h.solicitorVisible,
      inclusion,
    });
  }
  return out;
}

export function capturePacketLocal(caseId: string, packetPath: string): {
  hashes: PacketHashes;
  output: Record<string, unknown>;
  occurrences: CapturedOccurrence[];
} {
  const outputPath = path.join(packetPath, "casebrain-output.json");
  const bundlePath = path.join(packetPath, "bundle-text.md");
  const truthPath = path.join(packetPath, "truth-key.json");

  const outputBuf = fs.readFileSync(outputPath);
  const actualOutputHash = sha256(outputBuf);
  const captureCompletedAt = new Date().toISOString();

  // Truth read ONLY after actual output hashed
  let truthKeyHash: string | null = null;
  if (fs.existsSync(truthPath)) {
    truthKeyHash = sha256(fs.readFileSync(truthPath));
  }
  let bundleSourceHash: string | null = null;
  if (fs.existsSync(bundlePath)) {
    bundleSourceHash = sha256(fs.readFileSync(bundlePath));
  }

  const output = JSON.parse(outputBuf.toString("utf8")) as Record<string, unknown>;
  const occurrences = extractOccurrencesFromOutput(caseId, packetPath, output);

  return {
    hashes: {
      caseId,
      packetPath: packetPath.replace(/\\/g, "/"),
      actualOutputHash,
      truthKeyHash,
      bundleSourceHash,
      captureCompletedAt,
      proofActualBeforeTruth: true,
    },
    output,
    occurrences,
  };
}
