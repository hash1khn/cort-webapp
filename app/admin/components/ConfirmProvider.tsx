"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ConfirmContext, type ConfirmOptions } from "../../lib/hooks/useConfirm";

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
            role="alertdialog"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 id="confirm-title" className="text-lg font-bold text-[#0c225e]">
                {pending.title ?? "Confirm"}
              </h3>
            </div>
            <p id="confirm-message" className="px-6 py-4 text-sm text-slate-600 whitespace-pre-wrap">
              {pending.message}
            </p>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={
                  pending.destructive
                    ? "rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
                    : "rounded-lg bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
                }
              >
                {pending.confirmLabel ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
