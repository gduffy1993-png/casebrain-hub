"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type FoldSectionProps = {
  /** Section title shown in the header row */
  title: string;
  /** Initial open state */
  defaultOpen?: boolean;
  /** Optional id for anchor links (e.g. section-disclosure). Wrapper gets this id + scroll-mt for jump-to */
  id?: string;
  /** Content shown when expanded. Not rendered when collapsed. */
  children: React.ReactNode;
  /** Extra class on the outer wrapper (card) */
  className?: string;
};

/**
 * Accordion-style fold section: compact card with header row (title + chevron).
 * When collapsed, only the header is visible and children are not rendered.
 * Use id for Jump-to anchors; wrapper uses scroll-mt so scroll lands correctly.
 */
export function FoldSection({
  title,
  defaultOpen = false,
  id: sectionId,
  children,
  className = "",
}: FoldSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const content = (
    <Card
      className={`bg-surface/50 border-white/10 backdrop-blur-sm rounded-xl p-0 overflow-hidden ${className}`}
      data-fold-section
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:opacity-90 transition-opacity"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-white/90 truncate">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-accent/50 shrink-0" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 text-accent/50 shrink-0" aria-hidden />
        )}
      </button>
      {isOpen && <CardContent className="pt-0 pb-4 px-4 border-t border-white/10">{children}</CardContent>}
    </Card>
  );

  if (sectionId) {
    return (
      <div id={sectionId} className="scroll-mt-24">
        {content}
      </div>
    );
  }

  return content;
}
