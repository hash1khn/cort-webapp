"use client";

import Link from "next/link";
import { useCompanyStore } from "./store/CompanyStore";
import { useAuth } from "../lib/contexts/auth-context";
import { useState, useEffect } from "react";
import Modal from "./bookings/components/Modal";
import CreateBookingForm from "./bookings/components/CreateBookingForm";
import { MOCK_DASHBOARD_DATA } from "./lib/mockData";
import {
  TakingCareSection,
  NothingToDoSection,
  ValueDeliveredSection,
  CostVisibilitySection,
  EmployeeUsageSection,
  SmartInsightsSection,
  AdoptionHealthSection,
  ServiceUsageSection,
  PremiumTeaser
} from "./components/DashboardComponents";
import DashboardSkeleton from "./components/DashboardSkeleton";

export default function CompanyDashboardPage() {
  const { company, loading, error, bookings } = useCompanyStore();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // In a real app, we would merge real data with the mock data structure here
  // For now, we use the mock data to achieve the requested design
  const data = MOCK_DASHBOARD_DATA;

  // Real data overrides where possible (example)
  const today = new Date();
  const todayDateString = today.toDateString();
  const todayBookingsCount = bookings.filter(b => new Date(b.scheduled_for).toDateString() === todayDateString).length;

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

  if (!company) {
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
                You have <span className="text-white font-bold">{todayBookingsCount}</span> bookings today.
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
