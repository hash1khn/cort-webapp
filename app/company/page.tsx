"use client";

import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { fetchDashboardStats, selectDashboardStats, selectDashboardStatus } from "../lib/store/slices/dashboardSlice";
import { selectCompany } from "../lib/store/slices/companySlice";
import { useAuth } from "../lib/contexts/auth-context";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../lib/services/api-client";
import { getCalendarMonthRange } from "../lib/date-utils";
import Modal from "./bookings/components/Modal";
import CreateBookingForm from "./bookings/components/CreateBookingForm";
import EditBudgetForm from "./components/EditBudgetForm";
import {
  TakingCareSection,
  NothingToDoSection,
  ValueDeliveredSection,
  CostVisibilitySection,
  EmployeeUsageSection,
  SmartInsightsSection,
  AdoptionHealthSection,
  ServiceUsageSection,

  PremiumTeaser,
  OutstandingAmountRow
} from "./components/DashboardComponents";
import DashboardSkeleton from "./components/DashboardSkeleton";
import LiveMobilityCenter from "./components/LiveMobilityCenter";
import CostLeakageDetector from "./components/CostLeakageDetector";

export default function CompanyDashboardPage() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const dashboardStats = useAppSelector(selectDashboardStats);
  const status = useAppSelector(selectDashboardStatus);
  const loading = status === 'loading';
  const error = status === 'failed' ? 'Failed to load stats' : null;
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const companyId = user?.company_id?.toString();
  const [benchmarkDelta, setBenchmarkDelta] = useState<number | null>(null);

  const fetchBenchmarkSavings = useCallback(async () => {
    try {
      const now = new Date();
      const { from, to } = getCalendarMonthRange(now.getFullYear(), now.getMonth());
      const data = await apiClient.request<{ delta_pkr: number; has_benchmarks: boolean }>(
        `/company/savings-realisation?from=${from}&to=${to}`,
      );
      if (data.has_benchmarks) setBenchmarkDelta(data.delta_pkr);
    } catch {
      // Silently ignore — card falls back to booking-level savings
    }
  }, []);

  useEffect(() => {
    if (companyId) {
      dispatch(fetchDashboardStats(companyId));
    }
  }, [dispatch, companyId]);

  useEffect(() => {
    fetchBenchmarkSavings();
  }, [fetchBenchmarkSavings]);

  // Calculate services breakdown (percentages)
  // Prefer servicesEnabled from dashboard stats (authoritative, always fresh),
  // fall back to company profile while stats are loading.
  const isChauffeurEnabled =
    dashboardStats?.servicesEnabled?.chauffeur_enabled ??
    company?.services_enabled?.chauffeur_enabled ??
    false;
  const isShuttleEnabled =
    dashboardStats?.servicesEnabled?.shuttle_enabled ??
    company?.services_enabled?.shuttle_enabled ??
    false;

  const totalServices = (isChauffeurEnabled ? (dashboardStats?.chauffeur.totalBookings || 0) : 0) + (isShuttleEnabled ? (dashboardStats?.shuttle.monthlyTrips || 0) : 0);
  const chauffeurPct = totalServices > 0 ? Math.round(((dashboardStats?.chauffeur.totalBookings || 0) / totalServices) * 100) : 0;
  const shuttlePct = totalServices > 0 ? Math.round(((dashboardStats?.shuttle.monthlyTrips || 0) / totalServices) * 100) : 0;

  // Generate real insights
  const generateInsights = () => {
    if (!dashboardStats) return [];
    const insights = [];
    if (isChauffeurEnabled) {
      if (dashboardStats.chauffeur.spendTrend.startsWith('-')) {
        insights.push(`Spending is down ${dashboardStats.chauffeur.spendTrend.replace('-', '')} compared to last month.`);
      } else if (dashboardStats.chauffeur.spendTrend !== "0%") {
        insights.push(`Spending is up ${dashboardStats.chauffeur.spendTrend.replace('+', '')} due to increased demand.`);
      }

      if (dashboardStats.chauffeur.topPassengers.length > 0) {
        insights.push(`${dashboardStats.chauffeur.topPassengers[0].name} has the most rides this month.`);
      }
    }

    if (dashboardStats.employees.departmentUsage.length > 0) {
      insights.push(`${dashboardStats.employees.departmentUsage[0].name} is the most active department (${dashboardStats.employees.departmentUsage[0].percentage}%).`);
    }

    if (isShuttleEnabled && dashboardStats.shuttle.monthlyTrips > 0) {
      insights.push(`${dashboardStats.shuttle.monthlyTrips} shuttle trips completed this month across ${dashboardStats.shuttle.totalRoutes} routes.`);
    }

    if (insights.length === 0) {
      insights.push("Start using enabled services to see insights here.");
    }
    return insights;
  };

  // Transform API data to DashboardData interface
  const data = dashboardStats ? {
    takingCare: {
      unassignedBookings: isChauffeurEnabled ? (dashboardStats.chauffeur.unassignedBookings || 0) : 0,
      ridesCompleted: isChauffeurEnabled ? dashboardStats.chauffeur.completedThisMonth : 0,
      completedTrend: isChauffeurEnabled ? (dashboardStats.chauffeur.completedTrend || "0%") : "0%",
    },
    nothingToDo: {
      pendingApprovals: isChauffeurEnabled ? (dashboardStats.chauffeur.unassignedBookings || 0) : 0,
      delayedRides: 0,
      unresolvedIssues: 0,
      isAllClear: !isChauffeurEnabled || (dashboardStats.chauffeur.unassignedBookings || 0) === 0,
    },
    valueDelivered: {
      estimatedSavings: isChauffeurEnabled ? (dashboardStats.chauffeur.totalSavings || 0) : 0,
      activeRides: isChauffeurEnabled ? (dashboardStats.chauffeur.activeRides || 0) : 0,
      shuttleTrips: isShuttleEnabled ? ((dashboardStats.shuttle as any)?.monthlyTrips || 0) : 0,
      avgTripCost: isChauffeurEnabled && dashboardStats.chauffeur.completedThisMonth > 0
        ? Math.round(dashboardStats.chauffeur.totalSpend / dashboardStats.chauffeur.completedThisMonth)
        : 0,
    },
    cost: {
      totalSpendMTD: isChauffeurEnabled ? dashboardStats.chauffeur.totalSpend : 0,
      spendTrend: isChauffeurEnabled ? (dashboardStats.chauffeur.spendTrend || "0%") : "0%",
      costPerEmployee: isChauffeurEnabled && dashboardStats.employees.active > 0
        ? Math.round(dashboardStats.chauffeur.totalSpend / dashboardStats.employees.active)
        : 0,
      budget: dashboardStats.monthlyBudget || 1500000,
    },
    employeeUsage: {
      activeEmployees: dashboardStats.employees.active,
      totalEmployees: dashboardStats.employees.total,
      avgRidesPerEmployee: isChauffeurEnabled && dashboardStats.employees.active > 0
        ? parseFloat((dashboardStats.chauffeur.totalBookings / dashboardStats.employees.active).toFixed(1))
        : 0,
      departmentUsage: dashboardStats.employees.departmentUsage || [],
      topPassenger: isChauffeurEnabled && dashboardStats.chauffeur.topPassengers[0] ? {
        name: dashboardStats.chauffeur.topPassengers[0].name,
        rides: dashboardStats.chauffeur.topPassengers[0].trips,
        department: "N/A"
      } : { name: "N/A", rides: 0, department: "N/A" },
    },
    smartInsights: generateInsights(),
    seasonality: {
      highDemandDay: isChauffeurEnabled ? (dashboardStats.seasonality?.highDemandDay || "Analysis Pending") : "Analysis Pending",
      lowDemandDay: isChauffeurEnabled ? (dashboardStats.seasonality?.lowDemandDay || "Analysis Pending") : "Analysis Pending",
    },
    adminHealth: {
      registeredVsActiveRatio: dashboardStats.employees.total > 0 ? parseFloat((dashboardStats.employees.active / dashboardStats.employees.total).toFixed(2)) : 0,
      deptAdoptionRate: dashboardStats.employees.departmentUsage.length > 0 ? 100 : 0, // Simple placeholder logic
      bookingVsActualRatio: 1,
    },
    services: {
      chauffeur: isChauffeurEnabled ? chauffeurPct : 0,
      shuttles: isShuttleEnabled ? shuttlePct : 0,
      events: 0,
      eventShuttle: 0,
    },
    mobility: dashboardStats.mobility ?? {
      activeRides: 0,
      employeesTraveling: 0,
      shuttlesRunning: 0,
      chauffeurRides: 0,
      upcomingBookings: 0
    },
    costLeakage: dashboardStats.costLeakage ?? { insights: [] }
  } : null;

  // Real data overrides where possible (example)
  const today = new Date();

  // Use upcoming bookings from stats as proxy for today/actionable items (only relevant when chauffeur is on)
  const todayBookingsCount = isChauffeurEnabled ? (dashboardStats?.alerts.upcomingBookings || 0) : 0;

  if (loading) {
    return (
      <DashboardSkeleton />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Error loading company: {error}
        </div>
      </div>
    );
  }

  if (!company || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company data available</div>
      </div>
    );
  }

  const hasShuttle = isShuttleEnabled;
  const hasChauffeur = isChauffeurEnabled;

  return (
    <div className="flex flex-col gap-6 pb-12 relative max-w-[1600px] mx-auto">

      {/* Welcome Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 dashboard-section dashboard-section-delay-1">
        {/* Welcome Banner - Premium Background Image (Dark Theme - No Fade) */}
        <div className="lg:col-span-2 relative rounded-[2rem] bg-[#0c1a3d] p-6 sm:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.4)] border border-[var(--border-default)] overflow-hidden flex flex-col justify-center min-h-[200px] sm:min-h-[220px] hover:shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition-all duration-200 group">

          {/* Background Image Layer */}
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: "url('/image.png')",
              backgroundSize: "cover",
              backgroundPosition: "center", // Resetting to center to ensure it covers everything smoothly
            }}
          ></div>

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between h-full">
            <div className="flex flex-col justify-center mt-auto sm:mt-0">
              <div className="flex items-center gap-2 text-white text-opacity-70 mb-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-sm bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2 leading-tight">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
              </h1>
              <p className="text-white text-opacity-80 max-w-xl text-base sm:text-lg">
                {hasChauffeur
                  ? <>You have <span className="text-white font-bold">{todayBookingsCount}</span> upcoming bookings.</>
                  : <>Your mobility services are active.</>
                }
              </p>
            </div>

            {hasChauffeur && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="group relative flex items-center justify-center gap-2 rounded-xl bg-[var(--cort-orange)] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[var(--cort-orange-hover)] hover:-translate-y-0.5 shadow-lg active:translate-y-0 active:shadow-md whitespace-nowrap w-full sm:w-auto"
              >
                <svg className="w-4 h-4 text-white transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Booking</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Status - "Nothing specific for you to do" */}
        <div className="lg:col-span-1 h-full">
          <NothingToDoSection 
            data={data.nothingToDo} 
            outstandingAmount={dashboardStats?.chauffeur.outstandingAmount}
            invoices={dashboardStats?.chauffeur.outstandingInvoices}
          />
        </div>
      </div>

      {/* Value Delivered - Hero Row */}
      {(hasChauffeur || hasShuttle) && (
        <div className="w-full dashboard-section dashboard-section-delay-3">
          <ValueDeliveredSection data={data.valueDelivered} benchmarkDelta={benchmarkDelta} />
        </div>
      )}

      {/* Live Mobility Command Center - NEW */}
      <div className="w-full dashboard-section dashboard-section-delay-3">
        <LiveMobilityCenter data={data.mobility} />
      </div>

      {/* 2. Main Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">

        {/* We're Taking Care of This */}
        {hasChauffeur && (
          <div className="lg:col-span-1 dashboard-section dashboard-section-delay-2">
            <TakingCareSection data={data.takingCare} />
          </div>
        )}

        {/* Employee Usage - Wider card */}
        <div className="lg:col-span-1 dashboard-section dashboard-section-delay-3">
          <EmployeeUsageSection data={data.employeeUsage} />
        </div>

        {/* Cost Visibility */}
        {hasChauffeur && (
          <div className="lg:col-span-2 dashboard-section dashboard-section-delay-4">
            <CostVisibilitySection
              data={data.cost}
              onEditBudget={() => setIsBudgetModalOpen(true)}
            />
          </div>
        )}

        {/* Smart Insights */}
        {(hasChauffeur || hasShuttle) && (
          <div className="lg:col-span-2 dashboard-section dashboard-section-delay-5">
            <SmartInsightsSection insights={data.smartInsights} seasonality={data.seasonality} />
          </div>
        )}

        {(hasChauffeur || hasShuttle) && (
          <div className="lg:col-span-1 dashboard-section dashboard-section-delay-4">
            <ServiceUsageSection data={data.services} />
          </div>
        )}

        <div className="lg:col-span-1 dashboard-section dashboard-section-delay-3">
          <AdoptionHealthSection data={data.adminHealth} />
        </div>
      </div>

      {/* Power Insights (Optimization) - Enhanced with Cost Leakage Detector */}
      {hasChauffeur && (
        <div className="dashboard-section dashboard-section-delay-5">
          <CostLeakageDetector data={data.costLeakage} />
        </div>
      )}

      {/* Premium Teaser */}
      <PremiumTeaser />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Booking"
      >
        <CreateBookingForm
          onSuccess={() => setIsModalOpen(false)}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        title="Edit Monthly Budget"
      >
        <EditBudgetForm
          companyId={companyId!}
          currentBudget={data.cost.budget}
          onSuccess={() => setIsBudgetModalOpen(false)}
          onCancel={() => setIsBudgetModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
