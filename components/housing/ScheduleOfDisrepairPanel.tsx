"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";
import { FileText, Download } from "lucide-react";

type ScheduleOfDisrepairPanelProps = {
  caseId: string;
};

export function ScheduleOfDisrepairPanel({ caseId }: ScheduleOfDisrepairPanelProps) {
  const [loading, setLoading] = useState(false);
  const pushToast = useToast((state) => state.push);

  const downloadSchedule = async (format: "json" | "text") => {
    setLoading(true);
    try {
      const response = await fetch(`/api/housing/schedule/${caseId}?format=${format}`);
      if (!response.ok) throw new Error("Failed to generate schedule");

      if (format === "text") {
        const text = await response.text();
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `schedule_of_disrepair_${caseId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `schedule_of_disrepair_${caseId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      pushToast("Schedule of Disrepair downloaded.");
    } catch (error) {
      pushToast("Failed to generate schedule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Schedule of Disrepair"
      description="Court-ready detailed list of all defects with locations, severity, and repair status"
    >
      <div className="space-y-3">
        <p className="text-sm text-accent/70">
          Generate a detailed Schedule of Disrepair listing all defects, their locations, severity,
          dates reported, and repair status. Suitable for court bundles and disclosure.
        </p>
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={() => downloadSchedule("text")}
            disabled={loading}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download as Text
          </Button>
          <Button
            variant="secondary"
            onClick={() => downloadSchedule("json")}
            disabled={loading}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Download as JSON
          </Button>
        </div>
      </div>
    </Card>
  );
}

