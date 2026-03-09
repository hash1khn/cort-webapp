"use client";

import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { fetchDashboardStats, selectDashboardStats, selectDashboardStatus } from "../lib/store/slices/dashboardSlice";
import { selectCompany } from "../lib/store/slices/companySlice";
import { useAuth } from "../lib/contexts/auth-context";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (companyId) {
      dispatch(fetchDashboardStats(companyId));
    }
  }, [dispatch, companyId]);

  // Calculate services breakdown (percentages)
  const totalServices = (dashboardStats?.chauffeur.totalBookings || 0) + (dashboardStats?.shuttle.monthlyTrips || 0);
  const chauffeurPct = totalServices > 0 ? Math.round(((dashboardStats?.chauffeur.totalBookings || 0) / totalServices) * 100) : 0;
  const shuttlePct = totalServices > 0 ? Math.round(((dashboardStats?.shuttle.monthlyTrips || 0) / totalServices) * 100) : 0;

  // Generate real insights
  const generateInsights = () => {
    if (!dashboardStats) return [];
    const insights = [];
    if (dashboardStats.chauffeur.spendTrend.startsWith('-')) {
      insights.push(`Spending is down ${dashboardStats.chauffeur.spendTrend.replace('-', '')} compared to last month.`);
    } else if (dashboardStats.chauffeur.spendTrend !== "0%") {
      insights.push(`Spending is up ${dashboardStats.chauffeur.spendTrend.replace('+', '')} due to increased demand.`);
    }

    if (dashboardStats.employees.departmentUsage.length > 0) {
      insights.push(`${dashboardStats.employees.departmentUsage[0].name} is the most active department (${dashboardStats.employees.departmentUsage[0].percentage}%).`);
    }

    if (dashboardStats.chauffeur.topPassengers.length > 0) {
      insights.push(`${dashboardStats.chauffeur.topPassengers[0].name} has the most rides this month.`);
    } else {
      insights.push("Start booking rides to see top passenger insights.");
    }
    return insights;
  };

  // Transform API data to DashboardData interface
  const data = dashboardStats ? {
    takingCare: {
      unassignedBookings: dashboardStats.chauffeur.unassignedBookings || 0,
      ridesCompleted: dashboardStats.chauffeur.completedThisMonth,
      completedTrend: dashboardStats.chauffeur.completedTrend || "0%",
    },
    nothingToDo: {
      pendingApprovals: dashboardStats.chauffeur.unassignedBookings || 0,
      delayedRides: 0,
      unresolvedIssues: 0,
      isAllClear: (dashboardStats.chauffeur.unassignedBookings || 0) === 0,
    },
    valueDelivered: {
      estimatedSavings: dashboardStats.chauffeur.totalSavings || 0,
      activeRides: dashboardStats.chauffeur.activeRides || 0,
      shuttleTrips: (dashboardStats.shuttle as any)?.monthlyTrips || 0,
      avgTripCost: dashboardStats.chauffeur.completedThisMonth > 0
        ? Math.round(dashboardStats.chauffeur.totalSpend / dashboardStats.chauffeur.completedThisMonth)
        : 0,
    },
    cost: {
      totalSpendMTD: dashboardStats.chauffeur.totalSpend,
      spendTrend: dashboardStats.chauffeur.spendTrend || "0%",
      costPerEmployee: dashboardStats.employees.active > 0
        ? Math.round(dashboardStats.chauffeur.totalSpend / dashboardStats.employees.active)
        : 0,
      budget: dashboardStats.monthlyBudget || 1500000,
    },
    employeeUsage: {
      activeEmployees: dashboardStats.employees.active,
      totalEmployees: dashboardStats.employees.total,
      avgRidesPerEmployee: dashboardStats.employees.active > 0
        ? parseFloat((dashboardStats.chauffeur.totalBookings / dashboardStats.employees.active).toFixed(1))
        : 0,
      departmentUsage: dashboardStats.employees.departmentUsage || [],
      topPassenger: dashboardStats.chauffeur.topPassengers[0] ? {
        name: dashboardStats.chauffeur.topPassengers[0].name,
        rides: dashboardStats.chauffeur.topPassengers[0].trips,
        department: "N/A"
      } : { name: "N/A", rides: 0, department: "N/A" },
    },
    smartInsights: generateInsights(),
    seasonality: {
      highDemandDay: dashboardStats.seasonality?.highDemandDay || "Analysis Pending",
      lowDemandDay: dashboardStats.seasonality?.lowDemandDay || "Analysis Pending",
    },
    adminHealth: {
      registeredVsActiveRatio: dashboardStats.employees.total > 0 ? parseFloat((dashboardStats.employees.active / dashboardStats.employees.total).toFixed(2)) : 0,
      deptAdoptionRate: dashboardStats.employees.departmentUsage.length > 0 ? 100 : 0, // Simple placeholder logic
      bookingVsActualRatio: 1,
    },
    services: {
      chauffeur: chauffeurPct,
      shuttles: shuttlePct,
      events: 0,
      eventShuttle: 0,
    },
    mobility: (dashboardStats as any).mobility || {
      activeRides: 0,
      employeesTraveling: 0,
      shuttlesRunning: 0,
      chauffeurRides: 0,
      upcomingBookings: 0
    },
    costLeakage: (dashboardStats as any).costLeakage || { insights: [] }
  } : null;

  // Real data overrides where possible (example)
  const today = new Date();

  // Use upcoming bookings from stats as proxy for today/actionable items
  const todayBookingsCount = dashboardStats?.alerts.upcomingBookings || 0;

  if (loading) {
    return (
      <DashboardSkeleton />
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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

  return (
    <div className="flex flex-col gap-6 pb-12 relative max-w-[1600px] mx-auto">

      {/* Welcome Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 dashboard-section dashboard-section-delay-1">
        {/* Welcome Banner - Premium Background Image (Dark Theme - No Fade) */}
        <div className="lg:col-span-2 relative rounded-[2rem] bg-[var(--cort-navy)] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-[var(--cort-navy-border)] overflow-hidden flex flex-col justify-center min-h-[200px] sm:min-h-[220px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all duration-200 group">

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
                You have <span className="text-white font-bold">{todayBookingsCount}</span> upcoming bookings.
              </p>
            </div>

            {company?.services_enabled?.chauffeur_enabled && (
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
          <NothingToDoSection data={data.nothingToDo} />
        </div>
      </div>

      {/* Outstanding Amount Row - relative z-30 so tooltip appears above Value Delivered section */}

      {/* Value Delivered - Hero Row */}
      <div className="w-full dashboard-section dashboard-section-delay-3">
        <ValueDeliveredSection data={data.valueDelivered} />
      </div>
      <div className="w-full dashboard-section dashboard-section-delay-2 relative z-30">
        <OutstandingAmountRow
          amount={dashboardStats?.chauffeur.outstandingAmount || 0}
          invoices={dashboardStats?.chauffeur.outstandingInvoices || []}
        />
      </div>

      {/* Live Mobility Command Center - NEW */}
      <div className="w-full dashboard-section dashboard-section-delay-3">
        <LiveMobilityCenter data={data.mobility} />
      </div>

      {/* 2. Main Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max">

        {/* We're Taking Care of This */}
        <div className="lg:col-span-1 dashboard-section dashboard-section-delay-2">
          <TakingCareSection data={data.takingCare} />
        </div>

        {/* Employee Usage - Wider card */}
        <div className="lg:col-span-1 dashboard-section dashboard-section-delay-3">
          <EmployeeUsageSection data={data.employeeUsage} />
        </div>

        {/* Cost Visibility */}
        <div className="lg:col-span-2 dashboard-section dashboard-section-delay-4">
          <CostVisibilitySection
            data={data.cost}
            onEditBudget={() => setIsBudgetModalOpen(true)}
          />
        </div>

        {/* Smart Insights */}
        <div className="lg:col-span-2 dashboard-section dashboard-section-delay-5">
          <SmartInsightsSection insights={data.smartInsights} seasonality={data.seasonality} />
        </div>

        <div className="lg:col-span-1 dashboard-section dashboard-section-delay-4">
          <ServiceUsageSection data={data.services} />
        </div>

        <div className="lg:col-span-1 dashboard-section dashboard-section-delay-3">
          <AdoptionHealthSection data={data.adminHealth} />
        </div>
      </div>

      {/* Power Insights (Optimization) - Enhanced with Cost Leakage Detector */}
      <div className="dashboard-section dashboard-section-delay-5">
        <CostLeakageDetector data={data.costLeakage} />
      </div>

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
