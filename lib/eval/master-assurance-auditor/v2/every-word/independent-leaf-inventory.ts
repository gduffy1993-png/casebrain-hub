/**
 * Independent recursive leaf inventory over packet-local casebrain-output.json.
 * Not derived from extractOccurrencesFromOutput.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type LeafDisposition =
  | "included_solicitor_visible"
  | "included_structural_empty"
  | "excluded_internal_metadata"
  | "excluded_truth_comparison"
  | "excluded_non_wording_machine_state"
  | "excluded_unavailable_exit"
  | "excluded_other_with_specific_reason";

export type SourceLeaf = {
  leafId: string;
  caseId: string;
  packetRelativeFile: "casebrain-output.json";
  jsonPointer: string;
  arrayIndex: number | null;
  parentObjectIdentity: string;
  originalDataType: "string" | "number" | "boolean" | "null" | "absent";
  /** Exact rendered value; null for absent; JSON-stringified for non-strings. */
  exactValue: string | null;
  exactValueHash: string | null;
  disposition: LeafDisposition;
  dispositionReason: string;
  surfaceId: string;
  audience: string | null;
  exit: "view" | "copy" | "export" | "not_evidenced";
  copyable: boolean | null;
  blocked: boolean | null;
  solicitorVisible: boolean;
  finalWordingPresent: boolean;
};

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function isEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length === 0;
}

/** Classify a leaf by pointer + value — solicitor wording vs metadata vs machine state. */
export function classifyLeaf(
  jsonPointer: string,
  value: unknown,
  present: boolean,
): {
  disposition: LeafDisposition;
  reason: string;
  surfaceId: string;
  audience: string | null;
  exit: SourceLeaf["exit"];
  copyable: boolean | null;
  blocked: boolean | null;
  solicitorVisible: boolean;
  finalWordingPresent: boolean;
} {
  const p = jsonPointer;

  if (p === "/truthKeyComparison" || p.startsWith("/truthKeyComparison/")) {
    return {
      disposition: "excluded_truth_comparison",
      reason: "Truth-key comparison field — audit-only; never actual-output wording.",
      surfaceId: "truth_comparison",
      audience: null,
      exit: "not_evidenced",
      copyable: false,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }

  // Top-level / export identity metadata
  if (
    p === "/generatedAt" ||
    p === "/caseId" ||
    p === "/source" ||
    p === "/exportVersion/exportId" ||
    p === "/exportVersion/caseId" ||
    p === "/exportVersion/generatedAt" ||
    p === "/exportVersion/exportType" ||
    p === "/exportVersion/bundleVersionLabel" ||
    p === "/exportVersion/appVersion" ||
    p === "/exportVersion/warningCount"
  ) {
    return {
      disposition: "excluded_internal_metadata",
      reason: "Internal identity/version/timestamp metadata — not solicitor wording.",
      surfaceId: "internal_metadata",
      audience: null,
      exit: "not_evidenced",
      copyable: false,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }

  if (p === "/exportVersion/sourceStatesIncluded" || p.startsWith("/exportVersion/sourceStatesIncluded/")) {
    return {
      disposition: "excluded_non_wording_machine_state",
      reason: "Export pack machine-state list of source states included.",
      surfaceId: "export_source_states",
      audience: "solicitor",
      exit: "export",
      copyable: null,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }

  if (p === "/exportVersion/sendability") {
    return {
      disposition: "excluded_non_wording_machine_state",
      reason: "Export sendability enum — machine state, not final wording.",
      surfaceId: "export_sendability",
      audience: "solicitor",
      exit: "export",
      copyable: null,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }

  // Export pack wording — present on disk; do not claim export unavailable
  if (p === "/exportVersion/reviewFooter") {
    if (!present || value === null || value === undefined) {
      return {
        disposition: "included_structural_empty",
        reason: "Expected export reviewFooter absent/null.",
        surfaceId: "export_review_footer",
        audience: "solicitor",
        exit: "export",
        copyable: false,
        blocked: null,
        solicitorVisible: true,
        finalWordingPresent: false,
      };
    }
    if (isEmptyString(value)) {
      return {
        disposition: "included_structural_empty",
        reason: "Empty export reviewFooter tracked.",
        surfaceId: "export_review_footer",
        audience: "solicitor",
        exit: "export",
        copyable: false,
        blocked: null,
        solicitorVisible: true,
        finalWordingPresent: false,
      };
    }
    return {
      disposition: "included_solicitor_visible",
      reason: "Export pack reviewFooter is solicitor-visible wording on saved packet.",
      surfaceId: "export_review_footer",
      audience: "solicitor",
      exit: "export",
      copyable: false,
      blocked: null,
      solicitorVisible: true,
      finalWordingPresent: true,
    };
  }

  if (p === "/exportVersion/blockedReason") {
    if (!present || value === null || value === undefined) {
      return {
        disposition: "included_structural_empty",
        reason: "exportVersion.blockedReason null/absent — tracked as structural empty on export exit.",
        surfaceId: "export_blocked_reason",
        audience: "solicitor",
        exit: "export",
        copyable: false,
        blocked: null,
        solicitorVisible: true,
        finalWordingPresent: false,
      };
    }
    if (isEmptyString(value)) {
      return {
        disposition: "included_structural_empty",
        reason: "Empty export blockedReason.",
        surfaceId: "export_blocked_reason",
        audience: "solicitor",
        exit: "export",
        copyable: false,
        blocked: true,
        solicitorVisible: true,
        finalWordingPresent: false,
      };
    }
    return {
      disposition: "included_solicitor_visible",
      reason: "Export blockedReason is solicitor-visible blocked-banner wording.",
      surfaceId: "export_blocked_reason",
      audience: "solicitor",
      exit: "export",
      copyable: false,
      blocked: true,
      solicitorVisible: true,
      finalWordingPresent: true,
    };
  }

  // matterConfidence machine badges / statuses
  if (p.startsWith("/matterConfidence/sourceBadges")) {
    return {
      disposition: "excluded_non_wording_machine_state",
      reason: "sourceBadges are evidence-state machine badges, not final wording.",
      surfaceId: "matter_confidence_badge",
      audience: "solicitor",
      exit: "view",
      copyable: null,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }
  if (
    p === "/matterConfidence/level" ||
    p === "/matterConfidence/chaseSendability" ||
    p === "/matterConfidence/summarySendability" ||
    p === "/matterConfidence/safeCourtLineStatus"
  ) {
    return {
      disposition: "excluded_non_wording_machine_state",
      reason: "Matter-confidence status/sendability enum — machine state.",
      surfaceId: "matter_confidence_status",
      audience: "solicitor",
      exit: "view",
      copyable: null,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }

  // Evidence-state / court machine fields (raw enums & booleans — not human labels)
  if (
    /\/evidenceStates\/\d+\/(inferredSourceState|sendability|baseStatus|source)$/.test(p) ||
    /\/fiveAnswersEvidenceRows\/\d+\/(existence|reliability)$/.test(p) ||
    p === "/courtNote/canCopy"
  ) {
    return {
      disposition: "excluded_non_wording_machine_state",
      reason: "Sendability/existence/source/status enum or boolean machine state.",
      surfaceId: "machine_state_field",
      audience: "solicitor",
      exit: "view",
      copyable: null,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }

  // sendabilityLabel: human-readable rendered labels are solicitor-visible wording;
  // raw enums (e.g. needs_solicitor_review) remain machine state.
  if (
    /\/sendabilityLabel$/.test(p) ||
    p === "/courtNote/sendabilityLabel" ||
    /\/warningsAndGaps\/chaseItems\/\d+\/sendabilityLabel$/.test(p)
  ) {
    const raw = typeof value === "string" ? value : value == null ? "" : String(value);
    const isHumanLabel =
      present &&
      typeof value === "string" &&
      value.trim().length > 0 &&
      !/^[a-z0-9]+(_[a-z0-9]+)+$/.test(value.trim()) &&
      (/[A-Z]/.test(value) || /\s/.test(value));
    if (isHumanLabel) {
      return {
        disposition: "included_solicitor_visible",
        reason:
          "Human-readable sendabilityLabel is solicitor-visible wording (not raw enum machine state).",
        surfaceId: "sendability_label",
        audience: p.includes("chaseItems") ? "cps" : p.includes("courtNote") ? "court" : "solicitor",
        exit: "view",
        copyable: null,
        blocked: null,
        solicitorVisible: true,
        finalWordingPresent: true,
      };
    }
    if (!present || value === null || value === undefined || isEmptyString(value)) {
      return {
        disposition: "included_structural_empty",
        reason: "Expected sendabilityLabel empty/null/absent.",
        surfaceId: "sendability_label",
        audience: "solicitor",
        exit: "view",
        copyable: null,
        blocked: null,
        solicitorVisible: true,
        finalWordingPresent: false,
      };
    }
    return {
      disposition: "excluded_non_wording_machine_state",
      reason: `Raw sendability enum ${JSON.stringify(raw)} — machine state, not humanised label.`,
      surfaceId: "sendability_enum",
      audience: "solicitor",
      exit: "view",
      copyable: null,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }

  // Solicitor-visible wording surfaces
  const wordingMatchers: Array<{
    re: RegExp;
    surfaceId: string;
    audience: string;
    exit: SourceLeaf["exit"];
    copyable?: boolean | null;
  }> = [
    { re: /^\/courtNote\/text$/, surfaceId: "court_line", audience: "court", exit: "copy", copyable: true },
    {
      re: /^\/courtNote\/blockedReason$/,
      surfaceId: "court_line_blocked_reason",
      audience: "court",
      exit: "view",
      copyable: false,
    },
    { re: /^\/matterConfidence\/label$/, surfaceId: "matter_confidence", audience: "solicitor", exit: "view" },
    {
      re: /^\/matterConfidence\/doNotRelyYetReason$/,
      surfaceId: "matter_confidence",
      audience: "solicitor",
      exit: "view",
    },
    {
      re: /^\/fiveAnswersEvidenceRows\/\d+\/(label|note)$/,
      surfaceId: "truth_map_row",
      audience: "solicitor",
      exit: "view",
    },
    {
      re: /^\/evidenceStates\/\d+\/(label|existenceLabel|evidenceAnchor)$/,
      surfaceId: "evidence_state_row",
      audience: "solicitor",
      exit: "view",
    },
    {
      re: /^\/warningsAndGaps\/chaseItems\/\d+\/(label|copySuggestion)$/,
      surfaceId: "cps_chase_item",
      audience: "cps",
      exit: "copy",
      copyable: true,
    },
    {
      re: /^\/warningsAndGaps\/doNotOverstate\/\d+$/,
      surfaceId: "do_not_overstate",
      audience: "solicitor",
      exit: "view",
    },
    {
      re: /^\/warningsAndGaps\/hardRules\/\d+$/,
      surfaceId: "hard_rule",
      audience: "solicitor",
      exit: "view",
    },
  ];

  for (const m of wordingMatchers) {
    if (m.re.test(p)) {
      const empty =
        !present || value === null || value === undefined || isEmptyString(value);
      if (empty) {
        return {
          disposition: "included_structural_empty",
          reason: `Expected wording field empty/null/absent at ${p}.`,
          surfaceId: m.surfaceId,
          audience: m.audience,
          exit: m.exit,
          copyable: m.copyable ?? null,
          blocked: p.includes("blockedReason") ? true : null,
          solicitorVisible: true,
          finalWordingPresent: false,
        };
      }
      return {
        disposition: "included_solicitor_visible",
        reason: `Solicitor-visible wording at ${p}.`,
        surfaceId: m.surfaceId,
        audience: m.audience,
        exit: m.exit,
        copyable: m.copyable ?? null,
        blocked: p.includes("blockedReason") ? true : null,
        solicitorVisible: true,
        finalWordingPresent: true,
      };
    }
  }

  // Unknown leaf under known objects — classify conservatively
  if (p.startsWith("/exportVersion/")) {
    return {
      disposition: "excluded_other_with_specific_reason",
      reason: `Unclassified exportVersion leaf ${p} — treated as non-wording until adapter documents it.`,
      surfaceId: "export_unclassified",
      audience: "solicitor",
      exit: "export",
      copyable: null,
      blocked: null,
      solicitorVisible: false,
      finalWordingPresent: false,
    };
  }

  return {
    disposition: "excluded_other_with_specific_reason",
    reason: `Leaf ${p} not mapped to solicitor wording; excluded pending surface census.`,
    surfaceId: "unclassified_leaf",
    audience: null,
    exit: "not_evidenced",
    copyable: null,
    blocked: null,
    solicitorVisible: false,
    finalWordingPresent: false,
  };
}

function parentIdentity(pointer: string): string {
  const parts = pointer.split("/").filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "root";
  return parts.slice(0, -1).join("/");
}

function arrayIndexOf(pointer: string): number | null {
  const m = pointer.match(/\/(\d+)(?:\/|$)/);
  return m ? Number(m[1]) : null;
}

function encodeKey(key: string): string {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Recursively inventory every leaf (primitives + null) and record expected-but-absent
 * known wording fields when parent object exists but field missing.
 */
export function inventoryOutputLeaves(
  caseId: string,
  output: unknown,
): SourceLeaf[] {
  const leaves: SourceLeaf[] = [];

  const push = (
    jsonPointer: string,
    value: unknown,
    present: boolean,
    dataType: SourceLeaf["originalDataType"],
  ) => {
    const c = classifyLeaf(jsonPointer, value, present);
    let exactValue: string | null = null;
    let exactValueHash: string | null = null;
    if (present) {
      if (value === null) {
        exactValue = null;
        exactValueHash = sha256("null");
      } else if (typeof value === "string") {
        exactValue = value;
        exactValueHash = sha256(value);
      } else if (typeof value === "number" || typeof value === "boolean") {
        exactValue = String(value);
        exactValueHash = sha256(exactValue);
      }
    }
    const leafId = `${caseId}::${jsonPointer}::${exactValueHash ?? "absent"}`;
    leaves.push({
      leafId,
      caseId,
      packetRelativeFile: "casebrain-output.json",
      jsonPointer,
      arrayIndex: arrayIndexOf(jsonPointer),
      parentObjectIdentity: parentIdentity(jsonPointer),
      originalDataType: dataType,
      exactValue,
      exactValueHash,
      disposition: c.disposition,
      dispositionReason: c.reason,
      surfaceId: c.surfaceId,
      audience: c.audience,
      exit: c.exit,
      copyable: c.copyable,
      blocked: c.blocked,
      solicitorVisible: c.solicitorVisible,
      finalWordingPresent: c.finalWordingPresent,
    });
  };

  const walk = (node: unknown, pointer: string) => {
    if (node === null) {
      push(pointer || "/", null, true, "null");
      return;
    }
    if (typeof node === "string") {
      push(pointer || "/", node, true, "string");
      return;
    }
    if (typeof node === "number") {
      push(pointer || "/", node, true, "number");
      return;
    }
    if (typeof node === "boolean") {
      push(pointer || "/", node, true, "boolean");
      return;
    }
    if (Array.isArray(node)) {
      if (node.length === 0) {
        // Empty array itself is a structural signal — record as absent children context
        push(pointer, "[]", true, "string");
        // Override last push disposition for empty arrays under known sections
        const last = leaves[leaves.length - 1];
        if (last && last.jsonPointer === pointer) {
          last.disposition = "included_structural_empty";
          last.dispositionReason = `Empty array at ${pointer}.`;
          last.surfaceId = "empty_array_section";
          last.solicitorVisible = true;
          last.exactValue = "";
          last.exactValueHash = sha256("");
          last.originalDataType = "absent";
        }
        return;
      }
      node.forEach((item, i) => walk(item, `${pointer}/${i}`));
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      for (const key of keys) {
        walk(obj[key], `${pointer}/${encodeKey(key)}`);
      }
      // Expected-but-absent wording fields when parent present
      if (pointer === "/courtNote") {
        for (const f of ["text", "blockedReason"] as const) {
          if (!(f in obj)) push(`${pointer}/${f}`, undefined, false, "absent");
        }
      }
      if (pointer === "/exportVersion") {
        for (const f of ["reviewFooter", "blockedReason"] as const) {
          if (!(f in obj)) push(`${pointer}/${f}`, undefined, false, "absent");
        }
      }
      if (pointer === "/matterConfidence") {
        for (const f of ["label", "doNotRelyYetReason"] as const) {
          if (!(f in obj)) push(`${pointer}/${f}`, undefined, false, "absent");
        }
      }
      return;
    }
  };

  walk(output, "");
  // Fix root pointer "" → skip; children have absolute paths starting with /
  return leaves.filter((l) => l.jsonPointer.length > 0);
}

export function inventoryPacketFile(caseId: string, packetAbsDir: string): {
  leaves: SourceLeaf[];
  outputRaw: string;
  outputHash: string;
  output: Record<string, unknown>;
} {
  const file = path.join(packetAbsDir, "casebrain-output.json");
  const outputRaw = fs.readFileSync(file, "utf8");
  const outputHash = sha256(outputRaw);
  const output = JSON.parse(outputRaw) as Record<string, unknown>;
  const leaves = inventoryOutputLeaves(caseId, output);
  return { leaves, outputRaw, outputHash, output };
}

export function isIncludedDisposition(d: LeafDisposition): boolean {
  return d === "included_solicitor_visible" || d === "included_structural_empty";
}
