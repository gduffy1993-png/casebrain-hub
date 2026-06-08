"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const OWNER_USER_IDS = process.env.NEXT_PUBLIC_ADMIN_USER_ID ? [process.env.NEXT_PUBLIC_ADMIN_USER_ID] : [];
const OWNER_EMAILS = ["gduffy1993@gmail.com"];

/**
 * NUCLEAR OPTION: Aggressively removes paywall modal from DOM if it appears
 * This runs globally for the owner user and removes the modal every 50ms
 */
export function PaywallKiller() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      
      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email || undefined,
        });
      }
      setIsLoaded(true);
    };
    
    loadUser();
  }, []);

  const isOwner = 
    (user?.id && OWNER_USER_IDS.includes(user.id)) ||
    (user?.email && OWNER_EMAILS.includes(user.email.toLowerCase()));

  useEffect(() => {
    if (!isLoaded) return;

    // Set data attribute on body immediately for CSS to work
    if (isOwner) {
      const ownerId = user?.id || "owner";
      document.body.setAttribute("data-owner-user", ownerId);
      console.log("[PaywallKiller] ✅✅✅ SET data-owner-user attribute on body");
    } else {
      document.body.removeAttribute("data-owner-user");
    }

    if (!isOwner) return;

    console.log("[PaywallKiller] ✅✅✅ ACTIVATED for owner user");

    function killPaywallModal() {
      // Method 1: Remove by data attribute
      const modalByData = document.querySelector('[data-paywall-modal="true"]');
      if (modalByData) {
        console.log("[PaywallKiller] 🔪 KILLING modal by data attribute");
        (modalByData as HTMLElement).style.display = "none";
        (modalByData as HTMLElement).remove();
      }

      // Method 2: Remove by role="dialog" with paywall text
      const dialogs = document.querySelectorAll('[role="dialog"]');
      dialogs.forEach((dialog) => {
        const text = dialog.textContent || "";
        if (
          text.includes("PDF Upload Limit") ||
          text.includes("Upgrade Required") ||
          text.includes("limit reached")
        ) {
          console.log("[PaywallKiller] 🔪 KILLING modal by content");
          (dialog as HTMLElement).style.display = "none";
          (dialog as HTMLElement).remove();
        }
      });

      // Method 3: Remove any backdrop/overlay
      const backdrops = document.querySelectorAll(
        '.fixed.inset-0, [class*="backdrop"], [class*="overlay"]'
      );
      backdrops.forEach((backdrop) => {
        const parent = backdrop.parentElement;
        if (parent?.querySelector('[data-paywall-modal="true"]')) {
          console.log("[PaywallKiller] 🔪 KILLING backdrop");
          (backdrop as HTMLElement).style.display = "none";
          (backdrop as HTMLElement).remove();
        }
      });

      // Method 4: Force hide any element with paywall-related classes
      const paywallElements = document.querySelectorAll(
        '[class*="paywall"], [class*="upgrade"], [id*="paywall"], [id*="upgrade"]'
      );
      paywallElements.forEach((el) => {
        const text = el.textContent || "";
        if (
          text.includes("PDF Upload Limit") ||
          text.includes("Upgrade Required") ||
          text.includes("limit reached")
        ) {
          console.log("[PaywallKiller] 🔪 KILLING paywall element");
          (el as HTMLElement).style.display = "none";
          (el as HTMLElement).style.visibility = "hidden";
          (el as HTMLElement).remove();
        }
      });

      // Method 5: Intercept and prevent any modal from being added
      // This is a nuclear option - prevent ANY dialog from showing
      const allDialogs = document.querySelectorAll('[role="dialog"]');
      allDialogs.forEach((dialog) => {
        const text = dialog.textContent || "";
        if (
          text.includes("PDF") ||
          text.includes("Upload") ||
          text.includes("Limit") ||
          text.includes("Upgrade")
        ) {
          console.log("[PaywallKiller] 🔪 KILLING dialog by content match");
          (dialog as HTMLElement).style.display = "none";
          (dialog as HTMLElement).style.visibility = "hidden";
          (dialog as HTMLElement).remove();
        }
      });
    }

    // Run immediately
    killPaywallModal();

    // Run every 10ms (EXTREMELY aggressive)
    const interval = setInterval(killPaywallModal, 10);

    // Also watch for DOM mutations
    const observer = new MutationObserver(killPaywallModal);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-paywall-modal", "role"],
    });

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, [isLoaded, isOwner]);

  return null;
}

