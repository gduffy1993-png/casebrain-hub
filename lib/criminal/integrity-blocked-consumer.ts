/**
 * Consumer contract for typed integrity_blocked responses.
 * HTTP 200 + integrity_blocked must NEVER be treated as usable solicitor content.
 */

export type IntegrityBlockedBody = {
  ok: false;
  status: "integrity_blocked";
  surfaceId?: string;
  banner?: string | null;
  ruleIds?: string[];
  data: null;
  canCopy: false;
  reply?: null;
  error?: string;
};

export function isIntegrityBlockedPayload(body: unknown): body is IntegrityBlockedBody {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return b.status === "integrity_blocked" || (b.ok === false && b.error === "integrity_blocked");
}

/**
 * Returns true only when the payload is safe to display/copy/send/cache as a normal answer.
 */
export function canUseSolicitorApiResponse(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  if (isIntegrityBlockedPayload(body)) return false;
  const b = body as Record<string, unknown>;
  if (b.ok === false) return false;
  if (b.canCopy === false && b.status === "integrity_blocked") return false;
  return true;
}

/** Clipboard / send / cache guard. */
export function assertNotIntegrityBlockedForCopy(body: unknown): boolean {
  return canUseSolicitorApiResponse(body);
}

/**
 * Safe UI state when blocked — never expose blocked payload as content.
 */
export function solicitorUiStateFromApiBody(body: unknown): {
  usable: boolean;
  banner: string | null;
  canCopy: boolean;
} {
  if (isIntegrityBlockedPayload(body)) {
    return {
      usable: false,
      banner: body.banner ?? "Solicitor review required — output integrity check failed.",
      canCopy: false,
    };
  }
  if (!canUseSolicitorApiResponse(body)) {
    return {
      usable: false,
      banner: "Solicitor review required — output unavailable.",
      canCopy: false,
    };
  }
  return { usable: true, banner: null, canCopy: true };
}
