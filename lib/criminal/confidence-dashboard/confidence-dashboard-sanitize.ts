const FORBIDDEN_RE =
  /\b(safe to send|guaranteed|case strong|case weak|case will win|case collapses|you will win|must be acquitted|defence succeeds)\b/i;

export function sanitizeDashboardLine(text: string): string | null {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t || t.length > 280) return null;
  if (FORBIDDEN_RE.test(t)) return null;
  return t;
}

export function dashboardSendabilityLabel(
  sendability: string,
  hasSourceSupport: boolean,
): string {
  if (!hasSourceSupport) {
    return "Provisional — check source before sending";
  }
  switch (sendability) {
    case "safe_to_send":
      return "Copy suggestion — solicitor review required";
    case "needs_solicitor_review":
      return "Solicitor review required";
    case "provisional_check_source":
      return "Provisional — check source before sending";
    case "blocked":
      return "Blocked pending review";
    default:
      return "Solicitor review required";
  }
}

/** Never mark copy-safe without source-state support. */
export function outputHasSourceSupport(
  sendability: string,
  sourceStateSupport: "present" | "partial" | "missing",
): boolean {
  if (sourceStateSupport === "missing") return false;
  if (sendability === "blocked") return false;
  return sourceStateSupport === "present" || sourceStateSupport === "partial";
}
