"use client";

import { useState } from "react";
import {
  Scale,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import type { HearingPrepPack, HearingPrepSection } from "@/lib/types/casebrain";

type HearingPrepPanelProps = {
  caseId: string;
};

const priorityColors: Record<string, string> = {
  essential: "bg-red-500/20 text-red-400",
  recommended: "bg-amber-500/20 text-amber-400",
  optional: "bg-slate-500/20 text-slate-400",
};

export function HearingPrepPanel({ caseId }: HearingPrepPanelProps) {
  const [pack, setPack] = useState<HearingPrepPack | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hearingType, setHearingType] = useState("");
  const [hearingDate, setHearingDate] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const { push: showToast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/hearing-prep`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hearingType: hearingType || undefined,
          hearingDate: hearingDate || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate");

      const data = await res.json();
      setPack(data.pack);
      // Expand essential sections by default
      setExpandedSections(new Set(
        data.pack.sections
          .filter((s: HearingPrepSection) => s.priority === "essential")
          .map((s: HearingPrepSection) => s.id)
      ));
      showToast("Hearing pack generated");
    } catch (error) {
      console.error("Failed to generate:", error);
      showToast("Failed to generate hearing pack");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAll = async () => {
    if (!pack) return;

    const fullText = pack.sections
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
    if (pack) {
      setExpandedSections(new Set(pack.sections.map(s => s.id)));
    }
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  if (!pack) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <span>Hearing Preparation</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-accent/70">
            Generate a comprehensive hearing preparation pack including:
          </p>
          <ul className="ml-4 grid grid-cols-2 gap-1 text-xs text-accent/60">
            <li>• Case overview</li>
            <li>• Chronology</li>
            <li>• Key issues</li>
            <li>• Evidence summary</li>
            <li>• Contradictions</li>
            <li>• Opponent analysis</li>
            <li>• Risks & limitation</li>
            <li>• Draft questions</li>
            <li>• Draft submissions</li>
            <li>• Pre-hearing checklist</li>
          </ul>

          {/* Optional hearing details */}
          <div className="space-y-3 rounded-xl border border-primary/10 bg-surface-muted/50 p-3">
            <p className="text-xs text-accent/50">Optional: Add hearing details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-accent/60">Hearing Type</label>
                <select
                  value={hearingType}
                  onChange={(e) => setHearingType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-primary/20 bg-surface-muted px-3 py-2 text-sm text-accent"
                >
                  <option value="">Select type...</option>
                  <option value="CMC">Case Management Conference</option>
                  <option value="CCMC">Costs & Case Management</option>
                  <option value="PTR">Pre-Trial Review</option>
                  <option value="Trial">Trial</option>
                  <option value="Disposal">Disposal Hearing</option>
                  <option value="Application">Application</option>
                  <option value="Assessment">Detailed Assessment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-accent/60">Hearing Date</label>
                <input
                  type="date"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-primary/20 bg-surface-muted px-3 py-2 text-sm text-accent"
                />
              </div>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Pack...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Generate Hearing Pack
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
            <span>Hearing Preparation</span>
            <Badge variant="success" className="text-[10px]">
              Generated
            </Badge>
          </div>
          {pack.hearingDate && (
            <div className="flex items-center gap-1.5 text-xs text-accent/60">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(pack.hearingDate).toLocaleDateString("en-GB")}
            </div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Hearing info */}
        {(pack.hearingType || pack.hearingDate) && (
          <div className="flex flex-wrap gap-2">
            {pack.hearingType && (
              <Badge variant="primary">{pack.hearingType}</Badge>
            )}
          </div>
        )}

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
          >
            Expand All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={collapseAll}
          >
            Collapse All
          </Button>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {pack.sections.map((section, idx) => (
            <SectionAccordion
              key={section.id}
              section={section}
              index={idx + 1}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
            />
          ))}
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-accent/40">
          Generated: {new Date(pack.generatedAt).toLocaleString("en-GB")}
        </p>
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
  section: HearingPrepSection;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(`${section.title}\n\n${section.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="rounded-xl border border-primary/10 bg-surface-muted/30 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {index}
          </span>
          <span className="font-medium text-accent">{section.title}</span>
          {section.priority && (
            <Badge className={`text-[10px] ${priorityColors[section.priority]}`}>
              {section.priority}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
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

