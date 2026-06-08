"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, FileQuestion } from "lucide-react";
import type { DisclosureItem } from "@/lib/criminal/case-snapshot-adapter";

const PRIORITY_ORDER: Array<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW"> = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUS_SORT_ORDER = ["Outstanding", "Partial", "Received", "Unknown"];

type DisclosureTrackerTableProps = {
  items: DisclosureItem[];
};

function sortByPriorityThenStatus(items: DisclosureItem[]): DisclosureItem[] {
  return [...items].sort((a, b) => {
    const statusA = STATUS_SORT_ORDER.indexOf(a.status);
    const statusB = STATUS_SORT_ORDER.indexOf(b.status);
    if (statusA !== statusB) return statusA - statusB;
    if (a.status !== "Outstanding" && b.status !== "Outstanding") return 0;
    const priA = PRIORITY_ORDER.indexOf(a.priority ?? "MEDIUM");
    const priB = PRIORITY_ORDER.indexOf(b.priority ?? "MEDIUM");
    return priA - priB;
  });
}

export function DisclosureTrackerTable({ items }: DisclosureTrackerTableProps) {
  const sortedItems = useMemo(() => sortByPriorityThenStatus(items), [items]);

  if (items.length === 0) {
    return (
      <Card title="Disclosure Tracker" description="Track prosecution disclosure items">
        <div className="text-center py-4 text-muted-foreground text-sm">
          No disclosure items tracked yet
        </div>
      </Card>
    );
  }

  const getStatusIcon = (status: DisclosureItem["status"]) => {
    switch (status) {
      case "Received":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case "Partial":
        return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "Outstanding":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <FileQuestion className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: DisclosureItem["status"]) => {
    const colors = {
      Received: "bg-green-500/10 text-green-600 border-green-500/30",
      Partial: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      Outstanding: "bg-red-500/10 text-red-600 border-red-500/30",
      Unknown: "bg-muted/20 text-muted-foreground border-border/50",
    };
    return (
      <Badge className={`text-xs border ${colors[status] || colors.Unknown}`}>
        {status}
      </Badge>
    );
  };

  const getRowBg = (item: DisclosureItem) => {
    if (item.status !== "Outstanding") return undefined;
    if (item.priority === "CRITICAL") return "bg-red-500/5";
    if (item.priority === "HIGH") return "bg-amber-500/5";
    return undefined;
  };

  return (
    <Card title="Disclosure Tracker" description="Track prosecution disclosure items">
      <p className="text-xs text-muted-foreground mb-3">
        Outstanding disclosure items affecting the current strategy. Sorted: Critical → High → Satisfied.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-2 font-medium text-foreground">Item</th>
              <th className="text-left p-2 font-medium text-foreground">Priority</th>
              <th className="text-left p-2 font-medium text-foreground">Status</th>
              <th className="text-left p-2 font-medium text-foreground">Last Action</th>
              <th className="text-left p-2 font-medium text-foreground">Date</th>
              <th className="text-left p-2 font-medium text-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, idx) => (
              <tr
                key={idx}
                className={`border-b border-border/30 ${getRowBg(item) ?? ""}`}
              >
                <td className="p-2 text-foreground">{item.item}</td>
                <td className="p-2">
                  {item.priority ? (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        item.priority === "CRITICAL"
                          ? "bg-red-500/10 text-red-700 border-red-500/30"
                          : item.priority === "HIGH"
                            ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                            : "bg-muted/20 text-muted-foreground border-border/50"
                      }`}
                    >
                      {item.priority}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    {getStatusBadge(item.status)}
                  </div>
                </td>
                <td className="p-2 text-muted-foreground">
                  {item.lastAction || "—"}
                </td>
                <td className="p-2 text-muted-foreground">
                  {item.date ? new Date(item.date).toLocaleDateString() : "—"}
                </td>
                <td className="p-2 text-muted-foreground">
                  {item.notes || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

