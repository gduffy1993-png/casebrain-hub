"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { usePaywallStatus } from "@/hooks/usePaywallStatus";
import type { UsageLimitError } from "@/lib/usage-limits";

// HARDCODED OWNER USER ID - NEVER SHOW MODAL FOR THIS USER
const OWNER_USER_ID = "user_35JeizOJrQ0Nj";

type PaywallModalProps = {
  errorCode: UsageLimitError;
  limit?: number;
  plan?: string;
  onClose: () => void;
  onUpgrade?: () => void;
};

export function PaywallModal({
  errorCode,
  limit,
  plan,
  onClose,
  onUpgrade,
}: PaywallModalProps) {
  // NUCLEAR NUCLEAR NUCLEAR: HARDCODED OWNER CHECK - NEVER RENDER FOR OWNER
  const { user, isLoaded } = useUser();
  
  // If user data not loaded yet, don't render (prevents flash)
  if (!isLoaded) {
    return null;
  }
  
  // HARDCODED: If this is the owner user ID, NEVER render modal - PERIOD
  if (user?.id === OWNER_USER_ID) {
    console.log("[PaywallModal] ✅✅✅ HARDCODED OWNER CHECK - userId matches, NOT rendering modal");
    // Call onClose immediately to clear any state
    if (onClose) {
      setTimeout(() => onClose(), 0);
    }
    return null;
  }
  
  // Also check paywall status as backup
  const { isOwner, bypassActive } = usePaywallStatus();
  if (isOwner || bypassActive) {
    console.log("[PaywallModal] ✅ Owner detected via status - NOT rendering modal");
    if (onClose) {
      setTimeout(() => onClose(), 0);
    }
    return null;
  }
  const getTitle = () => {
    switch (errorCode) {
      case "PDF_LIMIT_REACHED":
        return "PDF Upload Limit Reached";
      case "CASE_LIMIT_REACHED":
        return "Active Case Limit Reached";
      case "FREE_TRIAL_ALREADY_USED":
        return "Free Trial Already Used";
      case "PHONE_NOT_VERIFIED":
        return "Phone Verification Required";
      case "ABUSE_DETECTED":
        return "Account Creation Restricted";
      default:
        return "Upgrade Required";
    }
  };

  const getMessage = () => {
    switch (errorCode) {
      case "PDF_LIMIT_REACHED":
        return `Your firm has reached the free tier limit of ${limit ?? 30} PDFs per month. Upgrade to unlock unlimited case analysis.`;
      case "CASE_LIMIT_REACHED":
        return `Your firm has reached the free tier limit of ${limit ?? 10} active cases. Archive or complete existing cases, or upgrade for unlimited cases.`;
      case "FREE_TRIAL_ALREADY_USED":
        return "Your firm has already used its free trial. Upgrade to continue using CaseBrain Hub.";
      case "PHONE_NOT_VERIFIED":
        return "To keep CaseBrain secure, please verify your phone number before uploading files or creating cases. After verifying, refresh the page and try uploading again.";
      case "ABUSE_DETECTED":
        return "We've detected unusual signup activity from this network. Please contact support to set up additional accounts.";
      default:
        return "Upgrade to continue using CaseBrain Hub.";
    }
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = "/pricing";
    }
    onClose();
  };

  const handleContactSales = () => {
    window.location.href = "mailto:support@casebrainhub.com?subject=Upgrade Request";
    onClose();
  };

  if (errorCode === "PHONE_NOT_VERIFIED") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">{getTitle()}</h2>
            <p className="text-sm text-muted-foreground">{getMessage()}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                // Navigate to Clerk account settings for phone verification
                // After verification, user can return and retry upload
                window.location.href = "/user/profile";
              }}
              className="flex-1"
            >
              Verify Phone
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (errorCode === "ABUSE_DETECTED") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-4">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">{getTitle()}</h2>
            <p className="text-sm text-muted-foreground">{getMessage()}</p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            <Button
              onClick={handleContactSales}
              className="flex-1"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // NUCLEAR: Double-check owner status before rendering ANYTHING
  if (user?.id === OWNER_USER_ID) {
    console.log("[PaywallModal] ✅✅✅ FINAL CHECK - Owner detected, returning null");
    if (onClose) {
      setTimeout(() => onClose(), 0);
    }
    return null;
  }
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      data-paywall-modal="true"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{getTitle()}</h2>
          <p className="text-sm text-muted-foreground">{getMessage()}</p>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Upgrade Benefits:</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Unlimited PDF uploads</li>
              <li>• Unlimited active cases</li>
              <li>• Priority support</li>
              <li>• Advanced analytics</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button
              onClick={handleUpgrade}
              className="flex-1"
            >
              Upgrade Monthly (£39)
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = "/pricing";
              }}
              className="flex-1"
            >
              View Plans
            </Button>
            <Button
              variant="outline"
              onClick={handleContactSales}
              className="flex-1"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

