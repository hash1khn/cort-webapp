"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { DriverType, ChauffeurBooking, apiClient } from "../../../../lib/services/api-client";
import { useDebounce } from "../../../../lib/hooks/useDebounce";

export type BookingStats = {
  total: number;
  pending: number;
  assigned: number;
  arrived: number;
  in_progress: number;
  ended: number;
  completed: number;
  cancelled: number;
};

const LIMIT = 10;

export function usePendingBookings() {
  const [bookings, setBookings] = useState<ChauffeurBooking[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [availableCars, setAvailableCars] = useState<any[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<any>(null);
  const [stats, setStats] = useState<BookingStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedCarId, setSelectedCarId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);
  const debouncedStatus = useDebounce(statusFilter, 500);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = useCallback(async (page: number, search: string, status: string) => {
    setIsLoading(true);
    try {
      const res = (await apiClient.getAllBookings({
        status: status || undefined,
        search: search || undefined,
        page,
        limit: LIMIT,
      })) as any;
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

  const loadStats = useCallback(async () => {
    try {
      const res = (await apiClient.getBookingStats()) as any;
      const data = res?.data ?? res;
      setStats(data);
    } catch (e) {
      console.error("Failed to load booking stats", e);
    }
  }, []);

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

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const handler = () => {
      loadData(1, "", "");
      loadStats();
    };
    window.addEventListener("booking:new", handler);
    return () => window.removeEventListener("booking:new", handler);
  }, [loadData, loadStats]);

  useEffect(() => {
    setCurrentPage(1);
    loadData(1, debouncedSearch, debouncedStatus);
  }, [debouncedSearch, debouncedStatus, loadData]);

  useEffect(() => {
    loadData(currentPage, debouncedSearch, debouncedStatus);
  }, [currentPage, debouncedSearch, debouncedStatus, loadData]);

  useEffect(() => {
    if (selectedCarId) {
      const carId = parseInt(selectedCarId);
      const assignedDriver = availableDrivers.find(
        (d: any) => d.drivers_profile?.current_vehicle_id === carId
      );
      if (assignedDriver) {
        setSelectedDriverId(assignedDriver.id);
      }
    }
  }, [selectedCarId, availableDrivers]);

  const refreshList = useCallback(() => {
    loadData(currentPage, debouncedSearch, debouncedStatus);
  }, [loadData, currentPage, debouncedSearch, debouncedStatus]);

  const onOpenBookingModal = async (booking: ChauffeurBooking) => {
    setSelectedBookingId(booking.id);
    setSelectedCarId(booking.vehicles?.id?.toString() || "");
    setSelectedDriverId(booking.users_chauffeur_bookings_driver_idTousers?.id?.toString() || "");
    setAvailableCars([]);
    setAvailableDrivers([]);

    const canEditAssignment =
      booking.status === "PENDING" ||
      booking.status === "ASSIGNED" ||
      booking.status === "ARRIVED";

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

    if (booking.status !== "PENDING") {
      loadPaymentData(booking.id);
    }
  };

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null;
    return bookings.find((b) => b.id === selectedBookingId) ?? null;
  }, [bookings, selectedBookingId]);

  const closeBookingModal = () => setSelectedBookingId(null);

  return {
    bookings,
    pagination,
    stats,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    selectedBooking,
    selectedBookingId,
    setSelectedBookingId,
    closeBookingModal,
    selectedCarId,
    setSelectedCarId,
    selectedDriverId,
    setSelectedDriverId,
    availableCars,
    availableDrivers,
    paymentHistory,
    paymentSummary,
    onOpenBookingModal,
    loadPaymentData,
    refreshList,
  };
}
