"use client";

import { Badge } from "@/components/ui/badge";

type MomentumState = "WEAK" | "BALANCED" | "STRONG (Expert Pending)" | "STRONG";

type MomentumBadgeProps = {
  state: MomentumState | string;
  size?: "sm" | "md";
};

export function MomentumBadge({ state, size = "md" }: MomentumBadgeProps) {
  // Map momentum state to badge variant
  const getVariant = (): "danger" | "warning" | "primary" | "success" => {
    if (state === "WEAK") return "danger";
    if (state === "BALANCED") return "warning";
    if (state === "STRONG (Expert Pending)" || state === "STRONG_PENDING") return "primary";
    if (state === "STRONG") return "success";
    return "warning";
  };

  // Format display text
  const getDisplayText = (): string => {
    if (state === "STRONG_PENDING") return "STRONG (EXPERT PENDING)";
    if (state === "STRONG (Expert Pending)") return "STRONG (EXPERT PENDING)";
    return state.toUpperCase();
  };

  return (
    <Badge variant={getVariant()} size={size} glow={state === "STRONG" || state === "STRONG (Expert Pending)"}>
      {getDisplayText()}
    </Badge>
  );
}

