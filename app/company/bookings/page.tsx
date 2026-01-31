"use client";

import { useCompanyStore } from "../store/CompanyStore";
import { useState, useEffect } from "react";
import Modal from "./components/Modal";
import CreateBookingForm from "./components/CreateBookingForm";
import { apiClient, ChauffeurBooking } from "../../lib/services/api-client";
import { useSearchParams, useRouter } from "next/navigation";

export default function BookingsPage() {
  const { company } = useCompanyStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookings, setBookings] = useState<ChauffeurBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ChauffeurBooking | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Check for action param to open modal
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new") {
      setIsModalOpen(true);
      // Clean up URL without reload
      router.replace("/company/bookings", { scroll: false });
    }
  }, [searchParams, router]);

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

  // Helper to format date
  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-PK', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                <th className="px-3 py-2 text-left">Service Type</th>
                <th className="px-3 py-2 text-left">Passenger</th>
                <th className="px-3 py-2 text-left">Package</th>
                <th className="px-3 py-2 text-left">Pickup Address</th>
                <th className="px-3 py-2 text-left">Trip Type</th>
                <th className="px-3 py-2 text-left">Scheduled</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted">Loading bookings...</td></tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted">
                    No bookings found matching your criteria.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const isPending = booking.status === "PENDING";
                  return (
                    <tr
                      key={booking.id}
                      onClick={() => !isPending && setSelectedBooking(booking)}
                      className={`${isPending ? "cursor-default" : "cursor-pointer hover:bg-slate-50"}`}
                    >
                      <td className="px-3 py-3 font-medium">#{booking.id}</td>
                      <td className="px-3 py-3 text-muted">{booking.service_category || "-"}</td>
                      <td className="px-3 py-3">
                        {getPassengerName(booking)}
                      </td>
                      <td className="px-3 py-3 capitalize">{booking.package_selected.replace(/_/g, " ")}</td>
                      <td className="px-3 py-3">
                        <div className="max-w-[200px] truncate" title={booking.pickup_address || "No address"}>
                          {booking.pickup_address || "-"}
                        </div>
                      </td>
                      <td className="px-3 py-3 capitalize">{booking.trip_type.replace(/_/g, " ")}</td>
                      <td className="px-3 py-3">
                        {formatDateTime(booking.scheduled_for)}
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
                  );
                })
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

      {/* Booking Details Modal */}
      {selectedBooking && (
        <Modal
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          title={`Booking Details #${selectedBooking.id}`}
        >
          <div className="flex flex-col gap-6">
            {/* Status Header */}
            <div className="flex items-center justify-between bg-surface p-4 rounded-lg border border-border">
              <div>
                <div className="text-xs text-muted uppercase tracking-wider font-semibold">Current Status</div>
                <div className={`mt-1 text-sm font-bold px-2 py-0.5 rounded-full inline-block ${selectedBooking.status === 'PENDING' ? "bg-amber-100 text-amber-800" :
                  selectedBooking.status === 'COMPLETED' ? "bg-green-100 text-green-800" :
                    selectedBooking.status === 'CANCELLED' ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                  }`}>
                  {selectedBooking.status}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted uppercase tracking-wider font-semibold">Scheduled For</div>
                <div className="mt-1 text-sm font-medium text-ink">{formatDateTime(selectedBooking.scheduled_for)}</div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Trip Details */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Trip Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-muted uppercase">Trip Type</div>
                    <div className="text-sm font-medium text-ink">{selectedBooking.trip_type.replace(/_/g, " ")}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase">Service Type</div>
                    <div className="text-sm font-medium text-ink">{selectedBooking.service_category || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase">Package</div>
                    <div className="text-sm font-medium text-ink">{selectedBooking.package_selected.replace(/_/g, " ")}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase">Requested Model</div>
                    <div className="text-sm font-medium text-ink">{selectedBooking.vehicle_model || "Any"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[10px] text-muted uppercase">Pickup Address</div>
                    <div className="text-sm font-medium text-ink">{selectedBooking.pickup_address || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Passenger Info */}
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Passenger</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-muted uppercase">Name</div>
                    <div className="text-sm font-medium text-ink">{selectedBooking.users_chauffeur_bookings_passenger_idTousers?.full_name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted uppercase">Email</div>
                    <div className="text-sm font-medium text-ink">{selectedBooking.users_chauffeur_bookings_passenger_idTousers?.email || "—"}</div>
                  </div>
                </div>
              </div>

              {/* Assignment (Driver & Vehicle) - Read Only */}
              {selectedBooking.status !== 'PENDING' && (
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Assignment Details</h4>
                  <div className="grid grid-cols-2 gap-4 bg-surface/30 p-3 rounded-md">
                    <div>
                      <div className="text-[10px] text-muted uppercase">Assigned Driver</div>
                      <div className="text-sm font-medium text-ink mt-0.5">
                        {selectedBooking.users_chauffeur_bookings_driver_idTousers?.full_name || "—"}
                      </div>
                      {selectedBooking.users_chauffeur_bookings_driver_idTousers?.phone && (
                        <div className="text-xs text-muted">{selectedBooking.users_chauffeur_bookings_driver_idTousers.phone}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Assigned Vehicle</div>
                      <div className="text-sm font-medium text-ink mt-0.5">
                        {selectedBooking.vehicles ? selectedBooking.vehicles.model : "—"}
                      </div>
                      {selectedBooking.vehicles && (
                        <div className="text-xs font-mono text-muted">{selectedBooking.vehicles.plate_number}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
