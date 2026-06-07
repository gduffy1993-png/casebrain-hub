import { postSupervisorSignoffToApi } from "./supervisor-signoff-api-client";
import { buildSupervisorSignoffRecord } from "./build-supervisor-signoff-record";
import { signoffRecordContainsForbiddenContent } from "./supervisor-signoff-sanitize";
import type {
  BuildSupervisorSignoffInput,
  SupervisorSignoffRecord,
} from "./supervisor-signoff-types";
import { SUPERVISOR_SIGNOFF_STORAGE_KEY } from "./supervisor-signoff-types";

export type SaveSupervisorSignoffResult = {
  record: SupervisorSignoffRecord;
  persisted: boolean;
};

const MAX_STORED_RECORDS = 200;

function readAllRaw(): SupervisorSignoffRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SUPERVISOR_SIGNOFF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is SupervisorSignoffRecord =>
        typeof r === "object" &&
        r !== null &&
        typeof (r as SupervisorSignoffRecord).caseId === "string" &&
        typeof (r as SupervisorSignoffRecord).status === "string",
    );
  } catch {
    return [];
  }
}

function writeAll(records: SupervisorSignoffRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = records.slice(-MAX_STORED_RECORDS);
    window.localStorage.setItem(SUPERVISOR_SIGNOFF_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* quota / privacy mode */
  }
}

function appendLocalRecord(record: SupervisorSignoffRecord): void {
  writeAll([...readAllRaw(), record]);
}

export function saveSupervisorSignoffLocal(input: BuildSupervisorSignoffInput): SupervisorSignoffRecord {
  const record = buildSupervisorSignoffRecord(input);
  if (signoffRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    throw new Error("Sign-off record rejected — forbidden content pattern");
  }
  appendLocalRecord(record);
  return record;
}

export async function saveSupervisorSignoff(
  input: BuildSupervisorSignoffInput,
  options?: { persistenceEnabled?: boolean },
): Promise<SaveSupervisorSignoffResult> {
  const record = buildSupervisorSignoffRecord(input);
  if (signoffRecordContainsForbiddenContent(record as unknown as Record<string, unknown>)) {
    throw new Error("Sign-off record rejected — forbidden content pattern");
  }

  if (options?.persistenceEnabled) {
    const apiResult = await postSupervisorSignoffToApi(input.caseId, input);
    if (apiResult.ok) {
      appendLocalRecord(apiResult.record);
      return { record: apiResult.record, persisted: true };
    }
  }

  appendLocalRecord(record);
  return { record, persisted: false };
}

export function listSupervisorSignoffsForCase(caseId: string): SupervisorSignoffRecord[] {
  return readAllRaw().filter((r) => r.caseId === caseId);
}

export function getLatestSupervisorSignoffForCase(caseId: string): SupervisorSignoffRecord | null {
  const list = listSupervisorSignoffsForCase(caseId);
  if (!list.length) return null;
  return list.reduce((latest, r) =>
    r.createdAt >= latest.createdAt ? r : latest,
  );
}

export function clearSupervisorSignoffsLocal(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SUPERVISOR_SIGNOFF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
