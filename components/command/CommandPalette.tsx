"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  run: () => Promise<void> | void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const pushToast = useToast((state) => state.push);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const actions = useMemo<PaletteAction[]>(() => {
    return [
      {
        id: "dashboard",
        label: "Go to dashboard",
        hint: "Navigate",
        run: () => router.push("/dashboard"),
      },
      {
        id: "briefing",
        label: "Generate daily briefing",
        hint: "AI summary",
        run: async () => {
          setOpen(false);
          const response = await fetch("/api/briefing", { method: "POST" });
          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            pushToast(payload?.error ?? "Failed to generate briefing");
            return;
          }
          pushToast("Daily briefing updated.");
          router.push("/briefing");
        },
      },
      {
        id: "inbox",
        label: "Open inbox",
        hint: "View ingested mail",
        run: () => router.push("/inbox"),
      },
      {
        id: "risk",
        label: "Review risk alerts",
        hint: "Risk radar",
        run: () => router.push("/risk"),
      },
      {
        id: "cases",
        label: "Open cases list",
        hint: "Navigate",
        run: () => router.push("/cases"),
      },
      {
        id: "upload",
        label: "Upload documents",
        hint: "Start ingestion",
        run: () => router.push("/upload"),
      },
      {
        id: "templates",
        label: "Manage templates",
        run: () => router.push("/templates"),
      },
      {
        id: "documents",
        label: "Browse documents",
        run: () => router.push("/documents"),
      },
      {
        id: "settings",
        label: "Open settings",
        run: () => router.push("/settings"),
      },
    ];
  }, [pushToast, router, setOpen]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return actions;
    }
    return actions.filter((action) =>
      action.label.toLowerCase().includes(normalized),
    );
  }, [actions, query]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="mx-auto mt-28 w-full max-w-xl rounded-3xl border border-primary/20 bg-surface p-4 shadow-card"
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ask CaseBrain (e.g. “Generate daily briefing”)"
          className="w-full rounded-2xl border border-primary/20 bg-white px-4 py-3 text-sm text-accent shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        />

        <ul className="mt-4 max-h-72 overflow-y-auto divide-y divide-primary/10">
          {filtered.length ? (
            filtered.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  onClick={() => {
                    void action.run();
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm text-accent transition hover:bg-primary/5"
                >
                  <span>{action.label}</span>
                  {action.hint ? (
                    <span className="text-xs uppercase tracking-wide text-accent/40">
                      {action.hint}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center text-sm text-accent/50">
              No matching command.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

