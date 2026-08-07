"use client";

import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BreakdownItem } from "../../../lib/types/admin-dashboard";
import { BentoTile } from "./BentoTile";
import { cx } from "../../components/ui/cx";

type Palette = {
  colors: string[];
};

const PALETTES: Record<"rides" | "expenses" | "revenue", Palette> = {
  rides: {
    colors: ["#0c225e", "#3b82f6", "#38bdf8", "#64748b", "#94a3b8"],
  },
  expenses: {
    colors: ["#ea580c", "#f59e0b", "#f97316", "#fb923c", "#fbbf24", "#d97706", "#c2410c"],
  },
  revenue: {
    colors: ["#0c225e", "#0ea5e9", "#14b8a6", "#6366f1", "#475569"],
  },
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
    notation: val >= 100000 ? "compact" : "standard",
  }).format(val);
}

function formatCenterValue(total: number, valueType: "currency" | "number") {
  if (valueType === "currency") return formatCurrency(total);
  if (total >= 1000) {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(total);
  }
  return String(total);
}

function ModernDonut({
  title,
  data,
  palette,
  valueType,
  emptyMessage,
  centerLabel,
}: {
  title: string;
  data: BreakdownItem[];
  palette: Palette;
  valueType: "currency" | "number";
  emptyMessage: string;
  centerLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartData = useMemo(
    () => (data || []).filter((d) => d.value > 0).map((d) => ({ ...d })),
    [data],
  );
  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);
  const hasData = chartData.length > 0 && total > 0;

  const active = activeIndex != null ? chartData[activeIndex] : null;
  const centerPrimary = active
    ? valueType === "currency"
      ? formatCurrency(active.value)
      : String(active.value)
    : formatCenterValue(total, valueType);
  const centerSecondary = active
    ? `${((active.value / total) * 100).toFixed(0)}% · ${active.name}`
    : centerLabel;

  return (
    <BentoTile padding="md" className="h-full flex flex-col">
      <div className="mb-2 flex items-center justify-between gap-2 shrink-0">
        <h3 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {title}
        </h3>
        {hasData && (
          <span className="rounded-full bg-black/5 dark:bg-white/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--text-secondary)]">
            {chartData.length}
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="flex flex-1 min-h-[200px] flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
          <div className="h-24 w-24 rounded-full border-[12px] border-[var(--border-default)] opacity-40" />
          <span className="text-[10px] font-medium uppercase tracking-wider">{emptyMessage}</span>
        </div>
      ) : (
        <div className="flex flex-1 min-h-0 flex-col">
          {/* Donut */}
          <div className="relative mx-auto h-[150px] w-full max-w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={3}
                  stroke="none"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  isAnimationActive
                  animationDuration={600}
                >
                  {chartData.map((_, index) => {
                    const isActive = activeIndex === index;
                    const dimmed = activeIndex != null && !isActive;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={palette.colors[index % palette.colors.length]}
                        fillOpacity={dimmed ? 0.35 : 1}
                        style={{
                          cursor: "pointer",
                          outline: "none",
                          transformOrigin: "center",
                          transition: "fill-opacity 150ms ease",
                          filter: isActive ? "brightness(1.05)" : undefined,
                        }}
                      />
                    );
                  })}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {active ? "Selected" : "Total"}
              </span>
              <span className="mt-0.5 text-base font-extrabold tabular-nums tracking-tight text-[var(--text-primary)] leading-none">
                {centerPrimary}
              </span>
              <span className="mt-1 max-w-[6.5rem] truncate text-[9px] font-medium text-[var(--text-muted)]">
                {centerSecondary}
              </span>
            </div>
          </div>

          {/* Legend below — no overlap */}
          <div className="mt-3 grid grid-cols-1 gap-1 overflow-y-auto max-h-[88px] custom-scrollbar pr-0.5">
            {chartData.map((item, index) => {
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              const isActive = activeIndex === index;
              return (
                <button
                  key={`${item.name}-${index}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={cx(
                    "flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors",
                    isActive
                      ? "bg-black/5 dark:bg-white/10"
                      : "hover:bg-black/[0.03] dark:hover:bg-white/5",
                  )}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: palette.colors[index % palette.colors.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[var(--text-primary)]">
                    {item.name}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold tabular-nums text-[var(--text-muted)]">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--text-secondary)] w-[3.5rem] text-right">
                    {valueType === "currency" ? formatCurrency(item.value) : item.value}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </BentoTile>
  );
}

export function DashboardCharts({
  ridesBreakdown,
  expensesBreakdown,
  revenueBreakdown,
  className,
}: {
  ridesBreakdown: BreakdownItem[];
  expensesBreakdown: BreakdownItem[];
  revenueBreakdown: BreakdownItem[];
  className?: string;
}) {
  return (
    <div className={cx("grid h-full gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-1", className)}>
      <ModernDonut
        title="Rides"
        data={ridesBreakdown}
        palette={PALETTES.rides}
        valueType="number"
        emptyMessage="No rides data"
        centerLabel="Trips"
      />
      <ModernDonut
        title="Expenses"
        data={expensesBreakdown}
        palette={PALETTES.expenses}
        valueType="currency"
        emptyMessage="No expense data"
        centerLabel="Spend"
      />
      <ModernDonut
        title="Revenue"
        data={revenueBreakdown}
        palette={PALETTES.revenue}
        valueType="currency"
        emptyMessage="No revenue data"
        centerLabel="Income"
      />
    </div>
  );
}
