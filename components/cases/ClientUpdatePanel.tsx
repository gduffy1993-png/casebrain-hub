"use client";

import { useState, useEffect, useTransition } from "react";
import { 
  Mail, 
  RefreshCw, 
  Copy, 
  Check, 
  Clock,
  Loader2,
  FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import type { ClientUpdateDraft } from "@/lib/types/casebrain";

type ClientUpdatePanelProps = {
  caseId: string;
};

export function ClientUpdatePanel({ caseId }: ClientUpdatePanelProps) {
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dataUsed, setDataUsed] = useState<ClientUpdateDraft["dataUsed"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const { push: showToast } = useToast();

  // Fetch existing update on mount
  useEffect(() => {
    const fetchUpdate = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/client-update`);
        if (res.ok) {
          const data = await res.json();
          setLastGeneratedAt(data.lastGeneratedAt);
          setPreview(data.preview);
        }
      } catch (error) {
        console.error("Failed to fetch client update:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdate();
  }, [caseId]);

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/client-update`, {
          method: "POST",
        });

        if (res.ok) {
          const data = await res.json();
          setLastGeneratedAt(data.update.generatedAt);
          setPreview(data.update.body);
          setDataUsed(data.update.dataUsed);
          showToast("Client update generated!");
        } else {
          const data = await res.json();
          showToast(`Error: ${data.error}`);
        }
      } catch (error) {
        showToast("Failed to generate update");
      }
    });
  };

  const handleCopy = async () => {
    if (!preview) return;
    
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      showToast("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      showToast("Failed to copy");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-secondary" />
          Client Update Generator
        </div>
      }
      description="Generate a professional email update for your client"
      action={
        <div className="flex items-center gap-2">
          {preview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerate}
            disabled={isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {preview ? "Regenerate" : "Generate"}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : preview ? (
        <div className="space-y-4">
          {/* Metadata */}
          <div className="flex items-center gap-4 text-xs text-accent-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Generated: {formatDate(lastGeneratedAt!)}
            </span>
            {dataUsed && (
              <>
                <span>{dataUsed.tasksCompleted} tasks</span>
                <span>{dataUsed.lettersSent} letters</span>
                <span>{dataUsed.documentsAdded} docs</span>
              </>
            )}
          </div>

          {/* Email Preview */}
          <div className="rounded-xl border border-white/10 bg-surface-muted/50 p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3">
              <FileText className="h-4 w-4 text-accent-muted" />
              <span className="text-xs font-medium text-accent-soft">Email Preview</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-sm text-accent leading-relaxed">
                {preview}
              </pre>
            </div>
          </div>

          {/* Instructions */}
          <p className="text-xs text-accent-muted">
            Review the update above, make any necessary edits, then copy and paste into your email client.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
            <Mail className="h-7 w-7 text-secondary" />
          </div>
          <p className="mt-4 text-sm font-medium text-accent">No update generated yet</p>
          <p className="mt-1 text-xs text-accent-soft">
            Click "Generate" to create a client update email based on recent case activity
          </p>
        </div>
      )}
    </Card>
  );
}

