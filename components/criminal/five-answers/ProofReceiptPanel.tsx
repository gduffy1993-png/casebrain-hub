"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileCheck2, FileSearch, ShieldAlert } from "lucide-react";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { displayExistenceLabel, displayProofSupportLevel } from "@/lib/criminal/five-answers/display-labels";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { gapEvidenceRows } from "@/lib/criminal/overview-presentation";
import {
  PROOF_RECEIPT_GUARD,
  SAFE_ACTION_CLASSES,
  SAFE_ACTION_LABELS,
  sanitizeProofReceiptPanelCopy,
  type ProofReceiptViewModel,
  type ProofReceiptRow,
  type FamilyProofCard,
} from "@/lib/criminal/proof-receipt";
import {
  buildGotRightPreviewItems,
  humanizeEvidenceLabel,
  sanitizeProofLine,
} from "./evidence-display";
import { EvidenceStateBadge } from "./EvidenceStateBadge";

function safePanelCopy(text: string): string {
  return sanitizeProofReceiptPanelCopy(text);
}

function SafeActionBadge({ action }: { action: ProofReceiptRow["safeAction"] }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SAFE_ACTION_CLASSES[action]}`}
      data-testid={`proof-safe-action-${action}`}
    >
      {SAFE_ACTION_LABELS[action]}
    </span>
  );
}

function ReceiptRowCard({ receipt }: { receipt: ProofReceiptRow }) {
  return (
    <article
      className="rounded-md border border-slate-800/80 bg-slate-950/35 px-3 py-2.5 space-y-2"
      data-testid={`proof-receipt-row-${receipt.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs text-slate-200 leading-relaxed flex-1 min-w-0">{safePanelCopy(receipt.outputLine)}</p>
        <span className="shrink-0 rounded border border-slate-700/80 bg-slate-900/60 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">
          {receipt.surface}
        </span>
      </div>
      <div className="grid gap-1 text-[10px] text-slate-500 sm:grid-cols-2">
        <p>
          <span className="text-slate-600">Source:</span> {receipt.sourceDocument}
          {receipt.sourcePage ? ` · ${receipt.sourcePage}` : ""}
        </p>
        <p>
          <span className="text-slate-600">Support:</span> {displayProofSupportLevel(receipt.supportLevel)}
        </p>
      </div>
      {receipt.sourceSnippet ? (
        <p className="rounded border border-slate-800/60 bg-slate-900/50 px-2 py-1.5 text-[10px] text-slate-400 line-clamp-3">
          {safePanelCopy(receipt.sourceSnippet)}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <EvidenceStateBadge existence={receipt.existence} />
        <SafeActionBadge action={receipt.safeAction} />
      </div>
      {receipt.solicitorReviewNote ? (
        <p className="text-[10px] text-slate-500 italic">{safePanelCopy(receipt.solicitorReviewNote)}</p>
      ) : null}
    </article>
  );
}

function FamilyCard({ card }: { card: FamilyProofCard }) {
  return (
    <div
      className="rounded-md border border-slate-800/70 bg-slate-950/30 px-3 py-2 space-y-1.5"
      data-testid={`family-proof-card-${card.id}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-200">{card.title}</p>
        <SafeActionBadge action={card.defaultAction} />
      </div>
      <p className="text-[10px] text-slate-500">{safePanelCopy(card.whyShown)}</p>
      <p className="text-[10px] text-slate-400 leading-relaxed">{safePanelCopy(card.safeSummary)}</p>
      {card.linkedLabels.length ? (
        <p className="text-[10px] text-slate-500">
          Linked: {card.linkedLabels.slice(0, 3).map((label) => safePanelCopy(label)).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

function refusalLines(warnings: string[]) {
  return warnings
    .map(sanitizeProofLine)
    .filter((line) => line.length > 8)
    .filter((line) => !/do not import|template|eval/i.test(line))
    .slice(0, 5);
}

function reviewRows(rows: FiveAnswersEvidenceRow[]) {
  return gapEvidenceRows(rows)
    .filter((row) => !/statement of offence|charge sheet/i.test(row.label))
    .slice(0, 5);
}

function ProofPacketSummary({
  rows,
  warnings,
  hideRefused = false,
  hideNeedsReview = false,
}: {
  rows: FiveAnswersEvidenceRow[];
  warnings: string[];
  hideRefused?: boolean;
  hideNeedsReview?: boolean;
}) {
  const gotRight = buildGotRightPreviewItems(rows);
  const refused = hideRefused ? [] : refusalLines(warnings);
  const needsReview = hideNeedsReview ? [] : reviewRows(rows);

  return (
    <div
      className="rounded-md border border-emerald-900/40 bg-emerald-950/10 p-3 space-y-2"
      data-testid="proof-packet-preview-panel"
    >
      <div className="flex items-start gap-2">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-200">Proof packet summary</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Source-backed findings
            {hideRefused && hideNeedsReview
              ? " — blocked wording and gaps are summarised above."
              : ", blocked wording, and outstanding review lines."}
          </p>
        </div>
      </div>

      <div
        className={`grid gap-2 ${
          hideRefused && hideNeedsReview ? "lg:grid-cols-1" : "lg:grid-cols-3"
        }`}
      >
        <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Got right</p>
          {gotRight.length ? (
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              {gotRight.map((item, i) => (
                <li key={`${item.label}-${i}`}>
                  <span className="font-medium">{item.label}</span>
                  <span className="text-slate-500"> — {item.detail}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-400">No served material confirmed for reliance yet.</p>
          )}
        </div>

        {!hideRefused ? (
          <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Refused to overstate</p>
            {refused.length ? (
              <ul className="mt-2 space-y-2 text-xs text-slate-200">
                {refused.map((line, i) => (
                  <li key={`${line}-${i}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No overstatement warnings on this preview.</p>
            )}
          </div>
        ) : null}

        {!hideNeedsReview ? (
          <div className="rounded-md border border-slate-800/80 bg-slate-950/35 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Still needs review</p>
            {needsReview.length ? (
              <ul className="mt-2 space-y-2 text-xs text-slate-200">
                {needsReview.map((row, i) => (
                  <li key={`${row.label}-${i}`}>
                    <span className="font-medium">{humanizeEvidenceLabel(row.label, row.existence)}</span>
                    <span className="text-slate-500"> — {displayExistenceLabel(row.existence)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-slate-400">No additional gaps shown on this preview.</p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ProofReceiptPanel({
  model,
  evidenceRows = [],
  warnings = [],
  /** Overview drawer: receipts + family only — gaps/warnings already above fold. */
  depthOnly = false,
}: {
  model: ProofReceiptViewModel;
  evidenceRows?: FiveAnswersEvidenceRow[];
  warnings?: string[];
  depthOnly?: boolean;
}) {
  // Dedupe by id so family chrome never repeats.
  const familyCards = Array.from(
    new Map(model.familyCards.map((card) => [card.id, card])).values(),
  );
  const [familyOpen, setFamilyOpen] = useState(false);

  return (
    <section
      className={`${workflowPilotCard} px-4 py-3 space-y-3`}
      data-testid="proof-receipt-panel"
    >
      <div className="flex items-start gap-3">
        <FileSearch className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
        <div className="min-w-0 space-y-1">
          <h2 className={workflowSectionTitle}>Proof receipts</h2>
          <p className="text-[11px] leading-relaxed text-slate-500">{PROOF_RECEIPT_GUARD}</p>
        </div>
      </div>

      {/* In Overview depth drawer, skip packet summary — gaps/don’t-say already above fold. */}
      {!depthOnly ? (
        <ProofPacketSummary
          rows={evidenceRows}
          warnings={warnings}
          hideRefused={model.refusedOverstatements.length > 0}
          hideNeedsReview={false}
        />
      ) : null}

      {model.receipts.length === 0 ? (
        <p className="text-sm text-slate-400" data-testid="proof-receipt-empty">
          Proof receipt not available for this line yet.
        </p>
      ) : (
        <div className="space-y-2" data-testid="proof-receipt-list">
          {model.receipts.slice(0, 8).map((receipt) => (
            <ReceiptRowCard key={receipt.id} receipt={receipt} />
          ))}
        </div>
      )}

      {!depthOnly && model.refusedOverstatements.length > 0 ? (
        <div className="rounded-md border border-amber-900/40 bg-amber-950/20 px-3 py-2.5 space-y-2" data-testid="refused-overstate-section">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Refused to overstate
            </p>
          </div>
          <ul className="space-y-2">
            {model.refusedOverstatements.map((row) => (
              <li key={row.id} className="text-xs text-slate-300 space-y-0.5" data-testid={`refused-overstate-${row.id}`}>
                <p>
                  <span className="text-slate-500">Blocked:</span> {safePanelCopy(row.blockedLine)}
                </p>
                <p className="text-[10px] text-slate-500">{safePanelCopy(row.reason)}</p>
                <p className="text-[10px] text-emerald-400/90">
                  <span className="text-slate-600">Safer:</span> {safePanelCopy(row.safeAlternative)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {familyCards.length > 0 ? (
        <div className="space-y-2" data-testid="family-proof-cards-section">
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            onClick={() => setFamilyOpen((v) => !v)}
            aria-expanded={familyOpen}
            data-testid="family-proof-cards-toggle"
          >
            {familyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Family review ({familyCards.length})
          </button>
          {familyOpen ? (
            <div className="space-y-2" data-testid="family-proof-cards">
              {familyCards.slice(0, 3).map((card) => (
                <FamilyCard key={card.id} card={card} />
              ))}
              {familyCards.length > 3 ? (
                <p className="text-[10px] text-slate-500">
                  +{familyCards.length - 3} more on linked truth-map rows.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
