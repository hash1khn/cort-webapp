"use client";

import Link from "next/link";
import { useAdminStore } from "./store/AdminStore";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="text-xs font-semibold tracking-wider text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-navy">{value}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { db, reset } = useAdminStore();

  const activeVehicles = db.vehicles.filter((v) => v.is_active).length;
  const totalEmployees = db.companies.reduce((acc, c) => acc + c.employees.length, 0);
  const pendingBookings = db.chauffeur_bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Overview</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            Super Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
          >
            Reset mock data
          </button>
          <Link
            href="/admin/companies"
            className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            Manage Companies
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Companies" value={`${db.companies.length}`} />
        <StatCard label="Employees" value={`${totalEmployees}`} />
        <StatCard label="Active Vehicles" value={`${activeVehicles}`} />
        <Link href="/admin/bookings/pending" className="block">
          <StatCard
            label="Pending Bookings"
            value={pendingBookings > 0 ? `${pendingBookings} ⚠️` : "0"}
          />
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-navy">Next modules</h2>
        <p className="mt-2 text-sm text-muted">
          You can navigate using the sidebar. Everything is mock/in-browser for now.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            className="rounded-lg border border-border bg-surface p-4 hover:bg-white"
            href="/admin/companies"
          >
            <div className="text-sm font-semibold text-ink">Company Management</div>
            <div className="mt-1 text-xs text-muted">
              Onboarding, services toggle, whitelisting, employees
            </div>
          </Link>
          <Link
            className="rounded-lg border border-border bg-surface p-4 hover:bg-white"
            href="/admin/pricing"
          >
            <div className="text-sm font-semibold text-ink">Contracts & Pricing</div>
            <div className="mt-1 text-xs text-muted">Global fuel + rate cards</div>
          </Link>
          {pendingBookings > 0 && (
            <Link
              className="rounded-lg border border-yellow/30 bg-yellow/5 p-4 hover:bg-yellow/10"
              href="/admin/bookings/pending"
            >
              <div className="text-sm font-semibold text-ink">
                Pending Bookings ({pendingBookings})
              </div>
              <div className="mt-1 text-xs text-muted">
                Review and approve company booking requests
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}


