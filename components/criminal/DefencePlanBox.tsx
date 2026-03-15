"use client";

/**
 * Single "Defence Plan" box – one source of truth for how we're fighting this case.
 * All content is from the committed strategy plan only (no DB position mixed in).
 * Renders narrative, attack order, how we're running it, and key plan sections.
 */

import { Card } from "@/components/ui/card";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";

type DefencePlanBoxProps = {
  /** Plan from StrategyCommitmentPanel (built from committed strategy + coordinator). Null when not committed or not yet loaded. */
  plan: DefenceStrategyPlan | null;
  /** e.g. "Act Denial" – primary route label for header when plan exists */
  primaryRouteLabel?: string | null;
};

function section(title: string, children: React.ReactNode) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{title}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function DefencePlanBox({ plan, primaryRouteLabel }: DefencePlanBoxProps) {
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
    </Card>
  );
}
