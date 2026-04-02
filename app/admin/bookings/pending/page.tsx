"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { DriverType, ChauffeurBooking, TripType, apiClient } from "../../../lib/services/api-client";
import { type MapMarker } from "../../ui/Map";
import Modal from "../../../company/bookings/components/Modal";
import Pagination from "../../../components/ui/Pagination";
import { useAuth } from "../../../lib/contexts/auth-context";
import { cx } from "../../components/ui/cx";
import { EndTripModal } from "./components/EndTripModal";
import { DailyLogsModal } from "./components/DailyLogsModal";
import { RecalculateModal } from "./components/RecalculateModal";
import { PaymentForm } from "./components/PaymentForm";
import { PaymentSummaryCard } from "./components/PaymentSummaryCard";
import { PaymentHistoryList } from "./components/PaymentHistoryList";
import { Trash2 } from "lucide-react";

// Dynamic import for the heavy Leaflet map component
const Map = dynamic(() => import("../../ui/Map"), { ssr: false, loading: () => <div className="h-40 bg-surface/50 rounded-lg animate-pulse flex items-center justify-center text-xs text-muted">Loading map...</div> });

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Karachi',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<ChauffeurBooking[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [availableCars, setAvailableCars] = useState<any[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);

  const { hasCrud } = useAuth();
  const canEditBookings =
    hasCrud("bookings", "create") ||
    hasCrud("bookings", "update") ||
    hasCrud("bookings", "delete");

  const [isLoading, setIsLoading] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [showEndTripModal, setShowEndTripModal] = useState(false);
  const [showDailyLogsModal, setShowDailyLogsModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [isEndingTrip, setIsEndingTrip] = useState(false);
  const [showRecalculateModal, setShowRecalculateModal] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Auto-fill driver when a vehicle is selected
  useEffect(() => {
    if (selectedCarId) {
      const carId = parseInt(selectedCarId);
      const assignedDriver = availableDrivers.find((d: any) => d.drivers_profile?.current_vehicle_id === carId);
      if (assignedDriver) {
        setSelectedDriverId(assignedDriver.id);
      }
    }
  }, [selectedCarId, availableDrivers]);

  const loadData = useCallback(async (page: number, search: string, status: string) => {
    setIsLoading(true);
    try {
      const res = await apiClient.getAllBookings({
        status: status || undefined,
        search: search || undefined,
        page,
        limit,
      }) as any;
      const raw = res?.data ?? res;
      setBookings(raw?.data ?? raw ?? []);
      const meta = raw?.pagination ?? {};
      setPagination({ page: meta.page ?? page, pages: meta.pages ?? 1, total: meta.total ?? 0 });
    } catch (e) {
      console.error("Failed to load bookings", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      loadData(1, searchQuery, statusFilter);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, loadData]);

  // Fetch when page changes
  useEffect(() => {
    loadData(currentPage, searchQuery, statusFilter);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // Load payment data for a booking
  const loadPaymentData = useCallback(async (bookingId: number) => {
    try {
      const [histRes, sumRes] = await Promise.all([
        apiClient.getPaymentHistory(bookingId) as any,
        apiClient.getPaymentSummary(bookingId) as any,
      ]);
      const histRaw = histRes?.data ?? histRes;
      const sumRaw = sumRes?.data ?? sumRes;
      setPaymentHistory(histRaw?.data ?? histRaw ?? []);
      setPaymentSummary(sumRaw?.data ?? sumRaw ?? null);
    } catch (e) {
      console.error("Failed to load payment data", e);
    }
  }, []);

  // Handle opening modal and fetching resources
  const onOpenBookingModal = async (booking: ChauffeurBooking) => {
    setSelectedBookingId(booking.id);
    setSelectedCarId(booking.vehicles?.id?.toString() || "");
    setSelectedDriverId(booking.users_chauffeur_bookings_driver_idTousers?.id?.toString() || "");
    setAvailableCars([]);
    setAvailableDrivers([]);

    const canEditAssignment = booking.status === 'PENDING' || booking.status === 'ASSIGNED' || booking.status === 'ARRIVED';

    if (canEditAssignment) {
      try {
        const [carsRes, driversRes] = await Promise.all([
          apiClient.getAvailableVehicles({ limit: 100 }) as any,
          apiClient.getAvailableDrivers({ limit: 100, driver_type: DriverType.CHAUFFEUR }) as any,
        ]);

        const carsRaw = carsRes?.data ?? carsRes;
        const driversRaw = driversRes?.data ?? driversRes;

        const cars = carsRaw?.data ?? carsRaw ?? [];
        const drivers = driversRaw?.data ?? driversRaw ?? [];

        // Ensure the currently-assigned vehicle/driver remain selectable in the dropdown,
        // even if the backend's "available" filter excludes them.
        const currentCar = booking.vehicles;
        if (currentCar?.id != null && !cars.some((c: any) => c?.id === currentCar.id)) {
          cars.push(currentCar);
        }

        const currentDriver = booking.users_chauffeur_bookings_driver_idTousers;
        if (currentDriver?.id && !drivers.some((d: any) => d?.id === currentDriver.id)) {
          drivers.push(currentDriver);
        }

        setAvailableCars(cars);
        setAvailableDrivers(drivers);
      } catch (e) {
        console.error("Failed to load assignment resources", e);
      }
    }

    if (booking.status !== 'PENDING') {
      loadPaymentData(booking.id);
    }
  };

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find((b) => b.id === selectedBookingId) ?? null;
  }, [bookings, selectedBookingId]);

  async function handleApprove() {
    if (!selectedBooking || !selectedCarId || !selectedDriverId) {
      alert("Please select both a vehicle and a driver to assign");
      return;
    }

    setIsApproving(true);
    try {
      await apiClient.assignBooking(selectedBooking.id, parseInt(selectedCarId), selectedDriverId);
      alert("Booking assignment updated!");
      setSelectedBookingId(null);
      setSelectedCarId("");
      setSelectedDriverId("");
      loadData(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      console.error("Failed to approve booking", error);
      alert(error?.message || "Failed to approve booking");
    } finally {
      setIsApproving(false);
    }
  }

  async function handleStartTrip() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to START this trip?")) return;

    setIsStartingTrip(true);
    try {
      await apiClient.startTrip(selectedBooking.id);
      alert("Trip started successfully!");
      setSelectedBookingId(null);
      loadData(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      alert(error?.message || "Failed to start trip");
    } finally {
      setIsStartingTrip(false);
    }
  }

  async function handleEndTrip(data: any) {
    if (!selectedBooking) return;

    setIsEndingTrip(true);
    try {
      await apiClient.endTrip(selectedBooking.id, data);
      alert("Trip completed and invoice generated successfully!");
      setShowEndTripModal(false);
      setSelectedBookingId(null);
      loadData(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      alert(error?.message || "Failed to end trip");
    } finally {
      setIsEndingTrip(false);
    }
  }

  async function handleUpdateDailyLogs(data: any) {
    if (!selectedBooking) return;

    try {
      await apiClient.updateDailyLogs(selectedBooking.id, data);
      alert("Daily logs updated successfully!");
      setShowDailyLogsModal(false);
      loadData(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      alert(error?.message || "Failed to update daily logs");
    }
  }

  async function handleCompleteTrip() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to COMPLETE this trip? Financials will be calculated.")) return;

    try {
      const res: any = await apiClient.completeTrip(selectedBooking.id);
      const data = res?.data ?? res;
      alert(`Trip completed! Invoice Amount: ${data?.result?.invoice_amount ?? 'Calculated'}`);
      setSelectedBookingId(null);
      loadData(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      alert("Failed to complete trip: " + (error?.message || error));
    }
  }

  async function handleReject() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to REJECT this booking?")) return;

    try {
      await apiClient.updateBookingStatus(selectedBooking.id, "CANCELLED");
      alert("Booking rejected.");
      setSelectedBookingId(null);
      loadData(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      alert(error?.message || "Failed to reject booking");
    }
  }

  async function handleDeleteBooking(bookingId: number) {
    if (!confirm(`Are you sure you want to permanently delete booking #${bookingId}? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient.deleteBooking(bookingId);
      alert("Booking deleted successfully.");
      setSelectedBookingId(null);
      loadData(currentPage, searchQuery, statusFilter);
    } catch (error: any) {
      console.error("Failed to delete booking", error);
      alert(error?.message || "Failed to delete booking");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleGenerateInvoice(id: number) {
    if (!confirm("Generate invoice for this trip?")) return;
    try {
      await apiClient.generateTripInvoice(id);
      alert("Invoice generated successfully");
      loadData(currentPage, searchQuery, statusFilter);
    } catch (e: any) {
      alert("Failed to generate invoice: " + (e?.message || e));
    }
  }

  async function handleRecalculate(data: any, mode: 'info' | 'recalculate') {
    if (!selectedBooking) return;
    setIsRecalculating(true);
    try {
      if (mode === 'info') {
        await apiClient.updateBookingInfo(selectedBooking.id, data);
        alert("✅ Booking info updated. Invoice was not changed.");
      } else {
        const res: any = await apiClient.recalculateBooking(selectedBooking.id, data);
        const result = res?.data ?? res;
        alert(
          `✅ Invoice regenerated!\n\nNew Invoice #${result?.invoice_number ?? ""}\nAmount: PKR ${Number(result?.invoice_amount ?? 0).toLocaleString()}`
        );
      }
      setShowRecalculateModal(false);
      loadData(currentPage, searchQuery, statusFilter);
    } catch (e: any) {
      alert("Failed: " + (e?.message || e));
    } finally {
      setIsRecalculating(false);
    }
  }

  const handleStatusChange = async (b: ChauffeurBooking, newStatus: string) => {
    if (newStatus === 'ASSIGNED') {
      alert("⚠️ Cannot manually switch to 'ASSIGNED'.\n\nPlease click on the booking row to open the details modal, then select a vehicle and driver to Assign.");
      loadData(currentPage, searchQuery, statusFilter);
      return;
    }

    if (newStatus === 'IN_PROGRESS') {
      if (!confirm("Start this trip? This will create a trip log.")) return;
      try {
        await apiClient.startTrip(b.id);
        loadData(currentPage, searchQuery, statusFilter);
      } catch (e: any) { alert("Failed: " + (e?.message || e)); }
      return;
    }

    if (newStatus === 'ENDED') {
      setSelectedBookingId(b.id);
      setShowEndTripModal(true);
      return;
    }

    if (newStatus === 'COMPLETED') {
      if (b.status !== 'ENDED') {
        alert("⚠️ Trip must be in status 'ENDED' before it can be 'COMPLETED'.\n\nPlease select 'ENDED' first to enter trip details (mileage, tolls, etc.).");
        loadData(currentPage, searchQuery, statusFilter);
        return;
      }
      if (!confirm("Complete this trip? This will calculate financials and generate the invoice.")) return;
      try {
        await apiClient.completeTrip(b.id);
        loadData(currentPage, searchQuery, statusFilter);
      } catch (e: any) { alert("Failed: " + (e?.message || e)); }
      return;
    }

    if (newStatus === 'CANCELLED') {
      if (!confirm("⚠️ Are you sure you want to CANCEL this booking?\n\nNote: This action only updates the status and does NOT currently send a cancellation email to the customer.")) return;
      try {
        await apiClient.updateBookingStatus(b.id, newStatus);
        loadData(currentPage, searchQuery, statusFilter);
      } catch (e: any) { alert("Failed: " + (e?.message || e)); }
      return;
    }

    const confirmMessage = newStatus === 'ARRIVED'
      ? "Mark driver as ARRIVED at pickup location?"
      : `Change status to ${newStatus}?`;

    if (!confirm(confirmMessage)) return;
    try {
      await apiClient.updateBookingStatus(b.id, newStatus);
      loadData(currentPage, searchQuery, statusFilter);
    } catch (e: any) { alert("Failed: " + (e?.message || e)); }
  }

  return (
    <div className="flex flex-col gap-6">
      <EndTripModal
        isOpen={showEndTripModal}
        onClose={() => setShowEndTripModal(false)}
        onSubmit={handleEndTrip}
        booking={selectedBooking}
        loading={isEndingTrip}
      />
      <DailyLogsModal
        isOpen={showDailyLogsModal}
        onClose={() => setShowDailyLogsModal(false)}
        onSubmit={handleUpdateDailyLogs}
        booking={selectedBooking}
      />
      <RecalculateModal
        isOpen={showRecalculateModal}
        onClose={() => setShowRecalculateModal(false)}
        onSubmit={handleRecalculate}
        booking={selectedBooking}
        loading={isRecalculating}
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Bookings Management</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            All Bookings
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-muted uppercase mb-1 block">Search</label>
          <input
            type="text"
            placeholder="Search passenger, company, vehicle..."
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
            <option value="ENDED">Ended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-surface/30">
            <div className="text-sm font-semibold text-navy">Booking List</div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left">Passenger</th>
                  <th className="px-4 py-3 text-left">Request</th>
                  <th className="px-4 py-3 text-left">City</th>
                  <th className="px-4 py-3 text-left">Pickup Address</th>
                  <th className="px-4 py-3 text-left">Assigned Driver</th>
                  <th className="px-4 py-3 text-left">Assigned Vehicle</th>
                  <th className="px-4 py-3 text-left">Scheduled At</th>
                  <th className="px-4 py-3 text-center">Days</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading && bookings.length === 0 ? (
                  <tr><td colSpan={9} className="p-4 text-center">Loading...</td></tr>
                ) : bookings.map((b) => {
                  const isSelected = selectedBookingId === b.id;
                  const driver = b.users_chauffeur_bookings_driver_idTousers;
                  const vehicle = b.vehicles;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => onOpenBookingModal(b)}
                      className={cx(
                        "cursor-pointer transition-colors group",
                        isSelected ? "bg-blue/5" : "hover:bg-surface",
                      )}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-ink group-hover:text-blue transition-colors">
                          {b.companies?.name || "Unknown Company"}
                        </div>
                        <div className="text-[10px] text-muted font-mono">{b.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-ink">{b.users_chauffeur_bookings_passenger_idTousers?.full_name || "Unknown Passenger"}</div>
                        <div className="text-[11px] text-muted">
                          {b.users_chauffeur_bookings_passenger_idTousers?.email}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-ink font-medium">{b.vehicle_model || "Any Model"}</div>
                        <div className="text-[11px] text-muted">{b.package_selected.replace(/_/g, " ")}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-ink">{b.city || "—"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[150px] truncate text-sm text-ink" title={b.pickup_address || "No address"}>
                          {b.pickup_address || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {driver ? (
                          <div>
                            <div className="text-sm font-medium text-ink">{driver.full_name}</div>
                            {driver.phone && (
                              <div className="text-[11px] text-muted mt-0.5">{driver.phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {vehicle ? (
                          <div>
                            <div className="text-sm font-medium text-ink">{vehicle.model}</div>
                            <div className="text-[11px] text-muted font-mono mt-0.5">{vehicle.plate_number}</div>
                          </div>
                        ) : (
                          <span className="text-muted text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-muted">
                        {formatDateTime(b.scheduled_for)}
                      </td>
                      <td className="px-4 py-4 text-center font-medium text-ink">
                        {b.no_of_days || 1}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={b.status}
                            onChange={(e) => {
                              if (!canEditBookings) return;
                              handleStatusChange(b, e.target.value);
                            }}
                            disabled={!canEditBookings}
                            className={cx(
                              "h-7 rounded-full px-2 text-[11px] font-semibold border-none outline-none cursor-pointer appearance-none text-center min-w-[100px]",
                              b.status === 'PENDING' ? "bg-yellow/10 text-yellow" :
                                b.status === 'COMPLETED' ? "bg-green/10 text-green-600" :
                                  b.status === 'CANCELLED' ? "bg-red/10 text-red-600" :
                                    "bg-blue/10 text-blue"
                            )}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="ASSIGNED">ASSIGNED</option>
                            <option value="ARRIVED">ARRIVED</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="ENDED">ENDED</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </div>

                        {canEditBookings && (
                          <div
                            className="mt-2 flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              aria-label={`Delete booking #${b.id}`}
                              title={`Delete booking #${b.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBooking(b.id);
                              }}
                              disabled={isDeleting}
                              className="text-danger hover:text-danger/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        {b.status === 'COMPLETED' && !b.invoices && (
                          <div className="mt-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => canEditBookings && handleGenerateInvoice(b.id)}
                              disabled={!canEditBookings}
                              className="text-[10px] bg-navy text-white px-2 py-1 rounded hover:opacity-90 disabled:opacity-50"
                            >
                              Generate Invoice
                            </button>
                          </div>
                        )}
                        {b.invoices && (
                          <div className="mt-2 text-center text-[10px] text-green-600 font-medium">
                            Invoiced #{b.invoices.invoice_number}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!isLoading && bookings.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-muted">No bookings found matching criteria.</div>
              </div>
            ) : null}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.pages}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </section>

        {selectedBooking && (
          <Modal
            isOpen={!!selectedBooking}
            onClose={() => setSelectedBookingId(null)}
            title={`Booking Details #${selectedBooking.id}`}
          >
            <div className="flex flex-col gap-6">
              {/* Status Header */}
              <div className="flex items-center justify-between bg-surface p-4 rounded-lg border border-border">
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider font-semibold">Current Status</div>
                  <div className={cx(
                    "mt-1 text-sm font-bold px-2 py-0.5 rounded-full inline-block",
                    selectedBooking.status === 'PENDING' ? "bg-yellow/10 text-yellow" :
                      selectedBooking.status === 'COMPLETED' ? "bg-green/10 text-green-600" :
                        selectedBooking.status === 'CANCELLED' ? "bg-red/10 text-red-600" :
                          "bg-blue/10 text-blue"
                  )}>
                    {selectedBooking.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted uppercase tracking-wider font-semibold">Scheduled For</div>
                  <div className="mt-1 text-sm font-medium text-ink">{formatDateTime(selectedBooking.scheduled_for)}</div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Trip & Vehicle Request */}
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Trip Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-muted uppercase">Trip Type</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.trip_type.replace(/_/g, " ")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Package</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.package_selected.replace(/_/g, " ")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Requested Model</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.vehicle_model || "Any"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">City</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.city || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Duration (Days)</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.no_of_days || 1}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-muted uppercase">Pickup Address</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.pickup_address || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Passenger Info */}
                <div>
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Passenger & Company</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] text-muted uppercase">Passenger Name</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.users_chauffeur_bookings_passenger_idTousers?.full_name || "—"}</div>
                      {selectedBooking.users_chauffeur_bookings_passenger_idTousers?.email && (
                        <div className="text-xs text-muted">{selectedBooking.users_chauffeur_bookings_passenger_idTousers.email}</div>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] text-muted uppercase">Company</div>
                      <div className="text-sm font-medium text-ink">{selectedBooking.companies?.name || "—"}</div>
                    </div>
                  </div>
                </div>

                {/* Assignment Details (if active) */}
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

                {/* Daily Breakdown (Transparency) */}
                {selectedBooking.chauffeur_trip_daily_logs && selectedBooking.chauffeur_trip_daily_logs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 border-b border-border pb-1">Trip Breakdown</h4>
                    <div className="border border-border rounded-lg overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface font-bold text-muted uppercase tracking-tight">
                          <tr>
                            <th className="px-3 py-2 border-b border-border">Date</th>
                            <th className="px-3 py-2 border-b border-border">Type</th>
                            <th className="px-3 py-2 border-b border-border text-center">Hours</th>
                            <th className="px-3 py-2 border-b border-border text-center">Full Day</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[...selectedBooking.chauffeur_trip_daily_logs].sort((a, b) => new Date(a.log_date).getTime() - new Date(b.log_date).getTime()).map((log) => (
                            <tr key={log.id} className="hover:bg-surface/50 transition-colors">
                              <td className="px-3 py-2 font-medium text-ink">
                                {new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                              </td>
                              <td className="px-3 py-2 text-muted">
                                {log.trip_type === 'OUT_STATION' ? (
                                  <span className="text-orange font-semibold">Outstation</span>
                                ) : (
                                  <span className="text-blue/80">In City</span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-ink">
                                {log.hours_used ? parseFloat(log.hours_used.toString()).toFixed(1) : (log.is_full_day ? "24.0" : "0.0")}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {log.is_full_day ? (
                                  <span className="text-green-600 text-[10px] font-bold">YES</span>
                                ) : (
                                  <span className="text-muted text-[10px]">NO</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {(selectedBooking.status === 'PENDING' || selectedBooking.status === 'ASSIGNED' || selectedBooking.status === 'ARRIVED') && (
                <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                  <div className="text-xs font-semibold tracking-wider text-muted">
                    {selectedBooking.status === 'PENDING' ? 'ASSIGN DRIVER & VEHICLE' : 'EDIT VEHICLE & DRIVER'}
                  </div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-ink">Select Vehicle</span>
                      <select
                        value={selectedCarId}
                        onChange={(e) => setSelectedCarId(e.target.value)}
                        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      >
                        <option value="">Select a vehicle</option>
                        {availableCars.map((car) => (
                          <option key={car.id} value={car.id}>
                            {car.make} {car.model} ({car.plate_number})
                          </option>
                        ))}
                      </select>
                      {availableCars.length === 0 && (
                        <div className="mt-1 text-xs text-muted">No available vehicles found.</div>
                      )}
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-ink">Select Driver</span>
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      >
                        <option value="">Select a driver</option>
                        {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.full_name} ({driver.email})
                          </option>
                        ))}
                      </select>
                      {availableDrivers.length === 0 && (
                        <div className="mt-1 text-xs text-muted">No available drivers found.</div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {selectedBooking.status === 'PENDING' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={canEditBookings ? handleReject : undefined}
                    disabled={!canEditBookings}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-danger/30 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={canEditBookings ? handleApprove : undefined}
                    disabled={!canEditBookings || !selectedCarId || !selectedDriverId || isApproving}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 gap-2"
                  >
                    {isApproving && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isApproving ? "Approving..." : "Approve & Assign"}
                  </button>
                </div>
              )}

              {(selectedBooking.status === 'ASSIGNED' || selectedBooking.status === 'ARRIVED') && (
                <div className="flex items-center justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={canEditBookings ? handleApprove : undefined}
                    disabled={!canEditBookings || !selectedCarId || !selectedDriverId || isApproving}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 gap-2"
                  >
                    {isApproving && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isApproving ? "Updating..." : "Update Assignment"}
                  </button>
                </div>
              )}


              {/* Payment Tracking Section - Only show for active/completed trips */}
              {selectedBooking.status !== 'PENDING' && selectedBooking.status !== 'CANCELLED' && (
                <div className="space-y-4 mt-6">
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider border-b border-border pb-1">
                    Payment Tracking
                  </h4>

                  {selectedBooking.status === 'COMPLETED' && paymentSummary && (
                    <PaymentSummaryCard summary={paymentSummary} />
                  )}

                  {(selectedBooking.status === 'IN_PROGRESS' ||
                    selectedBooking.status === 'ENDED' ||
                    selectedBooking.status === 'COMPLETED') &&
                    paymentSummary?.payment_status !== 'FULLY_PAID' &&
                    canEditBookings && (
                      <PaymentForm
                        bookingId={selectedBooking.id}
                        onSuccess={() => loadPaymentData(selectedBooking.id)}
                      />
                    )}

                  {paymentHistory.length > 0 && (
                    <PaymentHistoryList payments={paymentHistory} />
                  )}
                </div>
              )}

              {(selectedBooking.status === 'ASSIGNED' || selectedBooking.status === 'ARRIVED') && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={canEditBookings ? handleStartTrip : undefined}
                    disabled={!canEditBookings || isStartingTrip}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 gap-2"
                  >
                    {isStartingTrip && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isStartingTrip ? "Starting..." : "Start Trip"}
                  </button>
                </div>
              )}

              {selectedBooking.status === 'IN_PROGRESS' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={canEditBookings ? () => setShowEndTripModal(true) : undefined}
                    disabled={!canEditBookings}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  >
                    End Trip
                  </button>
                  <button
                    type="button"
                    onClick={canEditBookings ? () => setShowDailyLogsModal(true) : undefined}
                    disabled={!canEditBookings}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue/10 text-blue px-4 text-sm font-semibold hover:bg-blue/20 disabled:opacity-50"
                  >
                    Manage Daily Logs
                  </button>
                </div>
              )}

              {selectedBooking.status === 'ENDED' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={canEditBookings ? handleCompleteTrip : undefined}
                    disabled={!canEditBookings}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  >
                    Complete Trip (Generate Invoice)
                  </button>
                </div>
              )}

              {selectedBooking.status === 'COMPLETED' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={canEditBookings ? () => setShowRecalculateModal(true) : undefined}
                    disabled={!canEditBookings}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-orange/40 bg-orange/10 px-4 text-sm font-semibold text-orange hover:bg-orange/20 disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Override &amp; Recalculate Invoice
                  </button>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}
