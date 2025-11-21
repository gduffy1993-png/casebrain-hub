"use client";

import { create } from "zustand";

type Toast = { id: string; message: string };

type ToastStore = {
  list: Toast[];
  push: (message: string) => void;
  remove: (id: string) => void;
};

export const useToast = create<ToastStore>((set) => ({
  list: [],
  push: (message) =>
    set((state) => ({
      list: [...state.list, { id: crypto.randomUUID(), message }],
    })),
  remove: (id) =>
    set((state) => ({
      list: state.list.filter((toast) => toast.id !== id),
    })),
}));

export function ToastHost() {
  const { list, remove } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex w-80 flex-col gap-2">
      {list.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => remove(toast.id)}
          className="rounded-md border border-primary/20 bg-surface px-4 py-3 text-left text-sm text-accent shadow-card transition hover:border-primary/40"
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}

