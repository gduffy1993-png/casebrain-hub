"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { workflowMuted } from "@/components/criminal/workflow/workflowUi";

export const REASONING_V2_SOURCE_BASIS_MAX = 180;
export const REASONING_V2_DEFAULT_LIST_PREVIEW = 4;

export function truncateSourceBasis(text: string, max = REASONING_V2_SOURCE_BASIS_MAX): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function ExpandableStringList({
  items,
  previewCount = REASONING_V2_DEFAULT_LIST_PREVIEW,
  className = "list-disc pl-4 space-y-1 text-xs text-slate-800 leading-relaxed",
}: {
  items: string[];
  previewCount?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  const shown = expanded ? visible : visible.slice(0, previewCount);
  const hidden = visible.length - previewCount;

  return (
    <div className="min-w-0">
      <ul className={className}>
        {shown.map((item, i) => (
          <li key={`${i}-${item.slice(0, 24)}`} className="break-words">
            {item}
          </li>
        ))}
      </ul>
      {visible.length > previewCount ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-1 mt-1 text-[11px] text-indigo-800"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : `Show ${hidden} more`}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptySectionNote({ children }: { children: ReactNode }) {
  return <p className={`text-xs ${workflowMuted}`}>{children}</p>;
}
