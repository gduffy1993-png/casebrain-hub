import { isAfter, isBefore } from "date-fns";

export type LimitationInput = {
  accidentDate?: Date | null;
  dateOfKnowledge?: Date | null;
  clientDob?: Date | null;
};

export type LimitationResult = {
  limitationDate: Date | null;
  reason: string;
  isMinorAtAccident: boolean;
};

const THREE_YEARS_IN_MS = 1000 * 60 * 60 * 24 * 365.25 * 3;

export function calculateLimitation({
  accidentDate,
  dateOfKnowledge,
  clientDob,
}: LimitationInput): LimitationResult {
  const cleanedAccident = accidentDate ?? null;
  const cleanedKnowledge = dateOfKnowledge ?? null;
  const cleanedDob = clientDob ?? null;

  if (!cleanedAccident && !cleanedKnowledge) {
    return {
      limitationDate: null,
      reason: "Limitation not calculated – accident date or date of knowledge required.",
      isMinorAtAccident: false,
    };
  }

  const baseDate = resolveBaseDate(cleanedAccident, cleanedKnowledge);
  const isMinor = cleanedDob
    ? isBefore(cleanedAccident ?? cleanedKnowledge ?? cleanedDob, addYears(cleanedDob, 18))
    : false;

  let limitationDate: Date | null = null;
  let reason = "";

  if (isMinor && cleanedDob) {
    const majorityDate = addYears(cleanedDob, 18);
    limitationDate = addYears(majorityDate, 3);
    reason =
      "Client was a minor at the date of accident. Limitation calculated as 3 years from majority.";
  } else if (baseDate) {
    limitationDate = addYears(baseDate, 3);
    reason =
      cleanedKnowledge && isAfter(cleanedKnowledge, cleanedAccident ?? cleanedKnowledge)
        ? "Limitation calculated as 3 years from date of knowledge."
        : "Limitation calculated as 3 years from accident date.";
  }

  if (!limitationDate) {
    return {
      limitationDate: null,
      reason: "Limitation not calculated – insufficient date information.",
      isMinorAtAccident: isMinor,
    };
  }

  return {
    limitationDate,
    reason,
    isMinorAtAccident: isMinor,
  };
}

function resolveBaseDate(accidentDate?: Date | null, dateOfKnowledge?: Date | null) {
  if (accidentDate && dateOfKnowledge) {
    return isAfter(dateOfKnowledge, accidentDate) ? dateOfKnowledge : accidentDate;
  }
  return accidentDate ?? dateOfKnowledge ?? null;
}

function addYears(date: Date, years: number) {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + years);
  return copy;
}

export function isLimitationApproaching(limitationDate: Date | null, months = 6) {
  if (!limitationDate) return false;
  const now = new Date();
  if (isBefore(limitationDate, now)) return true;
  const threshold = new Date(now.getTime() + (THREE_YEARS_IN_MS / 36) * months);
  return isBefore(limitationDate, threshold);
}

