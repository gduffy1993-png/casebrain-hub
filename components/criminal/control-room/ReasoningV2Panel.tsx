"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, GitBranch, Loader2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { confidenceLabel } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import {
  REASONING_V2_UNAVAILABLE_MESSAGE,
  type ReasoningV2EvidenceItem,
  type ReasoningV2Result,
} from "@/lib/criminal/reasoning-v2/reasoning-v2-types";

export type ReasoningV2PanelProps = {
  result: ReasoningV2Result | null;
  loading?: boolean;
};

function SectionBlock({
  title,
  children,
  empty,
}: {
  title: string;
  children: ReactNode;
  empty?: string;
}) {
  return (
    <div className="border-t border-slate-100 pt-3 first:border-t-0 first:pt-0">
      <h3 className={workflowSectionTitle}>{title}</h3>
      <div className="mt-1.5">{children ?? <p className={`text-xs ${workflowMuted}`}>{empty ?? "None on current papers."}</p>}</div>
    </div>
  );
}

function BulletList({ items, cap = 8 }: { items: string[]; cap?: number }) {
  const visible = items.filter(Boolean).slice(0, cap);
  if (!visible.length) return null;
  return (
    <ul className="list-disc pl-4 space-y-1 text-xs text-slate-800 leading-relaxed">
      {visible.map((item, i) => (
        <li key={`${i}-${item.slice(0, 24)}`}>{item}</li>
      ))}
    </ul>
  );
}

function EvidenceList({ items, cap = 6 }: { items: ReasoningV2EvidenceItem[]; cap?: number }) {
  const visible = items.slice(0, cap);
  if (!visible.length) return null;
  return (
    <ul className="space-y-2">
      {visible.map((item, i) => (
        <li key={`${i}-${item.label.slice(0, 24)}`} className="text-xs text-slate-800 leading-relaxed">
          <p className="font-medium text-slate-900">{item.label}</p>
          <p className={`${workflowMuted} mt-0.5`}>
            {item.sourceSection}
            {item.sourceBasis ? ` · ${item.sourceBasis}` : ""}
          </p>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="secondary" size="sm" className="text-[10px] bg-slate-100">
              {confidenceLabel(item.confidence)}
            </Badge>
            {item.confidence === "provisional" || item.confidence === "needs_solicitor_review" ? (
              <Badge variant="secondary" size="sm" className="text-[10px] bg-amber-50 text-amber-900">
                Provisional
              </Badge>
            ) : null}
          </div>
          {item.doNotOverstate ? (
            <p className="text-[10px] text-amber-800/90 mt-1">Do not overstate: {item.doNotOverstate}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function ReasoningV2Panel({ result, loading }: ReasoningV2PanelProps) {
  const [open, setOpen] = useState(true);

  return (
    <section
      className={workflowCard}
      aria-label="Source-backed reasoning"
      data-testid="reasoning-v2-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="h-4 w-4 text-indigo-700 shrink-0" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">Reasoning</h2>
            <p className="text-[11px] text-slate-500">Why this route — source-backed · read-only</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {result?.available && result.humanReviewRequired ? (
            <Badge variant="secondary" size="sm" className="bg-amber-50 text-amber-900">
              Solicitor review
            </Badge>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Collapse
              </>
            ) : (
              <>
                <ChevronRight className="h-3.5 w-3.5 mr-1" />
                Expand
              </>
            )}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="px-4 py-3 space-y-3">
          {loading ? (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading source material…
            </p>
          ) : !result || !result.available ? (
            <p className="text-xs text-slate-600">{REASONING_V2_UNAVAILABLE_MESSAGE}</p>
          ) : (
            <>
              {result.humanReviewRequired ? (
                <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 flex gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-amber-950">Human review required</p>
                    <BulletList items={result.humanReviewReasons} cap={4} />
                  </div>
                </div>
              ) : null}

              <SectionBlock title="1. Primary route">
                <p className="text-sm font-medium text-slate-900">{result.primaryRoute}</p>
                {result.charge ? (
                  <p className={`text-[11px] ${workflowMuted} mt-1`}>
                    {result.charge}
                    {result.stage ? ` · ${result.stage}` : ""}
                  </p>
                ) : null}
              </SectionBlock>

              <SectionBlock title="2. Why this route is live">
                <p className="text-xs text-slate-800 leading-relaxed">{result.whyRouteIsLive}</p>
              </SectionBlock>

              <SectionBlock title="3. Proof points under pressure" empty="No proof points under pressure on current papers.">
                {result.proofPointsUnderPressure.length ? (
                  <ul className="space-y-1 text-xs text-slate-800">
                    {result.proofPointsUnderPressure.map((p) => (
                      <li key={p.label} className="flex justify-between gap-2">
                        <span>{p.label}</span>
                        <span className={`${workflowMuted} shrink-0`}>{p.pressureCount} pressure link(s)</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </SectionBlock>

              <SectionBlock title="4. Evidence helping defence">
                <EvidenceList items={result.evidenceHelpingDefence} />
              </SectionBlock>

              <SectionBlock title="5. Evidence hurting defence">
                <EvidenceList items={result.evidenceHurtingDefence} />
              </SectionBlock>

              <SectionBlock title="6. Missing material">
                <EvidenceList items={result.missingMaterial} />
              </SectionBlock>

              <SectionBlock title="7. Contradictions / unresolved conflicts">
                <EvidenceList items={result.contradictions} />
              </SectionBlock>

              <SectionBlock title="8. What would weaken or collapse the route">
                <BulletList items={[...result.collapseRisks, ...result.routeChangeTriggers]} cap={6} />
              </SectionBlock>

              <SectionBlock title="9. Disclosure chase priorities">
                {result.disclosureChasePriorities.length ? (
                  <ul className="space-y-2 text-xs text-slate-800">
                    {result.disclosureChasePriorities.map((d) => (
                      <li key={d.label}>
                        <p className="font-medium">{d.label}</p>
                        {d.chaseNote ? <p className={workflowMuted}>{d.chaseNote}</p> : null}
                        {d.safeAction ? <p className="text-[10px] text-slate-600 mt-0.5">{d.safeAction}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </SectionBlock>

              <SectionBlock title="10. Safe next action">
                <p className="text-xs text-slate-800 leading-relaxed">{result.safeNextAction}</p>
              </SectionBlock>

              <SectionBlock title="11. Do-not-overstate warning">
                <p className="text-xs text-amber-900/90 leading-relaxed">{result.doNotOverstateWarning}</p>
              </SectionBlock>

              <SectionBlock title="12. Human review required">
                <p className="text-xs text-slate-800">
                  {result.humanReviewRequired
                    ? "Yes — review before fixing hearing position or concessions."
                    : "Not flagged on current papers — still subject to solicitor judgment."}
                </p>
              </SectionBlock>

              <p className="text-[10px] text-center text-slate-500 pt-2 border-t border-slate-100">
                Source-backed · conditional · provisional where stated · no predictions
              </p>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
