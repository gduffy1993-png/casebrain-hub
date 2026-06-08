"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, MailOpen, Star, Archive, Link2 } from "lucide-react";
import { format } from "date-fns";
import { EmailComposer } from "./EmailComposer";

type Email = {
  id: string;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  attachmentsCount: number;
  caseId: string | null;
  autoLinked: boolean;
};

type CaseEmailsPanelProps = {
  caseId: string;
};

export function CaseEmailsPanel({ caseId }: CaseEmailsPanelProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    async function fetchEmails() {
      try {
        setLoading(true);
        const response = await fetch(`/api/email/cases/${caseId}`);
        if (response.ok) {
          const data = await response.json();
          setEmails(data);
        }
      } catch (error) {
        console.error("Failed to fetch emails:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEmails();
  }, [caseId]);

  const handleMarkRead = async (emailId: string, isRead: boolean) => {
    try {
      const response = await fetch(`/api/email/${emailId}/read`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });

      if (response.ok) {
        setEmails((prev) =>
          prev.map((e) => (e.id === emailId ? { ...e, isRead } : e))
        );
      }
    } catch (error) {
      console.error("Failed to mark email as read:", error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading emails...</span>
        </div>
      </Card>
    );
  }

  if (showComposer) {
    return (
      <EmailComposer
        caseId={caseId}
        onSent={() => {
          setShowComposer(false);
          // Refresh emails
          fetch(`/api/email/cases/${caseId}`)
            .then((res) => res.json())
            .then((data) => setEmails(data))
            .catch(console.error);
        }}
        onCancel={() => setShowComposer(false)}
      />
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Case Emails</h3>
        <Button size="sm" onClick={() => setShowComposer(true)}>
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </Button>
      </div>

      {emails.length === 0 ? (
        <p className="text-sm text-muted-foreground">No emails for this case</p>
      ) : (
        <div className="space-y-2">
          {emails.map((email) => (
            <div
              key={email.id}
              className={`p-4 rounded-lg border ${
                email.isRead
                  ? "bg-muted/30 border-border/50"
                  : "bg-cyan-950/20 border-cyan-800/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {email.isRead ? (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-cyan-400" />
                    )}
                    <span
                      className={`font-medium ${
                        email.isRead ? "text-foreground" : "text-cyan-300"
                      }`}
                    >
                      {email.subject || "(No subject)"}
                    </span>
                    {email.autoLinked && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        Auto-linked
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    From: {email.fromName || email.fromEmail}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(email.receivedAt), "dd MMM yyyy, HH:mm")}
                    {email.attachmentsCount > 0 && (
                      <span className="ml-2">
                        • {email.attachmentsCount} attachment
                        {email.attachmentsCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {!email.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMarkRead(email.id, true)}
                    >
                      <MailOpen className="h-4 w-4" />
                    </Button>
                  )}
                  {email.isStarred && (
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

