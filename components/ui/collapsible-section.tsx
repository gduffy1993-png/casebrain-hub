"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
};

export function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
  className = "",
  icon,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between gap-2 text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium text-white/90">{title}</CardTitle>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-accent/50" />
          ) : (
            <ChevronDown className="h-4 w-4 text-accent/50" />
          )}
        </button>
        {description && !isOpen && (
          <p className="text-xs text-accent/60 mt-1">{description}</p>
        )}
      </CardHeader>
      {isOpen && <CardContent>{children}</CardContent>}
    </Card>
  );
}

