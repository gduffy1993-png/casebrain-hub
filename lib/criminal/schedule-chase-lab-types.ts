/** Client-safe schedule chase lab types (no Node PDF reader). */

export const SCHEDULE_CHASE_UNSUPPORTED_REASON =
  "Schedule chase could not be read this way. Column-separated PDF text is required (original PDF path or supplied column pages). Flattened extract text is not enough. This is not proof that nothing is outstanding.";

/** Readable owned PDFs produced no recognised disclosure schedule rows. */
export const SCHEDULE_CHASE_NOT_ESTABLISHED_REASON =
  "A disclosure schedule was not established from the owned uploaded documents. This is not proof that nothing is outstanding.";

/** More than one owned PDF yielded schedule rows — most rows is not authority. */
export const SCHEDULE_CHASE_MULTIPLE_UNRESOLVED_REASON =
  "Multiple disclosure schedules were found in the owned uploaded documents. None is treated as sole authority. Source-linked observations are preserved below. This is not proof that nothing is outstanding.";

export type ScheduleChaseObservation = {
  documentId: string;
  documentName: string;
  page: number;
  reference: string;
  item: string;
  statusWord: string;
  side: "served" | "missing";
  line: string;
};

export type ScheduleChaseLabMeta = {
  enabled: true;
  /** False when the lab was requested but column-aware input was missing or unusable. */
  applied: boolean;
  unsupportedInput: boolean;
  unsupportedReason: string | null;
  /** True when PDFs were readable but no schedule rows were recognised. */
  scheduleNotEstablished: boolean;
  /** True when 2+ schedule-bearing uploads exist and no sole authority was chosen. */
  multipleSchedulesUnresolved: boolean;
  source: "column-pages" | "unit-pages" | "none";
  rowCount: number;
  missingCount: number;
  servedCount: number;
  sourceDocumentId: string | null;
  sourceDocumentName: string | null;
  scheduleDocuments: Array<{
    documentId: string;
    documentName: string;
    rowCount: number;
  }>;
  scheduleObservations: ScheduleChaseObservation[];
  conflicts: Array<{
    page: number;
    item: string;
    statusWord: string;
    line: string;
    scheduleLine: string;
  }>;
  uploadLimitations: Array<{
    page: number;
    reference: string;
    item: string;
    note: string;
    line: string;
  }>;
  cpsChaseHeld: true;
};

export function isScheduleChaseLabEnabled(explicit?: boolean): boolean {
  if (explicit === true) return true;
  if (explicit === false) return false;
  return process.env.CASEBRAIN_SCHEDULE_CHASE_LAB?.trim() === "1";
}
