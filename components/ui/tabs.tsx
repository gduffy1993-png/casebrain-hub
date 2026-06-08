"use client";

import type { ReactNode } from "react";
import { clsx } from "clsx";

export type TabItem = {
  id: string;
  label: string;
};

type CaseTabsProps = {
  /** Current active tab id (e.g. from URL ?tab=summary) */
  activeTab: string;
  /** All tab definitions in order */
  tabs: TabItem[];
  /** Callback when user selects a tab (e.g. update URL) */
  onTabChange: (tabId: string) => void;
  /** Content for the active tab */
  children: ReactNode;
  className?: string;
};

/**
 * Tab bar + content area. Controlled by parent (e.g. URL ?tab=).
 * Use for criminal case page tabs.
 */
export function CaseTabs({
  activeTab,
  tabs,
  onTabChange,
  children,
  className,
}: CaseTabsProps) {
  return (
    <div className={clsx("space-y-4", className)}>
      <div
        role="tablist"
        className="flex flex-wrap gap-1 border-b border-border pb-2"
        aria-label="Case sections"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                "px-3 py-2 text-sm font-medium rounded-t transition-colors",
                isActive
                  ? "bg-muted text-foreground border-b-2 border-primary -mb-0.5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        className="min-h-[200px]"
      >
        {children}
      </div>
    </div>
  );
}
