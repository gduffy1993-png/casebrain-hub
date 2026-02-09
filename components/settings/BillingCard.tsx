"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import Link from "next/link";

export function BillingCard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  const handleManageSubscription = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      if (res.status === 400) {
        setMessage({
          type: "info",
          text: "No subscription to manage. Subscribe first from the Upgrade page.",
        });
      } else if (res.status === 503) {
        setMessage({
          type: "info",
          text: "Billing is not configured yet. Contact support when you're ready to manage your subscription.",
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Something went wrong.",
        });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to open billing portal." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Billing"
      description="Manage your subscription, payment method, and invoices."
      action={
        <Button
          variant="secondary"
          size="sm"
          onClick={handleManageSubscription}
          disabled={loading}
          className="gap-2"
        >
          <CreditCard className="h-4 w-4" />
          {loading ? "Opening…" : "Manage subscription"}
        </Button>
      }
    >
      <p className="text-sm text-accent/70">
        Update your card, view invoices, or cancel your subscription in the Stripe billing portal.
      </p>
      {message && (
        <p
          className={`mt-3 text-sm ${
            message.type === "error" ? "text-amber-400/90" : "text-accent/70"
          }`}
        >
          {message.text}
          {message.type === "info" && message.text.includes("Upgrade page") && (
            <span>
              {" "}
              <Link href="/upgrade" className="text-primary hover:underline">
                Go to Upgrade
              </Link>
            </span>
          )}
        </p>
      )}
    </Card>
  );
}
