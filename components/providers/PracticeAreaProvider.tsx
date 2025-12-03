"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { PracticeArea } from "@/lib/types/casebrain";

type PracticeAreaContextType = {
  currentPracticeArea: PracticeArea;
  setPracticeArea: (area: PracticeArea) => void;
};

const PracticeAreaContext = createContext<PracticeAreaContextType | undefined>(undefined);

const STORAGE_KEY = "casebrain_current_practice_area";
const DEFAULT_PRACTICE_AREA: PracticeArea = "other_litigation";

export function PracticeAreaProvider({ children }: { children: ReactNode }) {
  const [currentPracticeArea, setCurrentPracticeAreaState] = useState<PracticeArea>(DEFAULT_PRACTICE_AREA);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        // Validate it's a valid PracticeArea
        const validAreas: PracticeArea[] = [
          "family",
          "housing_disrepair",
          "personal_injury",
          "clinical_negligence",
          "other_litigation",
        ];
        if (validAreas.includes(stored as PracticeArea)) {
          setCurrentPracticeAreaState(stored as PracticeArea);
        }
      }
    } catch (err) {
      console.error("[PracticeAreaProvider] Error loading from localStorage:", err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage when it changes
  const setPracticeArea = (area: PracticeArea) => {
    setCurrentPracticeAreaState(area);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, area);
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

