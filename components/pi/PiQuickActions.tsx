"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const ACTIONS = [
  { template: "cnf", label: "Draft CNF" },
  { template: "insurer_chaser", label: "Insurer chaser" },
  { template: "records_request", label: "Records request" },
  { template: "client_update", label: "Client update" },
] as const;

export function PiQuickActions({ caseId }: { caseId: string }) {
  const router = useRouter();

  const handleClick = (template: string) => {
    router.push(`/cases/${caseId}?piLetterPreview=${template}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ACTIONS.map((action) => (
        <Button
          key={action.template}
          size="sm"
          variant="secondary"
          className="px-3 py-1 text-[11px]"
          onClick={() => handleClick(action.template)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}


