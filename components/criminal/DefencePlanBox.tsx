"use client";

/**
 * Single "Defence Plan" box – one source of truth for how we're fighting this case.
 * All content is from the committed strategy plan only (no DB position mixed in).
 * Renders narrative, attack order, how we're running it, key plan sections, and chat (Phase 3).
 */

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";

type DefencePlanBoxProps = {
  caseId: string;
  /** Plan from StrategyCommitmentPanel (built from committed strategy + coordinator). Null when not committed or not yet loaded. */
  plan: DefenceStrategyPlan | null;
  /** e.g. "Act Denial" – primary route label for header when plan exists */
  primaryRouteLabel?: string | null;
};

type ChatMessage = { role: "user" | "assistant"; content: string };

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
  if (plan.strategy_in_one_line) parts.push(plan.strategy_in_one_line);
  if (plan.attack_sequence) parts.push(plan.attack_sequence);
  if (plan.posture) parts.push(plan.posture);
  if (plan.primary_route?.label) parts.push(`Primary route: ${plan.primary_route.label}`);
  if (plan.prosecution_still_must_prove?.length) parts.push("Prosecution must prove: " + plan.prosecution_still_must_prove.join("; "));
  if (plan.defence_angles?.length) parts.push("Defence angles: " + plan.defence_angles.slice(0, 3).join("; "));
  return parts.join("\n");
}

export function DefencePlanBox({ caseId, plan, primaryRouteLabel }: DefencePlanBoxProps) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const handleSendChat = async () => {
    const msg = chatInput.trim();
    if (!msg || !plan || !caseId) return;
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/criminal/${caseId}/defence-plan-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: msg, planSummary: buildPlanSummary(plan) }),
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
        <p className="text-sm text-muted-foreground">
          Commit to a strategy in the Evidence column to see your Defence Plan here. This box shows how we're fighting the case from one source only.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-primary/25 bg-primary/5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Defence Plan</h3>
      {primaryRouteLabel && (
        <p className="text-xs text-muted-foreground mb-4">Primary route: {primaryRouteLabel}</p>
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

      <div className="mt-6 pt-4 border-t border-border/50">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ask about this plan</p>
        <p className="text-[11px] text-muted-foreground mb-2">Answers use your Defence Plan and criminal law (e.g. CPIA) only.</p>
        {chatMessages.length > 0 && (
          <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
            {chatMessages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary/15 text-foreground ml-4" : "bg-muted/50 text-foreground mr-4"}`}
              >
                {m.content}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendChat()}
            placeholder="e.g. What disclosure duties apply?"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            disabled={chatLoading}
          />
          <Button type="button" size="sm" onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>
            {chatLoading ? "…" : "Send"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
