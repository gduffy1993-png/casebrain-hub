"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function DashboardCard({
  title,
  icon,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={`border-border/60 bg-card/80 shadow-sm overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2 bg-muted/20">
        {icon}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className={`p-3 text-sm ${bodyClassName}`}>{children}</div>
    </Card>
  );
}
