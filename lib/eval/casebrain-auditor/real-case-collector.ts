/**
 * Read-only real-case collector for full-960 discovery.
 * No DB writes. Uses same battleboard builder as GET /api/criminal/[caseId]/strategy-battleboard.
 */
import { combineCaseDocumentsText } from "@/lib/bundle/bundle-document-text";
import { computeDisclosureState } from "@/lib/criminal/disclosure-state";
import {
  dedupeWorkflowChaseLabels,
  filterBattleboardForWorkflowPilot,
  filterWorkflowPilotLines,
  resolveWorkflowProfile,
  resolveWorkflowProfileFromSignals,
  workflowDisclosureCaseWideLine,
  workflowPrimaryRouteTitle,
  workflowSafeCourtLine,
  type WorkflowProfile,
} from "@/lib/criminal/pilot-workflow";
import { buildStrategyBattleboard, type BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import { classifyCorpusBucket } from "./corpus-bucket";
import {
  isClearMoneyLaunderingFraudText,
  isMotoringOffenceText,
  resolveProvisionalWorkflowFromOffence,
} from "./provisional-offence-policy";
import { getAuditorSupabaseAdmin } from "./script-supabase";
import type { CorpusBucket } from "./types";
import type {
  AuditorFamilyProfile,
  AuditorScreen,
  CaseTruthManifest,
  CollectionStatus,
  ScreenCollection,
  SurfaceSource,
  UserRoleMode,
} from "./types";

const MAX_BUNDLE_CHARS = 220_000;

export type AuditorCorpus = "fictional" | "real";

export type RealCaseRow = {
  caseId: string;
  caseTitle: string;
  practiceArea: string | null;
  documentCount: number;
  defendantName: string | null;
  allegedOffence: string | null;
  offenceLabel: string | null;
  workflowProfile: WorkflowProfile;
  auditorFamily: AuditorFamilyProfile | null;
  evalPackId: string | null;
  evalPackName: string | null;
  corpusBucket: CorpusBucket;
  /** Merged from criminal_charges when case metadata offence is thin. */
  chargeOffences: string[];
};

export type RealCaseListExport = {
  exportedAt: string;
  orgId: string;
  totalListed: number;
  limit: number;
  offset: number;
  cases: RealCaseRow[];
};

function flatten(value: unknown, depth = 0): string {
  if (depth > 8 || value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => flatten(v, depth + 1)).join("\n");
  return Object.values(value as Record<string, unknown>)
    .map((v) => flatten(v, depth + 1))
    .join("\n");
}

function screen(
  name: AuditorScreen,
  payload: Record<string, unknown>,
  collectionStatus: CollectionStatus,
  surfaceSource: SurfaceSource,
  missing?: string[],
): ScreenCollection {
  return {
    screen: name,
    collectionStatus,
    surfaceSource,
    payload,
    allText: flatten(payload),
    missingSections: missing,
  };
}

export function inferAuditorFamilyFromOffence(offence: string | null | undefined): AuditorFamilyProfile | null {
  const t = (offence ?? "").toLowerCase();
  if (!t.trim()) return null;
  if (resolveProvisionalWorkflowFromOffence(t)) return null;
  if (isClearMoneyLaunderingFraudText(t)) return "fraud_account_control";
  if (/\b(fraud|dishonest|account|bank|poca)\b/.test(t) && !/\bmoney laundering\b/.test(t)) {
    return "fraud_account_control";
  }
  if (/\b(pwit|pwits|supply|class a|class b|drug| cocaine| heroin| cannabis)\b/.test(t)) return "pwits_phone_attribution";
  if (/\b(robbery|snatch|mugging)\b/.test(t)) return "robbery_identification";
  if (/\b(assault|gbh|abh|violence|affray|domestic|s\.18|s\.20|s\.47|oapa)\b/.test(t)) return "violence_domestic_assault";
  if (/\b(arson|criminal damage|fire)\b/.test(t) && !isMotoringOffenceText(t)) return "violence_domestic_assault";
  if (/\b(reckless|endanger)\b/.test(t) && !isMotoringOffenceText(t)) return "violence_domestic_assault";
  if (/\b(coercive|controlling behaviour|restraining|domestic abuse|rape|sexual offence)\b/.test(t)) {
    return "violence_domestic_assault";
  }
  if (/\b(burglary|public order|s\.4|s\.5|bladed|knife|blade|affray|violent disorder)\b/.test(t)) {
    return "violence_domestic_assault";
  }
  if (/\b(burglary|burglar|dwelling)\b/.test(t)) return "violence_domestic_assault";
  if (/\b(theft|shoplifting|handling)\b/.test(t)) return "robbery_identification";
  if (/\b(harassment|stalking|malicious communications|controlling|coercive)\b/.test(t)) {
    return "violence_domestic_assault";
  }
  if (/\b(knife|blade|offensive weapon|firearm|wounding|malicious wounding)\b/.test(t)) {
    return "violence_domestic_assault";
  }
  if (/\b(simple possession|possession of (?:a )?class\s*[ab]|possession of controlled)\b/.test(t)) {
    return "pwits_phone_attribution";
  }
  if (/\b(dangerous driving|driving whilst|no insurance|fail to stop|motoring|speeding|careless driving)\b/.test(t)) {
    return null;
  }
  return null;
}

function resolveRowWorkflowProfile(
  inferenceText: string,
  offenceLabel: string | null,
  ctx: {
    caseTitle: string;
    clientLabel: string;
    allegation: string;
    profileHint: WorkflowProfile | null;
  },
): { workflowProfile: WorkflowProfile; auditorFamily: AuditorFamilyProfile | null } {
  const text = inferenceText || offenceLabel || "";
  const provisional = resolveProvisionalWorkflowFromOffence(text);
  if (provisional) {
    return { workflowProfile: provisional, auditorFamily: null };
  }
  const chargeFamily = inferAuditorFamilyFromOffence(text);
  let workflowProfile = resolveWorkflowProfileFromSignals(ctx);
  const auditorFamily = chargeFamily;
  if (workflowProfile === "generic" && auditorFamily) {
    workflowProfile = auditorFamily;
  } else if (chargeFamily && workflowProfile !== chargeFamily) {
    const allegationFamily = inferAuditorFamilyFromOffence(inferenceText);
    if (allegationFamily === chargeFamily) workflowProfile = chargeFamily;
  }
  return { workflowProfile, auditorFamily };
}

/** Prefer explicit metadata; enrich inference with charge rows when present. */
export function mergeOffenceSignals(
  primary: string | null | undefined,
  charges: string[],
): { offenceLabel: string | null; inferenceText: string } {
  const parts = [primary?.trim(), ...charges.map((c) => c.trim()).filter(Boolean)].filter(Boolean) as string[];
  const unique = [...new Set(parts.map((p) => p.toLowerCase()))].map(
    (low) => parts.find((p) => p.toLowerCase() === low)!,
  );
  const inferenceText = unique.join("; ");
  const offenceLabel = primary?.trim() || unique[0] || null;
  return { offenceLabel, inferenceText };
}

function workflowProfileHintFromRow(row: RealCaseRow): WorkflowProfile | null {
  if (row.workflowProfile !== "generic") return row.workflowProfile;
  if (row.auditorFamily === "fraud_account_control") return "fraud_account_control";
  if (row.auditorFamily === "pwits_phone_attribution") return "pwits_phone_attribution";
  if (row.auditorFamily === "robbery_identification") return "robbery_identification";
  if (row.auditorFamily === "violence_domestic_assault") return "violence_domestic_assault";
  return null;
}

function workflowContextFromRow(row: RealCaseRow) {
  const allegation =
    [row.offenceLabel ?? row.allegedOffence, ...row.chargeOffences].filter(Boolean).join("; ") || "";
  return {
    caseTitle: row.caseTitle,
    clientLabel: row.defendantName ?? "Client",
    allegation,
    profileHint: workflowProfileHintFromRow(row),
  };
}

export function buildDiscoveryManifestFromRealCase(row: RealCaseRow): CaseTruthManifest {
  const allegation = row.offenceLabel ?? row.allegedOffence ?? "Offence not extracted";
  const family = row.auditorFamily;
  return {
    caseId: row.caseId,
    caseTitle: row.caseTitle,
    profile: row.workflowProfile,
    auditorFamily: family ?? undefined,
    manifestCertainty: "uncertain",
    sourceRef: row.caseId,
    offenceTag: allegation,
    certaintyNote: "Real uploaded case — discovery-only; no strict truth manifest.",
    corpusBucket: row.corpusBucket,
    bundleFound: row.documentCount > 0,
    expectedDefendant: row.defendantName ?? "Unknown",
    expectedAllegation: allegation,
    expectedCourt: "Court not safely extracted",
    expectedHearingDate: "2099-01-01",
    expectedHearingTime: "10:00",
    expectedRouteTitle: family ? workflowPrimaryRouteTitle(workflowContextFromRow(row)) ?? "" : "",
    requiredConcepts: [],
    forbiddenConcepts: [],
    forbiddenMalformedAnchors: [],
    expectedDisclosureItemCount: 8,
    expectedDocumentCount: row.documentCount,
  };
}

export async function loadRealCaseBattleboardInputs(
  caseId: string,
  orgId: string,
): Promise<{
  battleboard: BattleboardOutput;
  caseTitle: string;
  documentCount: number;
} | null> {
  const supabase = getAuditorSupabaseAdmin();

  const { data: caseRow, error: caseErr } = await supabase
    .from("cases")
    .select("id, title, org_id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (caseErr || !caseRow) return null;

  const [{ data: documents }, { data: positionRow }, { data: commitmentRow }, { data: criminalCase }, { data: timelineRows }, { data: charges }] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id, name, raw_text, extracted_text, extracted_json")
        .eq("case_id", caseId)
        .eq("org_id", orgId),
      supabase
        .from("case_positions")
        .select("position_text, phase, source")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("case_strategy_commitments")
        .select("primary_strategy")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("criminal_cases")
        .select("declared_dependencies, alleged_offence, stance_detected, interview_stance, defendant_name")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle(),
      supabase
        .from("criminal_disclosure_timeline")
        .select("item, action, action_date")
        .eq("case_id", caseId)
        .order("action_date", { ascending: false }),
      supabase
        .from("criminal_charges")
        .select("offence, section")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .limit(3),
    ]);

  const docs = documents ?? [];
  const bundleRaw = combineCaseDocumentsText(docs);
  const bundle_text = bundleRaw.slice(0, MAX_BUNDLE_CHARS);

  const chargeLabels = (charges ?? [])
    .map((c) => {
      const row = c as { offence?: string; section?: string | null };
      return [row.offence, row.section].filter(Boolean).join(" ").trim();
    })
    .filter(Boolean);
  const alleged =
    (typeof criminalCase?.alleged_offence === "string" && criminalCase.alleged_offence.trim()) || "";
  const offence_label =
    chargeLabels.length > 0
      ? [...new Set(chargeLabels)].join("; ")
      : alleged || null;

  type Dep = { id?: string; label?: string; status?: "required" | "helpful" | "not_needed" };
  const rawDeps = (criminalCase as { declared_dependencies?: Dep[] } | null)?.declared_dependencies;
  const declaredDependencies: Dep[] = Array.isArray(rawDeps) ? rawDeps : [];

  const disclosureTimeline = (timelineRows ?? []).map(
    (r: { item?: string; action?: string; action_date?: string }) => ({
      item: r.item ?? "",
      action: r.action ?? "",
      date: r.action_date ?? "",
    }),
  );

  const disclosureState = computeDisclosureState({
    documents: docs.map((d) => ({ id: d.id, name: d.name, title: d.name })),
    declaredDependencies,
    disclosureTimeline,
  });

  const positionText =
    typeof positionRow?.position_text === "string" ? positionRow.position_text.trim() : "";

  const caseTitle = typeof caseRow.title === "string" ? caseRow.title.trim() : "";

  const battleboard = buildStrategyBattleboard({
    case_id: caseId,
    bundle_text,
    offence_label,
    committed_strategy: commitmentRow?.primary_strategy ?? null,
    position_text: positionText || null,
    recorded_position: positionText
      ? {
          position_text: positionText,
          phase: typeof positionRow?.phase === "number" ? positionRow.phase : null,
          source: typeof positionRow?.source === "string" ? positionRow.source : null,
        }
      : null,
    stance_detected:
      typeof criminalCase?.stance_detected === "string" ? criminalCase.stance_detected : null,
    interview_stance:
      typeof criminalCase?.interview_stance === "string" ? criminalCase.interview_stance : null,
    strategy_summary_lines: caseTitle ? [`Case title: ${caseTitle}`] : [],
    outstanding_disclosure: disclosureState.missing_items.map((m) => m.label),
  });

  return { battleboard, caseTitle, documentCount: docs.length };
}

export async function fetchRealCaseRows(
  orgId: string,
  opts: { limit: number; offset: number; criminalOnly?: boolean },
): Promise<{ rows: RealCaseRow[]; totalFetched: number }> {
  const supabase = getAuditorSupabaseAdmin();
  const criminalOnly = opts.criminalOnly !== false;

  const fetchSize = Math.max(1, opts.limit);
  const { data: casePages, error } = await supabase
    .from("cases")
    .select("id, title, practice_area, eval_pack_id, eval_pack_name")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .range(opts.offset, opts.offset + fetchSize - 1);

  if (error) throw new Error(`fetchRealCaseRows: ${error.message}`);

  let cases = casePages ?? [];
  if (cases.length === 0) return { rows: [], totalFetched: 0 };

  const ids = cases.map((c) => c.id);

  const [{ data: criminalRows }, { data: docRows }, { data: chargeRows }] = await Promise.all([
    supabase
      .from("criminal_cases")
      .select("id, defendant_name, alleged_offence, offence_override")
      .eq("org_id", orgId)
      .in("id", ids),
    supabase.from("documents").select("case_id").eq("org_id", orgId).in("case_id", ids),
    supabase
      .from("criminal_charges")
      .select("case_id, offence, section")
      .eq("org_id", orgId)
      .in("case_id", ids),
  ]);

  const criminalById = new Map((criminalRows ?? []).map((r) => [r.id, r]));
  const docCountByCase = new Map<string, number>();
  for (const d of docRows ?? []) {
    const cid = String(d.case_id);
    docCountByCase.set(cid, (docCountByCase.get(cid) ?? 0) + 1);
  }
  const chargesByCase = new Map<string, string[]>();
  for (const ch of chargeRows ?? []) {
    const cid = String(ch.case_id);
    const label = [ch.offence, ch.section].filter(Boolean).join(" ").trim();
    if (!label) continue;
    const list = chargesByCase.get(cid) ?? [];
    list.push(label);
    chargesByCase.set(cid, list);
  }

  if (criminalOnly) {
    cases = cases.filter(
      (c) => c.practice_area === "criminal" || criminalById.has(c.id),
    );
  }

  const rows: RealCaseRow[] = cases.map((c) => {
    const cr = criminalById.get(c.id);
    const alleged =
      (typeof cr?.offence_override === "string" && cr.offence_override.trim()) ||
      (typeof cr?.alleged_offence === "string" && cr.alleged_offence.trim()) ||
      null;
    const chargeOffences = chargesByCase.get(c.id) ?? [];
    const { offenceLabel, inferenceText } = mergeOffenceSignals(alleged, chargeOffences);
    const ctx = {
      caseTitle: c.title ?? "",
      clientLabel: (typeof cr?.defendant_name === "string" && cr.defendant_name) || "Client",
      allegation: inferenceText || offenceLabel || "",
      profileHint: null as WorkflowProfile | null,
    };
    const { workflowProfile, auditorFamily } = resolveRowWorkflowProfile(inferenceText, offenceLabel, ctx);

    const documentCount = docCountByCase.get(c.id) ?? 0;
    const rowForBucket = {
      title: c.title,
      eval_pack_id: c.eval_pack_id,
      eval_pack_name: c.eval_pack_name,
      defendant_name: typeof cr?.defendant_name === "string" ? cr.defendant_name : null,
      alleged_offence: alleged,
      documentCount,
    };
    return {
      caseId: c.id,
      caseTitle: c.title ?? "Untitled",
      practiceArea: c.practice_area ?? null,
      documentCount,
      defendantName: typeof cr?.defendant_name === "string" ? cr.defendant_name : null,
      allegedOffence: alleged,
      offenceLabel,
      workflowProfile,
      auditorFamily,
      evalPackId: c.eval_pack_id ?? null,
      evalPackName: c.eval_pack_name ?? null,
      corpusBucket: classifyCorpusBucket(rowForBucket),
      chargeOffences,
    };
  });

  return { rows, totalFetched: rows.length };
}

export async function fetchRealCaseRowsByIds(
  orgId: string,
  caseIds: string[],
): Promise<RealCaseRow[]> {
  const ids = [...new Set(caseIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const supabase = getAuditorSupabaseAdmin();
  const { data: casePages, error } = await supabase
    .from("cases")
    .select("id, title, practice_area, eval_pack_id, eval_pack_name")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .in("id", ids);

  if (error) throw new Error(`fetchRealCaseRowsByIds: ${error.message}`);
  const cases = casePages ?? [];
  if (cases.length === 0) return [];

  const fetchedIds = cases.map((c) => c.id);

  const [{ data: criminalRows }, { data: docRows }, { data: chargeRows }] = await Promise.all([
    supabase
      .from("criminal_cases")
      .select("id, defendant_name, alleged_offence, offence_override")
      .eq("org_id", orgId)
      .in("id", fetchedIds),
    supabase.from("documents").select("case_id").eq("org_id", orgId).in("case_id", fetchedIds),
    supabase
      .from("criminal_charges")
      .select("case_id, offence, section")
      .eq("org_id", orgId)
      .in("case_id", fetchedIds),
  ]);

  const criminalById = new Map((criminalRows ?? []).map((r) => [r.id, r]));
  const docCountByCase = new Map<string, number>();
  for (const d of docRows ?? []) {
    const cid = String(d.case_id);
    docCountByCase.set(cid, (docCountByCase.get(cid) ?? 0) + 1);
  }
  const chargesByCase = new Map<string, string[]>();
  for (const ch of chargeRows ?? []) {
    const cid = String(ch.case_id);
    const label = [ch.offence, ch.section].filter(Boolean).join(" ").trim();
    if (!label) continue;
    const list = chargesByCase.get(cid) ?? [];
    list.push(label);
    chargesByCase.set(cid, list);
  }

  const idOrder = new Map(ids.map((id, i) => [id, i]));

  const rows: RealCaseRow[] = cases
    .filter((c) => c.practice_area === "criminal" || criminalById.has(c.id))
    .map((c) => {
      const cr = criminalById.get(c.id);
      const alleged =
        (typeof cr?.offence_override === "string" && cr.offence_override.trim()) ||
        (typeof cr?.alleged_offence === "string" && cr.alleged_offence.trim()) ||
        null;
      const chargeOffences = chargesByCase.get(c.id) ?? [];
      const { offenceLabel, inferenceText } = mergeOffenceSignals(alleged, chargeOffences);
      const ctx = {
        caseTitle: c.title ?? "",
        clientLabel: (typeof cr?.defendant_name === "string" && cr.defendant_name) || "Client",
        allegation: inferenceText || offenceLabel || "",
        profileHint: null as WorkflowProfile | null,
      };
      const { workflowProfile, auditorFamily } = resolveRowWorkflowProfile(inferenceText, offenceLabel, ctx);

      const documentCount = docCountByCase.get(c.id) ?? 0;
      const rowForBucket = {
        title: c.title,
        eval_pack_id: c.eval_pack_id,
        eval_pack_name: c.eval_pack_name,
        defendant_name: typeof cr?.defendant_name === "string" ? cr.defendant_name : null,
        alleged_offence: alleged,
        documentCount,
      };
      return {
        caseId: c.id,
        caseTitle: c.title ?? "Untitled",
        practiceArea: c.practice_area ?? null,
        documentCount,
        defendantName: typeof cr?.defendant_name === "string" ? cr.defendant_name : null,
        allegedOffence: alleged,
        offenceLabel,
        workflowProfile,
        auditorFamily,
        evalPackId: c.eval_pack_id ?? null,
        evalPackName: c.eval_pack_name ?? null,
        corpusBucket: classifyCorpusBucket(rowForBucket),
        chargeOffences,
      };
    })
    .sort((a, b) => (idOrder.get(a.caseId) ?? 999) - (idOrder.get(b.caseId) ?? 999));

  return rows;
}

export async function collectRealCaseDiscoverySurfaces(
  row: RealCaseRow,
  orgId: string,
  _opts: { userRole: UserRoleMode },
): Promise<ScreenCollection[]> {
  const loaded = await loadRealCaseBattleboardInputs(row.caseId, orgId);
  if (!loaded) {
    return [
      screen("control_room", { error: "case_not_found" }, "missing", "api-output", ["case"]),
    ];
  }

  const { battleboard } = loaded;
  const ctx = workflowContextFromRow(row);
  const filtered = filterBattleboardForWorkflowPilot(battleboard, ctx);
  const bb = filtered ?? battleboard;
  const surfaceSource: SurfaceSource = "api-output";

  const screens: ScreenCollection[] = [];

  screens.push(
    screen(
      "control_room",
      {
        primaryRoute: workflowPrimaryRouteTitle(ctx),
        safeCourtLine: workflowSafeCourtLine(ctx),
        disclosureCaseWide: workflowDisclosureCaseWideLine(ctx),
        solicitorSafeSummary: bb.solicitor_safe_summary,
        positionNotice: bb.position_notice,
        prosecutionWeakness: filterWorkflowPilotLines(bb.primary_route?.why_it_helps ?? [], ctx, { max: 4 }),
        defenceRisks: filterWorkflowPilotLines(
          [...(bb.primary_route?.collapse_risks ?? []), ...(bb.global_collapse_risks ?? [])],
          ctx,
          { max: 4 },
        ),
        routeTitles: bb.routes.map((r) => r.title),
        documentCount: row.documentCount,
        workflowProfile: row.workflowProfile,
      },
      bb.primary_route ? "collected" : "partial",
      surfaceSource,
    ),
  );

  screens.push(
    screen(
      "strategy",
      {
        overallStatus: bb.overall_status,
        primaryRouteTitle: bb.primary_route?.title,
        hearingLine: bb.primary_route?.hearing_line,
        collapseRisks: bb.primary_route?.collapse_risks,
        whyItHelps: bb.primary_route?.why_it_helps,
        evidenceAnchors: (bb.primary_route?.evidence_anchors ?? []).map((a) => a.slice(0, 120)),
      },
      "collected",
      surfaceSource,
    ),
  );

  const rawChaseLabels = battleboard.routes.flatMap((r) => r.next_moves ?? []);
  const filteredChase = filterWorkflowPilotLines(rawChaseLabels, ctx, { max: 12 });
  const outstandingLabels = dedupeWorkflowChaseLabels(filteredChase).slice(0, 8);

  screens.push(
    screen(
      "disclosure_chase",
      {
        outstandingCount: outstandingLabels.length,
        outstandingLabels,
        rawCountBeforeDedupe: rawChaseLabels.length,
      },
      row.documentCount > 0 ? "collected" : "partial",
      surfaceSource,
    ),
  );

  screens.push(
    screen(
      "hearing_war_room",
      {
        hearingLine: bb.primary_route?.hearing_line ?? "",
        overallStatus: bb.overall_status,
        thinBundle: bb.overall_status === "thin_bundle",
        positionNotice: bb.position_notice,
      },
      "collected",
      surfaceSource,
    ),
  );

  screens.push(
    screen(
      "documents",
      {
        documentCount: row.documentCount,
        note: "Metadata only — no PDF bytes in auditor scan.",
      },
      row.documentCount > 0 ? "collected" : "missing",
      surfaceSource,
      row.documentCount > 0 ? undefined : ["documents"],
    ),
  );

  return screens;
}

export async function exportRealCaseList(
  orgId: string,
  opts: { limit: number; offset: number },
): Promise<RealCaseListExport> {
  const { rows } = await fetchRealCaseRows(orgId, { ...opts, criminalOnly: true });
  return {
    exportedAt: new Date().toISOString(),
    orgId,
    totalListed: rows.length,
    limit: opts.limit,
    offset: opts.offset,
    cases: rows,
  };
}
