import { type ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { PracticeAreaProvider } from "@/components/providers/PracticeAreaProvider";
import { SeniorityProvider } from "@/components/providers/SeniorityProvider";
import { OwnerStatusChip } from "@/components/debug/OwnerStatusChip";
import { PaywallKiller } from "@/components/debug/PaywallKiller";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // TODO: Add organization check when organization system is implemented
  // For now, we'll skip the organization gate and render directly

  return (
    <PracticeAreaProvider>
      <SeniorityProvider>
        <AppShell>{children}</AppShell>
        <OwnerStatusChip />
        <PaywallKiller />
      </SeniorityProvider>
    </PracticeAreaProvider>
  );
}

