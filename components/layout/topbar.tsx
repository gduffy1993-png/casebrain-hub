"use client";

import { Command, Plus, Search, User, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { GlobalSolicitorRoleSelector } from "./GlobalSolicitorRoleSelector";
import { isCriminalPilotMode } from "@/lib/pilot-mode";

type TopbarProps = {
  onQuickUpload?: () => void;
};

export function Topbar({ onQuickUpload }: TopbarProps) {
  const pilotMode = isCriminalPilotMode();
  const [user, setUser] = useState<{ email?: string; fullName?: string } | null>(null);
  const [orgName, setOrgName] = useState<string>("Organisation");
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser({
          email: currentUser.email || undefined,
          fullName: currentUser.user_metadata?.name || currentUser.email || undefined,
        });

        try {
          const res = await fetch("/api/user/me");
          if (res.ok) {
            const data = await res.json();
            if (data.database?.org_id) {
              setOrgName("Organisation");
            }
          }
        } catch {
          /* non-fatal */
        }
      }
    };

    loadUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex flex-col min-w-0 pr-4">
        <span className="text-[11px] uppercase tracking-wide text-slate-500 truncate">
          {orgName}
        </span>
        <span className="text-sm font-semibold text-slate-900 truncate">
          {user?.fullName ?? user?.email ?? "User"}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <GlobalSolicitorRoleSelector />
        <Button
          variant={pilotMode ? "ghost" : "secondary"}
          size="sm"
          className={pilotMode ? "gap-1.5 px-2 text-slate-700" : "gap-2"}
          onClick={() => router.push("/search")}
          aria-label="Search"
        >
          {pilotMode ? (
            <>
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
            </>
          ) : (
            <>
              <Command className="h-4 w-4" />
              Search (Ctrl + K)
            </>
          )}
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="gap-2"
          onClick={onQuickUpload ?? (() => router.push("/upload"))}
        >
          <Plus className="h-4 w-4" /> New Upload
        </Button>
        <div className="flex items-center gap-1">
          {!pilotMode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/upgrade")}
              className="text-muted-foreground hover:text-foreground"
            >
              <Zap className="h-4 w-4 mr-1.5" />
              Upgrade
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/user")}
            className="text-slate-600 hover:text-slate-900 px-2"
            aria-label="Account"
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-slate-700 hover:text-slate-900"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
