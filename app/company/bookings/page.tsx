"use client";

import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { fetchBookings, setPage, setFilters, selectBookings, selectPagination, selectBookingsStatus, selectFilters } from "../../lib/store/slices/bookingsSlice";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDateTime } from "@/app/lib/utils";
import Modal from "./components/Modal";
import CreateBookingForm from "./components/CreateBookingForm";
import { ChauffeurBooking } from "../../lib/services/api-client";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "../components/DashboardComponents";
import TableSkeleton from "@/app/components/ui/TableSkeleton";
import TablePageSkeleton from "../components/TablePageSkeleton";
import Pagination from "../../components/ui/Pagination";

export default function BookingsPage() {
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const bookings = useAppSelector(selectBookings);
  const { page: reduxPage, limit, pages: totalPages } = useAppSelector(selectPagination);
  const { search, status } = useAppSelector(selectFilters);
  const statusState = useAppSelector(selectBookingsStatus);
  const isLoading = statusState === 'loading';

  const searchParams = useSearchParams();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ChauffeurBooking | null>(null);

  // Local state for pagination - decoupled from Redux metadata to prevent loops
  const [currentPage, setCurrentPage] = useState(reduxPage);

  // Local state for inputs to allow debouncing
  const [searchQuery, setSearchQuery] = useState(search);
  const [statusFilter, setStatusFilter] = useState(status);

  // Sync local state with Redux when it changes (e.g., on mount or navigation back)
  useEffect(() => {
    setSearchQuery(search);
    setStatusFilter(status);
  }, [search, status]);

  // Check for action param to open modal
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "new") {
      setIsModalOpen(true);
      // Clean up URL without reload
      router.replace("/company/bookings", { scroll: false });
    }
  }, [searchParams, router]);

  // Debounce search and update Redux filters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== search || statusFilter !== status) {
        dispatch(setFilters({ search: searchQuery, status: statusFilter }));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, search, status, dispatch]);

  // Track last fetched params to avoid duplicates
  const [lastFetchedParams, setLastFetchedParams] = useState<string>("");

  // Fetch when params change - Primary driver is LOCAL state
  useEffect(() => {
    if (!company?.id) return;

    const currentParams = JSON.stringify({ currentPage, limit, status, search });
    if (currentParams === lastFetchedParams && statusState !== 'idle') return;

    setLastFetchedParams(currentParams);
    dispatch(fetchBookings({
      companyId: company.id,
      page: currentPage,
      limit,
      status,
      search
    }));
  }, [dispatch, company?.id, currentPage, limit, status, search, lastFetchedParams, statusState]);

  const handleBookingCreated = () => {
    setIsModalOpen(false);
    if (company?.id) {
      setCurrentPage(1); // Reset local page
      dispatch(fetchBookings({ companyId: company.id, page: 1, limit, status, search }));
    }
  };

  const getPassengerName = (booking: ChauffeurBooking) => {
    return booking.users_chauffeur_bookings_passenger_idTousers?.full_name || "Unknown";
  };


  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-slate-500">No company selected</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wide">Overview</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Bookings</h1>
        </div>
        {company.services_enabled.chauffeur_enabled && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="group relative flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:-translate-y-0.5 shadow-lg active:translate-y-0 active:shadow-md"
          >
            <svg className="w-4 h-4 text-indigo-400 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Booking</span>
          </button>
        )}
      </div>

      <Card className="min-h-[600px]">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-[240px]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search passenger, plate number..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div className="w-[200px]">
            <div className="relative">
              <select
                className="w-full h-11 pl-3 pr-10 rounded-xl border border-slate-200 bg-slate-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none text-slate-600 font-medium"
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
              <svg className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Service</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Passenger</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Package</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Pickup</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">City</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Scheduled</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50/50">
              {isLoading && bookings.length === 0 ? (
                <TableSkeleton columns={9} rows={8} />
              ) : bookings.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <span className="bg-slate-50 p-4 rounded-full mb-3">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </span>
                      <span>No bookings found matching your criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => {
                  const isPending = booking.status === "PENDING";
                  return (
                    <tr
                      key={booking.id}
                      onClick={() => !isPending && setSelectedBooking(booking)}
                      className={`group transition-colors border-b border-transparent hover:bg-slate-50/80 ${isPending ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <td className="px-4 py-4 font-bold text-slate-700">#{booking.id}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                          {booking.service_category || "Standard"}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">
                        {getPassengerName(booking)}
                      </td>
                      <td className="px-4 py-4 text-slate-500 capitalize">{booking.package_selected.replace(/_/g, " ")}</td>
                      <td className="px-4 py-4">
                        <div className="max-w-[200px] truncate text-slate-500" title={booking.pickup_address || "No address"}>
                          {booking.pickup_address || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium">
                        {booking.city || "—"}
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium">
                        {formatDateTime(booking.scheduled_for)}
                      </td>
                      <td className="px-4 py-4">
                        {(() => {
                          const statusStyles: Record<string, string> = {
                            PENDING: "bg-amber-50 text-amber-700 border-amber-100",
                            ASSIGNED: "bg-blue-50 text-blue-700 border-blue-100",
                            ARRIVED: "bg-purple-50 text-purple-700 border-purple-100",
                            IN_PROGRESS: "bg-indigo-50 text-indigo-700 border-indigo-100",
                            COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-100",
                            CANCELLED: "bg-rose-50 text-rose-700 border-rose-100",
                          };
                          const styleClass = statusStyles[booking.status] || "bg-slate-50 text-slate-600 border-slate-200";

                          return (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${styleClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${styleClass.replace('bg-', 'bg-').replace('text-', 'bg-').split(' ')[1].replace('text-', 'bg-')}`}></span>
                              {booking.status}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-indigo-600 hover:shadow-sm">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            dispatch(setPage(page));
          }}
        />
      </Card >

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

      {/* Booking Details Modal - Reusing existing structure but could be improved */}
      {
        selectedBooking && (
          <Modal
            isOpen={!!selectedBooking}
            onClose={() => setSelectedBooking(null)}
            title={`Booking Details #${selectedBooking.id}`}
          >
            <div className="flex flex-col gap-6 relative">


              {/* Status Header */}
              <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-5 rounded-2xl text-white shadow-lg shadow-slate-900/10">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Current Status</div>
                  <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-bold border ${selectedBooking.status === 'PENDING' ? "bg-amber-500/20 text-amber-200 border-amber-500/30" :
                    selectedBooking.status === 'COMPLETED' ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/30" :
                      selectedBooking.status === 'CANCELLED' ? "bg-rose-500/20 text-rose-200 border-rose-500/30" :
                        "bg-blue-500/20 text-blue-200 border-blue-500/30"
                    }`}>
                    <span className={`w-1.5 h-1.5 rounded-full mr-2 ${selectedBooking.status === 'PENDING' ? "bg-amber-400" :
                      selectedBooking.status === 'COMPLETED' ? "bg-emerald-400" :
                        selectedBooking.status === 'CANCELLED' ? "bg-rose-400" :
                          "bg-blue-400"
                      }`}></span>
                    {selectedBooking.status}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Scheduled For</div>
                  <div className="text-lg font-bold text-white tracking-tight">{formatDateTime(selectedBooking.scheduled_for)}</div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Trip Details */}
                <div>
                  <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span> Trip Details
                  </h4>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-8 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Trip Type</div>
                      <div className="text-sm font-bold text-slate-800 capitalize mt-1">{selectedBooking.trip_type.replace(/_/g, " ")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Service Category</div>
                      <div className="text-sm font-bold text-slate-800 mt-1">{selectedBooking.service_category || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Package</div>
                      <div className="text-sm font-bold text-slate-800 capitalize mt-1">{selectedBooking.package_selected.replace(/_/g, " ")}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Requested Model</div>
                      <div className="text-sm font-bold text-slate-800 mt-1">{selectedBooking.vehicle_model || "Any"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">City</div>
                      <div className="text-sm font-bold text-slate-800 mt-1">{selectedBooking.city || "—"}</div>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-200/50">
                      <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Pickup Address</div>
                      <div className="flex items-start gap-2 text-sm font-medium text-slate-700 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {selectedBooking.pickup_address || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passenger Info */}
                <div>
                  <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span> Passenger
                  </h4>
                  <div className="flex items-center gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {selectedBooking.users_chauffeur_bookings_passenger_idTousers?.full_name?.charAt(0) || "P"}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{selectedBooking.users_chauffeur_bookings_passenger_idTousers?.full_name || "Unknown Passenger"}</div>
                      <div className="text-xs text-slate-500">{selectedBooking.users_chauffeur_bookings_passenger_idTousers?.email || "No email provided"}</div>
                    </div>
                  </div>
                </div>

                {/* Assignment (Driver & Vehicle) - Read Only */}
                {selectedBooking.status !== 'PENDING' && (
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <span className="w-1 h-4 bg-indigo-500 rounded-full"></span> Assignment
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Driver Card */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                          <svg className="w-16 h-16 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <div className="flex items-start gap-4 relative z-10">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Driver Name</div>
                              <div className="text-sm font-bold text-slate-900">{selectedBooking.users_chauffeur_bookings_driver_idTousers?.full_name || "—"}</div>
                            </div>
                            {selectedBooking.users_chauffeur_bookings_driver_idTousers?.phone && (
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">Driver Contact</div>
                                <div className="text-sm font-medium text-slate-700">{selectedBooking.users_chauffeur_bookings_driver_idTousers.phone}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Vehicle Card */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                          <svg className="w-16 h-16 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h5a2 2 0 012 2" /></svg>
                        </div>
                        <div className="flex items-start gap-4 relative z-10">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 012-2h5a2 2 0 012 2" /></svg>
                          </div>
                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="text-[10px] text-slate-400 uppercase font-bold">Vehicle Model</div>
                              <div className="text-sm font-bold text-slate-900">{selectedBooking.vehicles ? selectedBooking.vehicles.model : "—"}</div>
                            </div>
                            {selectedBooking.vehicles && (
                              <div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">License Plate</div>
                                <div className="text-sm font-medium text-slate-700 font-mono">{selectedBooking.vehicles.plate_number}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trip Breakdown Table */}
                {selectedBooking.chauffeur_trip_daily_logs && selectedBooking.chauffeur_trip_daily_logs.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <span className="w-1 h-4 bg-indigo-500 rounded-full"></span> Trip Breakdown
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Type</th>
                            <th className="px-4 py-3">Hours</th>
                            <th className="px-4 py-3 text-center">Full Day</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedBooking.chauffeur_trip_daily_logs.map((log, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-semibold text-slate-700">
                                {new Date(log.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${log.trip_type === 'OUT_STATION' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                  {log.trip_type.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-600">{log.hours_used ? Number(log.hours_used).toFixed(1) : '-'}</td>
                              <td className="px-4 py-3 text-center">
                                {log.is_full_day ? (
                                  <span className="text-emerald-500">
                                    <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                  </span>
                                ) : (
                                  <span className="text-slate-300">—</span>
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

              <div className="flex justify-end pt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition-all hover:border-slate-300"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal >
        )
      }
    </div >
  );
}
