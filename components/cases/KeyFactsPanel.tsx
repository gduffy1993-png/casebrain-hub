"use client";

import { useState, useEffect } from "react";
import {
  User,
  Users,
  Calendar,
  AlertTriangle,
  Target,
  Briefcase,
  Scale,
  Building,
  Clock,
  FileText,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KeyFactsSummary, KeyFactsKeyDate } from "@/lib/types/casebrain";
import type { ExtractedCaseFacts } from "@/types";

type KeyFactsPanelProps = {
  caseId: string;
};

const stageBadgeColors: Record<string, string> = {
  pre_action: "bg-blue-500/20 text-blue-400",
  issued: "bg-amber-500/20 text-amber-400",
  post_issue: "bg-orange-500/20 text-orange-400",
  trial_prep: "bg-red-500/20 text-red-400",
  settled: "bg-green-500/20 text-green-400",
  closed: "bg-slate-500/20 text-slate-400",
  other: "bg-slate-500/20 text-slate-400",
};

const fundingBadgeColors: Record<string, string> = {
  cfa: "bg-purple-500/20 text-purple-400",
  private: "bg-emerald-500/20 text-emerald-400",
  legal_aid: "bg-teal-500/20 text-teal-400",
  dba: "bg-indigo-500/20 text-indigo-400",
  after_event: "bg-cyan-500/20 text-cyan-400",
  other: "bg-slate-500/20 text-slate-400",
  unknown: "bg-slate-500/20 text-slate-400",
};

export function CaseKeyFactsPanel({ caseId }: KeyFactsPanelProps) {
  const [keyFacts, setKeyFacts] = useState<KeyFactsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fallbackData, setFallbackData] = useState<{
    parties: Array<{ name: string; role: string }>;
    dates: Array<{ label: string; date: string }>;
    amounts: Array<{ label: string; value: number; currency: string }>;
  } | null>(null);

  useEffect(() => {
    const fetchKeyFacts = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/key-facts`);
        if (res.ok) {
          const data = await res.json();
          setKeyFacts(data.keyFacts);
        } else {
          // Fallback: try to extract from documents
          try {
            const docsRes = await fetch(`/api/cases/${caseId}/documents`);
            if (docsRes.ok) {
              const docsData = await docsRes.json();
              const documents = docsData.documents ?? [];
              
              // Extract basic facts from documents
              const parties: Array<{ name: string; role: string }> = [];
              const dates: Array<{ label: string; date: string }> = [];
              const amounts: Array<{ label: string; value: number; currency: string }> = [];
              
              for (const doc of documents) {
                if (doc.extracted_json && typeof doc.extracted_json === "object") {
                  const extracted = doc.extracted_json as any;
                  
                  // Extract parties
                  if (Array.isArray(extracted.parties)) {
                    for (const party of extracted.parties) {
                      if (party.name && !parties.find(p => p.name === party.name)) {
                        parties.push({ name: party.name, role: party.role || "other" });
                      }
                    }
                  }
                  
                  // Extract dates
                  if (Array.isArray(extracted.dates)) {
                    for (const date of extracted.dates) {
                      if (date.label && date.isoDate) {
                        dates.push({ label: date.label, date: date.isoDate });
                      }
                    }
                  }
                  
                  // Extract amounts
                  if (Array.isArray(extracted.amounts)) {
                    for (const amount of extracted.amounts) {
                      if (amount.label && amount.value) {
                        amounts.push({
                          label: amount.label,
                          value: amount.value,
                          currency: amount.currency || "GBP",
                        });
                      }
                    }
                  }
                }
              }
              
              if (parties.length > 0 || dates.length > 0 || amounts.length > 0) {
                setFallbackData({ parties, dates, amounts });
              } else {
                setError("Failed to load key facts");
              }
            } else {
              setError("Failed to load key facts");
            }
          } catch (fallbackErr) {
            console.error("Fallback extraction failed:", fallbackErr);
            setError("Failed to load key facts");
          }
        }
      } catch (err) {
        console.error("Failed to fetch key facts:", err);
        // Try fallback extraction
        try {
          const docsRes = await fetch(`/api/cases/${caseId}/documents`);
          if (docsRes.ok) {
            const docsData = await docsRes.json();
            const documents = docsData.documents ?? [];
            
            const parties: Array<{ name: string; role: string }> = [];
            const dates: Array<{ label: string; date: string }> = [];
            const amounts: Array<{ label: string; value: number; currency: string }> = [];
            
            for (const doc of documents) {
              if (doc.extracted_json && typeof doc.extracted_json === "object") {
                const extracted = doc.extracted_json as any;
                if (Array.isArray(extracted.parties)) {
                  for (const party of extracted.parties) {
                    if (party.name && !parties.find(p => p.name === party.name)) {
                      parties.push({ name: party.name, role: party.role || "other" });
                    }
                  }
                }
                if (Array.isArray(extracted.dates)) {
                  for (const date of extracted.dates) {
                    if (date.label && date.isoDate) {
                      dates.push({ label: date.label, date: date.isoDate });
                    }
                  }
                }
                if (Array.isArray(extracted.amounts)) {
                  for (const amount of extracted.amounts) {
                    if (amount.label && amount.value) {
                      amounts.push({
                        label: amount.label,
                        value: amount.value,
                        currency: amount.currency || "GBP",
                      });
                    }
                  }
                }
              }
            }
            
            if (parties.length > 0 || dates.length > 0 || amounts.length > 0) {
              setFallbackData({ parties, dates, amounts });
            } else {
              setError("Failed to load key facts");
            }
          } else {
            setError("Failed to load key facts");
          }
        } catch (fallbackErr) {
          setError("Failed to load key facts");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchKeyFacts();
  }, [caseId]);

  if (isLoading) {
    return (
      <Card title="Key Facts">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  // If we have fallback data, render it
  if ((error || !keyFacts) && fallbackData) {
    return (
      <Card title="Key Facts">
        <div className="space-y-4">
          {fallbackData.parties.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-accent/50">Parties</p>
              <div className="space-y-1">
                {fallbackData.parties.map((party, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-accent/80">
                    <Users className="h-4 w-4 text-primary/50" />
                    <span className="font-medium">{party.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {party.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {fallbackData.dates.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-accent/50">Key Dates</p>
              <div className="space-y-1">
                {fallbackData.dates.slice(0, 5).map((date, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-accent/80">
                    <Calendar className="h-4 w-4 text-primary/50" />
                    <span>{new Date(date.date).toLocaleDateString()}</span>
                    <span className="text-accent/60">—</span>
                    <span>{date.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {fallbackData.amounts.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-accent/50">Amounts</p>
              <div className="space-y-1">
                {fallbackData.amounts.map((amount, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-accent/80">
                    <Target className="h-4 w-4 text-primary/50" />
                    <span>{amount.label}:</span>
                    <span className="font-medium">
                      {new Intl.NumberFormat("en-GB", {
                        style: "currency",
                        currency: amount.currency,
                      }).format(amount.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (error || !keyFacts) {
    return (
      <Card title="Key Facts">
        <p className="text-sm text-accent/60">
          {error ?? "No key facts available for this case."}
        </p>
      </Card>
    );
  }

  const stageLabel = keyFacts.stage.replace(/_/g, " ");
  const fundingLabel = keyFacts.fundingType.replace(/_/g, " ");

  return (
    <Card
      title={
        <div className="flex items-center gap-3">
          <span>Key Facts</span>
          <Badge className={stageBadgeColors[keyFacts.stage] ?? stageBadgeColors.other}>
            {stageLabel}
          </Badge>
          {keyFacts.fundingType !== "unknown" && (
            <Badge className={fundingBadgeColors[keyFacts.fundingType] ?? fundingBadgeColors.other}>
              {fundingLabel}
            </Badge>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {/* Parties Section */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Client */}
          <div className="rounded-xl border border-primary/10 bg-surface-muted/50 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent/50">
              <User className="h-3.5 w-3.5" />
              <span>Client</span>
            </div>
            <p className="mt-1 font-medium text-accent">
              {keyFacts.clientName ?? "Not specified"}
            </p>
          </div>

          {/* Opponent */}
          <div className="rounded-xl border border-danger/10 bg-danger/5 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-accent/50">
              <Users className="h-3.5 w-3.5" />
              <span>Opponent</span>
            </div>
            <p className="mt-1 font-medium text-accent">
              {keyFacts.opponentName ?? "Not specified"}
            </p>
          </div>
        </div>

        {/* Claim Details */}
        <div className="grid gap-4 sm:grid-cols-3">
          {keyFacts.claimType && (
            <div className="flex items-start gap-2">
              <Briefcase className="mt-0.5 h-4 w-4 text-primary/70" />
              <div>
                <p className="text-xs text-accent/50">Claim Type</p>
                <p className="text-sm font-medium text-accent">{keyFacts.claimType}</p>
              </div>
            </div>
          )}
          {keyFacts.causeOfAction && (
            <div className="flex items-start gap-2">
              <Scale className="mt-0.5 h-4 w-4 text-primary/70" />
              <div>
                <p className="text-xs text-accent/50">Cause of Action</p>
                <p className="text-sm font-medium text-accent">{keyFacts.causeOfAction}</p>
              </div>
            </div>
          )}
          {keyFacts.approxValue && (
            <div className="flex items-start gap-2">
              <FileText className="mt-0.5 h-4 w-4 text-primary/70" />
              <div>
                <p className="text-xs text-accent/50">Value</p>
                <p className="text-sm font-medium text-accent">{keyFacts.approxValue}</p>
              </div>
            </div>
          )}
          {keyFacts.courtName && (
            <div className="flex items-start gap-2">
              <Building className="mt-0.5 h-4 w-4 text-primary/70" />
              <div>
                <p className="text-xs text-accent/50">Court</p>
                <p className="text-sm font-medium text-accent">{keyFacts.courtName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Headline Summary */}
        {keyFacts.headlineSummary && (
          <div className="rounded-xl border border-primary/10 bg-gradient-to-r from-primary/5 to-transparent p-4">
            <p className="text-xs uppercase tracking-wide text-accent/50">Summary</p>
            <p className="mt-1 text-sm text-accent">{keyFacts.headlineSummary}</p>
          </div>
        )}

        {/* Client Objectives */}
        {keyFacts.whatClientWants && (
          <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-secondary" />
              <p className="text-xs uppercase tracking-wide text-accent/50">What Client Wants</p>
            </div>
            <p className="mt-1 text-sm text-accent">{keyFacts.whatClientWants}</p>
          </div>
        )}

        {/* Key Dates */}
        {keyFacts.keyDates.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary/70" />
              <p className="text-xs uppercase tracking-wide text-accent/50">Key Dates</p>
            </div>
            <div className="space-y-2">
              {keyFacts.keyDates.map((kd, idx) => (
                <KeyDateRow key={idx} keyDate={kd} />
              ))}
            </div>
          </div>
        )}

        {/* Primary Issues */}
        {keyFacts.primaryIssues.length > 0 && (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-accent/50">Primary Issues</p>
            <ul className="space-y-1">
              {keyFacts.primaryIssues.map((issue, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-accent/80">
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-primary/50" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Risks */}
        {keyFacts.mainRisks.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-danger/70" />
              <p className="text-xs uppercase tracking-wide text-accent/50">Key Risks</p>
            </div>
            <ul className="space-y-1">
              {keyFacts.mainRisks.map((risk, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-danger/10 bg-danger/5 px-3 py-2 text-sm text-danger"
                >
                  {risk}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {keyFacts.nextStepsBrief && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-wide text-accent/50">Next Step</p>
            </div>
            <p className="mt-1 text-sm font-medium text-accent">{keyFacts.nextStepsBrief}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function KeyDateRow({ keyDate }: { keyDate: KeyFactsKeyDate }) {
  const formattedDate = new Date(keyDate.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
        keyDate.isUrgent
          ? "border-danger/30 bg-danger/10"
          : keyDate.isPast
            ? "border-slate-500/20 bg-slate-500/5"
            : "border-primary/20 bg-primary/5"
      }`}
    >
      <span className="text-accent/70">{keyDate.label}</span>
      <div className="flex items-center gap-2">
        <span className={keyDate.isUrgent ? "font-semibold text-danger" : "text-accent"}>
          {formattedDate}
        </span>
        {keyDate.isUrgent && (
          <Badge variant="danger" className="text-[10px]">
            URGENT
          </Badge>
        )}
      </div>
    </div>
  );
}

