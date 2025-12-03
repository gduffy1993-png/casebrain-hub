"use client";

import { type ReactNode } from "react";
import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  useOrganization,
  CreateOrganization,
} from "@clerk/nextjs";
import { AppShell } from "@/components/layout/app-shell";
import { PracticeAreaProvider } from "@/components/providers/PracticeAreaProvider";
import { SeniorityProvider } from "@/components/providers/SeniorityProvider";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <OrganisationGate>{children}</OrganisationGate>
      </SignedIn>
    </>
  );
}

function OrganisationGate({ children }: { children: ReactNode }) {
  const { isLoaded, organization } = useOrganization();

  if (!isLoaded) {
    return null;
  }

  if (!organization) {
    return <NoOrgSelected />;
  }

  return (
    <PracticeAreaProvider>
      <SeniorityProvider>
        <AppShell>{children}</AppShell>
      </SeniorityProvider>
    </PracticeAreaProvider>
  );
}

function NoOrgSelected() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-muted text-center">
      <div className="glass-card max-w-lg space-y-4 p-12">
        <h1 className="text-2xl font-semibold text-accent">
          Join an organisation to continue
        </h1>
        <p className="text-sm text-accent/70">
          Your Clerk account is not associated with a CaseBrain organisation.
          Ask an owner to invite you, or create a new organisation via the
          profile menu.
        </p>
        <div className="mt-6 flex justify-center">
          <CreateOrganization afterCreateOrganizationUrl="/dashboard" />
        </div>
      </div>
    </div>
  );
}

