"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { BreakdownItem } from "../../../lib/types/admin-dashboard";
import { adminCard } from "../../components/ui/admin-styles";
import { useAdminTheme } from "../../lib/theme-context";

const COLORS = ["#1E293B", "#3B82F6", "#10B981", "#F59E0B", "#6366F1", "#8B5CF6"];
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null;

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="800">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function DashboardCharts({
  ridesBreakdown,
  expensesBreakdown,
  revenueBreakdown,
}: {
  ridesBreakdown: BreakdownItem[];
  expensesBreakdown: BreakdownItem[];
  revenueBreakdown: BreakdownItem[];
}) {
  const { theme } = useAdminTheme();
  const hasRides = ridesBreakdown && ridesBreakdown.some((i) => i.value > 0);
  const hasExpenses = expensesBreakdown && expensesBreakdown.some((i) => i.value > 0);
  const hasRevenue = revenueBreakdown && revenueBreakdown.some((i) => i.value > 0);

  const tooltipStyle = {
    backgroundColor: theme === "dark" ? "rgba(13, 17, 32, 0.95)" : "rgba(255, 255, 255, 0.95)",
    borderRadius: "12px",
    border: theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid #f1f5f9",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
    padding: "10px 14px",
    fontSize: "12px",
    fontWeight: "600" as const,
    color: theme === "dark" ? "#ffffff" : "#0f172a",
  };

  const ChartCard = ({ title, children, hasData, emptyMessage }: any) => (
    <div className={`${adminCard} p-7 transition-all hover:shadow-[var(--shadow-card-hover)]`}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em]">{title}</h3>
        <div className="w-8 h-1 bg-[var(--bg-subtle)] rounded-full" />
      </div>
      <div className="h-64 w-full">
        {hasData ? (
          children
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-[var(--text-muted)] gap-3">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[var(--border-default)] rounded-full border-dashed" />
            </div>
            <span className="text-xs font-medium uppercase tracking-wider">{emptyMessage}</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      <ChartCard title="Rides Distribution" hasData={hasRides} emptyMessage="No Rides Data">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ridesBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              innerRadius={60}
              outerRadius={95}
              paddingAngle={4}
              stroke="none"
              dataKey="value"
              nameKey="name"
            >
              {ridesBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value} Trips`, "Volume"]} contentStyle={tooltipStyle} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-[11px] font-bold text-[var(--text-secondary)] px-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Expense allocation" hasData={hasExpenses} emptyMessage="No Expense Data">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={expensesBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              innerRadius={60}
              outerRadius={95}
              paddingAngle={4}
              stroke="none"
              dataKey="value"
              nameKey="name"
            >
              {expensesBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                new Intl.NumberFormat("en-PK", {
                  style: "currency",
                  currency: "PKR",
                  maximumFractionDigits: 0,
                }).format(Number(value)),
                "Amount",
              ]}
              contentStyle={tooltipStyle}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-[11px] font-bold text-[var(--text-secondary)] px-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Revenue Stream" hasData={hasRevenue} emptyMessage="No Revenue Data">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={revenueBreakdown}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              innerRadius={60}
              outerRadius={95}
              paddingAngle={4}
              stroke="none"
              dataKey="value"
              nameKey="name"
            >
              {revenueBreakdown.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                new Intl.NumberFormat("en-PK", {
                  style: "currency",
                  currency: "PKR",
                  maximumFractionDigits: 0,
                }).format(Number(value)),
                "Impact",
              ]}
              contentStyle={tooltipStyle}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-[11px] font-bold text-[var(--text-secondary)] px-1">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
