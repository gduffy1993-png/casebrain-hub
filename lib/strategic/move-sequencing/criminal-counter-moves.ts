import type { Move } from "./types";
import type { EvidenceMap } from "../evidence-maps/types";

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreMatch(moveText: string, label: string): number {
  const m = normalizeText(moveText);
  const words = normalizeText(label)
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length >= 4);
  if (words.length === 0) return 0;
  let hit = 0;
  for (const w of words) {
    if (m.includes(w)) hit += 1;
  }
  return hit / Math.min(words.length, 6);
}

function pickFailureMode(modes: string[] | undefined): string {
  const m = (modes ?? []).map((x) => x.toLowerCase());
  if (m.some((x) => x.includes("late"))) return "Late production / timetable drift";
  if (m.some((x) => x.includes("partial"))) return "Partial production (clip-only / pages missing)";
  if (m.some((x) => x.includes("wrong"))) return "Wrong time window / wrong exhibit / wrong call";
  if (m.some((x) => x.includes("lost") || x.includes("missing"))) return "Asserted missing/lost material";
  if (m.some((x) => x.includes("redact"))) return "Over-redaction / unexplained redactions";
  return "Generic disclosure delay / incomplete response";
}

function likelyCpsResponseFromFailurePattern(pattern: string): string {
  switch (pattern) {
    case "Late production / timetable drift":
      return "CPS/disclosure officer: ‘Ongoing enquiries / material not yet processed; will be served in due course.’";
    case "Partial production (clip-only / pages missing)":
      return "CPS/disclosure officer: ‘We have served what we rely on; further material is unused/irrelevant or will follow.’";
    case "Wrong time window / wrong exhibit / wrong call":
      return "CPS/disclosure officer: ‘Served what was available; time window/format will be checked.’";
    case "Asserted missing/lost material":
      return "CPS/disclosure officer: ‘Material no longer available / not downloaded / overwritten / cannot be retrieved.’";
    case "Over-redaction / unexplained redactions":
      return "CPS/disclosure officer: ‘Redactions are necessary for third-party/privacy; full versions not disclosable.’";
    default:
      return "CPS/disclosure officer: ‘We’ll respond / provide what we can; relevance and timetable to be confirmed.’";
  }
}

function lawfulNextReplyFor(pattern: string, itemLabel?: string): string {
  const subject = itemLabel ? `(${itemLabel}) ` : "";
  if (pattern === "Partial production (clip-only / pages missing)" || pattern === "Wrong time window / wrong exhibit / wrong call") {
    return `Ask for native/original export + metadata ${subject}and written confirmation of full time window, continuity, and what has been withheld or does not exist. If still unresolved, seek disclosure directions/order.`;
  }
  if (pattern === "Asserted missing/lost material") {
    return `Ask for a formal explanation ${subject}(when created, retention policy, download/handling logs, who last had it) and consider case management directions.`;
  }
  if (pattern === "Over-redaction / unexplained redactions") {
    return `Ask for redaction schedule/justification ${subject}and whether an unredacted view can be provided to defence/counsel under appropriate safeguards; escalate via case management if needed.`;
  }
  return `Chase with a clear CPIA-focused timetable request ${subject}and, if necessary, seek case management directions / disclosure order (neutral, court-safe).`;
}

export function attachCriminalCounterMoves(params: { moves: Move[]; evidenceMap: EvidenceMap }): Move[] {
  const { moves, evidenceMap } = params;

  const expected = (evidenceMap.expectedEvidence ?? []).filter((e) => e.disclosureHook || (e.typicalFailureModes && e.typicalFailureModes.length > 0));

  return moves.map((move) => {
    const best = expected
      .map((e) => ({ e, s: scoreMatch(move.evidenceRequested + " " + move.action, e.label) }))
      .sort((a, b) => b.s - a.s)[0];

    const matched = best?.s && best.s >= 0.2 ? best.e : null;
    const failurePattern = pickFailureMode(matched?.typicalFailureModes);

    return {
      ...move,
      counterMove: {
        likelyCpsResponse: likelyCpsResponseFromFailurePattern(failurePattern),
        typicalFailurePattern: failurePattern,
        lawfulNextReply: lawfulNextReplyFor(failurePattern, matched?.label),
      },
    };
  });
}


