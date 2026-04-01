"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { fetchDashboardStats, setDateRange } from "../lib/store/slices/superAdminDashboardSlice";
import { MetricCard } from "./ui/dashboard/MetricCard";
import { DashboardCharts } from "./ui/dashboard/DashboardCharts";
import { DashboardTables } from "./ui/dashboard/DashboardTables";
import { FuelPriceAlert } from "./components/FuelPriceAlert";
import { RootState } from "../lib/store/store";
import { PermissionGate } from "./components/PermissionGate";
import { AdminCan } from "../lib/abilities/AdminAbilityProvider";

export default function AdminDashboardPage() {
  return (
    <PermissionGate permission="dashboard">
      <AdminCan I="read" a="Dashboard">
        <AdminDashboardContent />
      </AdminCan>
    </PermissionGate>
  );
}

function AdminDashboardContent() {
  const dispatch = useAppDispatch();
  const { stats, loading, error, dateRange } = useAppSelector((state: RootState) => state.superAdminDashboard);

  // Local state for date inputs to allow typing before dispatch
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const hasDateFilter = Boolean(startDate && endDate);

  // Track which button triggered the load
  const [loadingAction, setLoadingAction] = useState<'filter' | 'refresh' | null>(null);

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

  // Reset loading action when loading finishes
  useEffect(() => {
    if (!loading) {
      setLoadingAction(null);
    }
  }, [loading]);

  const handleRefreshData = (action: 'filter' | 'refresh') => {
    setLoadingAction(action);
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
        <button onClick={() => handleRefreshData('refresh')} className="px-4 py-2 bg-navy text-white rounded-md">Retry</button>
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
      {/* Fuel Price Alert */}
      <FuelPriceAlert />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-muted">Overview</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            Super Admin Dashboard
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="h-10 flex-1 sm:w-36 rounded-md border border-border px-3 text-sm"
            />
            <span className="text-muted">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="h-10 flex-1 sm:w-36 rounded-md border border-border px-3 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleRefreshData('filter')}
              disabled={loading}
              className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && loadingAction === 'filter' ? (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              <span>{loading && loadingAction === 'filter' ? 'Loading...' : 'Apply Filter'}</span>
            </button>
            <button
              onClick={() => handleRefreshData('refresh')}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-semibold text-navy hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Data"
            >
              {loading && loadingAction === 'refresh' ? (
                <svg className="animate-spin h-4 w-4 text-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
              )}
            </button>
          </div>
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

            <MetricCard
              label="Receivables"
              metric={{ current: stats.totalReceivables, previous: 0, percentageChange: 0, trend: 'neutral' }}
              type="currency"
              overlayContent={
                <div className="flex flex-col bg-white w-full h-full max-h-64 rounded-xl overflow-hidden">
                  <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Outstanding by Client</span>
                  </div>
                  <div className="overflow-y-auto w-full flex-1">
                    {stats.receivablesByClient && stats.receivablesByClient.length > 0 ? (
                      <div className="divide-y divide-orange-50">
                        {stats.receivablesByClient.map((client, i) => {
                          const max = Math.max(...stats.receivablesByClient.map(c => c.value));
                          const percent = (client.value / max) * 100;
                          return (
                            <div key={i} className="px-4 py-2 hover:bg-orange-50/50 transition-colors relative">
                              <div className="absolute inset-y-1 left-2 bg-orange-100/40 rounded" style={{ width: `calc(${percent}% - 16px)`, minWidth: '4px' }} />
                              <div className="flex justify-between items-center relative z-10 w-full gap-4">
                                <span className="text-xs font-medium text-navy truncate max-w-[140px]">{client.name}</span>
                                <span className="text-xs font-bold text-slate-800 shrink-0">
                                  {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(client.value)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">No pending receivables</div>
                    )}
                  </div>
                </div>
              }
            />

            <MetricCard label="Payables" metric={{ current: stats.totalPayables, previous: 0, percentageChange: 0, trend: 'neutral' }} type="currency" />
          </div>

          {hasDateFilter && (
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Current Filter Receivable"
                metric={{ current: stats.currentPeriodReceivables ?? 0, previous: 0, percentageChange: 0, trend: 'neutral' }}
                type="currency"
              />
              <MetricCard
                label="Current Filter Payable"
                metric={{ current: stats.currentPeriodPayables ?? 0, previous: 0, percentageChange: 0, trend: 'neutral' }}
                type="currency"
              />
            </div>
          )}

          {/* Charts */}
          <DashboardCharts
            ridesBreakdown={stats.ridesBreakdown}
            expensesBreakdown={stats.expensesBreakdown}
            revenueBreakdown={stats.revenueBreakdown}
          />

          {/* Tables */}
          <DashboardTables
            revenueByClient={stats.revenueByClient}
            fuelExpenses={stats.fuelExpenses}
            repairExpenses={stats.repairExpenses}
            overdueInvoices={stats.overdueInvoices}
          />
        </>
      )}
    </div>
  );
}


