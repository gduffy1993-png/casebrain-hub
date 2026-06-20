"use client";

import {
  CaseControlRoom,
  type CaseControlRoomProps,
} from "@/components/criminal/CaseControlRoom";

/** Pilot Papers tab — compact overview with expandable deep workspace for thick bundles. */
export function PilotPapersView(props: CaseControlRoomProps) {
  return <CaseControlRoom {...props} embedInShell surface="papers" />;
}
