"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import { fetchEmployees, selectEmployees, selectEmployeesStatus } from "../../../lib/store/slices/employeeSlice";
import { apiClient } from "../../../lib/services/api-client";
import { toast } from "sonner";
import { Card } from "../../components/DashboardComponents";
import { Button } from "@/app/admin/ui/Button";
import {
  Activity,
  ArrowLeft,
  Bus,
  User,
  MapPin,
  Sunrise,
  Sunset,
  Users,
  Phone,
  Mail,
  Car,
  RefreshCw,
  UserPlus,
  X,
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
  const t = useTranslations("company.routes");
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
    return <p className="text-xs text-[var(--text-muted)] italic">{t("noStopsConfigured")}</p>;
  }

  return (
    <div className="relative">
      <div className="absolute start-3.5 top-4 bottom-4 w-px bg-[var(--border-light)]" />
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
                    {direction === "MORNING" ? t("pickup") : t("dropoff")}: {eta}
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
  const t = useTranslations("company.routes");
  const tCommon = useTranslations("common");
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const allEmployees = useAppSelector(selectEmployees);
  const employeeStatus = useAppSelector(selectEmployeesStatus);
  const routeId = params.id ? +params.id : null;

  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingTrips, setGeneratingTrips] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedStopId, setSelectedStopId] = useState<number | "">("");

  useEffect(() => {
    if (company?.id && employeeStatus === "idle") {
      dispatch(fetchEmployees(company.id.toString()));
    }
  }, [company?.id, employeeStatus, dispatch]);

  const load = useCallback(async () => {
    if (!routeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request<RouteDetail>(`/routes/${routeId}`);
      setRoute(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : tCommon("errors.failedToLoadRoute"));
    } finally {
      setLoading(false);
    }
  }, [routeId, tCommon]);

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
      toast.success(t("tripsGeneratedSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedGenerateTrips"));
    } finally {
      setGeneratingTrips(false);
    }
  }

  async function handleAssignEmployee() {
    if (!routeId || !selectedUserId) return;
    setAssigning(true);
    try {
      await apiClient.assignEmployeeToRoute({
        user_id: selectedUserId,
        route_id: routeId,
        pickup_stop_id: selectedStopId ? Number(selectedStopId) : undefined,
      });
      toast.success(t("employeeAssignedSuccess"));
      setShowAssignModal(false);
      setSelectedUserId("");
      setSelectedStopId("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedAssignEmployee"));
    } finally {
      setAssigning(false);
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
        <div className="text-sm text-[var(--text-muted)]">{tCommon("errors.noCompanySelected")}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link href="/company/routes">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            {t("backToRoutes")}
          </Button>
        </Link>
      </div>

      {loading ? (
        <Card className="py-16 text-center">
          <RefreshCw className="w-5 h-5 mx-auto mb-3 animate-spin text-[var(--text-muted)]" />
          <div className="text-sm text-[var(--text-muted)]">{t("loadingRoute")}</div>
        </Card>
      ) : error ? (
        <Card className="py-12 text-center">
          <div className="text-sm text-red-500">{error}</div>
        </Card>
      ) : !route ? (
        <Card className="py-12 text-center">
          <div className="text-sm text-[var(--text-muted)]">{t("routeNotFound")}</div>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                {t("routeDetailLabel")}
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                <Bus className="w-7 h-7 text-[var(--cort-orange)]" />
                {route.name}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-2"
                disabled={generatingTrips}
                onClick={handleGenerateTrips}
              >
                {generatingTrips ? t("generatingTrips") : t("generateTrips")}
              </Button>
              <Button
                variant="default"
                className="gap-2 bg-[var(--cort-orange)] hover:bg-[var(--cort-orange-hover)] text-white"
                onClick={() => setShowAssignModal(true)}
              >
                <UserPlus className="w-4 h-4" />
                {t("assignEmployee")}
              </Button>
              <Link href={`/company/routes/${routeId}/track`}>
                <Button variant="outline" className="gap-2">
                  <Activity className="w-4 h-4" />
                  {t("trackLive")}
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: t("passengers"),
                value: employees.length,
                icon: <Users className="w-4 h-4" />,
                color: "text-[var(--cort-orange)]",
              },
              {
                label: t("stops"),
                value: stops.filter((s) => s.morning_sequence != null).length,
                icon: <MapPin className="w-4 h-4" />,
                color: "text-emerald-400",
              },
              {
                label: t("vehicle"),
                value: vehicle?.plate_number ?? "—",
                icon: <Car className="w-4 h-4" />,
                color: "text-blue-400",
              },
              {
                label: utilizationPct !== null ? t("utilization", { count: `${employees.length}/${capacity}` }) : t("driver"),
                value: utilizationPct !== null ? `${utilizationPct}%` : (driver?.full_name ?? t("unassigned")),
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
                      {t("passengersOnThisRoute")}
                    </span>
                    <span className="rounded-full bg-[var(--cort-orange)]/10 px-2 py-0.5 text-xs font-bold text-[var(--cort-orange)]">
                      {employees.length}
                    </span>
                  </div>
                  {capacity && (
                    <div className="text-xs text-[var(--text-muted)]">
                      {t("capacity", { current: employees.length, max: capacity })}
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
                    <div className="text-sm text-[var(--text-muted)]">{t("noEmployeesAssigned")}</div>
                    <Button
                      variant="outline"
                      className="mt-4 gap-2"
                      onClick={() => setShowAssignModal(true)}
                    >
                      <UserPlus className="w-4 h-4" />
                      {t("assignAnEmployee")}
                    </Button>
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
                              {emp?.full_name ?? tCommon("status.unknown")}
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
                  {t("vehicleAndDriver")}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[var(--bg-subtle)] text-blue-400">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">{t("vehicle")}</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {vehicle ? `${vehicle.plate_number}${vehicle.model ? ` · ${vehicle.model}` : ""}` : t("notAssigned")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[var(--bg-subtle)] text-purple-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs text-[var(--text-muted)]">{t("driver")}</div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {driver?.full_name ?? t("notAssigned")}
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
                    {t("morningRoute")}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {t("stopsCountParen", { count: stops.filter((s) => s.morning_sequence != null).length })}
                  </span>
                </div>
                <StopTimeline stops={stops} direction="MORNING" />
              </Card>

              {/* Evening stops */}
              <Card className="!p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Sunset className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                    {t("eveningRoute")}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {t("stopsCountParen", { count: stops.filter((s) => s.evening_sequence != null).length })}
                  </span>
                </div>
                <StopTimeline stops={stops} direction="EVENING" />
              </Card>
            </div>
          </div>
        </>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md !p-0 shadow-2xl border-[var(--border-light)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-[var(--bg-subtle)]">
              <h3 className="font-bold text-[var(--text-primary)]">{t("assignEmployeeTitle")}</h3>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1 rounded-lg hover:bg-[var(--border-light)] text-[var(--text-muted)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  {t("selectEmployee")}
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--cort-orange)] focus:ring-1 focus:ring-[var(--cort-orange)] outline-none transition-all"
                >
                  <option value="">{t("chooseEmployee")}</option>
                  {allEmployees
                    .filter((emp) => !employees.some((assigned) => assigned.users?.id === emp.id))
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}{emp.department ? ` (${emp.department})` : ""}
                      </option>
                    ))}
                </select>
                {allEmployees.length === 0 && employeeStatus !== "loading" && (
                  <p className="text-xs text-amber-500 mt-1">{t("noCompanyEmployees")}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  {t("pickupStop")}{" "}
                  <span className="text-[var(--text-muted)] font-normal">{t("pickupStopOptional")}</span>
                </label>
                <select
                  value={selectedStopId}
                  onChange={(e) => setSelectedStopId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full h-10 rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--cort-orange)] focus:ring-1 focus:ring-[var(--cort-orange)] outline-none transition-all"
                >
                  <option value="">{t("noneAutomatic")}</option>
                  {stops.map((stop) => (
                    <option key={stop.id} value={stop.id}>
                      {stop.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-light)] bg-[var(--bg-subtle)] flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                {tCommon("actions.cancel")}
              </Button>
              <Button
                disabled={!selectedUserId || assigning}
                onClick={handleAssignEmployee}
                className="bg-[var(--cort-orange)] hover:bg-[var(--cort-orange-hover)] text-white"
              >
                {assigning ? t("assigningEmployee") : t("confirmAssignment")}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
