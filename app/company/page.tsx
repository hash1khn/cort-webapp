"use client";

import Link from "next/link";
import { useCompanyStore } from "./store/CompanyStore";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="text-xs font-semibold tracking-wider text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-navy">{value}</div>
    </div>
  );
}

export default function CompanyDashboardPage() {
  const { company, employees, bookings } = useCompanyStore();

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">No company selected</div>
      </div>
    );
  }

  const activeEmployees = employees.filter((e) => e.status === "active").length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const activeBookings = bookings.filter(
    (b) => b.status === "searching" || b.status === "driver_assigned" || b.status === "in_progress",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Overview</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            {company.name} Dashboard
          </h1>
        </div>
        {company.services_enabled.chauffeur_enabled && (
          <Link
            href="/company/bookings/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            New Booking
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Employees" value={`${employees.length}`} />
        <StatCard label="Active Employees" value={`${activeEmployees}`} />
        <StatCard label="Pending Bookings" value={`${pendingBookings}`} />
        <StatCard label="Active Bookings" value={`${activeBookings}`} />
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-navy">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            className="rounded-lg border border-border bg-surface p-4 hover:bg-white"
            href="/company/employees"
          >
            <div className="text-sm font-semibold text-ink">Manage Employees</div>
            <div className="mt-1 text-xs text-muted">
              View, edit contact info, and deactivate employees
            </div>
          </Link>
          <Link
            className="rounded-lg border border-border bg-surface p-4 hover:bg-white"
            href="/company/bookings"
          >
            <div className="text-sm font-semibold text-ink">View Bookings</div>
            <div className="mt-1 text-xs text-muted">See all bookings and their status</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

