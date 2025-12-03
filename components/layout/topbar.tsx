"use client";

import { UserButton, useOrganization, useUser } from "@clerk/nextjs";
import { Command, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GlobalSolicitorRoleSelector } from "./GlobalSolicitorRoleSelector";

type TopbarProps = {
  onQuickUpload?: () => void;
};

export function Topbar({ onQuickUpload }: TopbarProps) {
  const { user } = useUser();
  const organization = useOrganization();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-surface px-6">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-accent/50">
          {organization.organization?.name ?? "Organisation"}
        </span>
        <span className="text-sm font-semibold text-accent">
          {user?.fullName ?? user?.emailAddresses?.[0]?.emailAddress}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <GlobalSolicitorRoleSelector />
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => router.push("/search")}
        >
          <Command className="h-4 w-4" />
          Search (Ctrl + K)
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="gap-2"
          onClick={onQuickUpload ?? (() => router.push("/upload"))}
        >
          <Plus className="h-4 w-4" /> New Upload
        </Button>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}

