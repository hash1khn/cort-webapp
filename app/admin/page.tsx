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
import { Calendar, Filter, RefreshCcw, AlertCircle, LayoutDashboard } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <PermissionGate permission="dashboard">
      <AdminCan I="read" a="Dashboard">
        <div className="min-h-screen bg-[#F8FAFC]">
          <AdminDashboardContent />
        </div>
      </AdminCan>
    </PermissionGate>
  );
}

function AdminDashboardContent() {
  const dispatch = useAppDispatch();
  const { stats, loading, error, dateRange } = useAppSelector((state: RootState) => state.superAdminDashboard);

  // Local state for date inputs to allow typing before dispatch
  const getDefaultDateRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const toISO = (d: Date) => d.toISOString().split('T')[0];
    return { start: toISO(firstDay), end: toISO(now) };
  };
  const defaults = getDefaultDateRange();
  const [startDate, setStartDate] = useState<string>(defaults.start);
  const [endDate, setEndDate] = useState<string>(defaults.end);
  const hasDateFilter = Boolean(startDate && endDate);

  // Track which button triggered the load
  const [loadingAction, setLoadingAction] = useState<'filter' | 'refresh' | null>(null);

  useEffect(() => {
    // Initial fetch with current month range
    if (!stats && !loading && !error) {
      dispatch(fetchDashboardStats({ startDate, endDate }));
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
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="bg-rose-50 p-8 rounded-3xl border border-rose-100 shadow-sm">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-navy mb-2">Something went wrong</h2>
          <p className="text-slate-500 mb-8 text-sm leading-relaxed">{error}</p>
          <button 
            onClick={() => handleRefreshData('refresh')} 
            className="w-full py-3 bg-navy text-white rounded-xl font-semibold shadow-lg shadow-navy/20 hover:shadow-navy/30 transition-all hover:-translate-y-0.5"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-navy rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <LayoutDashboard className="w-6 h-6 text-navy/20" />
          </div>
        </div>
        <div className="text-sm font-medium text-slate-400 animate-pulse">Initializing dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-10">
      {/* Fuel Price Alert */}
      <FuelPriceAlert />

      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy/5 border border-navy/10">
            <span className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse" />
            <span className="text-[11px] font-bold text-navy uppercase tracking-wider">System Overview</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy lg:text-4xl">
            Super Admin <span className="text-slate-400 font-light">Dashboard</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">Real-time financial performance and fleet metrics.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 border-r border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleDateChange('start', e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-navy focus:ring-0 w-28"
              />
            </div>
            <div className="flex items-center gap-2 px-3">
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleDateChange('end', e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-navy focus:ring-0 w-28"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleRefreshData('filter')}
              disabled={loading}
              className="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-navy px-6 text-[13px] font-bold text-white shadow-lg shadow-navy/20 hover:shadow-navy/30 hover:-translate-y-0.5 transition-all disabled:opacity-50"
            >
              {loading && loadingAction === 'filter' ? (
                <RefreshCcw className="animate-spin h-4 w-4" />
              ) : (
                <Filter className="h-4 w-4" />
              )}
              <span>Apply Filters</span>
            </button>
            <button
              onClick={() => handleRefreshData('refresh')}
              disabled={loading}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-navy shadow-sm hover:bg-slate-50 hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCcw className={`h-4 w-4 ${loading && loadingAction === 'refresh' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Critical Status Banner */}
      {stats && stats.totalUnassignedBookings > 0 && (
        <div className="relative overflow-hidden bg-white border border-rose-100 p-6 rounded-3xl shadow-[0_10px_40px_-15px_rgba(225,29,72,0.1)] flex flex-col md:flex-row items-center justify-between gap-4 group">
          <div className="absolute top-0 right-0 p-4 -mr-6 -mt-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <AlertCircle size={140} />
          </div>
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 border border-rose-100">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-navy">Unassigned Bookings Detected</h2>
              <p className="text-slate-500 text-sm font-medium">There are {stats.totalUnassignedBookings} bookings that require immediate driver allocation.</p>
            </div>
          </div>
          <button className="px-6 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 hover:shadow-rose-300 transition-all hover:scale-[1.02]">
            Take Action Now
          </button>
        </div>
      )}

      {/* Data Content */}
      {stats && (
        <div className="space-y-12">
          {/* Main Grid */}
          <section>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {/* Featured Full-Width Metric: Unassigned Bookings */}
              <div className="sm:col-span-2 lg:col-span-4">
                <MetricCard 
                  label="Critical: Unassigned Bookings" 
                  metric={{ current: stats.totalUnassignedBookings, previous: 0, percentageChange: 0, trend: 'neutral' }} 
                  type="number" 
                />
              </div>

              <MetricCard label="Total Revenue" metric={stats.totalRevenue} type="currency" />
              <MetricCard label="Chauffeur Revenue" metric={stats.chauffeurRevenue} type="currency" />
              <MetricCard label="Shuttle Revenue" metric={stats.shuttleRevenue} type="currency" />
              <MetricCard label="Total COGS" metric={stats.totalCOGS} type="currency" />
              <MetricCard label="Chauffeur COGS" metric={stats.chauffeurCOGS} type="currency" />
              <MetricCard label="Shuttle COGS" metric={stats.shuttleCOGS} type="currency" />
              <MetricCard label="Gross Profit" metric={stats.grossProfit} type="currency" />
              <MetricCard label="Net Margin" metric={stats.netMargin} type="percentage" />
              <MetricCard label="Chauffeur Profit" metric={stats.chauffeurProfit} type="currency" />
              <MetricCard label="Shuttle Profit" metric={stats.shuttleProfit} type="currency" />
              <MetricCard label="Avg Chauffeur Profit" metric={stats.avgChauffeurProfit} type="currency" />
              <MetricCard label="Avg Shuttle Profit" metric={stats.avgShuttleProfit} type="currency" />
              <MetricCard label="Chauffeur Rides" metric={stats.chauffeurRides} type="number" />
            </div>
          </section>

          <section>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Cost per Ride" metric={{ current: stats.costPerRide, previous: 0, percentageChange: 0, trend: 'neutral' }} type="currency" />
              <MetricCard
                label="Receivables"
                metric={{ current: stats.totalReceivables, previous: 0, percentageChange: 0, trend: 'neutral' }}
                type="currency"
                overlayContent={
                  <div className="flex flex-col bg-white w-full h-full max-h-72 rounded-2xl overflow-hidden border border-slate-100 shadow-2xl">
                    <div className="bg-orange-50/80 backdrop-blur-sm px-5 py-4 border-b border-orange-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-orange-900 uppercase tracking-widest">Client Balances</span>
                      </div>
                    </div>
                    <div className="overflow-y-auto w-full flex-1 p-2">
                      {stats.receivablesByClient && stats.receivablesByClient.length > 0 ? (
                        <div className="space-y-1">
                          {stats.receivablesByClient.map((client, i) => {
                            const max = Math.max(...stats.receivablesByClient.map(c => c.value));
                            const percent = (client.value / max) * 100;
                            return (
                              <div key={i} className="px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors relative group/row">
                                <div className="flex justify-between items-center relative z-10 w-full gap-4">
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-bold text-navy truncate">{client.name}</span>
                                    <div className="w-full mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${percent}%` }} />
                                    </div>
                                  </div>
                                  <span className="text-xs font-extrabold text-navy/80 shrink-0">
                                    {new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(client.value)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <p className="text-xs font-medium text-slate-400">No pending receivables</p>
                        </div>
                      )}
                    </div>
                  </div>
                }
              />
              <MetricCard label="Payables" metric={{ current: stats.totalPayables, previous: 0, percentageChange: 0, trend: 'neutral' }} type="currency" />
            </div>
          </section>

          {hasDateFilter && (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="bg-white/50 backdrop-blur-xl p-0.5 rounded-2xl border border-blue-100 shadow-xl shadow-blue-500/5 overflow-hidden">
                <MetricCard
                  label="Current Filter Total Receivable"
                  metric={{ current: stats.currentPeriodReceivables ?? 0, previous: 0, percentageChange: 0, trend: 'neutral' }}
                  type="currency"
                />
              </div>
              <div className="bg-white/50 backdrop-blur-xl p-0.5 rounded-2xl border border-indigo-100 shadow-xl shadow-indigo-500/5 overflow-hidden">
                <MetricCard
                  label="Current Filter Total Payable"
                  metric={{ current: stats.currentPeriodPayables ?? 0, previous: 0, percentageChange: 0, trend: 'neutral' }}
                  type="currency"
                />
              </div>
            </div>
          )}

          {/* Charts Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-6 w-1 bg-navy rounded-full" />
              <h2 className="text-xl font-bold text-navy">Performance Analytics</h2>
            </div>
            <DashboardCharts
              ridesBreakdown={stats.ridesBreakdown}
              expensesBreakdown={stats.expensesBreakdown}
              revenueBreakdown={stats.revenueBreakdown}
            />
          </section>

          {/* Tables Section */}
          <section className="space-y-6">
             <div className="flex items-center gap-3">
              <div className="h-6 w-1 bg-navy rounded-full" />
              <h2 className="text-xl font-bold text-navy">Operational Details</h2>
            </div>
            <DashboardTables
              revenueByClient={stats.revenueByClient}
              fuelExpenses={stats.fuelExpenses}
              repairExpenses={stats.repairExpenses}
              overdueInvoices={stats.overdueInvoices}
              problemReports={stats.problemReports}
            />
          </section>
        </div>
      )}
    </div>
  );
}


