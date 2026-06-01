"use client";

import { CASE_FILES_HASH } from "./focusCaseDocuments";

/** @deprecated Use {@link usePilotDocumentsTabActive} from useCaseWorkflowActiveTab. */
export { usePilotDocumentsTabActive as useCaseFilesDocumentsFocus } from "./useCaseWorkflowActiveTab";

export function isCaseFilesDocumentsHash(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hash === CASE_FILES_HASH;
}
