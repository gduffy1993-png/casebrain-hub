"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Send, Phone } from "lucide-react";

type SMSPanelProps = {
  caseId: string;
  defaultTo?: string;
};

export function SMSPanel({ caseId, defaultTo = "" }: SMSPanelProps) {
  const [to, setTo] = useState<string>(defaultTo);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<"sms" | "whatsapp">("sms");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!to.trim() || !message.trim()) {
      alert("Please enter phone number and message");
      return;
    }

    try {
      setSending(true);

      const response = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          to: to.trim(),
          body: message,
          messageType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      alert(`${messageType.toUpperCase()} sent successfully!`);
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Send SMS/WhatsApp</h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={messageType === "sms" ? "default" : "outline"}
            onClick={() => setMessageType("sms")}
          >
            <Phone className="h-4 w-4 mr-2" />
            SMS
          </Button>
          <Button
            size="sm"
            variant={messageType === "whatsapp" ? "default" : "outline"}
            onClick={() => setMessageType("whatsapp")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">To (Phone Number)</label>
          <input
            type="tel"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="+1234567890"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            rows={6}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground"
            maxLength={1600}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length}/1600 characters
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button onClick={handleSend} disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send {messageType.toUpperCase()}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

