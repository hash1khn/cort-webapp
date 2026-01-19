"use client";

import { useMemo } from "react";
import { useCompanyStore } from "../store/CompanyStore";
import Link from "next/link";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getStatusBadge(status: string) {
  const styles = {
    pending: "bg-yellow/10 text-yellow",
    searching: "bg-blue/10 text-blue",
    driver_assigned: "bg-purple/10 text-purple",
    arrived: "bg-green/10 text-green",
    in_progress: "bg-orange/10 text-orange",
    completed: "bg-success/10 text-success",
    cancelled: "bg-danger/10 text-danger",
  };

  return (
    <span
      className={cx(
        "rounded-full px-2 py-0.5 text-xs font-semibold",
        styles[status as keyof typeof styles] || "bg-muted/10 text-muted",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function BookingsPage() {
  const { company, bookings, employees } = useCompanyStore();

  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [bookings]);

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
        {sortedBookings.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-sm text-muted">No bookings yet.</div>
            <Link
              href="/company/bookings/new"
              className="mt-3 inline-block text-sm font-semibold text-orange hover:underline"
            >
              Create your first booking
            </Link>
          </div>
        ) : (
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
                {sortedBookings.map((b) => {
                  const passenger = employees.find((e) => e.id === b.passenger_employee_id);
                  return (
                    <tr key={b.id}>
                      <td className="px-3 py-2 font-mono text-xs">{b.id.slice(0, 8)}...</td>
                      <td className="px-3 py-2">
                        {passenger ? (
                          <div>
                            <div className="font-medium">{passenger.full_name}</div>
                            <div className="text-xs text-muted">{passenger.employee_id}</div>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{b.vehicle_model}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs">{b.package.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs">{b.trip_type.replace(/_/g, " ")}</span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted">
                        {formatDateTime(b.scheduled_at)}
                      </td>
                      <td className="px-3 py-2">{getStatusBadge(b.status)}</td>
                      <td className="px-3 py-2">
                        {b.driver_name ? (
                          <div>
                            <div className="text-xs font-medium">{b.driver_name}</div>
                            {b.plate_no && (
                              <div className="text-xs text-muted">{b.plate_no}</div>
                            )}
                            {b.driver_phone && (
                              <div className="text-xs text-muted">{b.driver_phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">
                            {b.status === "pending" ? "Awaiting approval" : "Not assigned"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {(b.status === "driver_assigned" ||
                          b.status === "arrived" ||
                          b.status === "in_progress") && (
                          <Link
                            href={`/company/bookings/${b.id}/track`}
                            className="inline-flex h-8 items-center justify-center rounded-md bg-orange px-3 text-xs font-semibold text-white hover:opacity-95"
                          >
                            Track
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

