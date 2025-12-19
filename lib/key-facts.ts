/**
 * Key Facts Brain
 * 
 * Builds a comprehensive summary of key case facts by pulling from
 * existing case data, brains, and optionally using AI to fill gaps.
 */

import { getSupabaseAdminClient } from "./supabase";
import { calculateNextStep } from "./next-step";
import type {
  KeyFactsSummary,
  KeyFactsStage,
  KeyFactsFundingType,
  KeyFactsKeyDate,
  KeyFactsBundleSummarySection,
  RiskFlag,
  LimitationInfo,
} from "./types/casebrain";
import { normalizePracticeArea, type PracticeArea } from "./types/casebrain";
import { getOrBuildLayeredSummary } from "@/lib/layered-summary/engine";
import { createDbLayeredSummaryCache } from "@/lib/layered-summary/cache-db";
import { resolvePracticeAreaFromSignals } from "@/lib/strategic/practice-area-filters";

/**
 * Build a key facts summary for a case
 */
export async function buildKeyFactsSummary(
  caseId: string,
  orgId: string,
): Promise<KeyFactsSummary> {
  const supabase = getSupabaseAdminClient();

  // 1. Fetch base case record
  // Note: Route-level scoped lookup should have already found the case,
  // but we still query with orgId for safety (orgId is either UUID or externalRef from scope)
  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area, status, created_at, org_id")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (caseError) {
    console.error("[key-facts] Case lookup failed:", {
      caseId,
      orgId,
      message: caseError.message,
      code: (caseError as any).code,
    });
    throw new Error("Case lookup failed");
  }

  if (!caseData) {
    throw new Error("Case not found");
  }

  let normalizedPracticeArea: PracticeArea = normalizePracticeArea(caseData.practice_area);

  // Runtime assert/repair: if criminal signals exist but stored practice_area is other/null,
  // force criminal for downstream logic (and safely persist for stability if it's unset/other).
  if (normalizedPracticeArea !== "criminal") {
    let hasCriminalSignals = false;
    try {
      const [{ data: criminalCaseRow }, { data: chargeRow }, { data: docs }] = await Promise.all([
        supabase
          .from("criminal_cases")
          .select("id")
          .eq("id", caseId)
          .eq("org_id", orgId)
          .maybeSingle(),
        supabase
          .from("criminal_charges")
          .select("id")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("documents")
          .select("name")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      const looksCriminal = (docs ?? []).some((d: any) =>
        /(?:\bPACE\b|\bCPIA\b|\bMG6\b|\bMG\s*6\b|\bMG5\b|\bCPS\b|\bcustody\b|\binterview\b|\bcharge\b|\bindictment\b|\bCrown Court\b|\bMagistrates'? Court\b)/i.test(
          String(d?.name ?? ""),
        ),
      );
      hasCriminalSignals = Boolean(criminalCaseRow?.id || (chargeRow as any)?.id || looksCriminal);
    } catch {
      // ignore
    }

    const resolved = resolvePracticeAreaFromSignals({
      storedPracticeArea: caseData.practice_area,
      hasCriminalSignals,
      context: "key-facts/buildKeyFactsSummary",
    });

    if (resolved === "criminal") {
      normalizedPracticeArea = "criminal" as PracticeArea;

      // Safe persistence: only overwrite when unset/other.
      try {
        const storedNormalized = caseData.practice_area ? normalizePracticeArea(caseData.practice_area) : null;
        if (!storedNormalized || storedNormalized === "other_litigation") {
          await supabase
            .from("cases")
            .update({ practice_area: "criminal" } as any)
            .eq("id", caseId)
            .eq("org_id", orgId);
        }
      } catch {
        // ignore
      }
    }
  }

  // =============================================================================
  // Criminal: build key facts from persisted criminal tables (deterministic, never-throw)
  // =============================================================================
  if (normalizedPracticeArea === "criminal") {
    try {
      const { data: documents } = await supabase
        .from("documents")
        .select("id, name, created_at, extracted_json")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: criminalCase } = await supabase
        .from("criminal_cases")
        .select("defendant_name, court_name, next_hearing_date, next_hearing_type, next_bail_review, bail_status")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();

      const { data: charges } = await supabase
        .from("criminal_charges")
        .select("offence, section, charge_date, status")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("charge_date", { ascending: false })
        .limit(5);

      const { data: hearings } = await supabase
        .from("criminal_hearings")
        .select("hearing_date, hearing_type, court_name, outcome")
        .eq("case_id", caseId)
        .eq("org_id", orgId)
        .order("hearing_date", { ascending: true })
        .limit(20);

      const now = new Date();
      const nextHearing =
        (criminalCase?.next_hearing_date as string | null) ??
        (hearings ?? []).find((h: any) => new Date(h.hearing_date).getTime() >= now.getTime())?.hearing_date ??
        null;

      const keyDates: KeyFactsKeyDate[] = [];
      keyDates.push({
        label: "Instructions",
        date: caseData.created_at,
        isPast: new Date(caseData.created_at) < now,
      });
      if (nextHearing) {
        keyDates.push({
          label: "Next Hearing",
          date: nextHearing,
          isPast: false,
          isUrgent: new Date(nextHearing).getTime() - now.getTime() <= 14 * 24 * 60 * 60 * 1000,
        });
      }
      if (criminalCase?.next_bail_review) {
        keyDates.push({
          label: "Bail Review",
          date: criminalCase.next_bail_review,
          isPast: new Date(criminalCase.next_bail_review) < now,
          isUrgent: new Date(criminalCase.next_bail_review).getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000,
        });
      }

      const primaryIssues: string[] = [];
      const topCharge = (charges ?? [])[0];
      if (topCharge?.offence) {
        primaryIssues.push(`Charge: ${topCharge.offence}${topCharge.section ? ` (${topCharge.section})` : ""}`);
      }
      if (criminalCase?.bail_status) {
        primaryIssues.push(`Bail status: ${String(criminalCase.bail_status).replace(/_/g, " ")}`);
      }
      if ((charges ?? []).length === 0) {
        primaryIssues.push("Charges not yet captured (upload MG forms / charge sheet)");
      }

      const claimType = "Criminal Defence";
      const opponentName = "CPS / Prosecution";

      const bundleSummarySections = buildBundleSummarySections(
        normalizedPracticeArea,
        documents ?? [],
        caseData.summary ?? undefined,
      );

      // Optional layered summary (best-effort; cached)
      let layeredSummary: KeyFactsSummary["layeredSummary"] = null;
      try {
        const { data: latestVersionRows } = await supabase
          .from("case_analysis_versions")
          .select("version_number, missing_evidence")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .order("version_number", { ascending: false })
          .limit(1);

        const latestVersion = latestVersionRows?.[0] ?? null;
        const latestAnalysisVersion = typeof latestVersion?.version_number === "number" ? latestVersion.version_number : null;
        const versionMissingEvidence = Array.isArray(latestVersion?.missing_evidence) ? latestVersion?.missing_evidence : [];

        const { data: latestBundleRows } = await supabase
          .from("case_bundles")
          .select("total_pages")
          .eq("case_id", caseId)
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(1);
        const totalPages = typeof latestBundleRows?.[0]?.total_pages === "number" ? latestBundleRows?.[0]?.total_pages : undefined;

        layeredSummary = await getOrBuildLayeredSummary({
          caseId,
          orgId,
          practiceArea: normalizedPracticeArea,
          documents: (documents ?? []).map((d: any) => ({
            id: d.id,
            name: d.name,
            extracted_json: d.extracted_json,
            created_at: d.created_at,
          })),
          totalPages,
          latestAnalysisVersion,
          keyDates,
          mainRisks: [],
          versionMissingEvidence,
          cache: createDbLayeredSummaryCache(),
        });
      } catch (err) {
        console.warn("[key-facts][layered-summary][criminal] non-fatal:", err);
        layeredSummary = null;
      }

      return {
        caseId,
        practiceArea: normalizedPracticeArea,
        clientName: criminalCase?.defendant_name ?? undefined,
        opponentName,
        courtName: criminalCase?.court_name ?? undefined,
        claimType,
        causeOfAction: topCharge?.offence ?? undefined,
        stage: "other",
        fundingType: "unknown",
        approxValue: undefined,
        headlineSummary: caseData.summary ?? undefined,
        whatClientWants: "Defend allegations and manage risk (disclosure-first).",
        keyDates,
        mainRisks: [],
        primaryIssues: primaryIssues.slice(0, 5),
        nextStepsBrief: nextHearing ? `Prepare for next hearing (${new Date(nextHearing).toISOString().slice(0, 10)}). Stabilise disclosure/continuity before committing positions.` : "Stabilise disclosure/continuity (MG6, custody, interview recording, CCTV/BWV/999).",
        bundleSummarySections,
        layeredSummary,
      };
    } catch (err) {
      // Absolute safety: never throw for key facts
      console.error("[buildKeyFactsSummary][criminal] fallback:", err);
      return {
        caseId,
        practiceArea: normalizedPracticeArea,
        clientName: undefined,
        opponentName: "CPS / Prosecution",
        courtName: undefined,
        claimType: "Criminal Defence",
        causeOfAction: undefined,
        stage: "other",
        fundingType: "unknown",
        approxValue: undefined,
        headlineSummary: caseData.summary ?? undefined,
        whatClientWants: undefined,
        keyDates: [
          { label: "Instructions", date: caseData.created_at, isPast: true },
        ],
        mainRisks: [],
        primaryIssues: ["Key facts not yet available (run extraction / upload charge sheet, MG forms, court listing)."],
        nextStepsBrief: "Upload core criminal bundle docs (charge sheet, MG5/MG6, custody record, interview, listing).",
        bundleSummarySections: [],
        layeredSummary: null,
      };
    }
  }

  // 2. Fetch PI case data if applicable
  const { data: piCase } = await supabase
    .from("pi_cases")
    .select("*")
    .eq("id", caseId)
    .maybeSingle();

  // 3. Fetch Housing case data if applicable
  const { data: housingCase } = await supabase
    .from("housing_cases")
    .select("*")
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  // 4. Fetch risk flags
  const { data: riskFlags } = await supabase
    .from("risk_flags")
    .select("id, flag_type, severity, description, resolved")
    .eq("case_id", caseId)
    .eq("resolved", false);

  // 5. Fetch deadlines
  const { data: deadlines } = await supabase
    .from("deadlines")
    .select("id, title, due_date")
    .eq("case_id", caseId)
    .order("due_date", { ascending: true });

  // 6. Fetch case notes for client objectives (first attendance note)
  const { data: caseNotes } = await supabase
    .from("case_notes")
    .select("id, body, is_attendance, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: true })
    .limit(5);

  // 7. Fetch documents for timeline extraction and structured facts
  const { data: documents } = await supabase
    .from("documents")
    .select("id, name, type, created_at, extracted_json")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
    .limit(50); // Limit to prevent memory issues

  // Ensure we have at least an empty array
  if (!documents) {
    console.warn(`[buildKeyFactsSummary] No documents found for case ${caseId}`);
  }

  // === Build Key Facts ===

  // Determine stage
  const stage = determineStage(caseData, piCase, housingCase);

  // Determine funding type
  const fundingType = determineFundingType(piCase);

  // Build key dates
  const keyDates = buildKeyDates(caseData, piCase, housingCase, deadlines ?? []);

  // Extract main risks
  const mainRisks = (riskFlags ?? [])
    .filter(r => r.severity === "critical" || r.severity === "high")
    .map(r => r.description)
    .slice(0, 5);

  // Extract primary issues from documents
  const primaryIssues = extractPrimaryIssues(documents ?? []);

  const bundleSummarySections = buildBundleSummarySections(
    normalizedPracticeArea,
    documents ?? [],
    caseData.summary ?? undefined,
  );

  // Optional layered summary (best-effort; cached)
  let layeredSummary: KeyFactsSummary["layeredSummary"] = null;
  try {
    const { data: latestVersionRows } = await supabase
      .from("case_analysis_versions")
      .select("version_number, missing_evidence")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("version_number", { ascending: false })
      .limit(1);

    const latestVersion = latestVersionRows?.[0] ?? null;
    const latestAnalysisVersion = typeof latestVersion?.version_number === "number" ? latestVersion.version_number : null;
    const versionMissingEvidence = Array.isArray(latestVersion?.missing_evidence) ? latestVersion?.missing_evidence : [];

    const { data: latestBundleRows } = await supabase
      .from("case_bundles")
      .select("total_pages")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1);
    const totalPages = typeof latestBundleRows?.[0]?.total_pages === "number" ? latestBundleRows?.[0]?.total_pages : undefined;

    layeredSummary = await getOrBuildLayeredSummary({
      caseId,
      orgId,
      practiceArea: normalizedPracticeArea,
      documents: (documents ?? []).map((d: any) => ({
        id: d.id,
        name: d.name,
        type: d.type,
        extracted_json: d.extracted_json,
        created_at: d.created_at,
      })),
      totalPages,
      latestAnalysisVersion,
      keyDates,
      mainRisks,
      versionMissingEvidence,
      cache: createDbLayeredSummaryCache(),
    });
  } catch (err) {
    console.warn("[key-facts][layered-summary] non-fatal:", err);
    layeredSummary = null;
  }

  // Get next step brief
  const nextStepsBrief = await getNextStepBrief(
    caseId,
    { practice_area: normalizedPracticeArea },
    riskFlags ?? [],
    documents ?? [],
  );

  // Get client objectives from available data
  const whatClientWants = getClientObjectives(caseData, caseNotes ?? [], piCase);

  // Determine approximate value
  const approxValue = getApproxValue(piCase, housingCase);

  // Determine claim type
  const claimType = getClaimType(normalizedPracticeArea, piCase, housingCase);

  // Get opponent name
  const opponentName = getOpponentName(piCase, housingCase);

  return {
    caseId,
    practiceArea: normalizedPracticeArea,
    clientName: piCase?.claimant_name ?? housingCase?.tenant_name ?? undefined,
    opponentName,
    courtName: piCase?.court_name ?? undefined,
    claimType,
    causeOfAction: piCase?.liability_type ?? housingCase?.claim_type ?? undefined,
    stage,
    fundingType,
    approxValue,
    headlineSummary: caseData.summary ?? undefined,
    whatClientWants,
    keyDates,
    mainRisks,
    primaryIssues,
    nextStepsBrief,
    bundleSummarySections,
    layeredSummary,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildBundleSummarySections(
  practiceArea: string,
  documents: Array<{ name?: string | null; created_at?: string; extracted_json?: unknown }>,
  caseSummary?: string,
): KeyFactsBundleSummarySection[] {
  const sections = getBundleSummarySectionConfigs(practiceArea);
  if (sections.length === 0) return [];

  const maxSentencesPerSection = 5;
  const maxCharsPerSection = 900;

  // Oldest first gives a more chronological narrative
  const docs = documents.slice().reverse();

  const pickedBySection: Record<string, string[]> = {};
  for (const s of sections) pickedBySection[s.title] = [];

  const seenGlobal = new Set<string>();

  for (const doc of docs) {
    const extracted = doc.extracted_json && typeof doc.extracted_json === "object"
      ? (doc.extracted_json as any)
      : null;
    const summaryText = typeof extracted?.summary === "string" ? extracted.summary : "";
    const text = [doc.name ?? "", summaryText].filter(Boolean).join(". ");
    if (!text) continue;

    const sentences = splitIntoSentences(text);
    for (const sentence of sentences) {
      const s = sentence.trim();
      if (s.length < 25) continue;
      if (s.length > 260) continue;

      const normalized = normalizeSentence(s);
      if (!normalized || seenGlobal.has(normalized)) continue;

      for (const section of sections) {
        if (pickedBySection[section.title].length >= maxSentencesPerSection) continue;
        if (containsAnyKeyword(normalized, section.keywords)) {
          pickedBySection[section.title].push(s);
          seenGlobal.add(normalized);
          break;
        }
      }
    }

    // Early stop if all sections are filled
    if (sections.every(sec => pickedBySection[sec.title].length >= maxSentencesPerSection)) {
      break;
    }
  }

  const out: KeyFactsBundleSummarySection[] = [];

  // Optional: include case summary as first section if it exists and is non-trivial
  if (caseSummary && caseSummary.trim().length >= 40) {
    out.push({
      title: "Overview",
      body: caseSummary.trim(),
    });
  }

  for (const section of sections) {
    const sentences = pickedBySection[section.title];
    if (!sentences || sentences.length === 0) continue;
    const body = truncateToChars(sentences.join(" "), maxCharsPerSection);
    out.push({ title: section.title, body });
  }

  return out;
}

function getBundleSummarySectionConfigs(practiceArea: string): Array<{ title: string; keywords: string[] }> {
  switch (practiceArea) {
    case "clinical_negligence":
      return [
        { title: "Hospital / Trust", keywords: ["nhs", "hospital", "trust", "a&e", "ward", "consultant", "clinic", "radiology"] },
        { title: "Presentation & Timeline", keywords: ["present", "attend", "admit", "discharg", "delay", "refer", "follow-up", "timeline"] },
        { title: "Injury / Outcome", keywords: ["injury", "deterior", "surgery", "operation", "infection", "stroke", "death", "amputation", "fracture"] },
        { title: "Imaging / Tests", keywords: ["x-ray", "xray", "ct", "mri", "scan", "imaging", "radiology", "report", "addendum", "discrepanc"] },
        { title: "Consent / Pathway", keywords: ["consent", "guideline", "pathway", "protocol", "policy"] },
      ];
    case "personal_injury":
      return [
        { title: "Accident / Mechanism", keywords: ["accident", "collision", "rta", "rtc", "slip", "trip", "fall", "impact", "junction", "speed"] },
        { title: "Where it happened", keywords: ["location", "road", "street", "junction", "roundabout", "site", "workplace", "premises"] },
        { title: "Injuries", keywords: ["injury", "fracture", "sprain", "whiplash", "pain", "bruise", "laceration", "strain"] },
        { title: "Treatment", keywords: ["a&e", "hospital", "gp", "physio", "x-ray", "xray", "ct", "mri", "operation", "surgery", "discharge"] },
        { title: "Liability / Evidence", keywords: ["liability", "fault", "neglig", "admission", "deny", "insurer", "cctv", "witness", "photos"] },
      ];
    case "housing_disrepair":
      return [
        { title: "Property / Landlord", keywords: ["landlord", "property", "flat", "house", "council", "housing association", "tenancy"] },
        { title: "Damp / Mould / Ingress", keywords: ["damp", "mould", "mold", "leak", "water ingress", "condensation"] },
        { title: "Health impact", keywords: ["asthma", "cough", "breath", "child", "eczema", "gp", "hospital"] },
        { title: "Complaints / Inspections / Works", keywords: ["complaint", "inspection", "survey", "works order", "repair", "contractor", "visit"] },
      ];
    case "criminal":
      return [
        { title: "Allegations / Charges", keywords: ["charge", "charged", "offence", "offense", "allegation", "assault", "robbery", "wound", "knife", "strangl", "gbh", "abh"] },
        { title: "Court / Hearings", keywords: ["court", "hearing", "listing", "crown", "magistrates", "plea", "trial", "sentencing", "cmh"] },
        { title: "Bail / Custody", keywords: ["bail", "remand", "custody", "curfew", "conditions", "police bail", "released"] },
        { title: "PACE / Interview / Disclosure", keywords: ["pace", "interview", "caution", "solicitor", "mg6", "disclosure", "unused material", "cctv", "bwv", "999", "cad", "continuity"] },
      ];
    case "family":
      return [
        { title: "Parties / Children", keywords: ["child", "children", "mother", "mum", "father", "dad", "school", "social worker"] },
        { title: "Safeguarding", keywords: ["safeguard", "risk", "domestic", "abuse", "harm", "police"] },
        { title: "Orders / Court", keywords: ["order", "c100", "fl401", "fact finding", "cafcass", "hearing", "court"] },
      ];
    default:
      return [
        { title: "Core facts", keywords: ["summary", "facts", "background", "issue", "dispute"] },
        { title: "Key events", keywords: ["date", "timeline", "occur", "happen", "event"] },
        { title: "Evidence", keywords: ["document", "evidence", "report", "statement", "photo"] },
      ];
  }
}

function splitIntoSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  // Simple, TS-target-safe sentence split (no lookbehind)
  return cleaned.split(/[.!?]\s+/g).map(s => s.trim()).filter(Boolean);
}

function normalizeSentence(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function containsAnyKeyword(normalizedSentence: string, keywords: string[]): boolean {
  for (const kw of keywords) {
    if (!kw) continue;
    if (normalizedSentence.includes(kw)) return true;
  }
  return false;
}

function truncateToChars(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

function determineStage(
  caseData: { status?: string; practice_area?: string },
  piCase: { stage?: string } | null,
  housingCase: { stage?: string } | null,
): KeyFactsStage {
  // Check PI case stage
  if (piCase?.stage) {
    const piStage = piCase.stage.toLowerCase();
    if (piStage.includes("pre")) return "pre_action";
    if (piStage.includes("issue")) return "issued";
    if (piStage.includes("trial")) return "trial_prep";
    if (piStage.includes("settle")) return "settled";
  }

  // Check housing case stage
  if (housingCase?.stage) {
    const hStage = housingCase.stage.toLowerCase();
    if (hStage === "pre_action") return "pre_action";
    if (hStage === "litigation") return "issued";
    if (hStage === "settlement") return "settled";
    if (hStage === "closed") return "closed";
  }

  // Fall back to case status
  const status = caseData.status?.toLowerCase() ?? "";
  if (status.includes("pre")) return "pre_action";
  if (status.includes("issue")) return "issued";
  if (status.includes("trial")) return "trial_prep";
  if (status.includes("settle")) return "settled";
  if (status.includes("close")) return "closed";

  return "other";
}

function determineFundingType(
  piCase: { funding_type?: string } | null,
): KeyFactsFundingType {
  if (!piCase?.funding_type) return "unknown";
  
  const ft = piCase.funding_type.toLowerCase();
  if (ft.includes("cfa")) return "cfa";
  if (ft.includes("private")) return "private";
  if (ft.includes("legal_aid") || ft.includes("legal aid")) return "legal_aid";
  if (ft.includes("dba")) return "dba";
  if (ft.includes("aei") || ft.includes("after")) return "after_event";
  
  return "other";
}

function buildKeyDates(
  caseData: { created_at: string },
  piCase: { 
    incident_date?: string; 
    instructions_date?: string;
    limitation_date?: string;
    issue_date?: string;
  } | null,
  housingCase: { 
    first_complaint_date?: string;
    issue_date?: string;
  } | null,
  deadlines: Array<{ title: string; due_date: string }>,
): KeyFactsKeyDate[] {
  const dates: KeyFactsKeyDate[] = [];
  const now = new Date();

  // Instructions/first contact date
  const instructionsDate = piCase?.instructions_date ?? caseData.created_at;
  dates.push({
    label: "Instructions",
    date: instructionsDate,
    isPast: new Date(instructionsDate) < now,
  });

  // Incident date
  if (piCase?.incident_date) {
    dates.push({
      label: "Incident",
      date: piCase.incident_date,
      isPast: true,
    });
  }
  if (housingCase?.first_complaint_date) {
    dates.push({
      label: "First Complaint",
      date: housingCase.first_complaint_date,
      isPast: true,
    });
  }

  // Limitation date
  if (piCase?.limitation_date) {
    const limitDate = new Date(piCase.limitation_date);
    const daysRemaining = Math.ceil((limitDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    dates.push({
      label: "Limitation",
      date: piCase.limitation_date,
      isPast: daysRemaining < 0,
      isUrgent: daysRemaining > 0 && daysRemaining <= 90,
    });
  }

  // Issue date
  const issueDate = piCase?.issue_date ?? housingCase?.issue_date;
  if (issueDate) {
    dates.push({
      label: "Issued",
      date: issueDate,
      isPast: new Date(issueDate) < now,
    });
  }

  // Next critical deadline
  const nextDeadline = deadlines.find(d => new Date(d.due_date) > now);
  if (nextDeadline) {
    const daysUntil = Math.ceil((new Date(nextDeadline.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    dates.push({
      label: `Next: ${nextDeadline.title}`,
      date: nextDeadline.due_date,
      isPast: false,
      isUrgent: daysUntil <= 14,
    });
  }

  // Sort by date
  return dates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Extract primary issues from structured extraction data
 * Uses extracted_json structured facts as primary input
 * Falls back to summary text if structured data is missing
 */
function extractPrimaryIssues(
  documents: Array<{ extracted_json?: unknown; name?: string }>,
): string[] {
  const issues: string[] = [];
  const seenIssues = new Set<string>();
  
  // Process documents in reverse order (newest first) to prioritize recent extractions
  for (const doc of documents.slice().reverse()) {
    if (doc.extracted_json && typeof doc.extracted_json === "object") {
      const extracted = doc.extracted_json as { 
        keyIssues?: string[];
        summary?: string;
        housingMeta?: {
          propertyDefects?: Array<{ type: string; severity?: string }>;
          hhsrsHazards?: string[];
        };
      };
      
      // Primary: Use structured keyIssues
      if (Array.isArray(extracted.keyIssues) && extracted.keyIssues.length > 0) {
        for (const issue of extracted.keyIssues) {
          const normalized = issue.trim().toLowerCase();
          if (normalized && !seenIssues.has(normalized)) {
            seenIssues.add(normalized);
            issues.push(issue.trim());
          }
        }
      }
      
      // Fallback: Extract from housing defects if no keyIssues
      if (issues.length === 0 && extracted.housingMeta?.propertyDefects) {
        for (const defect of extracted.housingMeta.propertyDefects) {
          const issueText = `${defect.type}${defect.severity ? ` (${defect.severity})` : ""}`;
          const normalized = issueText.toLowerCase();
          if (!seenIssues.has(normalized)) {
            seenIssues.add(normalized);
            issues.push(issueText);
          }
        }
      }
      
      // Fallback: Extract from HHSRS hazards
      if (extracted.housingMeta?.hhsrsHazards && extracted.housingMeta.hhsrsHazards.length > 0) {
        for (const hazard of extracted.housingMeta.hhsrsHazards) {
          const issueText = `HHSRS hazard: ${hazard}`;
          const normalized = issueText.toLowerCase();
          if (!seenIssues.has(normalized)) {
            seenIssues.add(normalized);
            issues.push(issueText);
          }
        }
      }

      // Final fallback: Extract key phrases from summary if no structured issues
      if (issues.length === 0 && extracted.summary) {
        const summaryLower = extracted.summary.toLowerCase();
        if (summaryLower.includes("damp") || summaryLower.includes("mould")) {
          issues.push("Damp and mould issues");
        }
        if (summaryLower.includes("awaab") || summaryLower.includes("awaab's law")) {
          issues.push("Potential Awaab's Law breach");
        }
        if (summaryLower.includes("category 1") || summaryLower.includes("cat 1")) {
          issues.push("Category 1 hazard identified");
        }
        if (summaryLower.includes("child") && (summaryLower.includes("health") || summaryLower.includes("asthma"))) {
          issues.push("Child health impact from disrepair");
        }
      }
    }
  }

  // Limit to top 5 most relevant issues
  return issues.slice(0, 5);
}

async function getNextStepBrief(
  caseId: string,
  caseData: { practice_area?: string },
  riskFlags: Array<{ severity: string; flag_type: string; description: string; resolved: boolean }>,
  documents: Array<{ name: string; type?: string }>,
): Promise<string | undefined> {
  try {
    const convertedRiskFlags = riskFlags.map((rf, idx) => {
      const rawType =
        typeof rf.flag_type === "string" && rf.flag_type.trim().length > 0
          ? rf.flag_type.trim()
          : `unknown_${idx}`;
      const rawSeverity = typeof rf.severity === "string" ? rf.severity : "MEDIUM";
      const severityUpper = rawSeverity.toUpperCase();
      const severity =
        severityUpper === "LOW" ||
        severityUpper === "MEDIUM" ||
        severityUpper === "HIGH" ||
        severityUpper === "CRITICAL"
          ? (severityUpper as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL")
          : ("MEDIUM" as const);

      return {
        id: rawType,
        caseId,
        severity,
        type: rawType as RiskFlag["type"],
        code: rawType.toUpperCase(),
        title: rawType.replace(/_/g, " "),
        message: typeof rf.description === "string" ? rf.description : "",
        source: "risk_detection",
        status: rf.resolved ? ("resolved" as const) : ("outstanding" as const),
        createdAt: new Date().toISOString(),
      };
    });

    const nextStep = calculateNextStep({
      caseId,
      practiceArea: caseData.practice_area ?? "other_litigation",
      riskFlags: convertedRiskFlags,
      missingEvidence: [],
      pendingChasers: [],
      hasRecentAttendanceNote: true,
      daysSinceLastUpdate: 7,
    });

    return nextStep?.title;
  } catch (err) {
    console.warn("[key-facts] next step generation failed (non-fatal):", err);
    return undefined;
  }
}

function getClientObjectives(
  caseData: { summary?: string; title: string },
  caseNotes: Array<{ body: string; is_attendance: boolean }>,
  piCase: { client_objectives?: string } | null,
): string | undefined {
  // First check for explicit client objectives
  if (piCase?.client_objectives) {
    return piCase.client_objectives;
  }

  // Try to find in first attendance note
  const attendanceNote = caseNotes.find(n => n.is_attendance);
  if (attendanceNote?.body) {
    // Look for explicit objectives pattern
    const objectivesMatch = attendanceNote.body.match(/(?:client wants?|objectives?|seeking|wishes? to)[:\s]+([^.]+)/i);
    if (objectivesMatch) {
      return objectivesMatch[1].trim();
    }
  }

  // Try to extract from case summary
  if (caseData.summary) {
    const summaryMatch = caseData.summary.match(/(?:client wants?|objectives?|seeking|wishes? to|claims? for)[:\s]+([^.]+)/i);
    if (summaryMatch) {
      return summaryMatch[1].trim();
    }
  }

  // TODO: Could use AI to summarize client objectives from notes
  return undefined;
}

function getApproxValue(
  piCase: { claim_value?: number; estimated_damages?: number } | null,
  housingCase: { estimated_damages?: number } | null,
): string | undefined {
  const value = piCase?.claim_value ?? piCase?.estimated_damages ?? housingCase?.estimated_damages;
  
  if (!value) return undefined;
  
  // Format as bracket
  if (value < 10000) return "Small claims (< £10k)";
  if (value < 25000) return "Fast track (£10k-£25k)";
  if (value < 100000) return "Multi-track (£25k-£100k)";
  return "High value (> £100k)";
}

function getClaimType(
  practiceArea: string | undefined,
  piCase: { claim_type?: string; liability_type?: string } | null,
  housingCase: { claim_type?: string } | null,
): string | undefined {
  if (piCase?.claim_type) return piCase.claim_type;
  if (piCase?.liability_type) return piCase.liability_type;
  if (housingCase?.claim_type) return housingCase.claim_type;
  
  // Fall back to practice area
  if (practiceArea === "pi" || practiceArea === "personal_injury") return "Personal Injury";
  if (practiceArea === "clinical_negligence") return "Clinical Negligence";
  if (practiceArea === "housing_disrepair") return "Housing Disrepair";
  if (practiceArea === "criminal") return "Criminal Defence";
  
  return undefined;
}

function getOpponentName(
  piCase: { defendant_name?: string; insurer_name?: string } | null,
  housingCase: { landlord_name?: string } | null,
): string | undefined {
  if (piCase?.defendant_name) return piCase.defendant_name;
  if (piCase?.insurer_name) return `${piCase.insurer_name} (Insurer)`;
  if (housingCase?.landlord_name) return housingCase.landlord_name;
  return undefined;
}

