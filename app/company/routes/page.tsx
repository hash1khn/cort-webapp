"use client";

import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { MOCK_ROUTES, MOCK_SHUTTLE_DRIVERS, MOCK_VEHICLES } from "../lib/routesMockData";
import { Card } from "../components/DashboardComponents";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function RoutesPage() {
  const company = useAppSelector(selectCompany);
  const routes = MOCK_ROUTES;
  const shuttleDrivers = MOCK_SHUTTLE_DRIVERS;
  const vehicles = MOCK_VEHICLES;

  // No filtering needed as routes are mocked

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
          <div className="text-lg font-bold text-[var(--cort-navy)]">Shuttle Service Disabled</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Shuttle service is not enabled for your company. Please contact Cort Super Admin.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
            <span className="text-xs font-medium uppercase tracking-wide">Route Management</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--cort-navy)]">Route Roster</h1>
        </div>
      </div>

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
              const driver = route.driver_id
                ? shuttleDrivers.find((d) => d.id === route.driver_id)
                : null;
              const vehicle = route.vehicle_id
                ? vehicles.find((v) => v.id === route.vehicle_id)
                : null;

              return (
                <div
                  key={route.id}
                  className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface-subtle)]/30 p-5 hover:bg-white hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-[var(--cort-navy)]">{route.name}</h3>
                        <span className="rounded-full bg-[var(--cort-orange)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--cort-orange)]">
                          Route ID: {route.id}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">ASSIGNED DRIVER</div>
                          <div className="mt-1 text-sm text-[var(--cort-navy)]">
                            {driver ? (
                              <div>
                                <div className="font-medium">{driver.full_name}</div>
                                <div className="text-xs text-[var(--text-muted)]">@{driver.username}</div>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">Not assigned</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">ASSIGNED VEHICLE</div>
                          <div className="mt-1 text-sm text-[var(--cort-navy)]">
                            {vehicle ? (
                              <div>
                                <div className="font-medium">
                                  {vehicle.plate_no} — {vehicle.make} {vehicle.model}
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  {vehicle.year} • {vehicle.color}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[var(--text-muted)]">Not assigned</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">STOPS</div>
                          <div className="mt-1 text-sm text-[var(--cort-navy)]">
                            {route.stops.length} stop{route.stops.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">ROUTE STOPS</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {route.stops.map((stop, idx) => (
                            <div
                              key={stop.id}
                              className={cx(
                                "rounded-md border px-3 py-1.5 text-xs",
                                idx === 0
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                  : idx === route.stops.length - 1
                                    ? "border-[var(--cort-orange)]/30 bg-[var(--cort-orange)]/10 text-[var(--cort-orange)]"
                                    : "border-[var(--border-light)] bg-white text-[var(--cort-navy)]",
                              )}
                            >
                              <div className="font-medium">{stop.name}</div>
                              {stop.eta_minutes_from_start > 0 && (
                                <div className="text-xs text-[var(--text-muted)]">
                                  +{stop.eta_minutes_from_start} min
                                </div>
                              )}
                            </div>
                          ))}
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

