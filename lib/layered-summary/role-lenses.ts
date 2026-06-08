import type { PracticeArea } from "@/lib/types/casebrain";
import type { DomainSummary, DomainKey, RoleLens, CaseSolicitorRole } from "./types";
import { CASE_SOLICITOR_ROLES } from "./types";
import { uniq } from "./util";

type RoleLensContext = {
  practiceArea: PracticeArea;
  isLargeBundleMode: boolean;
  keyDates: Array<{ label: string; date: string; isUrgent?: boolean }>;
  mainRisks: string[];
};

function topDomainsForRole(role: CaseSolicitorRole, domains: DomainSummary[]): DomainKey[] {
  const ordered = domains
    .slice()
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .map((d) => d.domain);

  // role weighting (no re-extraction; just prioritisation)
  const preferred: DomainKey[] =
    role === "criminal_solicitor"
      ? ["disclosure_integrity", "police_procedural", "incident_accident", "expert_opinion", "damages_impact", "hospital_medical"]
      : role === "clinical_neg_solicitor"
        ? ["hospital_medical", "expert_opinion", "incident_accident", "damages_impact", "disclosure_integrity", "police_procedural"]
        : role === "pi_solicitor"
          ? ["incident_accident", "hospital_medical", "damages_impact", "expert_opinion", "disclosure_integrity", "police_procedural"]
          : role === "housing_solicitor"
            ? ["incident_accident", "damages_impact", "disclosure_integrity", "expert_opinion", "hospital_medical", "police_procedural"]
            : role === "family_solicitor"
              ? ["incident_accident", "disclosure_integrity", "police_procedural", "damages_impact", "expert_opinion", "hospital_medical"]
              : ["incident_accident", "disclosure_integrity", "expert_opinion", "hospital_medical", "damages_impact", "police_procedural"];

  const merged = uniq([...preferred, ...ordered]).filter((d) => ordered.includes(d));
  return merged.slice(0, 3);
}

function primaryRiskFromDomains(domains: DomainSummary[], topDomains: DomainKey[], mainRisks: string[]): string {
  // Prefer explicit contradictions/gaps in top domains; fallback to existing mainRisks; else safe statement.
  for (const d of topDomains) {
    const domain = domains.find((x) => x.domain === d);
    if (!domain) continue;
    const gap = domain.contradictionsOrUncertainties[0];
    if (gap) return gap;
    const missing = domain.missingEvidence[0]?.label;
    if (missing) return `Missing evidence: ${missing}`;
  }
  if (mainRisks.length > 0) return mainRisks[0];
  return "Insufficient structured data to identify a clear primary risk yet (treat bundle coverage as incomplete until core documents are confirmed).";
}

function recommendedNextMove(domains: DomainSummary[], topDomains: DomainKey[]): string {
  // Choose most leverageable missing evidence from the top domains; else ask for confirming document type.
  for (const d of topDomains) {
    const domain = domains.find((x) => x.domain === d);
    const missing = domain?.missingEvidence?.[0];
    if (missing?.label) {
      return `Obtain / chase: ${missing.label}${missing.notes ? ` — ${missing.notes}` : ""}`;
    }
  }
  // fallback
  return "Confirm bundle completeness: identify what is missing for the leading domain(s) and request those items before committing to a fixed narrative.";
}

function whatMattersMost(domains: DomainSummary[], topDomains: DomainKey[], isLargeBundleMode: boolean): string[] {
  const bullets: string[] = [];
  for (const d of topDomains) {
    const domain = domains.find((x) => x.domain === d);
    if (!domain) continue;
    const headline = domain.keyFacts[0] || domain.helpsHurts[0] || domain.title;
    bullets.push(`${domain.title}: ${headline}`);
  }
  return isLargeBundleMode ? bullets.slice(0, 3) : bullets.slice(0, 2);
}

function supervisorAddendum(domains: DomainSummary[], ctx: RoleLensContext): RoleLens["supervisorAddendum"] {
  const topRisks = uniq([
    ...ctx.mainRisks.slice(0, 3),
    ...domains.flatMap((d) => d.contradictionsOrUncertainties.slice(0, 1)),
  ]).slice(0, 5);

  const upcomingDeadlines = ctx.keyDates
    .filter((d) => d && typeof d.date === "string")
    .filter((d) => d.isUrgent || new Date(d.date).getTime() - Date.now() <= 14 * 24 * 60 * 60 * 1000)
    .slice(0, 5)
    .map((d) => `${d.label}: ${new Date(d.date).toISOString().slice(0, 10)}`);

  const spendGuardrails = uniq([
    "Do not instruct experts until the core evidence set for the top 1–2 domains is confirmed present (or formally requested).",
    "If disclosure/continuity gaps exist, press for production/metadata first; avoid expensive steps that can be undermined by missing material.",
  ]);

  const escalationTriggers = uniq(
    domains
      .flatMap((d) => d.missingEvidence)
      .filter((m) => m.priority === "CRITICAL" || m.priority === "HIGH")
      .slice(0, 3)
      .map((m) => `If still missing after chase(s), escalate on: ${m.label}`)
  );

  return {
    topRisks,
    upcomingDeadlines,
    spendGuardrails,
    escalationTriggers,
  };
}

export function buildRoleLenses(input: {
  domains: DomainSummary[];
  context: RoleLensContext;
}): Record<CaseSolicitorRole, RoleLens> {
  const out = {} as Record<CaseSolicitorRole, RoleLens>;

  for (const role of CASE_SOLICITOR_ROLES) {
    const topDomains = topDomainsForRole(role, input.domains);
    const lens: RoleLens = {
      role,
      title:
        role === "criminal_solicitor"
          ? "Criminal Defence Lens"
          : role === "clinical_neg_solicitor"
            ? "Clinical Neg Lens"
            : role === "pi_solicitor"
              ? "PI Lens"
              : role === "housing_solicitor"
                ? "Housing Lens"
                : role === "family_solicitor"
                  ? "Family Lens"
                  : "General Litigation Lens",
      topDomains,
      whatMattersMost: whatMattersMost(input.domains, topDomains, input.context.isLargeBundleMode),
      primaryRisk: primaryRiskFromDomains(input.domains, topDomains, input.context.mainRisks),
      recommendedNextMove: recommendedNextMove(input.domains, topDomains),
      supervisorAddendum: supervisorAddendum(input.domains, input.context),
    };
    out[role] = lens;
  }

  return out;
}


