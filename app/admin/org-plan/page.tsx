"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/Toast";

// TODO: Set this to your Clerk user ID in production
const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID || "";

type OrganisationPlan = "FREE" | "LOCKED" | "PAID_MONTHLY" | "PAID_YEARLY";

export default function AdminOrgPlanPage() {
  const { user, isLoaded } = useUser();
  const [orgs, setOrgs] = useState<Array<{
    id: string;
    name: string;
    plan: OrganisationPlan;
    email_domain: string | null;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const pushToast = useToast((state) => state.push);

  useEffect(() => {
    if (!isLoaded) return;

    // Check if user is admin
    if (!user || user.id !== ADMIN_USER_ID) {
      pushToast("Access denied. Admin only.", "error");
      return;
    }

    fetchOrgs();
  }, [isLoaded, user]);

  const fetchOrgs = async () => {
    try {
      const res = await fetch("/api/admin/organisations");
      if (!res.ok) throw new Error("Failed to fetch organisations");
      const data = await res.json();
      setOrgs(data.organisations || []);
    } catch (error) {
      console.error("[admin] Failed to fetch orgs:", error);
      pushToast("Failed to load organisations", "error");
    } finally {
      setLoading(false);
    }
  };

  const updatePlan = async (orgId: string, newPlan: OrganisationPlan) => {
    setUpdating(orgId);
    try {
      const res = await fetch("/api/admin/organisations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organisationId: orgId, plan: newPlan }),
      });

      if (!res.ok) throw new Error("Failed to update plan");

      pushToast(`Plan updated to ${newPlan}`, "success");
      await fetchOrgs();
    } catch (error) {
      console.error("[admin] Failed to update plan:", error);
      pushToast("Failed to update plan", "error");
    } finally {
      setUpdating(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || user.id !== ADMIN_USER_ID) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-6">
          <h1 className="text-xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            This page is only accessible to administrators.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-6">Organisation Plan Management</h1>

        {loading ? (
          <p className="text-muted-foreground">Loading organisations...</p>
        ) : (
          <div className="space-y-4">
            {orgs.map((org) => (
              <Card key={org.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{org.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {org.email_domain || "Personal workspace"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">ID: {org.id}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={org.plan}
                      onChange={(e) => updatePlan(org.id, e.target.value as OrganisationPlan)}
                      disabled={updating === org.id}
                      className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
                    >
                      <option value="FREE">FREE</option>
                      <option value="LOCKED">LOCKED</option>
                      <option value="PAID_MONTHLY">PAID_MONTHLY</option>
                      <option value="PAID_YEARLY">PAID_YEARLY</option>
                    </select>

                    {updating === org.id && (
                      <span className="text-xs text-muted-foreground">Updating...</span>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {orgs.length === 0 && (
              <p className="text-muted-foreground">No organisations found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

