import {
  ArrowDownIcon,
  ArrowUpIcon,
  MinusIcon,
  TrendingUp,
  DollarSign,
  Activity,
  Percent,
  Briefcase,
} from "lucide-react";
import { MetricComparison } from "../../../lib/types/admin-dashboard";
import { BentoTile, isSolidAccent, type BentoAccent } from "./BentoTile";
import { MiniSparkline } from "./MiniCharts";
import { cx } from "../../components/ui/cx";

interface MetricCardProps {
  label: string;
  metric: MetricComparison;
  type?: "currency" | "number" | "percentage";
  prefix?: string;
  suffix?: string;
  overlayContent?: React.ReactNode;
  variant?: "hero" | "default" | "compact";
  className?: string;
  hint?: string;
  accent?: BentoAccent;
  showSparkline?: boolean;
}

export function MetricCard({
  label,
  metric,
  type = "number",
  prefix = "",
  suffix = "",
  overlayContent,
  variant = "default",
  className,
  hint,
  accent = "default",
  showSparkline,
}: MetricCardProps) {
  const { current, percentageChange, trend } = metric;
  const solid = isSolidAccent(accent);

  const formatValue = (val: number) => {
    if (type === "currency") {
      return new Intl.NumberFormat("en-PK", {
        style: "currency",
        currency: "PKR",
        maximumFractionDigits: 0,
      }).format(val);
    }
    if (type === "percentage") {
      return `${val.toFixed(2)}%`;
    }
    return new Intl.NumberFormat("en-US").format(val);
  };

  const isPositive = trend === "up";
  const isNeutral = trend === "neutral";
  const TrendIcon = isNeutral ? MinusIcon : isPositive ? ArrowUpIcon : ArrowDownIcon;

  const trendColor = solid
    ? "text-white/90"
    : isNeutral
      ? "text-[var(--text-muted)]"
      : isPositive
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-rose-500";

  const bgColor = solid
    ? "bg-white/15"
    : isNeutral
      ? "bg-[var(--bg-subtle)]"
      : isPositive
        ? "bg-emerald-500/10"
        : "bg-rose-500/10";

  const getIcon = () => {
    const iconClass = solid ? "h-3.5 w-3.5 text-white/80" : "h-3.5 w-3.5 text-[var(--text-muted)]";
    const lowerLabel = label.toLowerCase();
    if (
      lowerLabel.includes("revenue") ||
      lowerLabel.includes("price") ||
      lowerLabel.includes("receivable") ||
      lowerLabel.includes("payable") ||
      lowerLabel.includes("cogs")
    )
      return <DollarSign className={iconClass} />;
    if (lowerLabel.includes("margin") || lowerLabel.includes("percentage"))
      return <Percent className={iconClass} />;
    if (lowerLabel.includes("profit")) return <TrendingUp className={iconClass} />;
    if (lowerLabel.includes("ride") || lowerLabel.includes("cost"))
      return <Activity className={iconClass} />;
    return <Briefcase className={iconClass} />;
  };

  const isHero = variant === "hero";
  const isCompact = variant === "compact";

  return (
    <BentoTile
      accent={accent}
      className={cx("relative group h-full", isCompact && "justify-center", className)}
      padding={isCompact ? "sm" : "md"}
    >
      <div className={cx("flex justify-between items-start", isCompact ? "mb-2" : "mb-3")}>
        <div className="flex items-center gap-2 min-w-0">
          {!isCompact && (
            <div
              className={cx(
                "p-1.5 rounded-lg shrink-0 border",
                solid
                  ? "bg-white/10 border-white/15"
                  : "bg-white/60 dark:bg-black/20 border-[var(--border-default)]",
              )}
            >
              {getIcon()}
            </div>
          )}
          <div
            className={cx(
              "font-medium tracking-tight truncate",
              isHero ? "text-sm" : "text-xs",
              solid ? "text-white/75" : "text-[var(--text-muted)]",
            )}
          >
            {label}
          </div>
        </div>
        {metric.previous !== 0 && (
          <div
            className={cx(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border border-current/10 shrink-0",
              bgColor,
              trendColor,
            )}
          >
            <TrendIcon className="h-2.5 w-2.5 stroke-[3]" />
            <span>{Math.abs(percentageChange).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className={cx(isCompact && "mt-auto")}>
        <div
          className={cx(
            "font-extrabold tracking-tight tabular-nums",
            isHero ? "text-3xl lg:text-4xl" : "text-2xl",
            solid ? "text-white" : "text-[var(--text-primary)]",
          )}
        >
          {prefix}
          {formatValue(current)}
          {suffix}
        </div>

        {hint && (
          <p
            className={cx(
              "mt-1.5 text-[11px] font-medium",
              solid ? "text-white/70" : "text-[var(--text-muted)]",
            )}
          >
            {hint}
          </p>
        )}

        {(showSparkline ?? (isHero || (!isCompact && metric.previous !== 0))) &&
          (metric.previous !== 0 || metric.current !== 0) && (
            <div className="mt-2">
              <MiniSparkline
                previous={metric.previous}
                current={metric.current}
                color={solid ? "#ffffff" : isPositive ? "#10b981" : isNeutral ? "#0c225e" : "#f43f5e"}
                light={solid}
              />
            </div>
          )}
      </div>

      {!isCompact && metric.previous !== 0 && (
        <div
          className={cx(
            "mt-2 pt-2 flex items-center justify-between",
            solid ? "border-t border-white/15" : "border-t border-[var(--divider)]",
          )}
        >
          <span className={cx("text-[10px] font-medium", solid ? "text-white/60" : "text-[var(--text-muted)]")}>
            Previous
          </span>
          <span
            className={cx(
              "text-[10px] font-semibold",
              solid ? "text-white/85" : "text-[var(--text-secondary)]",
            )}
          >
            {prefix}
            {formatValue(metric.previous)}
            {suffix}
          </span>
        </div>
      )}

      {overlayContent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 invisible opacity-0 scale-95 transition-all duration-300 group-hover:visible group-hover:opacity-100 group-hover:scale-100 z-50 pointer-events-none group-hover:pointer-events-auto">
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-modal)] overflow-hidden w-64 md:w-80 max-h-72 flex flex-col text-[var(--text-primary)]">
            {overlayContent}
          </div>
        </div>
      )}
    </BentoTile>
  );
}
