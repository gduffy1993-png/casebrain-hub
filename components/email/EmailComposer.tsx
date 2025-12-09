"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Send, X, Paperclip } from "lucide-react";

type EmailComposerProps = {
  caseId: string;
  defaultTo?: string[];
  defaultSubject?: string;
  defaultBody?: string;
  onSent?: () => void;
  onCancel?: () => void;
};

export function EmailComposer({
  caseId,
  defaultTo = [],
  defaultSubject = "",
  defaultBody = "",
  onSent,
  onCancel,
}: EmailComposerProps) {
  const [to, setTo] = useState<string>(defaultTo.join(", "));
  const [cc, setCc] = useState<string>("");
  const [bcc, setBcc] = useState<string>("");
  const [subject, setSubject] = useState<string>(defaultSubject);
  const [body, setBody] = useState<string>(defaultBody);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim()) {
      alert("Please enter at least one recipient");
      return;
    }

    try {
      setSending(true);

      // Upload attachments if any
      const attachmentUrls: string[] = [];
      for (const file of attachments) {
        // TODO: Upload to storage and get URL
        // For now, just track file names
        attachmentUrls.push(file.name);
      }

      const response = await fetch(`/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          to: to.split(",").map((e) => e.trim()).filter(Boolean),
          cc: cc.split(",").map((e) => e.trim()).filter(Boolean),
          bcc: bcc.split(",").map((e) => e.trim()).filter(Boolean),
          subject,
          bodyText: body,
          bodyHtml: body.replace(/\n/g, "<br>"),
          attachments: attachmentUrls,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send email");
      }

      if (onSent) {
        onSent();
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compose Email</h3>
        {onCancel && (
          <Button size="sm" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="email@example.com"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">CC</label>
          <input
            type="text"
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            placeholder="email@example.com"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">BCC</label>
          <input
            type="text"
            value={bcc}
            onChange={(e) => setBcc(e.target.value)}
            placeholder="email@example.com"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Body</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Email body..."
            rows={10}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Attachments</label>
          <input
            type="file"
            multiple
            onChange={handleAttachmentChange}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
          {attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {attachments.map((file, idx) => (
                <div key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                  <Paperclip className="h-3 w-3" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button onClick={handleSend} disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

