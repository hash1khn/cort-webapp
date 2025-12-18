"use client";

import { useMemo, useState } from "react";
import { makeNewShuttleRoute, makeNewStop, useAdminStore } from "../../store/AdminStore";
import type { ShuttleRoute } from "../../store/types";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function OpsShuttlePage() {
  const { db, upsertShuttleRoute, deleteShuttleRoute } = useAdminStore();
  const [selectedId, setSelectedId] = useState<string>(db.shuttle_routes[0]?.id ?? "");

  const selected = useMemo(
    () => db.shuttle_routes.find((r) => r.id === selectedId) ?? null,
    [db.shuttle_routes, selectedId],
  );

  const shuttleCompanies = db.companies.filter((c) => c.services_enabled.shuttle_enabled);
  const activeVehicles = db.vehicles.filter((v) => v.is_active);
  const activeDrivers = db.shuttle_drivers.filter((d) => d.is_active);

  function save(route: ShuttleRoute) {
    upsertShuttleRoute(route);
    setSelectedId(route.id);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm font-medium text-muted">Operations: Shuttle</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Route Builder</h1>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted">
          Mock route builder (no map yet): manage stops + ETAs, and assign Company/Driver/Vehicle.
        </p>
        <button
          type="button"
          onClick={() => {
            const r = makeNewShuttleRoute();
            r.name = `Route ${db.shuttle_routes.length + 1}`;
            r.stops = [
              { ...makeNewStop(), name: "Stop 1", eta_minutes_from_start: 0 },
              { ...makeNewStop(), name: "Stop 2", eta_minutes_from_start: 15 },
            ];
            save(r);
          }}
          className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
        >
          Create Route
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-border bg-white p-4">
          <div className="text-sm font-semibold text-navy">Routes</div>
          <div className="mt-3 flex flex-col gap-2">
            {db.shuttle_routes.map((r) => {
              const active = r.id === selectedId;
              const company = r.company_id ? db.companies.find((c) => c.id === r.company_id) : null;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={cx(
                    "flex w-full flex-col gap-1 rounded-lg border px-3 py-3 text-left",
                    active ? "border-blue bg-blue/5" : "border-border bg-white hover:bg-surface",
                  )}
                >
                  <div className="truncate text-sm font-semibold text-ink">{r.name || "Untitled Route"}</div>
                  <div className="truncate text-xs text-muted">{company?.name ?? "Unassigned company"}</div>
                  <div className="text-[11px] text-muted">{r.stops.length} stops</div>
                </button>
              );
            })}
            {db.shuttle_routes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
                No routes yet.
              </div>
            ) : null}
          </div>
        </section>

        <section className="min-w-0">
          {!selected ? (
            <div className="rounded-xl border border-border bg-white p-6 text-sm text-muted">
              Select a route to edit.
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">ROUTE</div>
                    <div className="mt-1 text-lg font-semibold text-navy">{selected.name}</div>
                    <div className="mt-1 text-xs text-muted">Route_ID: {selected.id}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Delete this route? (mock)")) {
                        deleteShuttleRoute(selected.id);
                        setSelectedId(db.shuttle_routes[0]?.id ?? "");
                      }
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-danger/30 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger/5"
                  >
                    Delete
                  </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold tracking-wider text-muted">Route Name</span>
                    <input
                      value={selected.name}
                      onChange={(e) => save({ ...selected, name: e.target.value })}
                      className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Assign Company</span>
                    <select
                      value={selected.company_id ?? ""}
                      onChange={(e) => save({ ...selected, company_id: e.target.value || null })}
                      className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                      <option value="">Unassigned</option>
                      {shuttleCompanies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Assign Vehicle</span>
                    <select
                      value={selected.vehicle_id ?? ""}
                      onChange={(e) => save({ ...selected, vehicle_id: e.target.value || null })}
                      className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                      <option value="">Unassigned</option>
                      {activeVehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plate_no} — {v.make} {v.model}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Assign Driver</span>
                    <select
                      value={selected.driver_id ?? ""}
                      onChange={(e) => save({ ...selected, driver_id: e.target.value || null })}
                      className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                      <option value="">Unassigned</option>
                      {activeDrivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.full_name} ({d.username})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">STOPS</div>
                    <div className="mt-1 text-sm text-muted">
                      Add stops and define ETA (minutes from route start).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => save({ ...selected, stops: [...selected.stops, makeNewStop()] })}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-orange px-3 text-xs font-semibold text-white hover:opacity-95"
                  >
                    Add Stop
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Stop Name</th>
                        <th className="px-3 py-2 text-left">ETA (min)</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {selected.stops.map((s, idx) => (
                        <tr key={s.id}>
                          <td className="px-3 py-2">
                            <input
                              value={s.name}
                              onChange={(e) => {
                                const stops = selected.stops.map((x) =>
                                  x.id === s.id ? { ...x, name: e.target.value } : x,
                                );
                                save({ ...selected, stops });
                              }}
                              className="h-9 w-64 rounded-md border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                              placeholder={`Stop ${idx + 1}`}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={s.eta_minutes_from_start}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isFinite(v)) return;
                                const stops = selected.stops.map((x) =>
                                  x.id === s.id ? { ...x, eta_minutes_from_start: v } : x,
                                );
                                save({ ...selected, stops });
                              }}
                              className="h-9 w-28 rounded-md border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                const stops = selected.stops.filter((x) => x.id !== s.id);
                                save({ ...selected, stops });
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-danger/30 bg-white px-3 text-xs font-semibold text-danger hover:bg-danger/5"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selected.stops.length === 0 ? (
                        <tr>
                          <td className="px-3 py-8 text-center text-sm text-muted" colSpan={3}>
                            No stops yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}


