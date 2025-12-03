"use client";

import { usePersona } from "@/components/providers/usePersona";
import { Badge } from "@/components/ui/badge";

/**
 * Displays the current persona/role in a badge format
 * Shows "Viewing as: {displayLabel}"
 */
export function CurrentPersonaBadge() {
  const persona = usePersona();

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-accent/70 font-medium">Viewing as:</span>
      <Badge variant="outline" className="font-medium text-accent border-primary/30 bg-primary/5">
        {persona.displayLabel}
      </Badge>
    </div>
  );
}

