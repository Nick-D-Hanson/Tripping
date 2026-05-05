"use client";

import { X } from "lucide-react";
import * as React from "react";
import { Notice } from "@/components/ui/notice";
import { Button } from "@/components/ui/button";

type Toast = {
  id: number;
  title?: string;
  description?: string;
  variant?: "success" | "error" | "info";
};

type ToastContextValue = {
  toast: (input: Omit<Toast, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextToastId = React.useRef(1);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = React.useCallback((input: Omit<Toast, "id">) => {
    const id = nextToastId.current++;
    setToasts((current) => [...current, { id, ...input }]);
    window.setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
        <div className="flex w-full max-w-md flex-col gap-3">
          {toasts.map((item) => (
            <div key={item.id} className="pointer-events-auto">
              <Notice variant={item.variant}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {item.title ? <p className="font-medium">{item.title}</p> : null}
                    {item.description ? <p className={item.title ? "mt-1" : undefined}>{item.description}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => dismiss(item.id)}
                    aria-label="Dismiss notification"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </Notice>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
