"use client";

import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userProfilePath = params?.["user-profile"] as string[] | undefined;

  // If accessing /user (base path), redirect to /user/profile
  useEffect(() => {
    if (!userProfilePath || userProfilePath.length === 0) {
      router.replace("/user/profile");
    }
  }, [userProfilePath, router]);

  // Show loading while redirecting
  if (!userProfilePath || userProfilePath.length === 0) {
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
            Manage your account, verify your phone number, and update your preferences.
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
        <UserProfile
          routing="path"
          path="/user"
          appearance={{
            baseTheme: dark,
            elements: {
              rootBox: "mx-auto",
              card: "bg-card border-border shadow-xl",
            },
          }}
        />
      </div>
    </div>
  );
}

