"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type CompanyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  loading?: boolean;
  closeOnBackdrop?: boolean;
};

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function CompanyModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  loading = false,
  closeOnBackdrop = true,
}: CompanyModalProps) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      setIsClosing(false);
      return;
    }

    if (isMounted) {
      setIsClosing(true);
      const timeout = setTimeout(() => {
        setIsMounted(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, isMounted]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose, loading]);

  if (!isMounted) return null;

  const canCloseOnBackdrop = closeOnBackdrop && !loading;

  return createPortal(
    <div
      className={cx(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4",
        isClosing && "opacity-0 transition-opacity duration-200",
      )}
      onClick={canCloseOnBackdrop ? onClose : undefined}
    >
      <div
        className={cx(
          "w-full transform overflow-hidden rounded-2xl bg-[var(--bg-card)] shadow-2xl max-h-[90vh] flex flex-col border border-[var(--border-default)]",
          sizeClass[size],
          isClosing && "scale-95 opacity-0 transition-all duration-200",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--border-light)] px-6 py-5 shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="font-bold text-[var(--text-primary)]">{title}</h2>
            {description && (
              <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] disabled:opacity-40 shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
