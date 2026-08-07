"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { fetchDashboardStats, setDateRange } from "../lib/store/slices/superAdminDashboardSlice";
import { MetricCard } from "./ui/dashboard/MetricCard";
import { DashboardCharts } from "./ui/dashboard/DashboardCharts";
import { DashboardTables } from "./ui/dashboard/DashboardTables";
import { SuperAdminAiBriefing } from "./ui/dashboard/SuperAdminAiBriefing";
import { ServiceSplitTile } from "./ui/dashboard/ServiceSplitTile";
import { BentoTile } from "./ui/dashboard/BentoTile";
import {
  CashFlowBars,
  MarginGauge,
  RankedBarChart,
  ServiceCompareChart,
} from "./ui/dashboard/MiniCharts";
import { FuelPriceAlert } from "./components/FuelPriceAlert";
import { RootState } from "../lib/store/store";
import { PermissionGate } from "./components/PermissionGate";
import { AdminCan } from "../lib/abilities/AdminAbilityProvider";
import {
  Calendar,
  Filter,
  RefreshCcw,
  AlertCircle,
  LayoutDashboard,
  Car,
  Bus,
  ArrowRight,
} from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <PermissionGate permission="dashboard">
      <AdminCan I="read" a="Dashboard">
        <div className="admin-dashboard min-h-screen bg-[var(--bg-page)]">
          <AdminDashboardContent />
        </div>
      </AdminCan>
    </PermissionGate>
  );
}

function AdminDashboardContent() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { stats, loading, error, dateRange } = useAppSelector(
    (state: RootState) => state.superAdminDashboard,
  );

  const getDefaultDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const toLocalDateInputValue = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    return { start: toLocalDateInputValue(firstDay), end: toLocalDateInputValue(now) };
  };
  const defaults = getDefaultDateRange();
  const [startDate, setStartDate] = useState<string>(defaults.start);
  const [endDate, setEndDate] = useState<string>(defaults.end);
  const hasDateFilter = Boolean(startDate && endDate);
  const [loadingAction, setLoadingAction] = useState<"filter" | "refresh" | null>(null);

  useEffect(() => {
    if (!stats && !loading && !error) {
      dispatch(fetchDashboardStats({ startDate, endDate }));
    }
  }, [dispatch, stats, loading, error]);

  useEffect(() => {
    if (dateRange) {
      setStartDate(dateRange.startDate);
      setEndDate(dateRange.endDate);
    }
  }, [dateRange]);

  useEffect(() => {
    if (!loading) setLoadingAction(null);
  }, [loading]);

  const handleRefreshData = (action: "filter" | "refresh") => {
    setLoadingAction(action);
    const params = startDate && endDate ? { startDate, endDate } : undefined;
    dispatch(setDateRange({ startDate: startDate || "", endDate: endDate || "" }));
    dispatch(fetchDashboardStats(params));
  };

  const handleDateChange = (type: "start" | "end", value: string) => {
    if (type === "start") setStartDate(value);
    else setEndDate(value);
  };

  if (error) {
    return (
      <div className="p-8 text-center max-w-md mx-auto">
        <BentoTile className="p-8">
          <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Something went wrong</h2>
          <p className="text-[var(--text-muted)] mb-6 text-sm">{error}</p>
          <button
            onClick={() => handleRefreshData("refresh")}
            className="w-full py-2.5 bg-[var(--cort-navy)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </BentoTile>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-[var(--border-default)] border-t-[var(--cort-navy)] rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <LayoutDashboard className="w-5 h-5 text-[var(--text-primary)]/20" />
          </div>
        </div>
        <div className="text-xs font-medium text-[var(--text-muted)] animate-pulse">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="px-1 pt-0 pb-4 md:px-2 md:pb-6 lg:px-3 lg:pb-8 space-y-6">
      {/* Compact toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">Dashboard</h1>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[var(--bg-card)] px-2 py-1 rounded-xl border border-[var(--border-default)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0 ml-1" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange("start", e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-[var(--text-primary)] focus:ring-0 w-[7.5rem] py-1"
            />
            <span className="text-[var(--text-muted)] text-xs">–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange("end", e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-[var(--text-primary)] focus:ring-0 w-[7.5rem] py-1"
            />
          </div>

          <button
            onClick={() => handleRefreshData("filter")}
            disabled={loading}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--cort-navy)] px-3.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading && loadingAction === "filter" ? (
              <RefreshCcw className="animate-spin h-3.5 w-3.5" />
            ) : (
              <Filter className="h-3.5 w-3.5" />
            )}
            Apply
          </button>
          <button
            onClick={() => handleRefreshData("refresh")}
            disabled={loading}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCcw
              className={`h-3.5 w-3.5 ${loading && loadingAction === "refresh" ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <FuelPriceAlert />

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5">
          {/* Unassigned alert — single compact tile */}
          {stats.totalUnassignedBookings > 0 && (
            <BentoTile
              padding="md"
              className="sm:col-span-2 lg:col-span-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-500">
                    Action needed
                  </div>
                  <div className="text-2xl font-bold text-[var(--text-primary)] tabular-nums leading-tight">
                    {stats.totalUnassignedBookings}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">
                    Unassigned booking{stats.totalUnassignedBookings === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/admin/bookings/pending")}
                className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto self-start px-3 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
              >
                Assign now
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </BentoTile>
          )}

          {/* Hero financials */}
          <MetricCard
            label="Total Revenue"
            metric={stats.totalRevenue}
            type="currency"
            variant="hero"
            className={
              stats.totalUnassignedBookings > 0
                ? "sm:col-span-1 lg:col-span-5"
                : "sm:col-span-1 lg:col-span-7"
            }
          />
          <BentoTile
            className={
              stats.totalUnassignedBookings > 0
                ? "sm:col-span-1 lg:col-span-3"
                : "sm:col-span-1 lg:col-span-5"
            }
            padding="md"
          >
            <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">
              Profitability
            </div>
            <div className="flex items-center gap-4">
              <MarginGauge value={stats.netMargin.current} />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Gross profit
                  </div>
                  <div className="text-xl font-extrabold text-[var(--text-primary)] tabular-nums tracking-tight truncate">
                    {new Intl.NumberFormat("en-PK", {
                      style: "currency",
                      currency: "PKR",
                      maximumFractionDigits: 0,
                    }).format(stats.grossProfit.current)}
                  </div>
                  {stats.grossProfit.previous !== 0 && (
                    <div
                      className={`mt-0.5 text-[10px] font-semibold ${
                        stats.grossProfit.trend === "up"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : stats.grossProfit.trend === "down"
                            ? "text-rose-500"
                            : "text-[var(--text-muted)]"
                      }`}
                    >
                      {Math.abs(stats.grossProfit.percentageChange).toFixed(1)}% vs prior
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-[var(--divider)]">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Net margin
                  </div>
                  <div className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums">
                    {stats.netMargin.current.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          </BentoTile>

          {/* Service splits */}
          <ServiceSplitTile
            title="Chauffeur"
            icon={Car}
            revenue={stats.chauffeurRevenue}
            cogs={stats.chauffeurCOGS}
            profit={stats.chauffeurProfit}
            className="sm:col-span-1 lg:col-span-4"
          />
          <ServiceSplitTile
            title="Shuttle"
            icon={Bus}
            revenue={stats.shuttleRevenue}
            cogs={stats.shuttleCOGS}
            profit={stats.shuttleProfit}
            className="sm:col-span-1 lg:col-span-4"
          />

          {/* Cash position */}
          <BentoTile className="sm:col-span-2 lg:col-span-4" padding="md">
            <div className="text-xs font-semibold text-[var(--text-muted)] mb-1">
              Cash position
            </div>
            <CashFlowBars
              receivables={stats.totalReceivables}
              payables={stats.totalPayables}
            />
            {(hasDateFilter &&
              (stats.currentPeriodReceivables != null || stats.currentPeriodPayables != null)) && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-[var(--text-muted)]">
                {stats.currentPeriodReceivables != null && (
                  <span>
                    Period AR:{" "}
                    {new Intl.NumberFormat("en-PK", {
                      style: "currency",
                      currency: "PKR",
                      maximumFractionDigits: 0,
                    }).format(stats.currentPeriodReceivables)}
                  </span>
                )}
                {stats.currentPeriodPayables != null && (
                  <span>
                    Period AP:{" "}
                    {new Intl.NumberFormat("en-PK", {
                      style: "currency",
                      currency: "PKR",
                      maximumFractionDigits: 0,
                    }).format(stats.currentPeriodPayables)}
                  </span>
                )}
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-[var(--divider)] grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Total COGS
                </div>
                <div className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {new Intl.NumberFormat("en-PK", {
                    style: "currency",
                    currency: "PKR",
                    maximumFractionDigits: 0,
                  }).format(stats.totalCOGS.current)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Cost / ride
                </div>
                <div className="text-lg font-extrabold text-[var(--text-primary)] tabular-nums mt-0.5">
                  {new Intl.NumberFormat("en-PK", {
                    style: "currency",
                    currency: "PKR",
                    maximumFractionDigits: 0,
                  }).format(stats.costPerRide)}
                </div>
              </div>
            </div>
          </BentoTile>

          {/* Charts */}
          <div className="sm:col-span-2 lg:col-span-8 min-h-0">
            <DashboardCharts
              ridesBreakdown={stats.ridesBreakdown}
              expensesBreakdown={stats.expensesBreakdown}
              revenueBreakdown={stats.revenueBreakdown}
              className="h-full"
            />
          </div>

          {/* Ops metrics — stretch to match charts row height */}
          <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-2 grid-rows-2 gap-5 h-full min-h-[240px] lg:min-h-0">
            <MetricCard
              label="Chauffeur rides"
              metric={stats.chauffeurRides}
              type="number"
              variant="compact"
              showSparkline={false}
              className="h-full"
            />
            <MetricCard
              label="Avg chauffeur profit"
              metric={stats.avgChauffeurProfit}
              type="currency"
              variant="compact"
              showSparkline={false}
              className="h-full"
            />
            <MetricCard
              label="Avg shuttle profit"
              metric={stats.avgShuttleProfit}
              type="currency"
              variant="compact"
              showSparkline={false}
              className="h-full"
            />
            <MetricCard
              label="Net margin"
              metric={stats.netMargin}
              type="percentage"
              variant="compact"
              showSparkline={false}
              className="h-full"
            />
          </div>

          {/* Visual analytics row */}
          <BentoTile className="sm:col-span-2 lg:col-span-4" padding="md">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Service compare
            </div>
            <ServiceCompareChart
              chauffeurRevenue={stats.chauffeurRevenue.current}
              shuttleRevenue={stats.shuttleRevenue.current}
              chauffeurProfit={stats.chauffeurProfit.current}
              shuttleProfit={stats.shuttleProfit.current}
            />
          </BentoTile>
          <BentoTile className="sm:col-span-1 lg:col-span-4" padding="md">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Top clients
            </div>
            <RankedBarChart data={stats.revenueByClient || []} color="#0ea5e9" height={200} />
          </BentoTile>
          <BentoTile className="sm:col-span-1 lg:col-span-4" padding="md">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Fuel spend
            </div>
            <RankedBarChart data={stats.fuelExpenses || []} color="#f59e0b" height={200} />
          </BentoTile>

          {/* Tables */}
          <div className="sm:col-span-2 lg:col-span-12">
            <DashboardTables
              revenueByClient={stats.revenueByClient}
              fuelExpenses={stats.fuelExpenses}
              repairExpenses={stats.repairExpenses}
              overdueInvoices={stats.overdueInvoices}
              problemReports={stats.problemReports}
            />
          </div>
        </div>
      )}

      <SuperAdminAiBriefing startDate={startDate} endDate={endDate} />
    </div>
  );
}
