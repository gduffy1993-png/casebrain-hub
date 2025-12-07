"use client";

import { useState, useEffect } from "react";
import { DeadlineCalendar } from "./DeadlineCalendar";
import type { UnifiedDeadline } from "@/lib/core/deadline-management";

type DeadlineCalendarWrapperProps = {
  caseId: string;
};

export function DeadlineCalendarWrapper({ caseId }: DeadlineCalendarWrapperProps) {
  const [deadlines, setDeadlines] = useState<UnifiedDeadline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeadlines() {
      try {
        const res = await fetch(`/api/cases/${caseId}/deadlines`);
        if (res.ok) {
          const data = await res.json();
          setDeadlines(data.deadlines || []);
        }
      } catch (error) {
        console.error("Failed to fetch deadlines:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDeadlines();
  }, [caseId]);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading calendar...</div>;
  }

  return <DeadlineCalendar deadlines={deadlines} />;
}

