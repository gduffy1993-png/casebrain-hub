"use client";

import { useState } from "react";
import {
  FileText,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Scale,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import type { InstructionsToCounselDraft, InstructionsToCounselSection } from "@/lib/types/casebrain";

type InstructionsToCounselPanelProps = {
  caseId: string;
  existingData?: {
    timeline?: Array<{ date: string; label: string; description?: string }>;
    keyIssues?: Array<{ id: string; label: string; category?: string | null; severity?: string }>;
    parties?: Array<{ name: string; role?: string }>;
    documents?: Array<{ id: string; name: string; type?: string | null }>;
    caseRecord?: { title?: string | null; summary?: string | null; practice_area?: string | null };
    clientName?: string;
    opponentName?: string;
  };
};

export function InstructionsToCounselPanel({ caseId, existingData }: InstructionsToCounselPanelProps) {
  const [draft, setDraft] = useState<InstructionsToCounselDraft | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const { push: showToast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/instructions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: existingData ? JSON.stringify(existingData) : undefined,
      });

      if (!res.ok) {
        throw new Error("Failed to generate instructions");
      }

      const data = await res.json();
      setDraft(data.draft);
      // Expand first few sections by default
      setExpandedSections(new Set(data.draft.sections.slice(0, 3).map((s: InstructionsToCounselSection) => s.id)));
      showToast("Instructions to Counsel generated");
    } catch (error) {
      console.error("Failed to generate instructions:", error);
      showToast("Failed to generate instructions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (!draft) return;

    const fullText = draft.sections
      .map(s => `${s.title}\n${"=".repeat(s.title.length)}\n\n${s.content}`)
      .join("\n\n\n");

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      showToast("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Failed to copy");
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const expandAll = () => {
    if (draft) {
      setExpandedSections(new Set(draft.sections.map(s => s.id)));
    }
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  if (!draft) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span>Instructions to Counsel</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-accent/70">
            Generate a comprehensive Instructions to Counsel document that aggregates:
          </p>
          <ul className="ml-4 space-y-1 text-xs text-accent/60">
            <li>• Parties & case overview</li>
            <li>• Client objectives & instructions</li>
            <li>• Background facts & chronology</li>
            <li>• Key issues in dispute</li>
            <li>• Evidence & bundle analysis</li>
            <li>• Risks, limitation & compliance</li>
            <li>• Opponent behaviour patterns</li>
            <li>• Questions for Counsel</li>
          </ul>

          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate Instructions Draft
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span>Instructions to Counsel</span>
            <Badge variant="success" className="text-[10px]">
              Generated
            </Badge>
          </div>
          <span className="text-xs text-accent/50">
            {new Date(draft.generatedAt).toLocaleString("en-GB")}
          </span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleGenerate}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Regenerate
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyAll}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy All
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={expandAll}
            className="gap-1.5"
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
            className="gap-1.5"
          >
            Collapse All
          </Button>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {draft.sections.map((section, idx) => (
            <SectionAccordion
              key={section.id}
              section={section}
              index={idx + 1}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function SectionAccordion({
  section,
  index,
  isExpanded,
  onToggle,
}: {
  section: InstructionsToCounselSection;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopySection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${section.title}\n\n${section.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  return (
    <div className="rounded-xl border border-primary/10 bg-surface-muted/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {index}
          </span>
          <span className="font-medium text-accent">{section.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySection}
            className="rounded-lg p-1.5 hover:bg-primary/10 transition-colors"
            title="Copy section"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-accent/50" />
            )}
          </button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-accent/50" />
          ) : (
            <ChevronDown className="h-4 w-4 text-accent/50" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-primary/10 p-4">
          <pre className="whitespace-pre-wrap font-mono text-xs text-accent/80 leading-relaxed">
            {section.content}
          </pre>
        </div>
      )}
    </div>
  );
}

