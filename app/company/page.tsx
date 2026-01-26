"use client";

import Link from "next/link";
import { useCompanyStore } from "./store/CompanyStore";
import { useAuth } from "../lib/contexts/auth-context";
import { useState } from "react";
import Modal from "./bookings/components/Modal";
import CreateBookingForm from "./bookings/components/CreateBookingForm";

// Mock data for analytics
// Initial fallback data
const INITIAL_STATS = {
  employees: {
    total: 0,
    active: 0,
  },
  chauffeur: {
    totalBookings: 0,
    activeRides: 0,
    completedThisMonth: 0,
    totalSpend: 0, // In PKR
    spotBookings: { total: 0, hr5: 0, hr10: 0, hr24: 0 },
    monthlyBookings: { total: 0, hr10Daily: 0, hr24Daily: 0 },
    topPassengers: [],
  },
  shuttle: {
    totalRoutes: 0,
    totalRidersToday: 0,
    monthlyTrips: 0,
    totalSpend: 0, // In PKR
    routes: []
  },
  alerts: {
    upcomingBookings: 0,
    budgetUsed: 0
  }
};

function StatCard({
  label,
  value,
  subtext,
  trend,
  color = "navy",
  icon
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  const colorClasses = {
    navy: 'text-[#0c225e]',
    orange: 'text-[#f47f00]',
    green: 'text-green-600',
    blue: 'text-blue-600',
  };

  return (
    <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500/80">{label}</div>
          <div className={`mt-2 text-3xl font-bold ${colorClasses[color as keyof typeof colorClasses] || colorClasses.navy}`}>
            {value}
          </div>
          {subtext && <div className="text-xs text-slate-500 mt-1 font-medium">{subtext}</div>}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-1 rounded-full w-fit">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {trend}
            </div>
          )}
        </div>
        {icon && <div className="text-slate-400/80 p-2 bg-white/50 rounded-lg">{icon}</div>}
      </div>
    </div>
  );
}


function ProgressBar({ label, value, max, color = "#3b82f6", showPercentage = true }: { label: string; value: number; max: number; color?: string; showPercentage?: boolean }) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-slate-900">{value}{showPercentage && ` (${percentage}%)`}</span>
      </div>
      <div className="h-2.5 bg-slate-200/50 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 rounded-full shadow-sm"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        ></div>
      </div>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: { label: string; href: string } }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-[#0c225e] tracking-tight">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-sm font-semibold text-[#f47f00] hover:text-[#d97000] transition-colors flex items-center gap-1 hover:gap-2 duration-200"
        >
          {action.label} <span>→</span>
        </Link>
      )}
    </div>
  );
}

export default function CompanyDashboardPage() {
  const { company, employees, loading, error, dashboardStats } = useCompanyStore();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = dashboardStats || INITIAL_STATS;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#f47f00] border-r-transparent"></div>
          <p className="mt-4 text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
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

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">No company data available</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-8 relative">
      {/* Background Decoration for Glass Effect */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-100/40 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-orange-100/30 blur-[100px]" />
      </div>

      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-navy to-blue p-8 text-white shadow-xl ring-1 ring-white/10">
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-200 mb-2">
              <span className="text-sm font-medium">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
              Welcome back, <span className="text-premium-gold">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
            </h1>
            <p className="text-blue-100/80">
              Here is what's happening at <span className="font-semibold text-white">{company.name}</span> today.
            </p>
          </div>

          {company.services_enabled.chauffeur_enabled && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="group flex items-center gap-2 rounded-lg bg-premium-gold px-5 py-2.5 text-sm font-bold text-black transition-all hover:bg-[#c5a028] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)] shadow-lg shadow-black/20"
            >
              <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Booking
            </button>
          )}
        </div>

        {/* Decorative Background Elements */}
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/2 rounded-full bg-premium-gold/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 -translate-x-1/3 translate-y-1/3 rounded-full bg-blue-500/20 blur-3xl" />
      </div>

      {/* Key Metrics Overview */}
      <div>
        <SectionHeader title="Overview" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Employees"
            value={stats.employees.total}
            trend="+0 this month"
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <StatCard
            label="Active Employees"
            value={stats.employees.active}
            subtext={`${stats.employees.total > 0 ? Math.round((stats.employees.active / stats.employees.total) * 100) : 0}% of total`}
            color="green"
            icon={
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          {company.services_enabled.chauffeur_enabled && (
            <StatCard
              label="Active Rides"
              value={stats.chauffeur.activeRides}
              subtext="In progress now"
              color="blue"
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
          )}
          {company.services_enabled.shuttle_enabled && (
            <StatCard
              label="Shuttle Usage Today"
              value={stats.shuttle.totalRidersToday}
              subtext="Across all routes"
              color="orange"
              icon={
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              }
            />
          )}
        </div>
      </div>

      {/* Chauffeur Service Section */}
      {company.services_enabled.chauffeur_enabled && (
        <div>
          <SectionHeader
            title="Chauffeur Service"
            action={{ label: "View All Bookings", href: "/company/bookings" }}
          />

          {/* Chauffeur Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Total Bookings</div>
              <div className="text-3xl font-bold text-[#0c225e]">{stats.chauffeur.totalBookings}</div>
              <div className="mt-4 text-xs text-slate-600">This month</div>
            </div>

            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Completed</div>
              <div className="text-3xl font-bold text-green-600">{stats.chauffeur.completedThisMonth}</div>
              <div className="mt-4 text-xs text-slate-600">{stats.chauffeur.totalBookings > 0 ? Math.round((stats.chauffeur.completedThisMonth / stats.chauffeur.totalBookings) * 100) : 0}% completion rate</div>
            </div>

            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Monthly Spend</div>
              <div className="text-3xl font-bold text-[#f47f00]">PKR {(stats.chauffeur.totalSpend / 1000).toFixed(0)}K</div>
              <div className="mt-4 text-xs text-slate-600">Chauffeur services</div>
            </div>

          </div>

          {/* Chauffeur Details */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Booking Breakdown */}
            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
              <h3 className="text-sm font-bold text-slate-700 mb-5">Package Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-3">Spot Bookings</div>
                  <div className="space-y-3">
                    <ProgressBar label="5-Hour Package" value={stats.chauffeur.spotBookings.hr5} max={stats.chauffeur.spotBookings.total} color="#3b82f6" showPercentage={false} />
                    <ProgressBar label="10-Hour Package" value={stats.chauffeur.spotBookings.hr10} max={stats.chauffeur.spotBookings.total} color="#8b5cf6" showPercentage={false} />
                    <ProgressBar label="24-Hour Package" value={stats.chauffeur.spotBookings.hr24} max={stats.chauffeur.spotBookings.total} color="#ec4899" showPercentage={false} />
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 mb-3">Monthly Bookings</div>
                  <div className="space-y-3">
                    <ProgressBar label="10-Hr Daily" value={stats.chauffeur.monthlyBookings.hr10Daily} max={stats.chauffeur.monthlyBookings.total} color="#f59e0b" showPercentage={false} />
                    <ProgressBar label="24-Hr Daily" value={stats.chauffeur.monthlyBookings.hr24Daily} max={stats.chauffeur.monthlyBookings.total} color="#f97316" showPercentage={false} />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Passengers */}
            <div className="rounded-xl border border-white/40 bg-white/60 backdrop-blur-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:bg-white/80">
              <h3 className="text-sm font-bold text-slate-700 mb-5">Top Passengers</h3>
              <div className="space-y-4">
                {stats.chauffeur.topPassengers.map((passenger, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white/40 rounded-lg hover:bg-white/60 transition-colors border border-transparent hover:border-white/40">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#f47f00] to-[#d97000] text-white font-bold text-sm shadow-md">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{passenger.name}</div>
                        <div className="text-xs text-slate-500">{passenger.trips} bookings</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-[#f47f00]">{passenger.trips}</div>
                      <div className="text-xs text-slate-500">trips</div>
                    </div>
                  </div>
                ))}
                {stats.chauffeur.topPassengers.length === 0 && (
                  <div className="text-center text-slate-500 py-8 text-sm">No passenger data available yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shuttle Service Section */}
      {company.services_enabled.shuttle_enabled && (
        <div>
          <SectionHeader
            title="Shuttle Service"
            action={{ label: "View All Routes", href: "/company/routes" }}
          />

          {/* Shuttle Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Total Routes" value={stats.shuttle.totalRoutes} color="navy" />
            <StatCard label="Shuttle Usage Today" value={stats.shuttle.totalRidersToday} color="green" />
            <StatCard label="Monthly Trips" value={stats.shuttle.monthlyTrips} color="blue" />
            <StatCard label="Monthly Spend" value={`PKR ${(stats.shuttle.totalSpend / 1000).toFixed(0)}K`} color="orange" />
          </div>
        </div>
      )}

      {/* Alerts & Actions */}
      <div>
        <SectionHeader title="Alerts & Actions" />
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Upcoming Bookings */}
          <div className="rounded-xl border border-blue-200/50 bg-gradient-to-br from-blue-50/80 to-white/60 backdrop-blur-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100/50 rounded-lg backdrop-blur-sm">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-blue-900">Upcoming Bookings</h3>
            </div>
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-blue-700">{stats.alerts.upcomingBookings}</div>
              <div className="text-sm text-blue-600 mt-2">Scheduled in next 7 days</div>
            </div>
            <Link href="/company/bookings" className="block mt-4 text-center text-sm text-blue-700 hover:text-blue-900 font-semibold transition-colors">
              View Schedule →
            </Link>
          </div>

          {/* Budget Alert */}
          <div className="rounded-xl border border-red-200/50 bg-gradient-to-br from-red-50/80 to-white/60 backdrop-blur-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100/50 rounded-lg backdrop-blur-sm">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-red-900">Budget Alert</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-800">Monthly Budget Used</span>
                <span className="text-2xl font-bold text-red-900">{stats.alerts.budgetUsed}%</span>
              </div>
              <div className="h-4 bg-red-100/50 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-500"
                  style={{ width: `${stats.alerts.budgetUsed}%` }}
                ></div>
              </div>
              <div className="text-xs text-red-700 bg-red-100/60 rounded-lg p-3 backdrop-blur-sm border border-red-200/20">
                You've used {stats.alerts.budgetUsed}% of your monthly transportation budget. Consider reviewing expenses.
              </div>
            </div>
          </div>
        </div>
      </div>

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
