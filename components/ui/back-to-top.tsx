"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const SCROLL_THRESHOLD = 320;
const TARGET_ID = "case-jump-bar";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onScroll() {
      try {
        setVisible(window.scrollY > SCROLL_THRESHOLD);
      } catch {
        setVisible(false);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToJumpBar = () => {
    try {
      const el = typeof document !== "undefined" ? document.getElementById(TARGET_ID) : null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch {
      // no-op
    }
  };

  if (!mounted || !visible) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={scrollToJumpBar}
      className="fixed bottom-6 right-6 z-20 rounded-full h-10 w-10 p-0 shadow-md border bg-background/95 backdrop-blur"
      aria-label="Back to jump to section"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  );
}
