import { addDays, format, isSaturday, isSunday } from "date-fns";

const STATIC_BANK_HOLIDAYS = new Set([
  "2025-01-01",
  "2025-04-18",
  "2025-04-21",
  "2025-05-05",
  "2025-05-26",
  "2025-08-25",
  "2025-12-25",
  "2025-12-26",
]);

export function isHoliday(date: Date) {
  const key = format(date, "yyyy-MM-dd");
  return STATIC_BANK_HOLIDAYS.has(key);
}

export function isBusinessDay(date: Date) {
  return !isSaturday(date) && !isSunday(date) && !isHoliday(date);
}

export function addBusinessDays(base: Date, days: number) {
  let remaining = days;
  let current = new Date(base);

  while (remaining > 0) {
    current = addDays(current, 1);
    if (isBusinessDay(current)) {
      remaining -= 1;
    }
  }

  return current;
}

export type DeadlineCalculation = {
  dueDate: Date;
  businessDays: number;
  calendarDays: number;
  rule: string;
};

export function calculateDeadline(
  startDate: Date,
  businessDays: number,
  rule: string,
): DeadlineCalculation {
  const dueDate = addBusinessDays(startDate, businessDays);
  const calendarDays = Math.ceil(
    (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    dueDate,
    businessDays,
    calendarDays,
    rule,
  };
}

