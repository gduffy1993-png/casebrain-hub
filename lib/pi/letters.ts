import { differenceInCalendarDays, format } from "date-fns";
import type { PiCaseRecord, PiDisbursement } from "@/types";

export type PiLetterContext = {
  caseTitle: string;
  clientName?: string | null;
  clientFirstName?: string | null;
  defendantName?: string | null;
  piCase?: PiCaseRecord | null;
  disbursements?: PiDisbursement[];
  generalDamagesRange?: { min?: number | null; max?: number | null };
};

export type PiLetterPlaceholder = {
  token: string;
  description: string;
  sample?: string;
};

export const PI_LETTER_PLACEHOLDERS: PiLetterPlaceholder[] = [
  { token: "case_title", description: "Full case title", sample: "Matthews v Logistics Ltd" },
  { token: "client_name", description: "Client full name", sample: "Claire Matthews" },
  { token: "client_first_name", description: "Client first name", sample: "Claire" },
  { token: "client_dob", description: "Client date of birth", sample: "14/02/1990" },
  { token: "defendant_name", description: "Defendant/opponent name", sample: "Logistics Ltd" },
  { token: "accident_date", description: "Accident date (short)", sample: "12/08/2024" },
  { token: "accident_date_long", description: "Accident date (long)", sample: "12 August 2024" },
  { token: "date_of_knowledge", description: "Date of knowledge", sample: "01/09/2024" },
  { token: "limitation_date", description: "Limitation date", sample: "11/08/2027" },
  {
    token: "limitation_days_remaining",
    description: "Days remaining until limitation (negative if expired)",
    sample: "182",
  },
  { token: "injury_description", description: "Injury description", sample: "Whiplash and LBP" },
  {
    token: "injury_severity",
    description: "Severity rating (capitalised)",
    sample: "Medium",
  },
  { token: "employment_status", description: "Employment status note", sample: "Employed FT" },
  { token: "loss_of_earnings", description: "Loss of earnings estimate", sample: "£12,000" },
  { token: "special_damages", description: "Special damages estimate", sample: "£4,500" },
  { token: "disbursement_total", description: "Total recorded disbursements", sample: "£1,850" },
  { token: "case_stage", description: "Current PI stage", sample: "Investigation" },
  { token: "general_damages_min", description: "General damages minimum", sample: "£10,000" },
  { token: "general_damages_max", description: "General damages maximum", sample: "£13,500" },
  { token: "general_damages_mid", description: "General damages midpoint", sample: "£11,750" },
  { token: "liability_stance", description: "Recorded liability stance", sample: "Liability admitted" },
  { token: "today", description: "Today's date", sample: "11 November 2025" },
];

export function buildPiPlaceholderMap(context: PiLetterContext): Record<string, string> {
  const piCase = context.piCase ?? null;
  const accidentDate = piCase?.accident_date ? new Date(piCase.accident_date) : null;
  const knowledgeDate = piCase?.date_of_knowledge ? new Date(piCase.date_of_knowledge) : null;
  const limitationDate = piCase?.limitation_date ? new Date(piCase.limitation_date) : null;

  const disbursementTotal = (context.disbursements ?? []).reduce((sum, entry) => {
    return sum + (entry.amount ?? 0);
  }, 0);

  const generalMin =
    context.generalDamagesRange?.min ?? context.piCase?.general_damages_band?.split("-")[0];
  const generalMax =
    context.generalDamagesRange?.max ?? context.piCase?.general_damages_band?.split("-")[1];

  const generalMinNum =
    typeof generalMin === "number" ? generalMin : generalMin ? Number(generalMin) : null;
  const generalMaxNum =
    typeof generalMax === "number" ? generalMax : generalMax ? Number(generalMax) : null;

  let generalMid: number | null = null;
  if (generalMinNum != null && generalMaxNum != null) {
    generalMid = (generalMinNum + generalMaxNum) / 2;
  }

  const today = new Date();
  const limitationDays =
    limitationDate != null ? differenceInCalendarDays(limitationDate, today) : null;

  return {
    case_title: context.caseTitle ?? "",
    client_name: context.clientName ?? "",
    client_first_name: context.clientFirstName ?? (context.clientName?.split(" ")[0] ?? ""),
    client_dob: formatDate(context.piCase?.client_dob ? new Date(context.piCase.client_dob) : null, "dd/MM/yyyy"),
    defendant_name: context.defendantName ?? "",
    accident_date: formatDate(accidentDate, "dd/MM/yyyy"),
    accident_date_long: formatDate(accidentDate, "d MMMM yyyy"),
    date_of_knowledge: formatDate(knowledgeDate, "dd/MM/yyyy"),
    limitation_date: formatDate(limitationDate, "dd/MM/yyyy"),
    limitation_days_remaining: limitationDays != null ? String(limitationDays) : "",
    injury_description: piCase?.injury_description ?? "",
    injury_severity: capitalise(piCase?.injury_severity),
    employment_status: piCase?.employment_status ?? "",
    loss_of_earnings: formatCurrency(piCase?.loss_of_earnings_estimate),
    special_damages: formatCurrency(piCase?.special_damages_estimate),
    disbursement_total: formatCurrency(disbursementTotal),
    case_stage: capitalise(piCase?.stage ?? ""),
    liability_stance: piCase?.liability_stance ?? "",
    general_damages_min: formatCurrency(generalMinNum),
    general_damages_max: formatCurrency(generalMaxNum),
    general_damages_mid: formatCurrency(generalMid),
    today: format(today, "d MMMM yyyy"),
  };
}

export function renderPiLetterTemplate(templateBody: string, context: PiLetterContext): string {
  const map = buildPiPlaceholderMap(context);

  return templateBody.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, token) => {
    const key = token.trim();
    const value = map[key as keyof typeof map];
    if (value == null || value === "") {
      return "";
    }
    return value;
  });
}

function formatDate(date: Date | null, pattern: string) {
  if (!date || Number.isNaN(date.getTime())) {
    return "";
  }
  return format(date, pattern);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return "";
  }
  return `£${Number(value).toLocaleString("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function capitalise(value: string | null | undefined) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}


