"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Scale, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { buildClientStressResult } from "@/lib/criminal/client-stress-test/build-client-stress-result";
import { shouldShowClientStressPanel } from "@/lib/criminal/client-stress-test/client-stress-flag";
import {
  loadClientStressSelection,
  saveClientStressSelection,
} from "@/lib/criminal/client-stress-test/client-stress-selection-storage";
import { sanitizeClientStressNote } from "@/lib/criminal/client-stress-test/client-stress-sanitize";
import {
  CLIENT_ACCOUNT_OPTIONS,
  CLIENT_STRESS_NOTE_MAX_CHARS,
  type ClientAccountOption,
  type ClientInstructionChecklistItem,
  type DoNotConcedeGuardItem,
} from "@/lib/criminal/client-stress-test/client-stress-types";
import type { ReasoningV2Result, ReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { REASONING_V2_UNAVAILABLE_MESSAGE } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { ExpandableStringList } from "./reasoningV2Ui";

export type ClientAccountStressTestPanelProps = {
  caseId: string;
  clientStressEnabled: boolean;
  reasoningV2Enabled: boolean;
  reasoningResult: ReasoningV2Result | null;
};

function CollapsibleBlock({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="min-w-0 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <p className={workflowSectionTitle}>{title}</p>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
        )}
      </button>
      {open ? <div className="mt-1.5 min-w-0">{children}</div> : null}
    </div>
  );
}

function ExpandableChecklist({
  items,
  previewCount = 4,
}: {
  items: ClientInstructionChecklistItem[];
  previewCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) {
    return <p className={`text-xs ${workflowMuted}`}>None flagged on current papers.</p>;
  }
  const shown = expanded ? items : items.slice(0, previewCount);
  const hidden = items.length - previewCount;

  return (
    <div className="min-w-0 space-y-2">
      {shown.map((item, i) => (
        <div
          key={`${i}-${item.questionText.slice(0, 32)}`}
          className="rounded-md border border-slate-100 bg-slate-50/60 px-2.5 py-2 text-xs text-slate-800"
        >
          <p className="font-medium break-words">{item.questionText}</p>
          <p className={`mt-1 ${workflowMuted} break-words`}>{item.whyItMatters}</p>
          {item.provisional ? (
            <Badge variant="secondary" size="sm" className="mt-1.5 text-[10px] bg-amber-50 text-amber-900">
              Provisional — thin source
            </Badge>
          ) : null}
        </div>
      ))}
      {items.length > previewCount ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-[11px] text-violet-800"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </Button>
      ) : null}
    </div>
  );
}

function ExpandableGuards({
  items,
  previewCount = 4,
}: {
  items: DoNotConcedeGuardItem[];
  previewCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) {
    return <p className={`text-xs ${workflowMuted}`}>None flagged on current papers.</p>;
  }
  const shown = expanded ? items : items.slice(0, previewCount);
  const hidden = items.length - previewCount;

  return (
    <div className="min-w-0 space-y-2">
      {shown.map((g, i) => (
        <div
          key={`${i}-${g.concessionRiskLabel}`}
          className="rounded-md border border-amber-100 bg-amber-50/40 px-2.5 py-2 text-xs text-slate-800"
        >
          <p className="font-medium text-amber-950 break-words">{g.concessionRiskLabel}</p>
          <p className="mt-1 break-words">{g.whyNotToConcedeYet}</p>
          <p className={`mt-1 ${workflowMuted} break-words`}>{g.sourceOrMissingBasis}</p>
          <p className="mt-1 text-violet-900 break-words">
            <span className="font-medium">Safe wording: </span>
            {g.safeWordingAlternative}
          </p>
          {g.solicitorReviewRequired ? (
            <Badge variant="secondary" size="sm" className="mt-1.5 text-[10px] bg-amber-50 text-amber-900">
              Solicitor review before conceding
            </Badge>
          ) : null}
        </div>
      ))}
      {items.length > previewCount ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 text-[11px] text-violet-800"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </Button>
      ) : null}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (!items.length) {
    return (
      <div className="min-w-0 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
        <p className={workflowSectionTitle}>{title}</p>
        <p className={`text-xs ${workflowMuted} mt-1`}>None flagged on current papers.</p>
      </div>
    );
  }
  return (
    <div className="min-w-0 border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
      <p className={workflowSectionTitle}>{title}</p>
      <div className="mt-1">
        <ExpandableStringList items={items} previewCount={4} />
      </div>
    </div>
  );
}

export function ClientAccountStressTestPanel({
  caseId,
  clientStressEnabled,
  reasoningV2Enabled,
  reasoningResult,
}: ClientAccountStressTestPanelProps) {
  const hasReasoning = reasoningResult?.available === true;
  const visible = shouldShowClientStressPanel(
    clientStressEnabled,
    reasoningV2Enabled,
    hasReasoning,
  );

  const [selected, setSelected] = useState<ClientAccountOption[]>([]);
  const [otherNote, setOtherNote] = useState("");
  const [ran, setRan] = useState(false);

  useEffect(() => {
    const saved = loadClientStressSelection(caseId);
    if (saved) {
      setSelected(saved.selectedOptions);
      setOtherNote(saved.otherNote ?? "");
    }
  }, [caseId]);

  const reasoningVm: ReasoningV2ViewModel | null =
    reasoningResult?.available ? reasoningResult : null;

  const stressOutcome = useMemo(() => {
    if (!ran || !reasoningVm) return null;
    return buildClientStressResult(reasoningVm, {
      selectedOptions: selected,
      otherNote: selected.includes("other_short_note")
        ? sanitizeClientStressNote(otherNote)
        : null,
    });
  }, [ran, reasoningVm, selected, otherNote]);

  if (!visible) return null;

  const toggleOption = (opt: ClientAccountOption) => {
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
    );
    setRan(false);
  };

  const onRun = () => {
    const input = {
      selectedOptions: selected,
      otherNote: selected.includes("other_short_note")
        ? sanitizeClientStressNote(otherNote)
        : null,
    };
    saveClientStressSelection(caseId, input);
    setRan(true);
  };

  return (
    <section
      className={`${workflowCard} border-violet-100/80 mt-3`}
      aria-label="Client account stress test"
      data-testid="client-account-stress-test"
    >
      <div className="border-b border-slate-100 bg-violet-50/50 px-4 py-3 flex flex-wrap items-center gap-2">
        <Scale className="h-4 w-4 text-violet-800 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Client account stress-test</h2>
          <p className={`text-[11px] ${workflowMuted}`}>
            Compare structured client account to source-backed reasoning — not legal advice; solicitor
            review required.
          </p>
        </div>
        {stressOutcome?.available && stressOutcome.solicitorReviewRequired ? (
          <Badge variant="secondary" size="sm" className="bg-amber-50 text-amber-900 shrink-0">
            Solicitor review required
          </Badge>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-3 min-w-0">
        {!reasoningV2Enabled ? (
          <p className="text-xs text-slate-600">
            Enable Reasoning V2 (?reasoningV2=1) to compare client account against source-backed
            reasoning.
          </p>
        ) : !hasReasoning ? (
          <p className="text-xs text-slate-600">{REASONING_V2_UNAVAILABLE_MESSAGE}</p>
        ) : (
          <>
            <p className={`text-[11px] ${workflowMuted}`}>
              Select structured account options (provisional). Do not paste case papers.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CLIENT_ACCOUNT_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  size="sm"
                  variant={selected.includes(opt.value) ? "primary" : "outline"}
                  className="h-8 text-[11px] px-2.5 whitespace-normal text-left max-w-full"
                  onClick={() => toggleOption(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {selected.includes("other_short_note") ? (
              <div>
                <label htmlFor="client-stress-other-note" className={workflowSectionTitle}>
                  Other short note
                </label>
                <textarea
                  id="client-stress-other-note"
                  value={otherNote}
                  onChange={(e) => {
                    setOtherNote(e.target.value.slice(0, CLIENT_STRESS_NOTE_MAX_CHARS));
                    setRan(false);
                  }}
                  rows={2}
                  placeholder="Brief account label only — not evidence or papers"
                  className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-y min-h-[2.5rem]"
                />
              </div>
            ) : null}

            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={!selected.length}
              onClick={onRun}
            >
              Compare to source-backed reasoning
            </Button>

            {ran && stressOutcome && !stressOutcome.available ? (
              <p className="text-xs text-slate-600">
                {stressOutcome.reason === "no_account_selected"
                  ? "Select at least one account option."
                  : REASONING_V2_UNAVAILABLE_MESSAGE}
              </p>
            ) : null}

            {stressOutcome?.available ? (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {stressOutcome.solicitorReviewRequired ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 flex gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
                    <ExpandableStringList
                      items={stressOutcome.solicitorReviewReasons}
                      previewCount={3}
                    />
                  </div>
                ) : null}

                <Section title="1. Client account summary" items={[stressOutcome.accountSummary]} />
                <Section title="2. What supports the account (on papers)" items={stressOutcome.supportsAccount} />
                <Section
                  title="3. What undermines the account (on papers)"
                  items={stressOutcome.underminesAccount}
                />
                <Section
                  title="4. Missing before safe assessment"
                  items={stressOutcome.missingBeforeAssessment}
                />
                <Section title="5. Source conflicts" items={stressOutcome.sourceConflicts} />
                <CollapsibleBlock title="Questions to take from client" defaultOpen>
                  <ExpandableChecklist items={stressOutcome.clientInstructionChecklist} />
                </CollapsibleBlock>
                <CollapsibleBlock title="Do not concede yet" defaultOpen>
                  <ExpandableGuards items={stressOutcome.doNotConcedeGuards} />
                </CollapsibleBlock>
                <Section title="6. What would change the route" items={stressOutcome.whatWouldChangeRoute} />
                <Section title="7. What not to overstate" items={stressOutcome.whatNotToOverstate} />
                <Section
                  title="8. Solicitor review"
                  items={[
                    stressOutcome.solicitorReviewRequired
                      ? "Yes — review before relying on account vs papers comparison."
                      : "Not flagged — still subject to solicitor judgment.",
                  ]}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
