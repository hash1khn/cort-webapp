"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ConfirmContext, type ConfirmOptions } from "../../lib/hooks/useConfirm";
import {
  adminBtnDestructive,
  adminBtnOutline,
  adminBtnPrimary,
  adminModalHeader,
  adminModalShell,
  adminModalTitle,
} from "./ui/admin-styles";
import { cx } from "./ui/cx";

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
            className={cx(adminModalShell, "max-w-md")}
            role="alertdialog"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
          >
            <div className={adminModalHeader}>
              <h3 id="confirm-title" className={adminModalTitle}>
                {pending.title ?? "Confirm"}
              </h3>
            </div>
            <p
              id="confirm-message"
              className="px-6 py-4 text-sm text-[var(--text-secondary)] whitespace-pre-wrap"
            >
              {pending.message}
            </p>
            <div className="flex justify-end gap-3 border-t border-[var(--border-default)] px-6 py-4">
              <button type="button" onClick={() => close(false)} className={adminBtnOutline}>
                {pending.cancelLabel ?? "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => close(true)}
                className={pending.destructive ? adminBtnDestructive : adminBtnPrimary}
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
