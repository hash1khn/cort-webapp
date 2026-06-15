"use client";

import { Loader2 } from "lucide-react";
import { forwardRef } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type CompanyLoadingButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "outline" | "danger" | "ghost";
};

const variantClass: Record<NonNullable<CompanyLoadingButtonProps["variant"]>, string> = {
  primary:
    "bg-[var(--cort-orange)] text-white hover:bg-[var(--cort-orange)]/90 border-0 disabled:opacity-60",
  outline:
    "border border-[var(--border-input)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] disabled:opacity-60",
  danger:
    "bg-emerald-600 text-white hover:bg-emerald-700 border-0 disabled:opacity-60",
  ghost:
    "text-[var(--text-secondary)] hover:text-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/10 border-0 disabled:opacity-60",
};

export const CompanyLoadingButton = forwardRef<HTMLButtonElement, CompanyLoadingButtonProps>(
  function CompanyLoadingButton(
    {
      loading = false,
      loadingText,
      children,
      disabled,
      variant = "primary",
      className,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cx(
          "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:pointer-events-none",
          variantClass[variant],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        {loading && loadingText ? loadingText : children}
      </button>
    );
  },
);
