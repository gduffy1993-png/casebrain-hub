"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

export function FirmSettingsForm() {
  const [firmName, setFirmName] = useState("");
  const [firmAddress, setFirmAddress] = useState("");
  const [defaultSignOff, setDefaultSignOff] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const pushToast = useToast((state) => state.push);

  useEffect(() => {
    fetch("/api/settings/firm")
      .then((res) => res.json())
      .then((data) => {
        setFirmName(data.firmName ?? "");
        setFirmAddress(data.firmAddress ?? "");
        setDefaultSignOff(data.defaultSignOff ?? "");
      })
      .catch(() => {
        pushToast("Failed to load firm settings.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pushToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/settings/firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmName,
          firmAddress,
          defaultSignOff,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save");
      }
      pushToast("Firm settings saved.");
    } catch (error) {
      pushToast(
        error instanceof Error ? error.message : "Failed to save firm settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-accent/60">Loading firm settings...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
          Firm name
        </label>
        <input
          type="text"
          value={firmName}
          onChange={(e) => setFirmName(e.target.value)}
          placeholder="Your Firm Name"
          className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
          Firm address
        </label>
        <textarea
          value={firmAddress}
          onChange={(e) => setFirmAddress(e.target.value)}
          placeholder="123 High Street&#10;London&#10;SW1A 1AA"
          rows={4}
          className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-accent/50">
          Default sign-off
        </label>
        <textarea
          value={defaultSignOff}
          onChange={(e) => setDefaultSignOff(e.target.value)}
          placeholder="Yours faithfully,&#10;Your Name&#10;CaseBrain Hub"
          rows={3}
          className="mt-2 w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <p className="mt-1 text-xs text-accent/50">
          This will be appended to letters and included in PDF bundles.
        </p>
      </div>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Saving..." : "Save firm settings"}
      </Button>
    </form>
  );
}

