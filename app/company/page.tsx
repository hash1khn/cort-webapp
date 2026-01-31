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
  icon,
  isActive = false,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  color?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
}) {
  // Format PKR values to dim the currency symbol - Use consistent purple branding for currency
  const formattedValue = typeof value === 'string' && value.includes('PKR') ? (
    <>
      <span className="text-2xl font-bold text-purple mr-1">PKR</span>
      <span className="text-4xl font-bold text-gray-900 tracking-tight">{value.replace('PKR ', '')}</span>
    </>
  ) : (
    <span className="text-4xl font-bold text-gray-900 tracking-tight">{value}</span>
  );

  return (
    <div className="flex flex-col justify-between rounded-[2rem] bg-white p-7 border border-gray-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.01)] h-full transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06),0_20px_40px_rgba(0,0,0,0.02)] hover:border-gray-200 hover:-translate-y-1">
      {/* Header */}
      <div className="flex items-center gap-4 mb-5">
        <div className={`flex items-center justify-center w-12 h-12 rounded-[14px] bg-${color === 'navy' || color === 'purple' ? 'purple' : color}-50 text-${color === 'navy' || color === 'purple' ? 'purple' : color}-600`}>
          {icon ? (
            <div className="w-6 h-6 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
              {icon}
            </div>
          ) : (
            <div className="w-2 h-2 rounded-full bg-current"></div>
          )}
        </div>
        <span className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      </div>

      {/* Body */}
      <div>
        <div className="flex items-baseline gap-2">
          {/* Value Container */}
          {formattedValue}

          {/* Consistent Status Indicator */}
          {isActive ? (
            <span className="relative flex h-3 w-3 ml-2 -top-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          ) : (
            value === 0 || value === '0' ? (
              <span className="h-2 w-2 rounded-full bg-gray-200 ml-2 -top-3 relative"></span>
            ) : (
              <span className="h-2 w-2 rounded-full bg-gray-300 ml-2 -top-3 relative"></span>
            )
          )}
        </div>

        <div className="flex items-center gap-3 mt-3">
          {trend && (
            <div className="flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              {trend.includes('+') ? trend : `+${trend}`}
            </div>
          )}
          {subtext && <div className="text-sm text-gray-400 font-medium">{subtext}</div>}
        </div>
      </div>
    </div>
  );
}


function ProgressBar({ label, value, max, color = "#374151", showPercentage = true }: { label: string; value: number; max: number; color?: string; showPercentage?: boolean }) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{value}{showPercentage && ` (${percentage}%)`}</span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
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
      <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
      {action && (
        <Link
          href={action.href}
          className="text-sm font-semibold text-purple hover:text-purple/80 transition-colors flex items-center gap-1 hover:gap-2 duration-200"
        >
          {action.label} <span>→</span>
        </Link>
      )}
    </div>
  );
}

export default function CompanyDashboardPage() {
  const { company, employees, loading, error, dashboardStats, bookings } = useCompanyStore();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const stats = dashboardStats || INITIAL_STATS;

  // Calculate dynamic stats for today
  const today = new Date();
  const todayDateString = today.toDateString();
  const todayBookings = bookings.filter(b => new Date(b.scheduled_for).toDateString() === todayDateString).length;
  const activeRides = stats.chauffeur.activeRides;

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
      {/* Welcome Header */}
      <div className="relative rounded-[2rem] bg-slate-900 p-12 shadow-[0_2px_20px_rgba(0,0,0,0.04)] border border-gray-800 overflow-hidden">
        {/* Luxury Sedan Background with Gradient Mask */}
        <div className="absolute right-0 top-0 w-3/4 h-full pointer-events-none z-0 mix-blend-lighten">
          <img
            src="/luxury-sedan-banner.png"
            alt="Luxury Sedan"
            className="w-full h-full object-cover object-right opacity-80"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 50%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 50%)' }}
          />
        </div>

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wide">
                {today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white mb-3">
              Welcome back, <span className="text-gray-200">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
            </h1>
            <p className="text-gray-300 max-w-xl text-lg">
              You have <span className="text-white font-bold">{activeRides}</span> active rides and <span className="text-white font-bold">{todayBookings}</span> bookings scheduled for today.
            </p>
          </div>

          {company.services_enabled.chauffeur_enabled && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="group relative flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 transition-all hover:bg-gray-100 hover:-translate-y-0.5 shadow-lg active:translate-y-0 active:shadow-md"
            >
              <svg className="w-4 h-4 text-purple transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>New Booking</span>
            </button>
          )}
        </div>
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
            isActive={stats.employees.active > 0}
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
            <div className="group rounded-[2rem] border border-gray-200/60 bg-white p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-purple/5 text-purple">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">Total Bookings</div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900 tracking-tight">{stats.chauffeur.totalBookings}</span>
                <span className="h-2 w-2 rounded-full bg-gray-300 ml-2 -top-3 relative"></span>
              </div>
              <div className="mt-3 text-sm text-gray-400 font-medium">This month</div>
            </div>

            <div className="group rounded-[2rem] border border-gray-200/60 bg-white p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-green-50 text-green-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">Completed</div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-gray-900 tracking-tight">{stats.chauffeur.completedThisMonth}</span>
                <span className="h-2 w-2 rounded-full bg-gray-300 ml-2 -top-3 relative"></span>
              </div>
              <div className="mt-3 text-sm text-gray-400 font-medium">{stats.chauffeur.totalBookings > 0 ? Math.round((stats.chauffeur.completedThisMonth / stats.chauffeur.totalBookings) * 100) : 0}% completion rate</div>
            </div>

            <div className="group rounded-[2rem] border border-gray-200/60 bg-white p-7 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex items-center justify-center w-12 h-12 rounded-[14px] bg-orange-50 text-orange-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">Monthly Spend</div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple mr-1">PKR</span>
                <span className="text-4xl font-bold text-gray-900 tracking-tight">{(stats.chauffeur.totalSpend / 1000).toFixed(0)}K</span>
                <span className="h-2 w-2 rounded-full bg-gray-300 ml-2 -top-3 relative"></span>
              </div>
              <div className="mt-3 text-sm text-gray-400 font-medium">Chauffeur services</div>
            </div>

          </div>

          {/* Chauffeur Details */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Booking Breakdown */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-5">Package Distribution</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-semibold text-gray-500 mb-3">Spot Bookings</div>
                  <div className="space-y-3">
                    <ProgressBar label="5-Hour Package" value={stats.chauffeur.spotBookings.hr5} max={stats.chauffeur.spotBookings.total} color="#374151" showPercentage={false} />
                    <ProgressBar label="10-Hour Package" value={stats.chauffeur.spotBookings.hr10} max={stats.chauffeur.spotBookings.total} color="#4b5563" showPercentage={false} />
                    <ProgressBar label="24-Hour Package" value={stats.chauffeur.spotBookings.hr24} max={stats.chauffeur.spotBookings.total} color="#6b7280" showPercentage={false} />
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <div className="text-xs font-semibold text-gray-500 mb-3">Monthly Bookings</div>
                  <div className="space-y-3">
                    <ProgressBar label="10-Hr Daily" value={stats.chauffeur.monthlyBookings.hr10Daily} max={stats.chauffeur.monthlyBookings.total} color="#1f2937" showPercentage={false} />
                    <ProgressBar label="24-Hr Daily" value={stats.chauffeur.monthlyBookings.hr24Daily} max={stats.chauffeur.monthlyBookings.total} color="#111827" showPercentage={false} />
                  </div>
                </div>
              </div>
            </div>

            {/* Top Passengers */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-5">Top Passengers</h3>
              <div className="space-y-4">
                {stats.chauffeur.topPassengers.map((passenger, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 text-gray-900 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{passenger.name}</div>
                        <div className="text-xs text-gray-500">{passenger.trips} bookings</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{passenger.trips}</div>
                      <div className="text-xs text-slate-500">trips</div>
                    </div>
                  </div>
                ))}
                {stats.chauffeur.topPassengers.length === 0 && (
                  <div className="text-center text-gray-500 py-8 text-sm">No passenger data available yet</div>
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
        <div className="grid gap-4">
          {/* Upcoming Bookings */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple/10 rounded-lg">
                <svg className="w-5 h-5 text-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-gray-900">Upcoming Bookings</h3>
            </div>
            <div className="text-center py-6">
              <div className="text-5xl font-bold text-gray-900">{stats.alerts.upcomingBookings}</div>
              <div className="text-sm text-gray-500 mt-2">Scheduled in next 7 days</div>
            </div>
            <Link href="/company/bookings" className="block mt-4 text-center text-sm text-purple hover:underline font-semibold transition-colors">
              View Schedule →
            </Link>
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
