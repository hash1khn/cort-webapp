"use client";

import { useMemo, useState, useEffect } from "react";
import { DriverType, ChauffeurBooking } from "../../../lib/services/api-client";
import Map, { type MapMarker } from "../../ui/Map";
import Modal from "../../../company/bookings/components/Modal";
import Pagination from "../../../components/ui/Pagination";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import {
  fetchAdminBookings,
  fetchAvailableVehicles,
  fetchAvailableDrivers,
  assignBooking,
  updateBookingStatus,
  startTrip,
  endTrip,
  completeTrip,
  generateTripInvoice,
  selectAdminBookings,
  selectAvailableVehicles,
  selectAvailableDrivers,
  selectAdminBookingsStatus,
  selectAdminBookingsPagination
} from "../../../lib/store/slices/adminBookingsSlice";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Karachi', // GMT+5
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function EndTripModal({ isOpen, onClose, onSubmit }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void }) {
  const [distance, setDistance] = useState("0");
  const [toll, setToll] = useState("0");
  const [parking, setParking] = useState("0");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-navy mb-4">End Trip & Enter Details</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase text-muted">Total Distance (KM)</label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted">Toll Expenses</label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              value={toll}
              onChange={(e) => setToll(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted">Parking Expenses</label>
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-border p-2 text-sm"
              value={parking}
              onChange={(e) => setParking(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:bg-surface rounded">Cancel</button>
            <button
              onClick={() => onSubmit({
                total_distance_km: parseFloat(distance),
                expense_toll: parseFloat(toll),
                expense_parking: parseFloat(parking)
              })}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue rounded hover:opacity-90"
            >
              End Trip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const dispatch = useAppDispatch();
  const bookings = useAppSelector(selectAdminBookings);
  const status = useAppSelector(selectAdminBookingsStatus);
  const pagination = useAppSelector(selectAdminBookingsPagination);
  const availableCars = useAppSelector(selectAvailableVehicles);
  const availableDrivers = useAppSelector(selectAvailableDrivers);

  const [isLoading, setIsLoading] = useState(true); // Local loading state for initial load or debounce
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedCarId, setSelectedCarId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [showEndTripModal, setShowEndTripModal] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    // Sync loading state with Redux if needed, or just use Redux status directly
    setIsLoading(status === 'loading');
  }, [status]);

  const loadData = () => {
    dispatch(fetchAdminBookings({
      status: statusFilter || undefined,
      search: searchQuery || undefined,
      page: currentPage,
      limit
    }));
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        loadData();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  // Fetch when page changes
  useEffect(() => {
    loadData();
  }, [currentPage]);

  // Handle opening modal and fetching resources
  const onOpenBookingModal = (booking: ChauffeurBooking) => {
    setSelectedBookingId(booking.id);
    setSelectedCarId("");
    setSelectedDriverId("");

    // Only fetch resources if the booking needs assignment (PENDING status)
    if (booking.status === 'PENDING') {
      // Check if resources are already loaded to avoid redundant calls or force refresh if needed
      // Currently forcing refresh to ensure availability is up to date
      dispatch(fetchAvailableVehicles({ limit: 100 }));
      dispatch(fetchAvailableDrivers({ limit: 100, driver_type: DriverType.CHAUFFEUR }));
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

    try {
      await dispatch(assignBooking({
        bookingId: selectedBooking.id,
        vehicleId: parseInt(selectedCarId),
        driverId: selectedDriverId
      })).unwrap();

      alert("Booking approved and assignment complete!");
      setSelectedBookingId(null);
      setSelectedCarId("");
      setSelectedDriverId("");

      loadData();
      // Refresh resources if needed? Usually not strictly necessary unless availability changed drastically
    } catch (error: any) {
      console.error("Failed to approve booking", error);
      alert(error || "Failed to approve booking");
    }
  }

  async function handleStartTrip() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to START this trip?")) return;

    try {
      await dispatch(startTrip(selectedBooking.id)).unwrap();
      alert("Trip started successfully!");
      setSelectedBookingId(null);
      loadData();
    } catch (error: any) {
      alert(error || "Failed to start trip");
    }
  }

  async function handleEndTrip(data: any) {
    if (!selectedBooking) return;

    try {
      await dispatch(endTrip({ id: selectedBooking.id, data })).unwrap();
      alert("Trip ended successfully!");
      setShowEndTripModal(false);
      setSelectedBookingId(null);
      loadData();
    } catch (error: any) {
      alert(error || "Failed to end trip");
    }
  }

  async function handleCompleteTrip() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to COMPLETE this trip? Financials will be calculated.")) return;

    try {
      const res: any = await dispatch(completeTrip(selectedBooking.id)).unwrap();
      // res.result might contain invoice_amount
      alert(`Trip completed! Invoice Amount: ${res.result?.invoice_amount ?? 'Calculated'}`);
      setSelectedBookingId(null);
      loadData();
    } catch (error: any) {
      alert("Failed to complete trip: " + error);
    }
  }

  async function handleReject() {
    if (!selectedBooking) return;
    if (!confirm("Are you sure you want to REJECT this booking?")) return;

    try {
      await dispatch(updateBookingStatus({ id: selectedBooking.id, status: "CANCELLED" })).unwrap();
      alert("Booking rejected.");
      setSelectedBookingId(null);
      loadData();
    } catch (error: any) {
      alert(error || "Failed to reject booking");
    }
  }

  async function handleGenerateInvoice(id: number) {
    if (!confirm("Generate invoice for this trip?")) return;
    try {
      await dispatch(generateTripInvoice(id)).unwrap();
      alert("Invoice generated successfully");
      loadData();
    } catch (e: any) {
      alert("Failed to generate invoice: " + e);
    }
  }

  const handleStatusChange = async (b: ChauffeurBooking, newStatus: string) => {
    if (newStatus === 'IN_PROGRESS') {
      if (!confirm("Start this trip? This will create a trip log.")) return;
      try {
        await dispatch(startTrip(b.id)).unwrap();
        loadData();
      } catch (e: any) { alert("Failed: " + e); }
      return;
    }

    if (newStatus === 'ENDED') {
      setSelectedBookingId(b.id);
      setShowEndTripModal(true);
      return;
    }

    if (newStatus === 'COMPLETED') {
      if (!confirm("Complete this trip? This will calculate financials and generate the invoice.")) return;
      try {
        await dispatch(completeTrip(b.id)).unwrap();
        loadData();
      } catch (e: any) { alert("Failed: " + e); }
      return;
    }

    // Default status update
    if (!confirm(`Change status to ${newStatus}?`)) return;
    try {
      await dispatch(updateBookingStatus({ id: b.id, status: newStatus })).unwrap();
      loadData();
    } catch (e: any) { alert("Failed: " + e); }
  }

  return (
    <div className="flex flex-col gap-6">
      <EndTripModal
        isOpen={showEndTripModal}
        onClose={() => setShowEndTripModal(false)}
        onSubmit={handleEndTrip}
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
                      <td className="px-4 py-4 text-center">
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={b.status}
                            onChange={(e) => handleStatusChange(b, e.target.value)}
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
                        {b.status === 'COMPLETED' && !b.invoices && (
                          <div className="mt-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleGenerateInvoice(b.id)}
                              className="text-[10px] bg-navy text-white px-2 py-1 rounded hover:opacity-90"
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
              </div>

              {selectedBooking.status === 'PENDING' && (
                <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
                  <div className="text-xs font-semibold tracking-wider text-muted">
                    ASSIGN DRIVER & VEHICLE
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
                    onClick={handleReject}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-danger/30 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger/5"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={!selectedCarId || !selectedDriverId}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
                  >
                    Approve & Assign
                  </button>
                </div>
              )}

              {(selectedBooking.status === 'ASSIGNED' || selectedBooking.status === 'ARRIVED') && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleStartTrip}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue px-4 text-sm font-semibold text-white hover:opacity-95"
                  >
                    Start Trip
                  </button>
                </div>
              )}

              {selectedBooking.status === 'IN_PROGRESS' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowEndTripModal(true)}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-navy px-4 text-sm font-semibold text-white hover:opacity-95"
                  >
                    End Trip
                  </button>
                </div>
              )}

              {selectedBooking.status === 'ENDED' && (
                <div className="flex items-center gap-3 justify-end pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleCompleteTrip}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-4 text-sm font-semibold text-white hover:opacity-95"
                  >
                    Complete Trip (Generate Invoice)
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
