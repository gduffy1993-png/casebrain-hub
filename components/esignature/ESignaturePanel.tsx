"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Send, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";

type ESignatureRequest = {
  id: string;
  caseId: string;
  documentId: string | null;
  provider: string;
  envelopeId: string | null;
  documentName: string;
  recipients: Array<{
    email: string;
    name: string;
    role: string;
    status: string;
    signedAt?: string;
  }>;
  status: string;
  sentAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
};

type ESignaturePanelProps = {
  caseId: string;
};

export function ESignaturePanel({ caseId }: ESignaturePanelProps) {
  const [requests, setRequests] = useState<ESignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      try {
        setLoading(true);
        const response = await fetch(`/api/esignature/cases/${caseId}`);
        if (response.ok) {
          const data = await response.json();
          setRequests(data);
        }
      } catch (error) {
        console.error("Failed to fetch e-signature requests:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, [caseId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "signed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "sent":
      case "delivered":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "declined":
      case "voided":
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "expired":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "signed":
        return <CheckCircle className="h-4 w-4" />;
      case "declined":
      case "voided":
      case "failed":
        return <XCircle className="h-4 w-4" />;
      case "sent":
      case "delivered":
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading e-signature requests...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">E-Signature Requests</h3>
        <Button size="sm">
          <Send className="h-4 w-4 mr-2" />
          Send for Signature
        </Button>
      </div>

      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No e-signature requests yet. Send a document for signature to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{request.documentName}</span>
                    <Badge className={getStatusColor(request.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Provider: {request.provider}
                  </p>
                  {request.sentAt && (
                    <p className="text-xs text-muted-foreground">
                      Sent: {format(new Date(request.sentAt), "dd MMM yyyy, HH:mm")}
                    </p>
                  )}
                  {request.completedAt && (
                    <p className="text-xs text-muted-foreground">
                      Completed: {format(new Date(request.completedAt), "dd MMM yyyy, HH:mm")}
                    </p>
                  )}
                </div>
              </div>

              {/* Recipients */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Recipients:</p>
                {request.recipients.map((recipient, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                  >
                    <span>
                      {recipient.name} ({recipient.email})
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        recipient.status === "signed"
                          ? "bg-green-500/20 text-green-400 border-green-500/30"
                          : ""
                      }
                    >
                      {recipient.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

