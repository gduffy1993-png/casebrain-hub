"use client";

/**
 * Single "Defence Plan" box – one source of truth for how we're fighting this case.
 * All content is from the committed strategy plan only (no DB position mixed in).
 * Renders narrative, attack order, how we're running it, key plan sections, and chat (Phase 3).
 * Chat history is persisted per case in localStorage so it survives refresh.
 * D4: Chat UX – auto-scroll, bubbles, typing indicator, sticky input, collapsible plan, command shortcuts.
 */

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Send, Loader2, Check, Pencil, X } from "lucide-react";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import { LawSliceSuggestions } from "./LawSliceSuggestions";
import { VerdictRatingBlock } from "./VerdictRatingBlock";

const CHAT_COMMAND_PROMPTS: Record<string, string> = {
  "/disclosure": "What disclosure should I be pushing in this case and what are the CPIA duties?",
  "/timeline": "What are the key dates and next steps in this case?",
  "/plan": "Summarise our defence plan and the main angles we're running.",
  "/propose": "__PROPOSE__", // special: triggers propose-summary API and proposal card
};

const CHAT_STORAGE_KEY_PREFIX = "casebrain:defence-plan-chat:";

type DefencePlanBoxProps = {
  caseId: string;
  /** Plan from StrategyCommitmentPanel (built from committed strategy + coordinator). Null when not committed or not yet loaded. */
  plan: DefenceStrategyPlan | null;
  /** For Phase 5 law slice suggestions (offence-specific) */
  offenceType?: string | null;
  /** For Phase 5 law slice suggestions (phase 2 vs 3) */
  currentPhase?: number;
  /** For Phase 5 evidence-aware chat: short summary of evidence/disclosure so answers are case-specific */
  evidenceSummary?: string | null;
  /** For Phase 5 timeline reasoning: key dates and next hearing so chat can reason over timeline */
  timelineSummary?: string | null;
  /** Quick case navigation controls for eval/training flow */
  caseNav?: {
    label?: string | null;
    canGoPrev: boolean;
    canGoNext: boolean;
    onGoPrev?: () => void;
    onGoNext?: () => void;
  };
  /** Optional eval case list for bulk question runs (e.g. NS-CPS 0401-0440). */
  evalCases?: Array<{ id: string; title: string }>;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

type PendingProposal = { caseTheoryLine?: string; agreedSummaryDetailed?: string };

function section(title: string, children: React.ReactNode) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{title}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function buildPlanSummary(plan: DefenceStrategyPlan): string {
  const parts: string[] = [];
  if (plan.strategy_stance) parts.push(`Stance: ${plan.strategy_stance === "fight_to_win" ? "Going for a win" : "Damage limitation"}.`);
  if (plan.strategy_in_one_line) parts.push(plan.strategy_in_one_line);
  if (plan.case_theory_one_go) parts.push("Case theory: " + plan.case_theory_one_go);
  if (plan.attack_sequence) parts.push(plan.attack_sequence);
  if (plan.posture) parts.push(plan.posture);
  if (plan.primary_route?.label) parts.push(`Primary route: ${plan.primary_route.label}`);
  if (plan.prosecution_still_must_prove?.length) parts.push("Prosecution must prove: " + plan.prosecution_still_must_prove.join("; "));
  if (plan.defence_angles?.length) parts.push("Defence angles: " + plan.defence_angles.slice(0, 3).join("; "));
  if (plan.winning_angles?.length) parts.push("Winning angles: " + plan.winning_angles.slice(0, 3).join("; "));
  if (plan.offence_leverage_angles?.length) parts.push("Offence leverage: " + plan.offence_leverage_angles.join("; "));
  if (plan.disclosure_weapon_steps?.length) parts.push("Disclosure as weapon: " + plan.disclosure_weapon_steps.join(" "));
  if (plan.risks_pivots_short?.length) parts.push("If things change: " + plan.risks_pivots_short.join("; "));
  if (plan.no_case_line) parts.push(plan.no_case_line);
  return parts.join("\n");
}

/** Compressed plan for chat only: high-leverage sections, capped length so the model has room to complete answers. */
const MAX_PLAN_FOR_CHAT = 1200;
function buildPlanSummaryForChat(plan: DefenceStrategyPlan): string {
  const parts: string[] = [];
  if (plan.strategy_stance) parts.push(`Stance: ${plan.strategy_stance === "fight_to_win" ? "Going for a win" : "Damage limitation"}.`);
  if (plan.case_theory_one_go) parts.push(plan.case_theory_one_go);
  if (plan.strategy_in_one_line) parts.push(plan.strategy_in_one_line);
  if (plan.prosecution_still_must_prove?.length) parts.push("Prosecution must prove: " + plan.prosecution_still_must_prove.slice(0, 3).join("; "));
  if (plan.offence_leverage_angles?.length) parts.push("Offence leverage: " + plan.offence_leverage_angles.join("; "));
  if (plan.disclosure_weapon_steps?.length) parts.push("Disclosure as weapon: " + plan.disclosure_weapon_steps.join(" "));
  if (plan.no_case_line) parts.push(plan.no_case_line);
  const out = parts.join("\n");
  return out.length > MAX_PLAN_FOR_CHAT ? out.slice(0, MAX_PLAN_FOR_CHAT - 3) + "…" : out;
}

function loadChatFromStorage(caseId: string): ChatMessage[] {
  if (typeof window === "undefined" || !caseId) return [];
  try {
    const raw = localStorage.getItem(`${CHAT_STORAGE_KEY_PREFIX}${caseId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is ChatMessage => m && typeof m.role === "string" && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"));
  } catch {
    return [];
  }
}

function saveChatToStorage(caseId: string, messages: ChatMessage[]) {
  if (typeof window === "undefined" || !caseId) return;
  try {
    if (messages.length === 0) localStorage.removeItem(`${CHAT_STORAGE_KEY_PREFIX}${caseId}`);
    else localStorage.setItem(`${CHAT_STORAGE_KEY_PREFIX}${caseId}`, JSON.stringify(messages));
  } catch {
    // ignore quota / private mode
  }
}

export function DefencePlanBox({ caseId, plan, offenceType, currentPhase = 2, evidenceSummary, timelineSummary, caseNav, evalCases = [] }: DefencePlanBoxProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [planSectionOpen, setPlanSectionOpen] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<PendingProposal | null>(null);
  const [editingProposal, setEditingProposal] = useState<PendingProposal | null>(null);
  const [proposalSaving, setProposalSaving] = useState(false);
  const [evalInput, setEvalInput] = useState("");
  const [evalScope, setEvalScope] = useState<"current" | "5" | "10" | "20" | "all">("all");
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalProgress, setEvalProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [evalRows, setEvalRows] = useState<
    Array<{ caseId: string; caseTitle: string; questionNo: number; question: string; answer: string; error?: string }>
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  /** Scroll only this panel — scrollIntoView on the sentinel scrolls the whole page. */
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  // Load persisted chat for this case on mount (client-only to avoid hydration mismatch)
  useEffect(() => {
    if (!caseId) return;
    setChatMessages(loadChatFromStorage(caseId));
    setChatLoaded(true);
  }, [caseId]);

  // Persist chat whenever messages change (after initial load)
  useEffect(() => {
    if (!caseId || !chatLoaded) return;
    saveChatToStorage(caseId, chatMessages);
  }, [caseId, chatLoaded, chatMessages]);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

  const resolveMessage = (raw: string): string => {
    const trimmed = raw.trim().toLowerCase();
    return CHAT_COMMAND_PROMPTS[trimmed] ?? CHAT_COMMAND_PROMPTS[Object.keys(CHAT_COMMAND_PROMPTS).find((k) => trimmed.startsWith(k)) ?? ""] ?? raw.trim();
  };

  const runProposeFlow = async () => {
    if (!plan || !caseId) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: "Propose summary & case theory" }]);
    setChatLoading(true);
    setPendingProposal(null);
    try {
      const res = await fetch(`/api/criminal/${caseId}/propose-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planSummary: buildPlanSummaryForChat(plan),
          evidenceSummary: evidenceSummary?.slice(0, 1200) ?? "",
          timelineSummary: timelineSummary?.slice(0, 500) ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && typeof data.reply === "string") {
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.proposal && (data.proposal.caseTheoryLine || data.proposal.agreedSummaryDetailed)) {
          setPendingProposal(data.proposal);
        }
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Could not generate proposal. Try again." }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const parseEvalQuestions = (): string[] => {
    return evalInput
      .split(/\r?\n/)
      .map((q) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 10);
  };

  const selectedEvalCases = (): Array<{ id: string; title: string }> => {
    if (evalScope === "current") return [{ id: caseId, title: "Current case" }];
    if (evalScope === "5") return evalCases.slice(0, 5);
    if (evalScope === "10") return evalCases.slice(0, 10);
    if (evalScope === "20") return evalCases.slice(0, 20);
    return evalCases;
  };

  const runEvalAcrossCases = async () => {
    const questions = parseEvalQuestions();
    const runCases = selectedEvalCases();
    if (questions.length === 0 || runCases.length === 0 || evalRunning) return;
    const total = questions.length * runCases.length;
    setEvalRunning(true);
    setEvalRows([]);
    setEvalProgress({ done: 0, total });

    const rows: Array<{ caseId: string; caseTitle: string; questionNo: number; question: string; answer: string; error?: string }> = [];
    let done = 0;
    try {
      for (let qIdx = 0; qIdx < questions.length; qIdx += 1) {
        const question = questions[qIdx]!;
        for (const c of runCases) {
          let answer = "";
          let error: string | undefined;
          try {
            const res = await fetch(`/api/criminal/${c.id}/defence-plan-chat`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ message: question }),
            });
            const data = (await res.json().catch(() => ({}))) as { ok?: boolean; reply?: string; error?: string };
            if (!res.ok || !data.ok || typeof data.reply !== "string") {
              error = data.error ?? `HTTP ${res.status}`;
            } else {
              answer = data.reply;
            }
          } catch (e) {
            error = e instanceof Error ? e.message : "Unknown error";
          }

          rows.push({
            caseId: c.id,
            caseTitle: c.title,
            questionNo: qIdx + 1,
            question,
            answer,
            ...(error ? { error } : {}),
          });
          done += 1;
          setEvalProgress({ done, total });
          setEvalRows([...rows]);
        }
      }
    } finally {
      setEvalRunning(false);
    }
  };

  const copyEvalRows = async () => {
    if (evalRows.length === 0) return;
    const header = ["case_id", "case_title", "question_no", "question", "answer", "error"].join("\t");
    const body = evalRows
      .map((r) =>
        [
          r.caseId,
          r.caseTitle.replace(/\t/g, " "),
          String(r.questionNo),
          r.question.replace(/\t/g, " "),
          (r.answer || "").replace(/\t/g, " ").replace(/\r?\n/g, " \\n "),
          (r.error || "").replace(/\t/g, " "),
        ].join("\t"),
      )
      .join("\n");
    await navigator.clipboard.writeText(`${header}\n${body}`);
  };

  const renderCaseNavAndEvalRunner = () => (
    <>
      {caseNav && (caseNav.canGoPrev || caseNav.canGoNext || caseNav.label) && (
        <div className="mb-3 rounded-md border border-border/60 bg-muted/20 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">{caseNav.label ?? "Case navigation"}</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!caseNav.canGoPrev}
                onClick={caseNav.onGoPrev}
              >
                Previous case
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!caseNav.canGoNext}
                onClick={caseNav.onGoNext}
              >
                Next case
              </Button>
            </div>
          </div>
        </div>
      )}
      {evalCases.length > 0 && (
        <div className="mb-3 rounded-md border border-border/60 bg-muted/20 p-2.5">
          <p className="text-[11px] font-medium text-foreground">Bulk eval runner (ask same question(s) across all eval cases)</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Enter up to 10 questions (one per line). Runner will execute each question across {evalCases.length} cases.
          </p>
          <textarea
            value={evalInput}
            onChange={(e) => setEvalInput(e.target.value)}
            placeholder={"1) What is the case in one sentence?\n2) What disclosure is missing?\n... (up to 10 lines)"}
            className="mt-2 h-28 w-full rounded-md border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            disabled={evalRunning}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
              value={evalScope}
              onChange={(e) => setEvalScope(e.target.value as "current" | "5" | "10" | "20" | "all")}
              disabled={evalRunning}
            >
              <option value="current">Current case only</option>
              <option value="5">First 5 eval cases</option>
              <option value="10">First 10 eval cases</option>
              <option value="20">First 20 eval cases</option>
              <option value="all">All eval cases</option>
            </select>
            <Button type="button" size="sm" onClick={runEvalAcrossCases} disabled={evalRunning || parseEvalQuestions().length === 0}>
              {evalRunning ? "Running..." : `Run on ${selectedEvalCases().length} case${selectedEvalCases().length === 1 ? "" : "s"}`}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={copyEvalRows} disabled={evalRows.length === 0}>
              Copy results
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEvalRows([])} disabled={evalRunning || evalRows.length === 0}>
              Clear
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Progress: {evalProgress.done}/{evalProgress.total}
            </span>
          </div>
          {evalRows.length > 0 && (
            <div className="mt-2 max-h-48 overflow-auto rounded border border-border/60 bg-background p-2">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pr-2">Case</th>
                    <th className="pr-2">Q#</th>
                    <th className="pr-2">Status</th>
                    <th>Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {evalRows.slice(-120).map((r, idx) => (
                    <tr key={`${r.caseId}-${r.questionNo}-${idx}`} className="border-t border-border/40 align-top">
                      <td className="pr-2 py-1 text-foreground">{r.caseTitle}</td>
                      <td className="pr-2 py-1 text-foreground">{r.questionNo}</td>
                      <td className="pr-2 py-1">{r.error ? <span className="text-red-600">error</span> : <span className="text-emerald-600">ok</span>}</td>
                      <td className="py-1 text-muted-foreground">{(r.error ?? r.answer).slice(0, 120)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );

  const handleAcceptProposal = async () => {
    if (!pendingProposal || !caseId || proposalSaving) return;
    setProposalSaving(true);
    try {
      const res = await fetch(`/api/criminal/${caseId}/agreed-summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caseTheoryLine: pendingProposal.caseTheoryLine ?? null,
          agreedSummaryDetailed: pendingProposal.agreedSummaryDetailed ?? null,
        }),
      });
      if (res.ok) setPendingProposal(null);
    } finally {
      setProposalSaving(false);
    }
  };

  const handleSendChat = async () => {
    const raw = chatInput.trim();
    if (!raw || !plan || !caseId) return;
    const resolved = resolveMessage(raw);
    if (resolved === "__PROPOSE__" || raw.toLowerCase().trim().startsWith("/propose")) {
      runProposeFlow();
      return;
    }
    const msg = resolved;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/criminal/${caseId}/defence-plan-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: msg,
          planSummary: buildPlanSummaryForChat(plan),
          evidenceSummary: evidenceSummary?.slice(0, 1200) ?? "",
          timelineSummary: timelineSummary?.slice(0, 500) ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok && typeof data.reply === "string") {
        setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setChatMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn’t get a response. Try again." }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (!plan) {
    return (
      <Card className="p-6 border-2 border-primary/20 bg-primary/5">
        <h3 className="text-sm font-semibold text-foreground mb-2">Defence Plan</h3>
        {renderCaseNavAndEvalRunner()}
        <p className="text-sm text-muted-foreground">
          Commit to a strategy in the Evidence column to see your Defence Plan here. This box shows how we're fighting the case from one source only.
        </p>
      </Card>
    );
  }

  const isFightToWin = plan.strategy_stance === "fight_to_win";

  return (
    <Card className="p-6 border-2 border-primary/25 bg-primary/5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Defence Plan</h3>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {plan.strategy_stance && (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isFightToWin
                ? "bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30"
                : "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
            }`}
          >
            {isFightToWin ? "Going for a win" : "Damage limitation"}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => setPlanSectionOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left py-2 text-xs font-semibold text-muted-foreground hover:text-foreground border-y border-border/50"
      >
        {planSectionOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Plan details
      </button>
      {planSectionOpen && (
      <>
      {plan.winning_angles?.length > 0 && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/10 p-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Winning angles</p>
          <ul className="text-sm text-foreground space-y-0.5 list-disc pl-4">
            {plan.winning_angles.slice(0, 5).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {plan.case_theory_one_go && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Case theory</p>
          <p className="text-sm text-foreground">{plan.case_theory_one_go}</p>
        </div>
      )}
      {plan.offence_leverage_angles?.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Offence leverage</p>
          <ul className="text-sm text-foreground space-y-0.5 list-disc pl-4">
            {plan.offence_leverage_angles.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}
      {plan.disclosure_weapon_steps?.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Disclosure as weapon</p>
          <ol className="text-sm text-foreground space-y-0.5 list-decimal pl-4">
            {plan.disclosure_weapon_steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </div>
      )}
      {plan.risks_pivots_short?.length > 0 && (
        <div className="mb-4 rounded-lg border border-border/50 bg-muted/30 p-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">If things change</p>
          <ul className="text-sm text-foreground space-y-0.5 list-disc pl-4">
            {plan.risks_pivots_short.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="space-y-4">
        {plan.strategy_in_one_line && section("How we're running it", <p className="font-medium">{plan.strategy_in_one_line}</p>)}
        {plan.attack_sequence && section("Attack order", <p className="whitespace-pre-wrap">{plan.attack_sequence}</p>)}
        {plan.prosecution_still_must_prove?.length > 0 && section("What prosecution still has to prove", <ul className="list-disc pl-4 space-y-0.5">{plan.prosecution_still_must_prove.map((b, i) => <li key={i}>{b}</li>)}</ul>)}
        {plan.posture && section("Defence position (plan)", <p>{plan.posture}</p>)}
        {plan.primary_route && section("Primary route", <><p className="font-medium">{plan.primary_route.label}</p>{plan.primary_route.rationale?.length > 0 && <ul className="list-disc pl-4 mt-1 space-y-0.5">{plan.primary_route.rationale.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}</ul>}</>)}
        {plan.defence_angles?.length > 0 && section("Key defence angles", <ul className="list-disc pl-4 space-y-0.5">{plan.defence_angles.slice(0, 6).map((a, i) => <li key={i}>{a}</li>)}</ul>)}
        {plan.order_to_challenge?.length > 0 && section("Order to challenge evidence", <ul className="list-disc pl-4 space-y-0.5">{plan.order_to_challenge.map((b, i) => <li key={i}>{b}</li>)}</ul>)}
        {plan.witness_attack_plan?.length > 0 && section("Witness attack plan", <ul className="list-disc pl-4 space-y-0.5">{plan.witness_attack_plan.map((b, i) => <li key={i}>{b}</li>)}</ul>)}
        {plan.disclosure_leverage_line && section("Disclosure leverage", <p>{plan.disclosure_leverage_line}</p>)}
        {plan.cross_examination_themes?.length > 0 && section("Cross-examination themes", <ul className="list-disc pl-4 space-y-0.5">{plan.cross_examination_themes.slice(0, 4).map((t, i) => <li key={i}>{t}</li>)}</ul>)}
        {plan.risks_if_we_fight?.length > 0 && section("Trial risks", <ul className="list-disc pl-4 space-y-0.5">{plan.risks_if_we_fight.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}</ul>)}
        {plan.defence_counters?.length > 0 && section("Defence counters", <ul className="space-y-1">{plan.defence_counters.slice(0, 3).map((c, i) => <li key={i}><span className="font-medium">{c.point}:</span> {c.safe_wording}</li>)}</ul>)}
      </div>
      </>
      )}

      <div className="mt-6 pt-4 border-t border-border/50 flex flex-col min-h-0">
        {renderCaseNavAndEvalRunner()}
        <LawSliceSuggestions offenceType={offenceType} currentPhase={currentPhase} hasPlan={true} />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ask about this plan</p>
        <div className="rounded border border-border/50 bg-muted/20 px-2 py-1.5 mb-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>Context:</span>
          <span>Plan</span>
          {evidenceSummary && <span>· Evidence</span>}
          {timelineSummary && <span>· Timeline</span>}
        </div>
        <Button type="button" variant="outline" size="sm" className="mb-2 self-start text-xs" onClick={runProposeFlow} disabled={chatLoading}>
          Propose summary & case theory
        </Button>
        {pendingProposal && (pendingProposal.caseTheoryLine || pendingProposal.agreedSummaryDetailed) && (
          <div className="mb-3 rounded-lg border-2 border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-foreground mb-2">Proposed (Agree / Edit / Reject)</p>
            {pendingProposal.caseTheoryLine && (
              <p className="text-sm font-medium text-foreground mb-1">{pendingProposal.caseTheoryLine}</p>
            )}
            {pendingProposal.agreedSummaryDetailed && (
              <p className="text-sm text-foreground whitespace-pre-wrap">{pendingProposal.agreedSummaryDetailed}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={handleAcceptProposal} disabled={proposalSaving}>
                <Check className="h-3.5 w-3.5 mr-1" />
                {proposalSaving ? "Saving…" : "Agree"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditingProposal({ ...pendingProposal })}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPendingProposal(null)}>
                <X className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        )}
        {editingProposal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-3 border-b border-border font-medium text-sm">Edit proposal</div>
              <div className="p-3 overflow-y-auto flex-1 space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Case theory line</label>
                  <textarea
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm min-h-[60px]"
                    value={editingProposal.caseTheoryLine ?? ""}
                    onChange={(e) => setEditingProposal((p) => (p ? { ...p, caseTheoryLine: e.target.value } : null))}
                    placeholder="One sentence"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Agreed summary (detailed)</label>
                  <textarea
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm min-h-[120px]"
                    value={editingProposal.agreedSummaryDetailed ?? ""}
                    onChange={(e) => setEditingProposal((p) => (p ? { ...p, agreedSummaryDetailed: e.target.value } : null))}
                    placeholder="2–3 paragraphs"
                  />
                </div>
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!editingProposal || !caseId || proposalSaving) return;
                    setProposalSaving(true);
                    try {
                      const res = await fetch(`/api/criminal/${caseId}/agreed-summary`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          caseTheoryLine: editingProposal.caseTheoryLine?.trim() || null,
                          agreedSummaryDetailed: editingProposal.agreedSummaryDetailed?.trim() || null,
                        }),
                      });
                      if (res.ok) {
                        setPendingProposal(null);
                        setEditingProposal(null);
                      }
                    } finally {
                      setProposalSaving(false);
                    }
                  }}
                  disabled={proposalSaving}
                >
                  {proposalSaving ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingProposal(null)}>Cancel</Button>
              </div>
            </Card>
          </div>
        )}
        <div className="flex flex-col">
          <div
            ref={messagesScrollRef}
            className="min-h-[80px] max-h-64 overflow-y-auto overflow-x-hidden space-y-2 mb-3 pr-1 overscroll-contain"
          >
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`rounded-2xl px-3 py-2 text-sm max-w-[90%] ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground rounded-br-md" : "mr-auto bg-muted/60 text-foreground rounded-bl-md"}`}
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="mr-auto rounded-2xl rounded-bl-md px-3 py-2 bg-muted/60 text-muted-foreground text-sm flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Thinking…</span>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
              placeholder="Ask or /disclosure, /timeline, /plan, /propose"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              disabled={chatLoading}
            />
            <Button type="button" size="sm" className="rounded-full shrink-0" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
              {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <div className="mt-2 pt-2 border-t border-border/50">
            <VerdictRatingBlock caseId={caseId} target="chat" />
          </div>
        </div>
      </div>
    </Card>
  );
}
