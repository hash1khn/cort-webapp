"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "../../store/AdminStore";
import type { ChauffeurBooking, ChauffeurCar } from "../../store/types";
import Map, { type MapMarker } from "../../ui/Map";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function PendingBookingsPage() {
  const { db, upsertChauffeurBooking, upsertChauffeurCar } = useAdminStore();
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string>("");

  const pendingBookings = useMemo(() => {
    return db.chauffeur_bookings.filter((b) => b.status === "pending");
  }, [db.chauffeur_bookings]);

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return db.chauffeur_bookings.find((b) => b.id === selectedBookingId) ?? null;
  }, [db.chauffeur_bookings, selectedBookingId]);

  // Get available cars matching the booking's vehicle model
  const availableCars = useMemo(() => {
    if (!selectedBooking) return [];
    return db.chauffeur_cars.filter(
      (car) =>
        car.model === selectedBooking.vehicle_model &&
        (car.status === "available" || car.status === "offline"),
    );
  }, [db.chauffeur_cars, selectedBooking]);

  function handleApprove() {
    if (!selectedBooking || !selectedCarId) {
      alert("Please select a driver/car to assign");
      return;
    }

    const car = db.chauffeur_cars.find((c) => c.id === selectedCarId);
    if (!car) {
      alert("Selected car not found");
      return;
    }

    const now = new Date().toISOString();
    const updated: ChauffeurBooking = {
      ...selectedBooking,
      status: "searching", // Move to searching after approval
      driver_car_id: car.id,
      driver_name: car.driver_name,
      driver_phone: "", // Would come from driver profile in real app
      plate_no: car.plate_no,
      approved_at: now,
      approved_by: "superadmin", // In real app, use actual admin ID
      updated_at: now,
    };

    // Update car status to in_trip
    const updatedCar: ChauffeurCar = {
      ...car,
      status: "in_trip",
    };

    upsertChauffeurBooking(updated);
    upsertChauffeurCar(updatedCar);

    // Reset selection
    setSelectedBookingId(null);
    setSelectedCarId("");
    alert("Booking approved and driver assigned!");
  }

  function handleReject() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to reject this booking?")) return;

    const now = new Date().toISOString();
    const updated: ChauffeurBooking = {
      ...selectedBooking,
      status: "cancelled",
      updated_at: now,
    };

    upsertChauffeurBooking(updated);
    setSelectedBookingId(null);
    alert("Booking rejected");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Booking Approval</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            Pending Bookings
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-surface/30">
            <div className="text-sm font-semibold text-navy">Pending Requests</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Passenger</th>
                  <th className="px-4 py-3 text-left">Vehicle & Package</th>
                  <th className="px-4 py-3 text-left">Scheduled At</th>
                  <th className="px-4 py-3 text-left">Created At</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingBookings.map((b) => {
                  const company = db.companies.find((c) => c.id === b.company_id);
                  const employee = company?.employees.find((e) => e.id === b.passenger_employee_id);
                  const isSelected = selectedBookingId === b.id;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => {
                        setSelectedBookingId(b.id);
                        setSelectedCarId("");
                      }}
                      className={cx(
                        "cursor-pointer transition-colors group",
                        isSelected ? "bg-blue/5" : "hover:bg-surface",
                      )}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-ink group-hover:text-blue transition-colors">
                          {company?.name || "Unknown Company"}
                        </div>
                        <div className="text-[10px] text-muted font-mono">{b.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-ink">{employee?.full_name || "Unknown Passenger"}</div>
                        <div className="text-[11px] text-muted">
                          {employee?.employee_id ? `ID: ${employee.employee_id}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-ink font-medium">{b.vehicle_model}</div>
                        <div className="text-[11px] text-muted">{b.package.replace(/_/g, " ")}</div>
                      </td>
                      <td className="px-4 py-4 text-muted">
                        {formatDateTime(b.scheduled_at)}
                      </td>
                      <td className="px-4 py-4 text-[11px] text-muted">
                        {formatDateTime(b.created_at)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-yellow/10 px-2.5 py-0.5 text-[11px] font-semibold text-yellow">
                          Pending
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {pendingBookings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-muted">No pending bookings found.</div>
              </div>
            ) : null}
          </div>
        </section>

        {selectedBooking && (
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4 mb-6">
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted uppercase">
                      Booking Details
                    </div>
                    <div className="mt-1 text-lg font-semibold text-navy">
                      Reviewing Booking <span className="text-muted font-mono ml-2 text-sm">{selectedBooking.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-yellow/10 px-3 py-1 text-xs font-semibold text-yellow">
                      Pending Approval
                    </span>
                    <button
                      onClick={() => setSelectedBookingId(null)}
                      className="text-muted hover:text-ink text-sm font-medium ml-2"
                    >
                      Close
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">Company</div>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {db.companies.find((c) => c.id === selectedBooking.company_id)?.name || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">Passenger</div>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {(() => {
                        const company = db.companies.find((c) => c.id === selectedBooking.company_id);
                        const employee = company?.employees.find(
                          (e) => e.id === selectedBooking.passenger_employee_id,
                        );
                        return employee ? `${employee.full_name} (${employee.employee_id})` : "—";
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">Vehicle Model</div>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {selectedBooking.vehicle_model}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">Package</div>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {selectedBooking.package.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">Trip Type</div>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {selectedBooking.trip_type.replace(/_/g, " ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">Scheduled At</div>
                    <div className="mt-1 text-sm font-medium text-ink">
                      {formatDateTime(selectedBooking.scheduled_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">Created At</div>
                    <div className="mt-1 text-sm text-muted">
                      {formatDateTime(selectedBooking.created_at)}
                    </div>
                  </div>
                  {selectedBooking.pickup_address && (
                    <div>
                      <div className="text-xs font-semibold tracking-wider text-muted">Pickup Location</div>
                      <div className="mt-1 text-sm font-medium text-ink">
                        {selectedBooking.pickup_address}
                      </div>
                    </div>
                  )}
                  {selectedBooking.dropoff_address && (
                    <div>
                      <div className="text-xs font-semibold tracking-wider text-muted">Dropoff Location</div>
                      <div className="mt-1 text-sm font-medium text-ink">
                        {selectedBooking.dropoff_address}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                <div className="text-xs font-semibold tracking-wider text-muted">
                  ASSIGN DRIVER
                </div>
                <div className="mt-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-ink">Available Drivers</span>
                    <select
                      value={selectedCarId}
                      onChange={(e) => setSelectedCarId(e.target.value)}
                      className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                      <option value="">Select a driver</option>
                      {availableCars.map((car) => (
                        <option key={car.id} value={car.id}>
                          {car.driver_name} - {car.plate_no} ({car.status})
                        </option>
                      ))}
                    </select>
                  </label>
                  {availableCars.length === 0 && (
                    <div className="mt-2 text-xs text-danger">
                      No available drivers found for {selectedBooking.vehicle_model}. The booking
                      will be set to "searching" status.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={!selectedCarId && availableCars.length > 0}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  Approve & Assign Driver
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-danger/30 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger/5"
                >
                  Reject
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

