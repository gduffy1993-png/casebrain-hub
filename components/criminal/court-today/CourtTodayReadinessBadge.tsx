"use client";

import { Badge } from "@/components/ui/badge";
import { readinessLabel } from "./courtCaseBrief";
import type { CourtReadiness } from "./types";

function readinessVariant(
  readiness: CourtReadiness,
): "success" | "warning" | "danger" | "secondary" {
  switch (readiness) {
    case "green":
      return "success";
    case "amber":
      return "warning";
    case "red":
      return "danger";
    case "review":
      return "secondary";
  }
}

export function CourtTodayReadinessBadge({
  readiness,
  pilotMode,
}: {
  readiness: CourtReadiness;
  pilotMode?: boolean;
}) {
  return (
    <Badge variant={readinessVariant(readiness)} size="sm" className="font-medium">
      {readinessLabel(readiness, { pilot: pilotMode })}
    </Badge>
  );
}
