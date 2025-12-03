"use client";

import { usePracticeArea } from "./PracticeAreaProvider";
import { useSeniority } from "./SeniorityProvider";
import { buildPersona, type Persona } from "@/lib/state/persona";

/**
 * Hook that combines practice area and seniority into a Persona
 */
export function usePersona(): Persona {
  const { currentPracticeArea } = usePracticeArea();
  const { currentSeniority } = useSeniority();
  
  return buildPersona(currentPracticeArea, currentSeniority);
}

