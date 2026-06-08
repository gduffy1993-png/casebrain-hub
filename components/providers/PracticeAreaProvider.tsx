"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { PracticeArea } from "@/lib/types/casebrain";

type PracticeAreaContextType = {
  currentPracticeArea: PracticeArea;
  setPracticeArea: (area: PracticeArea) => void;
};

const PracticeAreaContext = createContext<PracticeAreaContextType | undefined>(undefined);

const STORAGE_KEY = "casebrain_current_practice_area";
const DEFAULT_PRACTICE_AREA: PracticeArea = "criminal";
/** Criminal-only: only this role is allowed (per plan). */
const ALLOWED_PRACTICE_AREAS: PracticeArea[] = ["criminal"];

export function PracticeAreaProvider({ children }: { children: ReactNode }) {
  const [currentPracticeArea, setCurrentPracticeAreaState] = useState<PracticeArea>(DEFAULT_PRACTICE_AREA);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount – criminal only
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ALLOWED_PRACTICE_AREAS.includes(stored as PracticeArea)) {
        setCurrentPracticeAreaState(stored as PracticeArea);
      } else {
        setCurrentPracticeAreaState(DEFAULT_PRACTICE_AREA);
        if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, DEFAULT_PRACTICE_AREA);
      }
    } catch (err) {
      console.error("[PracticeAreaProvider] Error loading from localStorage:", err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage when it changes – only allow criminal
  const setPracticeArea = (area: PracticeArea) => {
    const allowed = ALLOWED_PRACTICE_AREAS.includes(area) ? area : DEFAULT_PRACTICE_AREA;
    setCurrentPracticeAreaState(allowed);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, allowed);
      }
    } catch (err) {
      console.error("[PracticeAreaProvider] Error saving to localStorage:", err);
    }
  };

  // Don't render children until we've loaded from localStorage to avoid flash
  if (!isInitialized) {
    return null;
  }

  return (
    <PracticeAreaContext.Provider value={{ currentPracticeArea, setPracticeArea }}>
      {children}
    </PracticeAreaContext.Provider>
  );
}

export function usePracticeArea() {
  const context = useContext(PracticeAreaContext);
  if (context === undefined) {
    throw new Error("usePracticeArea must be used within a PracticeAreaProvider");
  }
  return context;
}

