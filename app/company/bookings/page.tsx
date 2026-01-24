"use client";

import { useCompanyStore } from "../store/CompanyStore";
import { useState, useEffect } from "react";
import Modal from "./components/Modal";
import CreateBookingForm from "./components/CreateBookingForm";
import { apiClient, ChauffeurBooking } from "../../lib/services/api-client";

export default function BookingsPage() {
  const { company } = useCompanyStore();
  const [bookings, setBookings] = useState<ChauffeurBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchBookings = async () => {
    if (!company) return;

    try {
      setIsLoading(true);
      const res = await apiClient.getCompanyChauffeurBookings(company.id, {
        status: statusFilter || undefined,
        search: searchQuery || undefined,
        limit: 100 // Fetch reasonably large number for now
      });
      setBookings(res.data.data);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search and fetch on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBookings();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, company?.id]);

  const handleBookingCreated = () => {
    setIsModalOpen(false);
    fetchBookings();
  };

  const getPassengerName = (booking: ChauffeurBooking) => {
    return booking.users_chauffeur_bookings_passenger_idTousers?.full_name || "Unknown";
  };

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
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            New Booking
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-muted uppercase mb-1 block">Search</label>
          <input
            type="text"
            placeholder="Search passenger, plate number..."
            className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-[200px]">
          <label className="text-xs font-semibold text-muted uppercase mb-1 block">Status</label>
          <select
            className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="ARRIVED">Arrived</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
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
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted">Loading bookings...</td></tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted">
                    No bookings found matching your criteria.
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
                      {(() => {
                        const statusColors: Record<string, string> = {
                          PENDING: "bg-amber-100 text-amber-800",
                          ASSIGNED: "bg-blue-100 text-blue-800",
                          ARRIVED: "bg-purple-100 text-purple-800",
                          IN_PROGRESS: "bg-indigo-100 text-indigo-800",
                          COMPLETED: "bg-green-100 text-green-800",
                          CANCELLED: "bg-red-100 text-red-800",
                        };
                        const colorClass = statusColors[booking.status] || "bg-gray-100 text-gray-800";

                        return (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                            {booking.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-3">
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
