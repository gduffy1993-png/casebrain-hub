"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertTriangle, FileText } from "lucide-react";
import type { PracticeArea } from "@/lib/types/casebrain";

type PreActionProtocolChecklistProps = {
  caseId: string;
  practiceArea: PracticeArea;
  onComplete?: () => void;
};

type ProtocolItem = {
  id: string;
  label: string;
  description: string;
  required: boolean;
  completed: boolean;
  deadline?: string;
};

const PROTOCOL_ITEMS: Record<PracticeArea, ProtocolItem[]> = {
  housing_disrepair: [
    {
      id: "letter-before-action",
      label: "Letter Before Action",
      description: "Send formal letter before action to landlord",
      required: true,
      completed: false,
    },
    {
      id: "pre-action-protocol",
      label: "Pre-Action Protocol Compliance",
      description: "Follow Pre-Action Protocol for Housing Disrepair",
      required: true,
      completed: false,
    },
    {
      id: "evidence-bundle",
      label: "Evidence Bundle",
      description: "Compile evidence bundle (photos, reports, correspondence)",
      required: true,
      completed: false,
    },
    {
      id: "expert-report",
      label: "Expert Report",
      description: "Obtain expert surveyor/engineer report if required",
      required: false,
      completed: false,
    },
    {
      id: "medical-evidence",
      label: "Medical Evidence",
      description: "Obtain medical evidence if health impact claimed",
      required: false,
      completed: false,
    },
  ],
  personal_injury: [
    {
      id: "cnf",
      label: "Claim Notification Form (CNF)",
      description: "Submit CNF to defendant within protocol timeframes",
      required: true,
      completed: false,
    },
    {
      id: "medical-evidence",
      label: "Medical Evidence",
      description: "Obtain medical report from MedCo expert",
      required: true,
      completed: false,
    },
    {
      id: "liability-admission",
      label: "Liability Response",
      description: "Await defendant's liability response",
      required: true,
      completed: false,
    },
    {
      id: "quantum-pack",
      label: "Quantum Pack",
      description: "Prepare and serve quantum pack with schedule of loss",
      required: true,
      completed: false,
    },
    {
      id: "settlement-negotiations",
      label: "Settlement Negotiations",
      description: "Engage in settlement negotiations if liability admitted",
      required: false,
      completed: false,
    },
  ],
  clinical_negligence: [
    {
      id: "letter-of-claim",
      label: "Letter of Claim",
      description: "Send detailed letter of claim to defendant",
      required: true,
      completed: false,
    },
    {
      id: "expert-evidence",
      label: "Expert Evidence",
      description: "Obtain expert reports (liability, causation, quantum)",
      required: true,
      completed: false,
    },
    {
      id: "letter-of-response",
      label: "Letter of Response",
      description: "Await defendant's letter of response",
      required: true,
      completed: false,
    },
    {
      id: "quantum-pack",
      label: "Quantum Pack",
      description: "Prepare and serve quantum pack",
      required: true,
      completed: false,
    },
    {
      id: "pre-action-meeting",
      label: "Pre-Action Meeting",
      description: "Attend pre-action meeting if required",
      required: false,
      completed: false,
    },
  ],
  family: [
    {
      id: "mediation",
      label: "Mediation",
      description: "Attempt mediation before court proceedings",
      required: true,
      completed: false,
    },
    {
      id: "pre-action-correspondence",
      label: "Pre-Action Correspondence",
      description: "Send pre-action correspondence",
      required: true,
      completed: false,
    },
  ],
  criminal: [
    {
      id: "pace-compliance-check",
      label: "PACE Compliance Check",
      description: "Review PACE compliance (caution, interview recording, solicitor access)",
      required: true,
      completed: false,
    },
    {
      id: "disclosure-request",
      label: "Early Disclosure Request",
      description: "Request initial disclosure from prosecution",
      required: true,
      completed: false,
    },
    {
      id: "defense-evidence",
      label: "Defense Evidence Gathering",
      description: "Gather defense evidence (witnesses, alibis, character evidence)",
      required: true,
      completed: false,
    },
    {
      id: "bail-conditions",
      label: "Bail Conditions Review",
      description: "Review and ensure compliance with bail conditions",
      required: true,
      completed: false,
    },
    {
      id: "defense-statement",
      label: "Defense Statement",
      description: "Prepare and serve defense statement if required",
      required: false,
      completed: false,
    },
  ],
  other_litigation: [
    {
      id: "letter-before-action",
      label: "Letter Before Action",
      description: "Send letter before action",
      required: true,
      completed: false,
    },
    {
      id: "pre-action-protocol",
      label: "Pre-Action Protocol",
      description: "Follow relevant pre-action protocol",
      required: true,
      completed: false,
    },
    {
      id: "evidence-gathering",
      label: "Evidence Gathering",
      description: "Gather and organize evidence",
      required: true,
      completed: false,
    },
  ],
};

export function PreActionProtocolChecklist({
  caseId,
  practiceArea,
  onComplete,
}: PreActionProtocolChecklistProps) {
  const [items, setItems] = useState<ProtocolItem[]>(
    PROTOCOL_ITEMS[practiceArea] || PROTOCOL_ITEMS.other_litigation
  );
  
  const toggleItem = async (itemId: string) => {
    const updated = items.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setItems(updated);
    
    // Save to database
    try {
      await fetch(`/api/cases/${caseId}/protocol-checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, completed: !items.find((i) => i.id === itemId)?.completed }),
      });
      
      if (onComplete && updated.every((i) => !i.required || i.completed)) {
        onComplete();
      }
    } catch (error) {
      console.error("Failed to save checklist:", error);
    }
  };
  
  const requiredItems = items.filter((i) => i.required);
  const completedRequired = requiredItems.filter((i) => i.completed).length;
  const allRequiredComplete = requiredItems.length > 0 && completedRequired === requiredItems.length;
  
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Pre-Action Protocol Checklist
        </div>
      }
      description="Ensure compliance with pre-action protocols"
    >
      <div className="space-y-4">
        {/* Progress Summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Required Items</span>
            <Badge variant={allRequiredComplete ? "success" : "warning"} size="sm">
              {completedRequired} / {requiredItems.length}
            </Badge>
          </div>
          {allRequiredComplete && (
            <div className="flex items-center gap-2 mt-2 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" />
              <span>All required items complete</span>
            </div>
          )}
        </div>
        
        {/* Checklist Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                item.completed
                  ? "border-green-500/30 bg-green-500/10"
                  : "border-border bg-muted/30"
              }`}
            >
              <button
                onClick={() => toggleItem(item.id)}
                className="mt-0.5 shrink-0"
              >
                {item.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${item.completed ? "text-green-400 line-through" : "text-foreground"}`}>
                    {item.label}
                  </span>
                  {item.required && (
                    <Badge variant="danger" size="sm">Required</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                {item.deadline && (
                  <p className="text-xs text-amber-400 mt-1">
                    Deadline: {new Date(item.deadline).toLocaleDateString("en-GB")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Warning if required items incomplete */}
        {!allRequiredComplete && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-400">Protocol Compliance Required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete all required items before issuing proceedings to avoid cost penalties.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

