"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCompanyStore } from "../../../store/CompanyStore";
import { useAdminStore } from "../../../../admin/store/AdminStore";
import Map, { type MapMarker } from "../../../../admin/ui/Map";
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

export default function TrackBookingPage() {
  const params = useParams();
  const router = useRouter();
  const { bookings, employees } = useCompanyStore();
  const { db } = useAdminStore();

  const bookingId = params.id as string;
  const booking = useMemo(() => {
    return bookings.find((b) => b.id === Number(bookingId));
  }, [bookings, bookingId]);

  const passenger = useMemo(() => {
    if (!booking) return null;
    return employees.find((e) => e.id === booking.passenger_employee_id);
  }, [booking, employees]);

  const driverCar = useMemo(() => {
    if (!booking?.driver_car_id) return null;
    return db.chauffeur_cars.find((c) => c.id === booking.driver_car_id);
  }, [booking, db.chauffeur_cars]);

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-sm text-muted">Booking not found</div>
        <Link
          href="/company/bookings"
          className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
        >
          Back to Bookings
        </Link>
      </div>
    );
  }

  // Only allow tracking for active bookings
  if (
    booking.status !== "driver_assigned" &&
    booking.status !== "arrived" &&
    booking.status !== "in_progress"
  ) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-sm text-muted">This booking is not active for tracking</div>
        <div className="text-xs text-muted">Status: {getStatusBadge(booking.status)}</div>
        <Link
          href="/company/bookings"
          className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
        >
          Back to Bookings
        </Link>
      </div>
    );
  }

  // Build map markers
  const markers: MapMarker[] = [];
  const polylines: Array<{ positions: [number, number][]; color?: string }> = [];

  // Add pickup marker
  if (booking.pickup_lat && booking.pickup_lng) {
    markers.push({
      id: "pickup",
      position: [booking.pickup_lat, booking.pickup_lng],
      label: `Pickup: ${booking.pickup_address || "Location"}`,
      color: "#22c55e",
    });
  }

  // Add dropoff marker
  if (booking.dropoff_lat && booking.dropoff_lng) {
    markers.push({
      id: "dropoff",
      position: [booking.dropoff_lat, booking.dropoff_lng],
      label: `Dropoff: ${booking.dropoff_address || "Location"}`,
      color: "#ef4444",
    });
  }

  // Add driver location marker
  if (driverCar?.lat && driverCar?.lng) {
    markers.push({
      id: "driver",
      position: [driverCar.lat, driverCar.lng],
      label: `Driver: ${booking.driver_name || driverCar.driver_name} - ${driverCar.plate_no}`,
      color: "#f47f00",
    });
  }

  // Add route polyline if we have pickup and dropoff
  if (booking.pickup_lat && booking.pickup_lng && booking.dropoff_lat && booking.dropoff_lng) {
    polylines.push({
      positions: [
        [booking.pickup_lat, booking.pickup_lng],
        [booking.dropoff_lat, booking.dropoff_lng],
      ],
      color: "#f47f00",
    });
  }

  // Calculate center of map
  const center: [number, number] = useMemo(() => {
    if (driverCar?.lat && driverCar?.lng) {
      return [driverCar.lat, driverCar.lng];
    }
    if (booking.pickup_lat && booking.pickup_lng) {
      return [booking.pickup_lat, booking.pickup_lng];
    }
    return [24.8607, 67.0011]; // Default: Karachi
  }, [driverCar, booking]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Live Tracking</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            Track Booking
          </h1>
        </div>
        <Link
          href="/company/bookings"
          className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
        >
          Back to Bookings
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-white p-6">
            <div className="text-xs font-semibold tracking-wider text-muted">BOOKING DETAILS</div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs text-muted">Passenger</div>
                <div className="mt-1 text-sm font-medium text-ink">
                  {passenger?.full_name || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Vehicle</div>
                <div className="mt-1 text-sm font-medium text-ink">{booking.vehicle_model}</div>
              </div>
              <div>
                <div className="text-xs text-muted">Status</div>
                <div className="mt-1">{getStatusBadge(booking.status)}</div>
              </div>
              {booking.driver_name && (
                <div>
                  <div className="text-xs text-muted">Driver</div>
                  <div className="mt-1 text-sm font-medium text-ink">{booking.driver_name}</div>
                  {booking.plate_no && (
                    <div className="text-xs text-muted">{booking.plate_no}</div>
                  )}
                  {booking.driver_phone && (
                    <div className="text-xs text-muted">{booking.driver_phone}</div>
                  )}
                </div>
              )}
              {booking.pickup_address && (
                <div>
                  <div className="text-xs text-muted">Pickup</div>
                  <div className="mt-1 text-sm text-ink">{booking.pickup_address}</div>
                </div>
              )}
              {booking.dropoff_address && (
                <div>
                  <div className="text-xs text-muted">Dropoff</div>
                  <div className="mt-1 text-sm text-ink">{booking.dropoff_address}</div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-4">
            <div className="text-xs font-semibold tracking-wider text-muted">MAP LEGEND</div>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green"></div>
                <span className="text-muted">Pickup Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red"></div>
                <span className="text-muted">Dropoff Location</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-orange"></div>
                <span className="text-muted">Driver Location</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <div className="mb-4">
            <div className="text-xs font-semibold tracking-wider text-muted">LIVE TRACKING MAP</div>
            <div className="mt-1 text-sm text-muted">
              Real-time view of driver location, pickup, and dropoff points
            </div>
          </div>
          <Map
            height="600px"
            center={center}
            zoom={13}
            markers={markers}
            polylines={polylines}
          />
        </div>
      </div>
    </div>
  );
}

