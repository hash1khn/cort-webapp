"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cx } from "../../components/ui/cx";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(val);
}

/** Tiny sparkline from previous → current period values */
export function MiniSparkline({
  previous,
  current,
  color = "#0c225e",
  className,
  light,
}: {
  previous: number;
  current: number;
  color?: string;
  className?: string;
  light?: boolean;
}) {
  const mid = previous + (current - previous) * 0.55;
  const data = [
    { name: "Prev", value: Math.max(0, previous) },
    { name: "Mid", value: Math.max(0, mid) },
    { name: "Now", value: Math.max(0, current) },
  ];
  const gradId = `spark-${color.replace("#", "")}-${light ? "l" : "d"}`;

  if (previous === 0 && current === 0) return null;

  return (
    <div className={cx("h-10 w-full", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={light ? 0.45 : 0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal comparison: current vs previous */
export function PeriodCompareBar({
  previous,
  current,
  color = "#0c225e",
  trackClassName,
}: {
  previous: number;
  current: number;
  color?: string;
  trackClassName?: string;
}) {
  const max = Math.max(previous, current, 1);
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex items-center gap-2">
        <span className="w-8 text-[9px] font-semibold uppercase text-[var(--text-muted)]">Now</span>
        <div className={cx("h-1.5 flex-1 rounded-full overflow-hidden", trackClassName ?? "bg-black/5 dark:bg-white/10")}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(current / max) * 100}%`, backgroundColor: color }}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-8 text-[9px] font-semibold uppercase text-[var(--text-muted)]">Prev</span>
        <div className={cx("h-1.5 flex-1 rounded-full overflow-hidden", trackClassName ?? "bg-black/5 dark:bg-white/10")}>
          <div
            className="h-full rounded-full opacity-50 transition-all"
            style={{ width: `${(previous / max) * 100}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

/** Mini bar chart for service revenue / cogs / profit */
export function ServiceMiniBars({
  revenue,
  cogs,
  profit,
  colors = ["#0ea5e9", "#94a3b8", "#10b981"],
}: {
  revenue: number;
  cogs: number;
  profit: number;
  colors?: [string, string, string] | string[];
}) {
  const data = [
    { name: "Rev", value: Math.max(0, revenue), fill: colors[0] },
    { name: "COGS", value: Math.max(0, cogs), fill: colors[1] },
    { name: "Profit", value: Math.max(0, profit), fill: colors[2] },
  ];

  return (
    <div className="h-[72px] w-full mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="28%">
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fill: "var(--text-muted)", fontWeight: 600 }}
          />
          <Tooltip
            cursor={{ fill: "transparent" }}
            formatter={(value) => [formatCurrency(Number(value)), ""]}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              fontSize: 11,
              fontWeight: 600,
            }}
          />
          <Bar dataKey="value" radius={[6, 6, 2, 2]} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Dual horizontal bars for receivables vs payables */
export function CashFlowBars({
  receivables,
  payables,
}: {
  receivables: number;
  payables: number;
}) {
  const max = Math.max(receivables, payables, 1);
  return (
    <div className="mt-3 space-y-2.5">
      <div>
        <div className="mb-1 flex justify-between text-[10px] font-semibold">
          <span className="text-orange-700/80 dark:text-orange-300/80">Receivables</span>
          <span className="text-[var(--text-primary)]">{formatCurrency(receivables)}</span>
        </div>
        <div className="h-2 rounded-full bg-orange-500/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${(receivables / max) * 100}%` }}
          />
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-[10px] font-semibold">
          <span className="text-slate-600 dark:text-slate-300">Payables</span>
          <span className="text-[var(--text-primary)]">{formatCurrency(payables)}</span>
        </div>
        <div className="h-2 rounded-full bg-slate-500/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-slate-500 transition-all"
            style={{ width: `${(payables / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/** Net margin radial gauge */
export function MarginGauge({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [
    { name: "margin", value: clamped },
    { name: "rest", value: 100 - clamped },
  ];

  return (
    <div className={cx("relative h-[88px] w-[88px] mx-auto", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={210}
            endAngle={-30}
            innerRadius={28}
            outerRadius={40}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill="#10b981" />
            <Cell fill="rgba(16,185,129,0.12)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pt-1">
        <span className="text-sm font-extrabold tabular-nums text-[var(--text-primary)]">
          {value.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/** Horizontal bar chart for ranked breakdowns */
export function RankedBarChart({
  data,
  color = "#0c225e",
  height = 200,
}: {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
}) {
  const sliced = data.slice(0, 6);
  if (!sliced.length || !sliced.some((d) => d.value > 0)) {
    return (
      <div className="flex h-full min-h-[160px] items-center justify-center text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
        No data
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sliced}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "var(--text-secondary)", fontWeight: 600 }}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 8, 8, 0]} barSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Grouped bars: chauffeur vs shuttle */
export function ServiceCompareChart({
  chauffeurRevenue,
  shuttleRevenue,
  chauffeurProfit,
  shuttleProfit,
}: {
  chauffeurRevenue: number;
  shuttleRevenue: number;
  chauffeurProfit: number;
  shuttleProfit: number;
}) {
  const data = [
    {
      name: "Revenue",
      Chauffeur: Math.max(0, chauffeurRevenue),
      Shuttle: Math.max(0, shuttleRevenue),
    },
    {
      name: "Profit",
      Chauffeur: Math.max(0, chauffeurProfit),
      Shuttle: Math.max(0, shuttleProfit),
    },
  ];

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--text-muted)", fontWeight: 600 }}
          />
          <YAxis hide />
          <Tooltip
            formatter={(value) => formatCurrency(Number(value))}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid var(--border-default)",
              background: "var(--bg-card)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          />
          <Bar dataKey="Chauffeur" fill="#0ea5e9" radius={[6, 6, 0, 0]} barSize={22} isAnimationActive={false} />
          <Bar dataKey="Shuttle" fill="#14b8a6" radius={[6, 6, 0, 0]} barSize={22} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
