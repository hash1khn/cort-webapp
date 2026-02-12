"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { fetchDashboardStats, setDateRange } from "../lib/store/slices/superAdminDashboardSlice";
import { MetricCard } from "./ui/dashboard/MetricCard";
import { DashboardCharts } from "./ui/dashboard/DashboardCharts";
import { DashboardTables } from "./ui/dashboard/DashboardTables";
import { RootState } from "../lib/store/store";

export default function AdminDashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, loading, error, dateRange } = useAppSelector((state: RootState) => state.superAdminDashboard);

  // Local state for date inputs to allow typing before dispatch
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    // Initial fetch if no stats
    if (!stats && !loading && !error) {
      dispatch(fetchDashboardStats());
    }
  }, [dispatch, stats, loading, error]);

  useEffect(() => {
    // Sync local state with redux state
    if (dateRange) {
      setStartDate(dateRange.startDate);
      setEndDate(dateRange.endDate);
    }
  }, [dateRange]);


  const handleRefresh = () => {
    const params = (startDate && endDate) ? { startDate, endDate } : undefined;
    dispatch(setDateRange({ startDate: startDate || '', endDate: endDate || '' }));
    dispatch(fetchDashboardStats(params));
  };

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') setStartDate(value);
    else setEndDate(value);
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-600 mb-4">Error loading dashboard: {error}</div>
        <button onClick={handleRefresh} className="px-4 py-2 bg-navy text-white rounded-md">Retry</button>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="p-6 text-center text-muted">
        Loading dashboard data...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Overview</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            Super Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange('start', e.target.value)}
            className="h-10 rounded-md border border-border px-3 text-sm"
          />
          <span className="text-muted">-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange('end', e.target.value)}
            className="h-10 rounded-md border border-border px-3 text-sm"
          />
          <button
            onClick={handleRefresh}
            className="inline-flex h-10 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            Apply Filter
          </button>
        </div>
      </div>

      {/* Unassigned Bookings Banner */}
      {stats && (
        <div className="bg-white p-4 rounded-lg border border-border shadow-sm flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-navy">Total Unassigned Bookings</h2>
            <p className="text-muted text-sm">Action required for these bookings</p>
          </div>
          <div className="text-3xl font-bold text-red-600">
            {stats.totalUnassignedBookings || 0}
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Revenue" metric={stats.totalRevenue} type="currency" />
            <MetricCard label="COGS" metric={stats.totalCOGS} type="currency" />
            <MetricCard label="Gross Profit" metric={stats.grossProfit} type="currency" />
            <MetricCard label="Net Margin" metric={stats.netMargin} type="percentage" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Profit per Ride" metric={{ current: stats.profitPerRide, previous: 0, percentageChange: 0, trend: 'neutral' }} type="currency" />
            <MetricCard label="Cost per Ride" metric={{ current: stats.costPerRide, previous: 0, percentageChange: 0, trend: 'neutral' }} type="currency" />
            <MetricCard label="Receivables" metric={{ current: stats.totalReceivables, previous: 0, percentageChange: 0, trend: 'neutral' }} type="currency" />
            <MetricCard label="Payables" metric={{ current: stats.totalPayables, previous: 0, percentageChange: 0, trend: 'neutral' }} type="currency" />
          </div>

          {/* Charts */}
          <DashboardCharts
            ridesBreakdown={stats.ridesBreakdown}
            expensesBreakdown={stats.expensesBreakdown}
          />

          {/* Tables */}
          <DashboardTables
            revenueByClient={stats.revenueByClient}
            fuelExpenses={stats.fuelExpenses}
            repairExpenses={stats.repairExpenses}
          />
        </>
      )}
    </div>
  );
}


