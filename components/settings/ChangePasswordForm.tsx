"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/Toast";

export function ChangePasswordForm() {
  const pushToast = useToast((state) => state.push);
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "change",
          currentPassword,
          password,
          confirmPassword,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update password.");
        setSaving(false);
        return;
      }
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      pushToast("Password updated.");
      setSaving(false);
    } catch {
      setError("Could not update password.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-accent mb-2">
          Current password
        </label>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-accent mb-2">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
          minLength={8}
          disabled={saving}
        />
      </div>
      <div>
        <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-accent mb-2">
          Confirm new password
        </label>
        <input
          id="confirmNewPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          required
          minLength={8}
          disabled={saving}
        />
      </div>
      <Button type="submit" variant="primary" disabled={saving}>
        {saving ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
