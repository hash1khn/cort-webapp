"use client";

import { cx } from "./ui/cx";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  loading = false,
}: ToggleSwitchProps) {
  const isDisabled = disabled || loading;

  return (
    <label
      className={cx(
        "relative inline-flex items-center",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
        disabled={isDisabled}
      />
      <div
        className={cx(
          "h-6 w-11 rounded-full transition-colors",
          checked ? "bg-[var(--cort-orange)]" : "bg-[var(--border-strong)]",
        )}
      />
      <div
        className={cx(
          "absolute left-[2px] top-[2px] flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] transition-transform",
          checked ? "translate-x-full" : "translate-x-0",
        )}
      >
        {loading && (
          <svg className="h-3 w-3 animate-spin text-[var(--cort-orange)]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" className="opacity-25" />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="opacity-90"
            />
          </svg>
        )}
      </div>
    </label>
  );
}
