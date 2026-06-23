import type { BundleContradiction, BundleContradictionType } from "./extract-bundle-contradictions";

export type BundleContradictionAction = {
  type: BundleContradictionType;
  label: string;
  todayCourtLine: string;
  chaseAsk: string;
  draftChaseWording: string;
  summaryRisk: string;
  clientSafeLine: string;
};

type ActionTemplate = {
  label: string;
  today: string;
  chase: string;
  draft: string;
  risk: string;
  client: string;
};

const TEMPLATES: Record<BundleContradictionType, ActionTemplate> = {
  location: {
    label: "Location inconsistency",
    today: "The defence asks the court to record that location remains unresolved on the current papers and the position is provisional pending source material.",
    chase: "BWV, scene photographs, CAD/999 and any location-linked witness material",
    draft: "Please provide BWV, scene photographs, CAD/999 material and any witness material needed to reconcile the location inconsistency.",
    risk: "Location differs across the papers, so sequence, causation and reliability should not be fixed until the source material is reconciled.",
    client: "The papers describe the incident location differently, so we need to check the source material before treating that point as settled.",
  },
  first_contact: {
    label: "First-contact inconsistency",
    today: "The defence asks the court to record that first contact remains disputed on the papers and the position is provisional pending BWV and 999 material.",
    chase: "BWV, 999 audio, CAD log and any first-account material",
    draft: "Please provide BWV, 999 audio, CAD log and any first-account material needed to reconcile who acted first.",
    risk: "First contact is not safely fixed on the papers, so any account of initiation remains provisional.",
    client: "The papers do not yet give one settled account of who acted first.",
  },
  loss_figure: {
    label: "Loss-figure inconsistency",
    today: "The defence asks the court to record that the alleged loss figure remains unreconciled and the position is provisional pending accounting material.",
    chase: "Full loss schedule, source accounting records, receipts, refunds and reconciliation notes",
    draft: "Please provide the full loss schedule, source accounting records, receipts, refunds and reconciliation notes explaining the figures relied upon.",
    risk: "Loss is not safely quantified until the source figures and reconciliation are served.",
    client: "The loss figures do not fully match yet, so we need the underlying records before that point is settled.",
  },
  cctv_window: {
    label: "CCTV-window inconsistency",
    today: "The defence asks the court to record that CCTV coverage does not yet safely cover the charge window and the position is provisional.",
    chase: "Full CCTV export for the charge period, continuity, viewing logs and clock-sync material",
    draft: "Please provide the full CCTV export for the charge period, continuity material, viewing logs and any clock-sync material.",
    risk: "CCTV coverage may not match the full charge window, so timing and continuity remain unresolved.",
    client: "The CCTV served so far may not cover the whole period alleged.",
  },
  sequence_order: {
    label: "Sequence-order inconsistency",
    today: "The defence asks the court to record that incident sequence remains unresolved and the position is provisional pending BWV, 999 and first-account material.",
    chase: "BWV, 999 audio, CAD chronology and first-account witness material",
    draft: "Please provide BWV, 999 audio, CAD chronology and first-account witness material needed to reconcile the incident sequence.",
    risk: "Sequence is not safely fixed, so reconstruction and any positive case theory must remain provisional.",
    client: "The order of events is described differently in the papers.",
  },
  sequence_timeline: {
    label: "Timeline-scope inconsistency",
    today: "The defence asks the court to record that timeline scope remains unresolved because the charge period and served narrative do not yet align.",
    chase: "Full timeline schedule, CCTV/export coverage, transaction or incident chronology and continuity material",
    draft: "Please provide the full timeline schedule, CCTV/export coverage, transaction or incident chronology and continuity material for the whole charge period.",
    risk: "The served narrative may not cover the full charge period, so timeline scope and continuity remain unresolved.",
    client: "The charge covers a wider timeline than the material served so far appears to explain.",
  },
  scope_multi_vs_single: {
    label: "Multi-vs-single scope inconsistency",
    today: "The defence asks the court to record that allegation scope remains unresolved because the papers refer to multiple matters but the served narrative appears narrower.",
    chase: "Particulars schedule, transaction or incident list, MG5 linkage and supporting source records",
    draft: "Please provide the particulars schedule, transaction or incident list, MG5 linkage and supporting source records explaining each alleged matter.",
    risk: "Allegation scope is not safely reconciled, so particulars and linkage remain open.",
    client: "The papers may be treating the case as wider than the served summary currently explains.",
  },
  scope_indictment_count: {
    label: "Count-scope inconsistency",
    today: "The defence asks the court to record that count linkage remains unresolved and particulars should be clarified before issues are fixed.",
    chase: "Count-by-count particulars, MG5 linkage, witness linkage and exhibit mapping",
    draft: "Please provide count-by-count particulars, MG5 linkage, witness linkage and exhibit mapping for each count relied upon.",
    risk: "Multiple counts may not be safely linked to the served narrative until particulars and exhibits are reconciled.",
    client: "There may be more counts on the charge than the current summary clearly explains.",
  },
  strength_serious_vs_minor: {
    label: "Injury-strength inconsistency",
    today: "The defence asks the court to record that injury strength remains unresolved pending full medical material and source records.",
    chase: "Full medical records, injury photographs, body maps, imaging and continuity material",
    draft: "Please provide full medical records, injury photographs, body maps, imaging and continuity material so injury strength can be reconciled.",
    risk: "Injury seriousness is not safely fixed where serious harm is alleged but served material describes lower injury.",
    client: "The papers may describe the injury more seriously in one place than in the source material served so far.",
  },
  strength_force_vs_cctv: {
    label: "Force-vs-CCTV inconsistency",
    today: "The defence asks the court to record that force and mechanism remain unresolved pending full CCTV export and continuity.",
    chase: "Full CCTV export, continuity, viewing logs, stills and any engineer or redaction notes",
    draft: "Please provide the full CCTV export, continuity, viewing logs, stills and any engineer or redaction notes relevant to contact or force.",
    risk: "Force or weapon use is not safely fixed if the served CCTV note describes limited contact.",
    client: "What is alleged about force does not yet fully match the CCTV note served so far.",
  },
  multi_incident_dates: {
    label: "Multi-date inconsistency",
    today: "The defence asks the court to record that incident dates and linkage remain unresolved pending particulars and source material.",
    chase: "Date-by-date particulars, MG5 linkage, witness statements and continuity material",
    draft: "Please provide date-by-date particulars, MG5 linkage, witness statements and continuity material for each alleged incident date.",
    risk: "Multiple alleged dates are not safely linked to the served narrative until particulars and source material are reconciled.",
    client: "More than one date is being referred to, but the current summary may only explain one incident.",
  },
  multi_incident_complainants: {
    label: "Complainant-scope inconsistency",
    today: "The defence asks the court to record that complainant linkage remains unresolved pending full witness and particulars material.",
    chase: "Full MG11 set, complainant schedule, particulars linkage and MG6 witness schedule",
    draft: "Please provide the full MG11 set, complainant schedule, particulars linkage and MG6 witness schedule for each complainant relied upon.",
    risk: "Complainant scope is not safely fixed until all witness material and particulars are reconciled.",
    client: "The papers may refer to more than one complainant, but the served statements may not yet explain that clearly.",
  },
  triangulation_mg11_cctv: {
    label: "MG11-vs-CCTV inconsistency",
    today: "The defence asks the court to record that witness account and CCTV do not yet safely reconcile and the position is provisional.",
    chase: "Full CCTV export, continuity, viewing logs, clock-sync material and any relevant MG11 clarifications",
    draft: "Please provide the full CCTV export, continuity, viewing logs, clock-sync material and any material needed to reconcile the MG11 account with CCTV.",
    risk: "Witness account and CCTV may not align, so reconstruction should remain provisional until full footage and continuity are served.",
    client: "What a witness says happened does not yet fully match the CCTV material served so far.",
  },
  triangulation_dispatch_scene: {
    label: "Dispatch-vs-scene inconsistency",
    today: "The defence asks the court to record that CAD/999 and scene account remain unreconciled pending full call and dispatch material.",
    chase: "Full CAD log, 999 audio, dispatch notes, BWV and officer first accounts",
    draft: "Please provide the full CAD log, 999 audio, dispatch notes, BWV and officer first accounts needed to reconcile dispatch with the scene account.",
    risk: "The initial dispatch record may not match the later scene account, so chronology and seriousness remain provisional.",
    client: "The first call or dispatch record may sound different from the later witness account.",
  },
  triangulation_bwv_account: {
    label: "BWV-vs-account inconsistency",
    today: "The defence asks the court to record that BWV observations and the witness account remain unreconciled pending full BWV export.",
    chase: "Full BWV export, continuity, redaction log, officer statements and any injury photographs",
    draft: "Please provide the full BWV export, continuity, redaction log, officer statements and any injury photographs needed to reconcile BWV with the witness account.",
    risk: "BWV observations may not align with the witness account, so injury and scene reconstruction remain provisional.",
    client: "The officer body-worn video notes may not fully match the complainant account.",
  },
};

function valueLabel(c: BundleContradiction): string {
  const values = c.values.map((v) => v.trim()).filter(Boolean);
  if (values.length < 2) return "";
  return ` (${values.slice(0, 2).join(" vs ")})`;
}

function dedupeByType(contradictions: BundleContradiction[]): BundleContradiction[] {
  const seen = new Set<BundleContradictionType>();
  const out: BundleContradiction[] = [];
  for (const c of contradictions) {
    if (seen.has(c.type)) continue;
    seen.add(c.type);
    out.push(c);
  }
  return out;
}

export function buildContradictionActions(
  contradictions: BundleContradiction[] | null | undefined,
): BundleContradictionAction[] {
  return dedupeByType(contradictions ?? []).map((c) => {
    const template = TEMPLATES[c.type];
    const values = valueLabel(c);
    return {
      type: c.type,
      label: `${template.label}${values}`,
      todayCourtLine: template.today,
      chaseAsk: template.chase,
      draftChaseWording: template.draft,
      summaryRisk: template.risk,
      clientSafeLine: template.client,
    };
  });
}
