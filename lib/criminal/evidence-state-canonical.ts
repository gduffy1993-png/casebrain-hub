/**
 * Canonical reconciled evidence state.
 *
 * Every surface that talks about what is on file must read this one state. Disclosure
 * Chase in particular consumes the reconciled requests produced here instead of
 * regenerating its own view of what is outstanding.
 *
 * Reconciliation rules (all modality-aware, so a clip never stands in for a master and
 * an incomplete transcript never becomes a missing recording):
 * - observations are grouped by alias-normalised label AND modality;
 * - served + incomplete for the same item resolves to incomplete (on file, not whole);
 * - served + missing is a genuine contradiction: it is never silently resolved, the
 *   item becomes not_safely_confirmed and the conflict is reported;
 * - an item that is served under any supported alias is never chased again;
 * - a request is only satisfied by material of the same specific modality.
 */

import { aliasProvesSameServedItem } from "@/lib/criminal/document-relationship-model";
import {
  evidenceMaySatisfyRequest,
  inferEvidenceModality,
  shouldSuppressChaseAsAlreadyOnFile,
  type EvidenceModality,
  type EvidenceStateRow,
  type SharedEvidenceState,
} from "@/lib/criminal/evidence-state-reconcile";

export type EvidenceObservation = {
  label: string;
  state: SharedEvidenceState;
  sourceDocumentTitle: string | null;
  sourceDocumentType: string | null;
  sourcePage: string | null;
  compiledPage: string | null;
  pageIdentityKnown: boolean;
  defendant?: string | null;
};

export type EvidenceContradiction = {
  label: string;
  modality: EvidenceModality;
  states: SharedEvidenceState[];
  /** Populated when the conflicting observations cannot be reconciled by rule. */
  unresolved: boolean;
  description: string;
};

export type CanonicalEvidenceItem = {
  /** Display label — the longest observed spelling, so detail is not lost. */
  label: string;
  key: string;
  modality: EvidenceModality;
  state: SharedEvidenceState;
  aliases: string[];
  defendants: string[];
  observations: EvidenceObservation[];
  contradiction: EvidenceContradiction | null;
  /** True when the reconciled state is not safe to rely on without solicitor review. */
  unresolved: boolean;
  limitation: string | null;
};

export type CanonicalChaseRequest = {
  label: string;
  key: string;
  modality: EvidenceModality;
  state: SharedEvidenceState;
  defendants: string[];
  reason: string;
  unresolved: boolean;
};

export type CanonicalEvidenceState = {
  items: CanonicalEvidenceItem[];
  contradictions: EvidenceContradiction[];
  chaseRequests: CanonicalChaseRequest[];
  suppressed: Array<{ label: string; reason: string }>;
};

/**
 * Alias-normalising key. Deliberately keeps modality-bearing words (master, clip,
 * transcript, subscriber) so distinct items never collapse into one another.
 */
export function canonicalEvidenceKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|of|for|and|please|copy|copies|version|served|outstanding|missing|incomplete|partial|full|complete)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Precedence when the same item is described more than once without contradiction. */
const STATE_RANK: Record<SharedEvidenceState, number> = {
  not_safely_confirmed: 0,
  referred_only: 1,
  served: 2,
  incomplete: 3,
  missing: 4,
};

function describeStates(states: SharedEvidenceState[]): string {
  return states.map((s) => s.replace(/_/g, " ")).join(" and ");
}

function reconcileStates(states: SharedEvidenceState[]): {
  state: SharedEvidenceState;
  contradiction: boolean;
  description: string | null;
} {
  const unique = Array.from(new Set(states));
  if (unique.length <= 1) {
    return { state: unique[0] ?? "not_safely_confirmed", contradiction: false, description: null };
  }

  const hasServed = unique.includes("served");
  const hasMissing = unique.includes("missing");
  const hasIncomplete = unique.includes("incomplete");

  // Served and missing for the same item cannot both be true.
  if (hasServed && hasMissing) {
    return {
      state: "not_safely_confirmed",
      contradiction: true,
      description: `Same item is recorded as ${describeStates(unique)} — the papers contradict each other; confirm before relying on either state`,
    };
  }

  // On file but not whole: incomplete is the safe reconciliation, not a contradiction.
  if (hasServed && hasIncomplete) {
    return {
      state: "incomplete",
      contradiction: false,
      description: null,
    };
  }

  if (hasMissing && hasIncomplete) {
    return {
      state: "incomplete",
      contradiction: false,
      description: null,
    };
  }

  const worst = unique.reduce((best, s) => (STATE_RANK[s] > STATE_RANK[best] ? s : best), unique[0]!);
  return { state: worst, contradiction: false, description: null };
}

/**
 * Group observations into canonical items. Items of different modality are never
 * merged even when their labels normalise alike.
 */
export function buildCanonicalEvidenceState(
  observations: EvidenceObservation[],
): CanonicalEvidenceState {
  const groups = new Map<string, EvidenceObservation[]>();
  for (const obs of observations) {
    const modality = inferEvidenceModality(obs.label);
    const key = `${canonicalEvidenceKey(obs.label)}::${modality}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(obs);
    else groups.set(key, [obs]);
  }

  const items: CanonicalEvidenceItem[] = [];
  const contradictions: EvidenceContradiction[] = [];

  for (const [key, obs] of groups) {
    const modality = inferEvidenceModality(obs[0]!.label);
    const states = obs.map((o) => o.state);
    const reconciled = reconcileStates(states);
    const aliases = Array.from(new Set(obs.map((o) => o.label)));
    const label = aliases.reduce((a, b) => (b.length > a.length ? b : a), aliases[0]!);
    const defendants = Array.from(
      new Set(obs.map((o) => o.defendant).filter((d): d is string => Boolean(d))),
    );

    const contradiction: EvidenceContradiction | null = reconciled.contradiction
      ? {
          label,
          modality,
          states: Array.from(new Set(states)),
          unresolved: true,
          description: reconciled.description!,
        }
      : null;
    if (contradiction) contradictions.push(contradiction);

    items.push({
      label,
      key,
      modality,
      state: reconciled.state,
      aliases,
      defendants,
      observations: obs,
      contradiction,
      unresolved: Boolean(contradiction) || reconciled.state === "not_safely_confirmed",
      limitation: contradiction?.description ?? null,
    });
  }

  const { chaseRequests, suppressed } = resolveCanonicalChaseRequests(items);
  return { items, contradictions, chaseRequests, suppressed };
}

function itemsAsRows(items: CanonicalEvidenceItem[]): EvidenceStateRow[] {
  return items.map((i) => ({
    label: i.label,
    state: i.state,
    modality: i.modality,
    aliases: i.aliases,
  }));
}

/**
 * The only place chase requests are derived. An item is chased when the canonical state
 * says it is missing or incomplete and nothing already on file satisfies it.
 */
export function resolveCanonicalChaseRequests(items: CanonicalEvidenceItem[]): {
  chaseRequests: CanonicalChaseRequest[];
  suppressed: Array<{ label: string; reason: string }>;
} {
  const rows = itemsAsRows(items);
  const chaseRequests: CanonicalChaseRequest[] = [];
  const suppressed: Array<{ label: string; reason: string }> = [];

  for (const item of items) {
    if (item.state === "served") continue;
    if (item.state === "referred_only" || item.state === "not_safely_confirmed") {
      // Referred-only / unconfirmed material is surfaced for confirmation, not as a
      // flat assertion that it is missing.
      chaseRequests.push({
        label: item.label,
        key: item.key,
        modality: item.modality,
        state: item.state,
        defendants: item.defendants,
        reason:
          item.contradiction?.description ??
          "Referred to in the papers but service is not safely confirmed — confirm on file",
        unresolved: true,
      });
      continue;
    }

    const servedAlias = rows.find(
      (row) =>
        row.state === "served" && aliasProvesSameServedItem({ label: item.label }, row),
    );
    if (servedAlias) {
      suppressed.push({
        label: item.label,
        reason: `${servedAlias.label} is a served alias of this request — do not chase`,
      });
      continue;
    }

    const verdict = shouldSuppressChaseAsAlreadyOnFile(item.label, rows);
    if (verdict.suppress) {
      suppressed.push({ label: item.label, reason: verdict.reason ?? "Already on file" });
      continue;
    }

    chaseRequests.push({
      label: item.label,
      key: item.key,
      modality: item.modality,
      state: item.state,
      defendants: item.defendants,
      reason:
        item.state === "incomplete"
          ? "On file but incomplete — request the complete version"
          : "Not served on current disclosure",
      unresolved: item.unresolved,
    });
  }

  return { chaseRequests, suppressed };
}

/**
 * Whether an externally generated chase request is contradicted by canonical state.
 * Used to keep Disclosure Chase from re-asking for material already served.
 */
export function chaseRequestAgainstCanonicalState(
  requestLabel: string,
  state: CanonicalEvidenceState,
): { chase: boolean; reason: string | null; canonicalState: SharedEvidenceState | null } {
  for (const item of state.items) {
    if (
      item.state === "served" &&
      aliasProvesSameServedItem({ label: requestLabel }, { label: item.label, state: "served" })
    ) {
      return {
        chase: false,
        reason: `${item.label} is a served alias of this request — do not chase`,
        canonicalState: "served",
      };
    }
  }
  for (const item of state.items) {
    const { match } = evidenceMaySatisfyRequest(requestLabel, {
      label: item.label,
      state: item.state,
      modality: item.modality,
      aliases: item.aliases,
    });
    if (!match) continue;
    if (item.state === "served") {
      return {
        chase: false,
        reason: `${item.label} is already on file under a supported alias — do not chase as absent`,
        canonicalState: "served",
      };
    }
    return { chase: true, reason: item.limitation, canonicalState: item.state };
  }

  const suppression = shouldSuppressChaseAsAlreadyOnFile(requestLabel, itemsAsRows(state.items));
  if (suppression.suppress) {
    return { chase: false, reason: suppression.reason, canonicalState: "served" };
  }
  return { chase: true, reason: null, canonicalState: null };
}

/** Canonical state lookup used by exits that must not contradict the evidence state. */
export function canonicalStateForLabel(
  label: string,
  state: CanonicalEvidenceState,
): CanonicalEvidenceItem | null {
  const key = canonicalEvidenceKey(label);
  const modality = inferEvidenceModality(label);
  return (
    state.items.find((i) => i.key === `${key}::${modality}`) ??
    state.items.find(
      (i) =>
        i.modality === modality &&
        evidenceMaySatisfyRequest(label, {
          label: i.label,
          state: i.state,
          modality: i.modality,
          aliases: i.aliases,
        }).match,
    ) ??
    null
  );
}
