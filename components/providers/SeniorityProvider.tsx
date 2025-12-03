"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type SeniorityRole = "Solicitor" | "Senior Solicitor" | "Partner" | "Paralegal" | "Trainee" | null;

type SeniorityContextType = {
  currentSeniority: SeniorityRole;
  setSeniority: (role: SeniorityRole) => void;
};

const SeniorityContext = createContext<SeniorityContextType | undefined>(undefined);

const STORAGE_KEY = "casebrain_current_seniority";

export function SeniorityProvider({ children }: { children: ReactNode }) {
  const [currentSeniority, setCurrentSeniorityState] = useState<SeniorityRole>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const validRoles: SeniorityRole[] = ["Solicitor", "Senior Solicitor", "Partner", "Paralegal", "Trainee"];
        if (validRoles.includes(stored as SeniorityRole)) {
          setCurrentSeniorityState(stored as SeniorityRole);
        }
      }
    } catch (err) {
      console.error("[SeniorityProvider] Error loading from localStorage:", err);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage when it changes
  const setSeniority = (role: SeniorityRole) => {
    setCurrentSeniorityState(role);
    try {
      if (typeof window !== "undefined") {
        if (role) {
          localStorage.setItem(STORAGE_KEY, role);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.error("[SeniorityProvider] Error saving to localStorage:", err);
    }
  };

  // Don't render children until we've loaded from localStorage to avoid flash
  if (!isInitialized) {
    return null;
  }

  return (
    <SeniorityContext.Provider value={{ currentSeniority, setSeniority }}>
      {children}
    </SeniorityContext.Provider>
  );
}

export function useSeniority() {
  const context = useContext(SeniorityContext);
  if (context === undefined) {
    throw new Error("useSeniority must be used within a SeniorityProvider");
  }
  return context;
}

