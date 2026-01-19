"use client";

import { useMemo } from "react";
import { useCompanyStore } from "../store/CompanyStore";
import { useAdminStore } from "../../admin/store/AdminStore";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function RoutesPage() {
  const { company } = useCompanyStore();
  const { db } = useAdminStore();

  const routes = useMemo(() => {
    if (!company) return [];
    return db.shuttle_routes.filter((r) => r.company_id === company.id);
  }, [db.shuttle_routes, company]);

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled.shuttle_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="rounded-xl border border-border bg-white p-6 text-center">
          <div className="text-lg font-semibold text-navy">Shuttle Service Disabled</div>
          <div className="mt-2 text-sm text-muted">
            Shuttle service is not enabled for your company. Please contact Cort Super Admin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Route Management</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Route Roster</h1>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 text-sm text-muted">
          <strong>Note:</strong> This is a read-only view of routes assigned to your company by Cort
          Super Admin. Routes are managed by Cort Operations.
        </div>

        {routes.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-sm text-muted">No routes assigned yet.</div>
            <div className="mt-1 text-xs text-muted">Contact Cort Super Admin to assign routes.</div>
          </div>
        ) : (
          <div className="grid gap-4">
            {routes.map((route) => {
              const driver = route.driver_id
                ? db.shuttle_drivers.find((d) => d.id === route.driver_id)
                : null;
              const vehicle = route.vehicle_id
                ? db.vehicles.find((v) => v.id === route.vehicle_id)
                : null;

              return (
                <div
                  key={route.id}
                  className="rounded-lg border border-border bg-surface p-5 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-navy">{route.name}</h3>
                        <span className="rounded-full bg-blue/10 px-2 py-0.5 text-xs font-semibold text-blue">
                          Route ID: {route.id}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <div className="text-xs font-semibold tracking-wider text-muted">ASSIGNED DRIVER</div>
                          <div className="mt-1 text-sm text-ink">
                            {driver ? (
                              <div>
                                <div className="font-medium">{driver.full_name}</div>
                                <div className="text-xs text-muted">@{driver.username}</div>
                              </div>
                            ) : (
                              <span className="text-muted">Not assigned</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold tracking-wider text-muted">ASSIGNED VEHICLE</div>
                          <div className="mt-1 text-sm text-ink">
                            {vehicle ? (
                              <div>
                                <div className="font-medium">
                                  {vehicle.plate_no} — {vehicle.make} {vehicle.model}
                                </div>
                                <div className="text-xs text-muted">
                                  {vehicle.year} • {vehicle.color}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted">Not assigned</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-semibold tracking-wider text-muted">STOPS</div>
                          <div className="mt-1 text-sm text-ink">
                            {route.stops.length} stop{route.stops.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-semibold tracking-wider text-muted">ROUTE STOPS</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {route.stops.map((stop, idx) => (
                            <div
                              key={stop.id}
                              className={cx(
                                "rounded-md border px-3 py-1.5 text-xs",
                                idx === 0
                                  ? "border-green/30 bg-green/10 text-green"
                                  : idx === route.stops.length - 1
                                    ? "border-orange/30 bg-orange/10 text-orange"
                                    : "border-border bg-white text-ink",
                              )}
                            >
                              <div className="font-medium">{stop.name}</div>
                              {stop.eta_minutes_from_start > 0 && (
                                <div className="text-xs text-muted">
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
      </div>
    </div>
  );
}

