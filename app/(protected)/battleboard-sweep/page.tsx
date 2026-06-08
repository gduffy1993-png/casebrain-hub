"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BattleboardSweepRunner } from "@/components/eval/BattleboardSweepRunner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LS_KEY = "casebrain:battleboardSweep";

function isSweepEnabled(searchParams: URLSearchParams | null): boolean {
  if (searchParams?.get("battleboardSweep") === "1") return true;
  if (typeof window !== "undefined" && localStorage.getItem(LS_KEY) === "true") return true;
  return false;
}

export default function BattleboardSweepPage() {
  const searchParams = useSearchParams();
  const [enabled, setEnabled] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setEnabled(isSweepEnabled(searchParams));
    setChecked(true);
  }, [searchParams]);

  function enablePersistent() {
    localStorage.setItem(LS_KEY, "true");
    setEnabled(true);
  }

  if (!checked) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6">
        <p className="text-sm text-accent/60">Loading…</p>
      </main>
    );
  }

  if (!enabled) {
    return (
      <main className="mx-auto w-full max-w-5xl p-6 space-y-4">
        <Card className="p-6 space-y-4">
          <h1 className="text-xl font-semibold text-accent">Battleboard Sweep</h1>
          <p className="text-sm text-accent/70">
            Dev-only harness for Strategy Battleboard outputs. Not shown in normal solicitor UI.
          </p>
          <p className="text-sm text-accent/60">
            Enable with{" "}
            <Link href="/battleboard-sweep?battleboardSweep=1" className="text-primary underline">
              ?battleboardSweep=1
            </Link>{" "}
            or persist for this browser:
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/battleboard-sweep?battleboardSweep=1">
              <Button variant="primary" size="sm">
                Open with URL flag
              </Button>
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={enablePersistent}>
              Enable via localStorage
            </Button>
            <Link href="/eval">
              <Button type="button" variant="outline" size="sm">
                Back to /eval
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl p-6">
      <BattleboardSweepRunner />
    </main>
  );
}
