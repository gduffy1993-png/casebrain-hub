"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileSearch, ShieldAlert } from "lucide-react";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import {
  PROOF_RECEIPT_GUARD,
  SAFE_ACTION_CLASSES,
  SAFE_ACTION_LABELS,
  type ProofReceiptViewModel,
  type ProofReceiptRow,
  type FamilyProofCard,
} from "@/lib/criminal/proof-receipt";
import { EvidenceStateBadge } from "./EvidenceStateBadge";

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
        <p className="text-xs text-slate-200 leading-relaxed flex-1 min-w-0">{receipt.outputLine}</p>
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
          <span className="text-slate-600">Support:</span> {receipt.supportLevel}
        </p>
      </div>
      {receipt.sourceSnippet ? (
        <p className="rounded border border-slate-800/60 bg-slate-900/50 px-2 py-1.5 text-[10px] text-slate-400 line-clamp-3">
          {receipt.sourceSnippet}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <EvidenceStateBadge existence={receipt.existence} />
        <SafeActionBadge action={receipt.safeAction} />
      </div>
      {receipt.solicitorReviewNote ? (
        <p className="text-[10px] text-slate-500 italic">{receipt.solicitorReviewNote}</p>
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
      <p className="text-[10px] text-slate-500">{card.whyShown}</p>
      <p className="text-[10px] text-slate-400 leading-relaxed">{card.safeSummary}</p>
      {card.linkedLabels.length ? (
        <p className="text-[10px] text-slate-500">
          Linked: {card.linkedLabels.slice(0, 3).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function ProofReceiptPanel({ model }: { model: ProofReceiptViewModel }) {
  const [familyOpen, setFamilyOpen] = useState(model.familyCards.length > 0 && model.familyCards.length <= 3);

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

      <div className="rounded-md border border-amber-900/40 bg-amber-950/20 px-3 py-2.5 space-y-2" data-testid="refused-overstate-section">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            Refused to overstate
          </p>
        </div>
        {model.refusedOverstatements.length ? (
          <ul className="space-y-2">
            {model.refusedOverstatements.map((row) => (
              <li key={row.id} className="text-xs text-slate-300 space-y-0.5" data-testid={`refused-overstate-${row.id}`}>
                <p>
                  <span className="text-slate-500">Blocked:</span> {row.blockedLine}
                </p>
                <p className="text-[10px] text-slate-500">{row.reason}</p>
                <p className="text-[10px] text-emerald-400/90">
                  <span className="text-slate-600">Safer:</span> {row.safeAlternative}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-400">No blocked unsafe wording on current overview.</p>
        )}
      </div>

      {model.familyCards.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400"
            onClick={() => setFamilyOpen((v) => !v)}
            aria-expanded={familyOpen}
            data-testid="family-proof-cards-toggle"
          >
            {familyOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Family review cards ({model.familyCards.length})
          </button>
          {familyOpen ? (
            <div className="space-y-2" data-testid="family-proof-cards">
              {model.familyCards.slice(0, 3).map((card) => (
                <FamilyCard key={card.id} card={card} />
              ))}
              {model.familyCards.length > 3 ? (
                <p className="text-[10px] text-slate-500">
                  +{model.familyCards.length - 3} more family cards on linked truth-map rows.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
