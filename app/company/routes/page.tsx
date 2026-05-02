"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { Card } from "../components/DashboardComponents";
import { PageHeader } from "../components/PageLayout";
import { Button } from "@/app/admin/ui/Button";
import { Activity } from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value?: string | null) {
  if (!value) return null;

  // Handle full ISO strings like 1970-01-01T08:00:00.000Z
  if (value.includes("T")) {
    const timePart = value.split("T")[1]?.slice(0, 5);
    if (timePart) return timePart;
  }

  // Handle plain HH:MM or HH:MM:SS
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.slice(0, 5);
  }

  return value;
}

type RouteStop = {
  id: number;
  route_id: number;
  name: string;
  sequence_order: number;
  morning_eta?: string | null;
  evening_eta?: string | null;
};

type CompanyRoute = {
  id: number;
  name: string;
  route_stops?: RouteStop[];
  vehicles?: { plate_number: string; model: string } | null;
  users?: { full_name: string; phone: string } | null;
  employee_route_assignments?: {
    users?: {
      full_name: string;
      email: string;
      phone: string;
    };
  }[];
};

export default function RoutesPage() {
  const company = useAppSelector(selectCompany);
  const [routes, setRoutes] = useState<CompanyRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .request<CompanyRoute[]>(`/routes?company_id=${company.id}`)
      .then((data) => {
        if (!cancelled) setRoutes(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load routes");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [company?.id]);

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled.shuttle_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md text-center">
          <div className="text-lg font-bold text-[var(--text-primary)]">Shuttle Service Disabled</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Shuttle service is not enabled for your company. Please contact Cort Super Admin.
          </div>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
        <PageHeader label="Route Management" title="Route Roster" />
        <Card className="py-12 text-center">
          <div className="text-sm text-[var(--text-muted)]">Loading routes...</div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
        <PageHeader label="Route Management" title="Route Roster" />
        <Card className="py-12 text-center">
          <div className="text-sm text-red-600">{error}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <PageHeader label="Route Management" title="Route Roster" />

      <Card className="overflow-hidden !p-0">
        <div className="p-6 border-b border-[var(--border-light)]">
          <div className="text-sm text-[var(--text-muted)]">
            <strong>Note:</strong> This is a read-only view of routes assigned to your company by Cort
            Super Admin. Routes are managed by Cort Operations.
          </div>
        </div>

        {routes.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-sm text-[var(--text-muted)]">No routes assigned yet.</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">Contact Cort Super Admin to assign routes.</div>
          </div>
        ) : (
          <div className="p-6 grid gap-4">
            {routes.map((route) => {
              const driver = route.users ?? null;
              const vehicle = route.vehicles ?? null;
              const stops = route.route_stops ?? [];
              const employees = route.employee_route_assignments?.map(a => a.users).filter(Boolean) || [];

              return (
                <div
                  key={route.id}
                  className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 hover:bg-[var(--bg-subtle)] hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{route.name}</h3>
                          <span className="rounded-full bg-[var(--cort-orange)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--cort-orange)]">
                            Route ID: {route.id}
                          </span>
                          <Link href={`/company/routes/${route.id}/track`}>
                            <Button variant="outline" size="sm" className="h-7 py-0 px-2 text-[10px] gap-1 border-[var(--border-input)] text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]">
                              <Activity className="w-3 h-3" />
                              Track Route
                            </Button>
                          </Link>
                        </div>
                        <div className="text-xs font-medium text-[var(--text-muted)]">
                          {employees.length} employee{employees.length !== 1 ? "s" : ""} assigned
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">ASSIGNED DRIVER</div>
                          <div className="mt-1 text-sm text-[var(--text-primary)]">
                            {driver?.full_name ? (
                              <div>
                                <div className="font-medium">{driver.full_name}</div>
                                {driver.phone && (
                                  <div className="text-xs text-[var(--text-muted)]">{driver.phone}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">Not assigned</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">ASSIGNED VEHICLE</div>
                          <div className="mt-1 text-sm text-[var(--text-primary)]">
                            {vehicle ? (
                              <div>
                                <div className="font-medium">
                                  {vehicle.plate_number} — {vehicle.model}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">Not assigned</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">STOPS</div>
                          <div className="mt-1 text-sm text-[var(--text-primary)]">
                            {stops.length} stop{stops.length !== 1 ? "s" : ""}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">ASSIGNED EMPLOYEES</div>
                          <div className="mt-1 text-sm text-[var(--text-primary)]">
                            {employees.length > 0 ? (
                              <div className="max-h-24 overflow-y-auto scrollbar-thin">
                                {employees.map((emp, i) => (
                                  <div key={i} className="text-xs truncate font-medium border-l-2 border-[var(--cort-orange)] pl-2 mb-1">
                                    {emp?.full_name}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">No employees</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">ROUTE STOPS</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {stops.map((stop, idx) => {
                            const pickup = formatTime(stop.morning_eta);
                            const dropoff = formatTime(stop.evening_eta);

                            return (
                              <div
                                key={stop.id}
                                className={cx(
                                  "rounded-md border px-3 py-1.5 text-xs",
                                  idx === 0
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : idx === stops.length - 1
                                      ? "border-[var(--cort-orange)]/30 bg-[var(--cort-orange)]/10 text-[var(--cort-orange)]"
                                      : "border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]",
                                )}
                              >
                                <div className="font-medium">{stop.name}</div>
                                {(pickup || dropoff) && (
                                  <div className="text-xs text-[var(--text-muted)]">
                                    {pickup && <span>Pickup: {pickup}</span>}
                                    {pickup && dropoff && <span className="mx-1">·</span>}
                                    {dropoff && <span>Drop-off: {dropoff}</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

