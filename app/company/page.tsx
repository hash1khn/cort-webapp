"use client";

import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../lib/store/hooks";
import { fetchDashboardStats, selectDashboardStats, selectDashboardStatus } from "../lib/store/slices/dashboardSlice";
import { selectCompany } from "../lib/store/slices/companySlice";
import { useAuth } from "../lib/contexts/auth-context";
import { useState, useEffect } from "react";
import Modal from "./bookings/components/Modal";
import CreateBookingForm from "./bookings/components/CreateBookingForm";
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

export default function CompanyDashboardPage() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const dashboardStats = useAppSelector(selectDashboardStats);
  const status = useAppSelector(selectDashboardStatus);
  const loading = status === 'loading';
  const error = status === 'failed' ? 'Failed to load stats' : null;
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      activeRoutes: dashboardStats.shuttle.totalRoutes || 0,
      shuttleTrips: dashboardStats.shuttle.monthlyTrips || 0,
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
    },
    employeeUsage: {
      activeEmployees: dashboardStats.employees.active,
      totalEmployees: dashboardStats.employees.total,
      avgRidesPerEmployee: dashboardStats.employees.active > 0
        ? parseFloat((dashboardStats.chauffeur.totalBookings / dashboardStats.employees.active).toFixed(1))
        : 0,
      departmentUsage: dashboardStats.employees.departmentUsage || [],
      topRider: dashboardStats.chauffeur.topPassengers[0] ? {
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
      airport: 0,
    }
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Error loading company: {error}
        </div>
      </div>
    );
  }

  if (!company || !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">No company data available</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 relative max-w-[1600px] mx-auto">

      {/* Welcome Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Banner - Shrunken/Balanced */}
        <div className="lg:col-span-2 relative rounded-[2rem] bg-slate-900 p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-800 overflow-hidden flex flex-col justify-center min-h-[220px]">
          {/* Luxury Sedan Background with Gradient Mask */}
          <div className="absolute right-0 top-0 w-3/4 h-full pointer-events-none z-0 mix-blend-lighten">
            <img
              src="/luxury-sedan-banner.png"
              alt="Luxury Sedan"
              className="w-full h-full object-cover object-right opacity-60"
              style={{ maskImage: 'linear-gradient(to right, transparent, black 60%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 60%)' }}
            />
          </div>

          <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <span className="text-xs font-medium uppercase tracking-wide">
                  {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                Welcome back, <span className="text-gray-200">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
              </h1>
              <p className="text-gray-300 max-w-xl text-lg">
                You have <span className="text-white font-bold">{todayBookingsCount}</span> upcoming bookings.
              </p>
            </div>

            {company?.services_enabled?.chauffeur_enabled && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="group relative flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition-all hover:bg-gray-50 hover:-translate-y-0.5 shadow-lg active:translate-y-0 active:shadow-md whitespace-nowrap"
              >
                <svg className="w-4 h-4 text-purple-600 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      {/* Value Delivered - Hero Row */}
      <div className="w-full">
        <ValueDeliveredSection data={data.valueDelivered} />
      </div>

      {/* Outstanding Amount Row */}
      <div className="w-full">
        <OutstandingAmountRow amount={dashboardStats?.chauffeur.outstandingAmount || 0} />
      </div>

      {/* 2. Main Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-fr">

        {/* We're Taking Care of This */}
        <div className="lg:col-span-1">
          <TakingCareSection data={data.takingCare} />
        </div>

        {/* Employee Usage - Wider card */}
        <div className="lg:col-span-1">
          <EmployeeUsageSection data={data.employeeUsage} />
        </div>

        {/* Cost Visibility */}
        <div className="lg:col-span-2">
          <CostVisibilitySection data={data.cost} />
        </div>

        {/* Smart Insights */}
        <div className="lg:col-span-2">
          <SmartInsightsSection insights={data.smartInsights} seasonality={data.seasonality} />
        </div>

        <div className="lg:col-span-1">
          <ServiceUsageSection data={data.services} />
        </div>

        <div className="lg:col-span-1">
          <AdoptionHealthSection data={data.adminHealth} />
        </div>
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
    </div>
  );
}
