import { cx } from "../../components/ui/cx";

export type BentoAccent = "default";

type BentoTileProps = {
  children: React.ReactNode;
  className?: string;
  /** @deprecated Colored accents removed — kept for prop compatibility */
  accent?: BentoAccent | string;
  padding?: "none" | "sm" | "md";
};

const paddingStyles: Record<NonNullable<BentoTileProps["padding"]>, string> = {
  none: "p-0",
  sm: "p-3.5",
  md: "p-4",
};

export function isSolidAccent(_accent?: string): boolean {
  return false;
}

export function BentoTile({
  children,
  className,
  padding = "md",
}: BentoTileProps) {
  return (
    <div
      className={cx(
        "rounded-3xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
        paddingStyles[padding],
        "flex flex-col",
        className,
      )}
    >
      {children}
    </div>
  );
}
