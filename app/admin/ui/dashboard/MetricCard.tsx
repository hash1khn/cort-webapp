import { ArrowDownIcon, ArrowUpIcon, MinusIcon, TrendingUp, DollarSign, Activity, Percent, Briefcase } from "lucide-react";
import { MetricComparison } from "../../../lib/types/admin-dashboard";
import { adminCard } from "../../components/ui/admin-styles";
import { cx } from "../../components/ui/cx";

interface MetricCardProps {
  label: string;
  metric: MetricComparison;
  type?: "currency" | "number" | "percentage";
  prefix?: string;
  suffix?: string;
  overlayContent?: React.ReactNode;
}

export function MetricCard({
  label,
  metric,
  type = "number",
  prefix = "",
  suffix = "",
  overlayContent,
}: MetricCardProps) {
  const { current, percentageChange, trend } = metric;

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

  const trendColor = isNeutral
    ? "text-[var(--text-muted)]"
    : isPositive
      ? "text-emerald-500"
      : "text-rose-500";

  const bgColor = isNeutral
    ? "bg-[var(--bg-subtle)]"
    : isPositive
      ? "bg-emerald-500/10"
      : "bg-rose-500/10";

  const getIcon = () => {
    const iconClass = "h-4 w-4 text-[var(--text-muted)]";
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

  return (
    <div
      className={cx(
        adminCard,
        "p-6 relative group transition-all duration-300 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5",
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] group-hover:border-[var(--cort-orange)]/20 transition-colors">
          {getIcon()}
        </div>
        {metric.previous !== 0 && (
          <div
            className={cx(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border border-current/10",
              bgColor,
              trendColor,
            )}
          >
            <TrendIcon className="h-3 w-3 stroke-[3]" />
            <span>{Math.abs(percentageChange).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-[13px] font-medium text-[var(--text-muted)] tracking-tight">{label}</div>
        <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {prefix}
          {formatValue(current)}
          {suffix}
        </div>
      </div>

      {metric.previous !== 0 && (
        <div className="mt-4 pt-4 border-t border-[var(--divider)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)] font-medium">Previous Period</span>
          <span className="text-[11px] text-[var(--text-secondary)] font-semibold">
            {prefix}
            {formatValue(metric.previous)}
            {suffix}
          </span>
        </div>
      )}

      {overlayContent && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 invisible opacity-0 scale-95 transition-all duration-300 group-hover:visible group-hover:opacity-100 group-hover:scale-100 z-50">
          <div className="relative bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-modal)] overflow-hidden w-64 md:w-85 max-h-72 flex flex-col">
            {overlayContent}
          </div>
        </div>
      )}
    </div>
  );
}
