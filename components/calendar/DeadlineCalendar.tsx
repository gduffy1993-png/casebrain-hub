"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import type { UnifiedDeadline } from "@/lib/core/deadline-management";

type DeadlineCalendarProps = {
  deadlines: UnifiedDeadline[];
  className?: string;
};

type CalendarEvent = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  label: string;
  severity: "critical" | "high" | "medium" | "low";
  deadline: UnifiedDeadline;
};

/**
 * Map UnifiedDeadline to CalendarEvent format
 */
function mapDeadlinesToCalendarEvents(deadlines: UnifiedDeadline[]): CalendarEvent[] {
  return deadlines.map((deadline) => {
    // Map priority to severity
    let severity: "critical" | "high" | "medium" | "low" = "low";
    if (deadline.priority === "CRITICAL" || deadline.status === "OVERDUE") {
      severity = "critical";
    } else if (deadline.priority === "HIGH") {
      severity = "high";
    } else if (deadline.priority === "MEDIUM") {
      severity = "medium";
    }

    // Extract date in yyyy-mm-dd format
    const date = new Date(deadline.dueDate).toISOString().split("T")[0];

    return {
      id: deadline.id,
      date,
      label: deadline.title,
      severity,
      deadline,
    };
  });
}

/**
 * Get color classes for severity
 */
function getSeverityColor(severity: "critical" | "high" | "medium" | "low"): string {
  switch (severity) {
    case "critical":
      return "bg-red-500/20 border-red-500/50 text-red-400";
    case "high":
      return "bg-amber-500/20 border-amber-500/50 text-amber-400";
    case "medium":
      return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400";
    case "low":
      return "bg-blue-500/20 border-blue-500/50 text-blue-400";
    default:
      return "bg-slate-500/20 border-slate-500/50 text-slate-400";
  }
}

export function DeadlineCalendar({ deadlines, className = "" }: DeadlineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Convert deadlines to calendar events
  const events = mapDeadlinesToCalendarEvents(deadlines);

  // Group events by date
  const eventsByDate = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    if (!eventsByDate.has(event.date)) {
      eventsByDate.set(event.date, []);
    }
    eventsByDate.get(event.date)!.push(event);
  });

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  // getDay() returns 0 (Sunday) to 6 (Saturday)
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
    // Clear selection when changing months
    setSelectedDate(null);
  };

  const today = new Date();
  const isToday = (day: number) => {
    const date = new Date(year, month, day);
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().split("T")[0];
    return eventsByDate.get(dateKey) || [];
  };

  const handleDayClick = (day: number) => {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().split("T")[0];
    const dayEvents = getEventsForDay(day);

    if (dayEvents.length > 0) {
      // Toggle selection - if already selected, deselect
      setSelectedDate(selectedDate === dateKey ? null : dateKey);
    } else {
      // No events, clear selection
      setSelectedDate(null);
    }
  };

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

  // Format time if available (for display in selected events panel)
  const formatTime = (deadline: UnifiedDeadline): string | null => {
    const date = new Date(deadline.dueDate);
    // Only show time if it's not midnight (i.e., a specific time was set)
    if (date.getHours() === 0 && date.getMinutes() === 0) {
      return null;
    }
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Deadline Calendar</span>
        </div>
      }
      description="Visual calendar view of all case deadlines"
      className={className}
    >
      <div className="space-y-4">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth("prev")}
            className="text-foreground hover:text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold text-foreground">
            {monthNames[month]} {year}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigateMonth("next")}
            className="text-foreground hover:text-primary"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {dayNames.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-xs font-semibold text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2 min-h-[80px]" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayEvents = getEventsForDay(day);
            const date = new Date(year, month, day);
            const dateKey = date.toISOString().split("T")[0];
            const isSelected = selectedDate === dateKey;
            const todayClass = isToday(day) ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "";

            // Get highest severity for this day (for cell background)
            const highestSeverity =
              dayEvents.length > 0
                ? dayEvents.reduce((highest, event) => {
                    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                    return severityOrder[event.severity] > severityOrder[highest.severity]
                      ? event
                      : highest;
                  }).severity
                : null;

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`
                  min-h-[80px] p-1 border rounded-lg text-left transition-all
                  ${todayClass}
                  ${isSelected ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-card" : ""}
                  ${dayEvents.length > 0 ? "bg-muted/30 hover:bg-muted/50" : "hover:bg-muted/10"}
                  ${highestSeverity === "critical" ? "border-red-500/50" : ""}
                  ${highestSeverity === "high" ? "border-amber-500/50" : ""}
                  ${highestSeverity === "medium" ? "border-yellow-500/50" : ""}
                  ${highestSeverity === "low" ? "border-blue-500/50" : ""}
                  ${!highestSeverity ? "border-border/50" : ""}
                `}
              >
                <div className="text-xs font-medium text-foreground mb-1">{day}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className={`text-[10px] px-1 py-0.5 rounded border truncate ${getSeverityColor(
                        event.severity,
                      )}`}
                      title={event.label}
                    >
                      {event.label}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Date Events Panel */}
        {selectedEvents.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-sm font-semibold text-foreground mb-3">
              Deadlines for {new Date(selectedDate!).toLocaleDateString("en-GB", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </h4>
            <div className="space-y-2">
              {selectedEvents.map((event) => {
                const time = formatTime(event.deadline);
                return (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border ${getSeverityColor(event.severity)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{event.label}</div>
                        {event.deadline.description && (
                          <div className="text-xs mt-1 opacity-80">
                            {event.deadline.description}
                          </div>
                        )}
                        {time && (
                          <div className="text-xs mt-1 opacity-70">Due at {time}</div>
                        )}
                      </div>
                      <Badge
                        variant={
                          event.severity === "critical"
                            ? "danger"
                            : event.severity === "high"
                              ? "warning"
                              : "secondary"
                        }
                        className="text-xs"
                      >
                        {event.severity.toUpperCase()}
                      </Badge>
                    </div>
                    {event.deadline.sourceRule && (
                      <div className="text-xs mt-2 opacity-60">
                        Source: {event.deadline.sourceRule}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {deadlines.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No deadlines this month</p>
          </div>
        )}

        {/* Legend */}
        {deadlines.length > 0 && (
          <div className="flex items-center gap-4 pt-4 border-t border-border text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
              <span className="text-muted-foreground">Critical/Overdue</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50" />
              <span className="text-muted-foreground">High Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/50" />
              <span className="text-muted-foreground">Medium Priority</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50" />
              <span className="text-muted-foreground">Low Priority</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
