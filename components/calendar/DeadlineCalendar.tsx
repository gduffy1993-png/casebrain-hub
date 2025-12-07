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

export function DeadlineCalendar({ deadlines, className = "" }: DeadlineCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();
  
  // Group deadlines by date
  const deadlinesByDate = new Map<string, UnifiedDeadline[]>();
  deadlines.forEach((deadline) => {
    const dateKey = new Date(deadline.dueDate).toISOString().split("T")[0];
    if (!deadlinesByDate.has(dateKey)) {
      deadlinesByDate.set(dateKey, []);
    }
    deadlinesByDate.get(dateKey)!.push(deadline);
  });
  
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
  
  const getDeadlinesForDay = (day: number): UnifiedDeadline[] => {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().split("T")[0];
    return deadlinesByDate.get(dateKey) || [];
  };
  
  const getPriorityColor = (deadline: UnifiedDeadline) => {
    const daysUntil = Math.ceil(
      (new Date(deadline.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntil < 0) return "bg-red-500/20 border-red-500/50 text-red-400";
    if (daysUntil <= 3) return "bg-orange-500/20 border-orange-500/50 text-orange-400";
    if (daysUntil <= 7) return "bg-amber-500/20 border-amber-500/50 text-amber-400";
    return "bg-blue-500/20 border-blue-500/50 text-blue-400";
  };
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Deadline Calendar
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
            <div key={`empty-${i}`} className="p-2" />
          ))}
          
          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayDeadlines = getDeadlinesForDay(day);
            const todayClass = isToday(day) ? "ring-2 ring-primary" : "";
            
            return (
              <div
                key={day}
                className={`min-h-[80px] p-1 border border-border/50 rounded-lg ${todayClass} ${
                  dayDeadlines.length > 0 ? "bg-muted/30" : ""
                }`}
              >
                <div className="text-xs font-medium text-foreground mb-1">{day}</div>
                <div className="space-y-1">
                  {dayDeadlines.slice(0, 2).map((deadline) => (
                    <div
                      key={deadline.id}
                      className={`text-[10px] px-1 py-0.5 rounded border ${getPriorityColor(deadline)} truncate`}
                      title={deadline.title}
                    >
                      {deadline.title}
                    </div>
                  ))}
                  {dayDeadlines.length > 2 && (
                    <div className="text-[10px] text-muted-foreground">
                      +{dayDeadlines.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 pt-4 border-t border-border text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
            <span className="text-muted-foreground">Overdue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/50" />
            <span className="text-muted-foreground">Due in 1-3 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/50" />
            <span className="text-muted-foreground">Due in 4-7 days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500/50" />
            <span className="text-muted-foreground">Upcoming</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

