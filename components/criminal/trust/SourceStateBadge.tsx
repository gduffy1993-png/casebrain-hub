import { Badge } from "@/components/ui/badge";
import type { SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

const LABELS: Record<SourceStateKind, string> = {
  served: "Served",
  referred_only: "Referred only",
  missing: "Missing",
  not_safely_confirmed: "Not safely confirmed",
  provisional: "Provisional",
  needs_review: "Needs review",
};

const VARIANTS: Record<
  SourceStateKind,
  "success" | "warning" | "secondary" | "danger" | "outline"
> = {
  served: "success",
  referred_only: "warning",
  missing: "warning",
  not_safely_confirmed: "danger",
  provisional: "secondary",
  needs_review: "warning",
};

export function SourceStateBadge({
  state,
  size = "sm",
  className,
}: {
  state: SourceStateKind;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <Badge
      variant={VARIANTS[state]}
      size={size}
      className={className}
      data-testid={`source-state-badge-${state}`}
    >
      {LABELS[state]}
    </Badge>
  );
}

export function sourceStateBadgeLabel(state: SourceStateKind): string {
  return LABELS[state];
}
