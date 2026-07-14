import {
  humanizeChaseFragmentLabel,
  isRawChaseFragmentLabel,
} from "@/lib/criminal/disclosure-chase-finalize";
import { formatDisplayLabelCasing } from "@/lib/criminal/bundle-truth-ledger";

const COURT_RECORD_RE =
  /^\s*(?:ask\s+the\s+court\s+to\s+record|the\s+defence\s+asks\s+the\s+court\s+to\s+record)\s+that\s+/i;

function normKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** H2 P2 — flatten nested court-record prefixes and raw MG6 fragments in Today/Summary lines. */
function normalizeClunkyCourtCore(core: string): string | null {
  const c = core.trim().replace(/\.$/, "");
  if (/^prepare hearing line on outstanding disclosure|^hearing line on outstanding disclosure/i.test(c)) {
    return "the defence position remains provisional pending service of the outstanding material";
  }
  if (/^ask for full mg11\/source material/i.test(c)) {
    return "full MG11/source material and unused schedule detail remain outstanding and should be disclosed on a timetable";
  }
  if (/^chase attribution material/i.test(c)) {
    return "attribution material, phone ownership, vehicle ownership, and role evidence remain outstanding and should be disclosed on a timetable";
  }
  return null;
}

export function sanitizePilotCourtRecordLine(line: string): string | null {
  let t = line.trim();
  if (!t) return null;

  t = t
    .replace(
      /^(?:Ask the court to record that\s+)+/i,
      "Ask the court to record that ",
    )
    .replace(/^Ask the court to record that ask for /i, "Ask the court to record that ")
    .replace(/\bremains outstanding and should be disclosed on a timetable\.?\s*$/i, "")
    .trim();

  // Fix garbled "…provisional pending service. remains outstanding…" hybrids.
  if (
    /defence position remains provisional pending service/i.test(t) &&
    !/\bremains outstanding\b/i.test(t)
  ) {
    return formatDisplayLabelCasing(
      "Ask the court to record that the defence position remains provisional pending service of the outstanding material.",
    );
  }

  if (/mg6c?\/\d+/i.test(t)) {
    const human = humanizeChaseFragmentLabel(t);
    if (!human || isRawChaseFragmentLabel(human)) return null;
    if (COURT_RECORD_RE.test(line)) {
      return formatDisplayLabelCasing(
        `Ask the court to record that ${human.charAt(0).toLowerCase()}${human.slice(1)} remains outstanding and should be disclosed on a timetable.`,
      );
    }
    return formatDisplayLabelCasing(human);
  }

  if (isRawChaseFragmentLabel(t)) {
    const human = humanizeChaseFragmentLabel(t);
    if (!human || isRawChaseFragmentLabel(human)) return null;
    if (COURT_RECORD_RE.test(line)) {
      return formatDisplayLabelCasing(
        `Ask the court to record that ${human.charAt(0).toLowerCase()}${human.slice(1)} remains outstanding and should be disclosed on a timetable.`,
      );
    }
    return formatDisplayLabelCasing(human);
  }

  if (COURT_RECORD_RE.test(t) && !/\bremains outstanding\b/i.test(t)) {
    const core = t.replace(COURT_RECORD_RE, "").trim();
    // Already a clean provisional-position ask — do not append "remains outstanding…".
    if (/defence position remains provisional pending service/i.test(core)) {
      return formatDisplayLabelCasing(
        "Ask the court to record that the defence position remains provisional pending service of the outstanding material.",
      );
    }
    const normalized = normalizeClunkyCourtCore(core);
    if (normalized) {
      if (/defence position remains provisional pending service/i.test(normalized)) {
        return formatDisplayLabelCasing(
          "Ask the court to record that the defence position remains provisional pending service of the outstanding material.",
        );
      }
      return formatDisplayLabelCasing(
        `Ask the court to record that ${normalized}.`,
      );
    }
    if (core) {
      return formatDisplayLabelCasing(
        `Ask the court to record that ${core.charAt(0).toLowerCase()}${core.slice(1)} remains outstanding and should be disclosed on a timetable.`,
      );
    }
  }

  if (!COURT_RECORD_RE.test(t)) {
    const normalized = normalizeClunkyCourtCore(t);
    if (normalized) {
      return formatDisplayLabelCasing(
        `Ask the court to record that ${normalized}.`,
      );
    }
  }

  return formatDisplayLabelCasing(t);
}

/** Dedupe near-identical court-record lines across Today and Summary. */
export function dedupePilotCourtRecordLines(lines: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of lines) {
    const cleaned = sanitizePilotCourtRecordLine(raw);
    if (!cleaned) continue;
    const key = normKey(cleaned);
    if (!key || seen.has(key)) continue;

    const subsetDup = out.some((existing) => {
      const ek = normKey(existing);
      if (ek === key) return true;
      const shorter = ek.length < key.length ? ek : key;
      const longer = ek.length < key.length ? key : ek;
      return shorter.length >= 24 && longer.includes(shorter);
    });
    if (subsetDup) continue;

    seen.add(key);
    out.push(cleaned);
  }

  return out;
}
