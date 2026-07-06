"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import { apiClient } from "../../../lib/services/api-client";
import { useAuth } from "../../../lib/contexts/auth-context";
import { toast } from "sonner";
import { Card } from "../../components/DashboardComponents";
import { PageHeader } from "../../components/PageLayout";
import { Button } from "@/app/admin/ui/Button";
import {
  Activity,
  ArrowLeft,
  Bus,
  User,
  MapPin,
  Sunrise,
  Sunset,
  ChevronRight,
  Users,
  Phone,
  Mail,
  Car,
  RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type RouteStop = {
  id: number;
  route_id: number;
  name: string;
  sequence_order: number;
  morning_sequence?: number | null;
  evening_sequence?: number | null;
  morning_eta?: string | null;
  evening_eta?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type EmployeeAssignment = {
  id: number;
  users?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    department?: string | null;
  } | null;
  route_stops?: {
    id: number;
    name: string;
    sequence_order: number;
  } | null;
};

type RouteDetail = {
  id: number;
  name: string;
  company_id: number | null;
  vehicles?: { plate_number: string; model: string | null; capacity?: number | null } | null;
  users?: { full_name: string; phone: string } | null; // driver
  route_stops: RouteStop[];
  employee_route_assignments?: EmployeeAssignment[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(value?: string | null) {
  if (!value) return null;
  if (value.includes("T")) {
    const timePart = value.split("T")[1]?.slice(0, 5);
    if (timePart) return timePart;
  }
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 5);
  return value;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StopTimeline({ stops, direction }: { stops: RouteStop[]; direction: "MORNING" | "EVENING" }) {
  const sorted = [...stops]
    .filter((s) =>
      direction === "MORNING" ? s.morning_sequence != null : s.evening_sequence != null
    )
    .sort((a, b) =>
      direction === "MORNING"
        ? (a.morning_sequence ?? 0) - (b.morning_sequence ?? 0)
        : (a.evening_sequence ?? 0) - (b.evening_sequence ?? 0)
    );

  if (sorted.length === 0) {
    return <p className="text-xs text-[var(--text-muted)] italic">No stops configured.</p>;
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-4 bottom-4 w-px bg-[var(--border-light)]" />
      <div className="space-y-3">
        {sorted.map((stop, idx) => {
          const eta =
            direction === "MORNING" ? formatTime(stop.morning_eta) : formatTime(stop.evening_eta);
          const isFirst = idx === 0;
          const isLast = idx === sorted.length - 1;

          return (
            <div key={stop.id} className="flex items-start gap-3">
              <div
                className={cx(
                  "relative z-10 mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-xs font-bold",
                  isFirst
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : isLast
                      ? "border-[var(--cort-orange)] bg-[var(--cort-orange)]/10 text-[var(--cort-orange)]"
                      : "border-[var(--border-default)] bg-[var(--bg-card)] text-[var(--text-muted)]"
                )}
              >
                {(direction === "MORNING" ? stop.morning_sequence : stop.evening_sequence) ?? idx + 1}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="text-sm font-semibold text-[var(--text-primary)]">{stop.name}</div>
                {eta && (
                  <div className="text-xs text-[var(--text-muted)]">
                    {direction === "MORNING" ? "Pickup" : "Drop-off"}: {eta}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RouteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const isTrialUser = !!user?.is_trial;
  const company = useAppSelector(selectCompany);
  const routeId = params.id ? +params.id : null;

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingTrips, setGeneratingTrips] = useState(false);

  const load = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request<RouteDetail>(`/routes/${routeId}`);
      setRoute(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load route");
    } finally {
      setLoading(false);
    }
  }, [routeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerateTrips() {
    if (!routeId) return;
    setGeneratingTrips(true);
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      await apiClient.generateShuttleTripsForRoute(routeId, [fmt(today), fmt(tomorrow)]);
      toast.success("Trips generated for today and tomorrow");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate trips");
    } finally {
      setGeneratingTrips(false);
    }
  }

  const employees = route?.employee_route_assignments ?? [];
  const stops = route?.route_stops ?? [];
  const vehicle = route?.vehicles ?? null;
  const driver = route?.users ?? null;

  // utilization
  const capacity = vehicle?.capacity ?? null;
  const utilizationPct = capacity ? Math.min(100, Math.round((employees.length / capacity) * 100)) : null;

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company selected</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link href="/company/routes">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Routes
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card className="py-16 text-center">
          <RefreshCw className="w-5 h-5 mx-auto mb-3 animate-spin text-[var(--text-muted)]" />
          <div className="text-sm text-[var(--text-muted)]">Loading route…</div>
        </Card>
      ) : error ? (
        <Card className="py-12 text-center">
          <div className="text-sm text-red-500">{error}</div>
        </Card>
      ) : !route ? (
        <Card className="py-12 text-center">
          <div className="text-sm text-[var(--text-muted)]">Route not found.</div>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Shuttle Operations · Route Detail
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                <Bus className="w-7 h-7 text-[var(--cort-orange)]" />
                {route.name}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              {isTrialUser && (
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={generatingTrips}
                  onClick={handleGenerateTrips}
                >
                  {generatingTrips ? "Generating…" : "Generate trips"}
                </Button>
              )}
              <Link href={`/company/routes/${routeId}/track`}>
                <Button variant="outline" className="gap-2">
                  <Activity className="w-4 h-4" />
                  Track Live
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Passengers",
                value: employees.length,
                icon: <Users className="w-4 h-4" />,
                color: "text-[var(--cort-orange)]",
              },
              {
                label: "Stops",
                value: stops.filter((s) => s.morning_sequence != null).length,
                icon: <MapPin className="w-4 h-4" />,
                color: "text-emerald-400",
              },
              {
                label: "Vehicle",
                value: vehicle?.plate_number ?? "—",
                icon: <Car className="w-4 h-4" />,
                color: "text-blue-400",
              },
              {
                label: utilizationPct !== null ? `Utilization (${employees.length}/${capacity})` : "Driver",
                value: utilizationPct !== null ? `${utilizationPct}%` : (driver?.full_name ?? "Unassigned"),
                icon: <User className="w-4 h-4" />,
                color: utilizationPct !== null && utilizationPct > 85 ? "text-red-400" : "text-purple-400",
              },
            ].map((stat) => (
              <Card key={stat.label} className="!p-4 flex items-center gap-3">
                <div className={cx("p-2 rounded-xl bg-[var(--bg-subtle)]", stat.color)}>{stat.icon}</div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {stat.label}
                  </div>
                  <div className="text-lg font-bold text-[var(--text-primary)] truncate">{stat.value}</div>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Employees */}
            <div className="lg:col-span-2">
              <Card className="!p-0 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--cort-orange)]" />
                    <span className="font-semibold text-[var(--text-primary)]">
                      Passengers on this Route
                    </span>
                    <span className="rounded-full bg-[var(--cort-orange)]/10 px-2 py-0.5 text-xs font-bold text-[var(--cort-orange)]">
                      {employees.length}
                    </span>
                  </div>
                  {capacity && (
                    <div className="text-xs text-[var(--text-muted)]">
                      {employees.length}/{capacity} capacity
                      <div className="mt-1 h-1.5 w-20 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                        <div
                          className={cx(
                            "h-full rounded-full transition-all",
                            utilizationPct! > 85 ? "bg-red-500" : utilizationPct! > 60 ? "bg-amber-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${utilizationPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {employees.length === 0 ? (
                  <div className="py-16 text-center">
                    <Users className="w-8 h-8 mx-auto mb-3 text-[var(--text-muted)] opacity-40" />
                    <div className="text-sm text-[var(--text-muted)]">No employees assigned to this route yet.</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                      Contact Cort Operations to assign employees.
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-light)]">
                    {employees.map((assignment) => {
                      const emp = assignment.users;
                      const pickupStop = assignment.route_stops;
                      return (
                        <div
                          key={assignment.id}
                          className="flex items-center gap-4 px-6 py-3.5 hover:bg-[var(--bg-subtle)] transition-colors"
                        >
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-[var(--cort-orange)]/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-[var(--cort-orange)]">
                              {emp?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-[var(--text-primary)] truncate">
                              {emp?.full_name ?? "Unknown"}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                              {emp?.department && (
                                <span className="text-xs text-[var(--text-muted)]">{emp.department}</span>
                              )}
                              {emp?.phone && (
                                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                  <Phone className="w-2.5 h-2.5" />
                                  {emp.phone}
                                </span>
                              )}
                              {emp?.email && (
                                <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] truncate max-w-[200px]">
                                  <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                                  {emp.email}
                                </span>
                              )}
                            </div>
                          </div>

                          {pickupStop && (
                            <div className="flex items-center gap-1.5 flex-shrink-0 rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                              <MapPin className="w-3 h-3 text-[var(--cort-orange)]" />
                              <span className="font-medium">{pickupStop.name}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Right: Route stops */}
            <div className="flex flex-col gap-4">
              {/* Vehicle & Driver info */}
              <Card className="!p-5">
                <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Vehicle & Driver
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[var(--bg-subtle)] text-blue-400">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Vehicle</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {vehicle ? `${vehicle.plate_number}${vehicle.model ? ` · ${vehicle.model}` : ""}` : "Not assigned"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[var(--bg-subtle)] text-purple-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">Driver</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {driver?.full_name ?? "Not assigned"}
                      </div>
                      {driver?.phone && (
                        <div className="text-xs text-[var(--text-muted)]">{driver.phone}</div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Morning stops */}
              <Card className="!p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sunrise className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                    Morning Route
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    ({stops.filter((s) => s.morning_sequence != null).length} stops)
                  </span>
                </div>
                <StopTimeline stops={stops} direction="MORNING" />
              </Card>

              {/* Evening stops */}
              <Card className="!p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sunset className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    Evening Route
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    ({stops.filter((s) => s.evening_sequence != null).length} stops)
                  </span>
                </div>
                <StopTimeline stops={stops} direction="EVENING" />
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
