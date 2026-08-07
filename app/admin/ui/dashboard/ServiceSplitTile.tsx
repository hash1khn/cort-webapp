import { MetricComparison } from "../../../lib/types/admin-dashboard";
import { ArrowDownIcon, ArrowUpIcon, MinusIcon, type LucideIcon } from "lucide-react";
import { BentoTile, type BentoAccent } from "./BentoTile";
import { ServiceMiniBars } from "./MiniCharts";
import { cx } from "../../components/ui/cx";

type ServiceSplitTileProps = {
  title: string;
  icon: LucideIcon;
  revenue: MetricComparison;
  cogs: MetricComparison;
  profit: MetricComparison;
  className?: string;
  accent?: BentoAccent;
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(val);
}

function MiniStat({
  label,
  metric,
  emphasize,
}: {
  label: string;
  metric: MetricComparison;
  emphasize?: boolean;
}) {
  const isNeutral = metric.trend === "neutral" || metric.previous === 0;
  const isUp = metric.trend === "up";
  const TrendIcon = isNeutral ? MinusIcon : isUp ? ArrowUpIcon : ArrowDownIcon;
  const trendColor = isNeutral
    ? "text-[var(--text-muted)]"
    : isUp
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-500";

  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </div>
      <div
        className={cx(
          "mt-0.5 truncate font-bold tracking-tight text-[var(--text-primary)]",
          emphasize ? "text-lg" : "text-sm",
        )}
      >
        {formatCurrency(metric.current)}
      </div>
      {metric.previous !== 0 && (
        <div className={cx("mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold", trendColor)}>
          <TrendIcon className="h-2.5 w-2.5 stroke-[3]" />
          {Math.abs(metric.percentageChange).toFixed(1)}%
        </div>
      )}
    </div>
  );
}

export function ServiceSplitTile({
  title,
  icon: Icon,
  revenue,
  cogs,
  profit,
  className,
  accent = "default",
}: ServiceSplitTileProps) {
  return (
    <BentoTile className={className} padding="md" accent={accent}>
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/5 dark:border-white/10 bg-white/70 dark:bg-black/20">
          <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Revenue" metric={revenue} emphasize />
        <MiniStat label="COGS" metric={cogs} />
        <MiniStat label="Profit" metric={profit} emphasize />
      </div>
      <ServiceMiniBars
        revenue={revenue.current}
        cogs={cogs.current}
        profit={profit.current}
        colors={
          accent === "teal"
            ? ["#14b8a6", "#94a3b8", "#10b981"]
            : ["#0ea5e9", "#94a3b8", "#10b981"]
        }
      />
    </BentoTile>
  );
}
