import type { PracticeArea } from "@/lib/types/casebrain";

// Used for sanitizing rendered strategic text (panels/insight copy)
const CRIMINAL_FORBIDDEN_TEXT_TOKENS: RegExp[] = [
  /\bcfa\b/i,
  /conditional\s+fee/i,
  /\bretainer\b/i,
  /engagement\s+letter/i,
  /\bpart\s*36\b/i,
  /\bcalderbank\b/i,
  /\bpap\b/i,
  /pre-?action/i,
  /letter\s+before\s+action/i,
  /\blba\b/i,
  /schedule\s+of\s+loss/i,
  /\bquantum\b/i,
  /\bsettlement\b/i,
  /\bclaimant\b/i,
  /\bdefendant\s+admits\s+liability\b/i,
  /\bparticulars\s+of\s+claim\b/i,
  /client\s+identification\s*[^evidence]/i, // Client Identification (civil meaning), but allow "client identification evidence" for criminal
  /client\s+id\s*[^evidence]/i,
];

// Used for filtering evidence/risk/compliance "items" (ids/labels/descriptions),
// intentionally *not* banning words like "LIABILITY" because those appear as category labels.
const CRIMINAL_FORBIDDEN_ITEM_TOKENS: RegExp[] = [
  /\bcfa\b/i,
  /conditional\s+fee/i,
  /\bretainer\b/i,
  /engagement\s+letter/i,
  /\bpart\s*36\b/i,
  /\bcalderbank\b/i,
  /\bpap\b/i,
  /pre-?action/i,
  /letter\s+before\s+action/i,
  /\blba\b/i,
  /schedule\s+of\s+loss/i,
  /\bquantum\b/i,
  /client\s+identification\s*[^evidence]/i, // Client Identification (civil meaning), but allow "client identification evidence" for criminal
  /client\s+id\s*[^evidence]/i,
];

function normalizePracticeAreaString(practiceArea: string): PracticeArea | "unknown" {
  const pa = (practiceArea || "").toLowerCase();
  if (pa === "criminal") return "criminal";
  if (pa === "clinical_negligence") return "clinical_negligence";
  if (pa === "personal_injury") return "personal_injury";
  if (pa === "housing_disrepair") return "housing_disrepair";
  if (pa === "family") return "family";
  if (pa === "other_litigation") return "other_litigation";
  return "unknown";
}

export function isCivilOnlyTextForCriminal(text: string): boolean {
  const t = (text || "").trim();
  if (!t) return false;
  return CRIMINAL_FORBIDDEN_TEXT_TOKENS.some((re) => re.test(t));
}

export function sanitizeTextForPracticeArea(
  text: string | null | undefined,
  practiceArea: PracticeArea | string,
  opts?: { context?: string; log?: boolean },
): string | null {
  const pa = normalizePracticeAreaString(String(practiceArea));
  const raw = (text ?? "").trim();
  if (!raw) return null;
  if (pa !== "criminal") return raw;

  if (isCivilOnlyTextForCriminal(raw)) {
    if (opts?.log ?? true) {
      console.error("[criminal/purity] Stripped forbidden strategic text:", {
        context: opts?.context,
        preview: raw.slice(0, 140),
      });
    }
    return null;
  }

  return raw;
}

export function resolvePracticeAreaFromSignals(params: {
  storedPracticeArea?: string | null;
  hasCriminalSignals: boolean;
  context?: string;
}): PracticeArea {
  const normalizedMaybe = normalizePracticeAreaString(String(params.storedPracticeArea ?? ""));
  const normalized: PracticeArea =
    normalizedMaybe === "unknown" ? "other_litigation" : (normalizedMaybe as PracticeArea);

  if (params.hasCriminalSignals && normalized !== "criminal") {
    console.error("[practice-area] Criminal signals present but stored practice_area is not criminal:", {
      context: params.context,
      storedPracticeArea: params.storedPracticeArea,
    });
    return "criminal";
  }

  return normalized;
}

export function filterEvidenceForPracticeArea<
  T extends {
    id?: string;
    label?: string;
    title?: string;
    description?: string;
    category?: string;
  },
>(
  items: T[],
  practiceArea: PracticeArea | string,
  opts?: { context?: string; log?: boolean },
): T[] {
  const pa = normalizePracticeAreaString(String(practiceArea));
  if (pa !== "criminal") return items;

  const stripped: Array<{ id?: string; label?: string }> = [];

  const filtered = items.filter((item) => {
    const combined = [
      item.id,
      item.label,
      item.title,
      item.description,
    ]
      .filter(Boolean)
      .join(" | ");

    // Never show civil-only items on criminal cases.
    if (CRIMINAL_FORBIDDEN_ITEM_TOKENS.some((re) => re.test(combined))) {
      stripped.push({ id: item.id, label: item.label ?? item.title });
      return false;
    }

    // "Quantum" is a civil concept; suppress the whole category for criminal.
    if (String(item.category || "").toUpperCase() === "QUANTUM") {
      stripped.push({ id: item.id, label: item.label ?? item.title });
      return false;
    }

    return true;
  });

  if ((opts?.log ?? true) && stripped.length > 0) {
    console.error("[criminal/purity] Stripped civil-only items from criminal output:", {
      context: opts?.context,
      stripped: stripped.slice(0, 10),
      totalStripped: stripped.length,
    });
  }

  return filtered;
}


