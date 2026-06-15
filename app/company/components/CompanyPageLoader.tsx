"use client";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function CompanyPageLoader({
  label = "Loading…",
  minHeight = "min-h-[50vh]",
  className,
}: {
  label?: string;
  minHeight?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center gap-3",
        minHeight,
        className,
      )}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--cort-orange)]/20 border-t-[var(--cort-orange)]" />
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
