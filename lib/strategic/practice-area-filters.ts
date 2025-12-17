import type { PracticeArea } from "@/lib/types/casebrain";

const CIVIL_ONLY_TERMS_FOR_CRIMINAL: RegExp[] = [
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
  /\bliability\b/i,
  /\bclaimant\b/i,
  /\bdefendant\b/i,
  /\bparticulars\s+of\s+claim\b/i,
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
  return CIVIL_ONLY_TERMS_FOR_CRIMINAL.some((re) => re.test(t));
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
      item.category,
    ]
      .filter(Boolean)
      .join(" | ");

    // Never show civil-only items on criminal cases.
    if (isCivilOnlyTextForCriminal(combined)) {
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


