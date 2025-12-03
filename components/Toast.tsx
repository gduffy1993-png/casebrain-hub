"use client";

import { create } from "zustand";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastStore = {
  list: Toast[];
  push: (message: string, type?: ToastType) => void;
  remove: (id: string) => void;
};

export const useToast = create<ToastStore>((set) => ({
  list: [],
  push: (message, type = "info") =>
    set((state) => ({
      list: [...state.list, { id: crypto.randomUUID(), message, type }],
    })),
  remove: (id) =>
    set((state) => ({
      list: state.list.filter((toast) => toast.id !== id),
    })),
}));

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setIsVisible(true));

    // Auto dismiss after 5 seconds
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onRemove, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onRemove]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(onRemove, 300);
  };

  const icons = {
    success: <CheckCircle className="h-5 w-5 text-success" />,
    error: <AlertCircle className="h-5 w-5 text-danger" />,
    info: <Info className="h-5 w-5 text-primary" />,
    warning: <AlertCircle className="h-5 w-5 text-warning" />,
  };

  const borderColors = {
    success: "border-success/30",
    error: "border-danger/30",
    info: "border-primary/30",
    warning: "border-warning/30",
  };

  const bgColors = {
    success: "bg-success/10",
    error: "bg-danger/10",
    info: "bg-primary/10",
    warning: "bg-warning/10",
  };

  return (
    <div
      className={`
        flex items-start gap-3 rounded-xl border backdrop-blur-xl p-4 shadow-lg
        transition-all duration-300 ease-out
        ${borderColors[toast.type]} ${bgColors[toast.type]}
        bg-surface/90
        ${isVisible && !isLeaving ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-accent">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="text-accent-muted hover:text-accent transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastHost() {
  const { list, remove } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-[999] flex w-96 flex-col gap-2">
      {list.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => remove(toast.id)} />
      ))}
    </div>
  );
}
