"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, FileQuestion } from "lucide-react";
import type { DisclosureItem } from "@/lib/criminal/case-snapshot-adapter";

type DisclosureTrackerTableProps = {
  items: DisclosureItem[];
};

export function DisclosureTrackerTable({ items }: DisclosureTrackerTableProps) {
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

  return (
    <Card title="Disclosure Tracker" description="Track prosecution disclosure items">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-2 font-medium text-foreground">Item</th>
              <th className="text-left p-2 font-medium text-foreground">Status</th>
              <th className="text-left p-2 font-medium text-foreground">Last Action</th>
              <th className="text-left p-2 font-medium text-foreground">Date</th>
              <th className="text-left p-2 font-medium text-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-b border-border/30">
                <td className="p-2 text-foreground">{item.item}</td>
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

