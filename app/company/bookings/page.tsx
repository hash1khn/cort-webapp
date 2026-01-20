"use client";

import { useCompanyStore } from "../store/CompanyStore";
import Link from "next/link";

export default function BookingsPage() {
  const { company } = useCompanyStore();

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">No company selected</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Booking Management</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Bookings</h1>
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

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Passenger</th>
                <th className="px-3 py-2 text-left">Vehicle</th>
                <th className="px-3 py-2 text-left">Package</th>
                <th className="px-3 py-2 text-left">Trip Type</th>
                <th className="px-3 py-2 text-left">Scheduled</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Driver</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-muted">
                  No bookings information available.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
