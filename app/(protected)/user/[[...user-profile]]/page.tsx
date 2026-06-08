"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const userProfilePath = params?.["user-profile"] as string[] | undefined;

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser({
          email: currentUser.email || undefined,
          name: currentUser.user_metadata?.name || currentUser.email || undefined,
        });
      }
      setLoading(false);
    };
    
    loadUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  // If accessing /user (base path), redirect to /user/profile
  useEffect(() => {
    if (!userProfilePath || userProfilePath.length === 0) {
      router.replace("/user/profile");
    }
  }, [userProfilePath, router]);

  // Show loading while redirecting
  if (!userProfilePath || userProfilePath.length === 0 || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Loading account settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-cyan-300">Account Settings</h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage your account and update your preferences.
          </p>
          <div className="mt-4">
            <Link 
              href="/upgrade"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/10 transition-colors"
            >
              <Zap className="h-4 w-4" />
              Upgrade to Pro
            </Link>
          </div>
        </div>
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <p className="text-sm text-muted-foreground">{user?.email || "Not available"}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Name
              </label>
              <p className="text-sm text-muted-foreground">{user?.name || "Not set"}</p>
            </div>
            <div className="pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

