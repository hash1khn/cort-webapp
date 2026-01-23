"use client";

import { useCompanyStore } from "../store/CompanyStore";
import { useState } from "react";
import Modal from "./components/Modal";
import CreateBookingForm from "./components/CreateBookingForm";

export default function BookingsPage() {
  const { company, bookings, employees } = useCompanyStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">No company selected</div>
      </div>
    );
  }

  const getPassengerName = (booking: any) => {
    // First try to get from included relation data
    if (booking.users_chauffeur_bookings_passenger_idTousers) {
      return booking.users_chauffeur_bookings_passenger_idTousers.full_name;
    }
    // Fallback to finding in employees array
    const emp = employees.find((e) => e.id === booking.passenger_id);
    return emp ? emp.full_name : "Unknown";
  };

  const handleBookingCreated = () => {
    setIsModalOpen(false);
    // Refresh the page to fetch new bookings since store doesn't support live updates yet
    window.location.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Booking Management</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Bookings</h1>
        </div>
        {company.services_enabled.chauffeur_enabled && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            New Booking
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full text-sm">
            <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Passenger</th>
                <th className="px-3 py-2 text-left">Package</th>
                <th className="px-3 py-2 text-left">Trip Type</th>
                <th className="px-3 py-2 text-left">Scheduled</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    No bookings found.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium">#{booking.id}</td>
                    <td className="px-3 py-3">
                      {getPassengerName(booking)}
                    </td>
                    <td className="px-3 py-3 capitalize">{booking.package_selected.replace(/_/g, " ")}</td>
                    <td className="px-3 py-3 capitalize">{booking.trip_type.replace(/_/g, " ")}</td>
                    <td className="px-3 py-3">
                      {new Date(booking.scheduled_for).toLocaleString('en-PK', {
                        timeZone: 'Asia/Karachi',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${booking.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : booking.status === "CANCELLED"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                          }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {/* Actions placeholder - can add View Details or Cancel later */}
                      <span className="text-muted text-xs">-</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Booking"
      >
        <CreateBookingForm
          onSuccess={handleBookingCreated}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
