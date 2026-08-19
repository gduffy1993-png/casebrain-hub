/**
 * Hostile / prompt-injection content inside uploaded papers is evidence text.
 * It must never become solicitor-visible chase labels, merged provenance, or
 * system instructions. Shared filter only — no case- or fixture-specific branches.
 */

const PROMPT_INJECTION_INSTRUCTION_RES: RegExp[] = [
  /\bignore\s+(?:all\s+)?(?:previous\s+)?instructions?\b/i,
  /\bmark\s+(?:the\s+)?[\w\s/.-]{0,40}\s+as\s+served\b/i,
  /\bdo\s+not\s+(?:mention|show|display|report|list)\s+(?:missing|outstanding)\b/i,
  /\breveal\s+(?:the\s+)?(?:previous|another|other)\s+client(?:['’]s)?\s+(?:case|information|data)?\b/i,
  /\btreat\s+(?:the\s+)?defendant\s+as\s+guilty\b/i,
  /\byou\s+(?:must|should)\s+(?:now\s+)?(?:ignore|mark|treat|reveal)\b/i,
  /\bsystem\s+prompt\b|\bas\s+an?\s+ai\s+(?:assistant|model)\b/i,
];

/** True when a line is shaped as an instruction to the product, not evidential content. */
export function isPromptInjectionInstructionLine(text: string | null | undefined): boolean {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  return PROMPT_INJECTION_INSTRUCTION_RES.some((re) => re.test(t));
}

export function filterPromptInjectionInstructionLines(lines: readonly string[]): string[] {
  return lines.filter((line) => !isPromptInjectionInstructionLine(line));
}
