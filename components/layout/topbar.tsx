"use client";

import { Command, Plus, Zap, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { GlobalSolicitorRoleSelector } from "./GlobalSolicitorRoleSelector";

type TopbarProps = {
  onQuickUpload?: () => void;
};

export function Topbar({ onQuickUpload }: TopbarProps) {
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
        
        // Get org name from API
        try {
          const res = await fetch("/api/user/me");
          if (res.ok) {
            const data = await res.json();
            if (data.database?.org_id) {
              // Could fetch org name here if needed
              setOrgName("Organisation");
            }
          }
        } catch {
          // Ignore
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
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-surface px-6">
      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wide text-accent/50">
          {orgName}
        </span>
        <span className="text-sm font-semibold text-accent">
          {user?.fullName ?? user?.email ?? "User"}
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/upgrade")}
            className="text-muted-foreground hover:text-foreground"
          >
            <Zap className="h-4 w-4 mr-1.5" />
            Upgrade
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/user")}
            className="text-muted-foreground hover:text-foreground"
          >
            <User className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}

