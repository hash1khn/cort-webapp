"use client";

import { useMemo, useState } from "react";
import { makeNewVehicle, useAdminStore } from "../store/AdminStore";
import type { ChauffeurDriverSignup, Vehicle } from "../store/types";

export default function FleetPage() {
  const {
    db,
    upsertVehicle,
    deleteVehicle,
    createShuttleDriver,
    assignShuttleDriverVehicle,
    setShuttleDriverActive,
    decideChauffeurSignup,
  } = useAdminStore();

  const [tab, setTab] = useState<"vehicles" | "drivers">("vehicles");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(db.vehicles[0]?.id ?? "");
  const [newDriverName, setNewDriverName] = useState<string>("");

  const selectedVehicle = useMemo(
    () => db.vehicles.find((v) => v.id === selectedVehicleId) ?? null,
    [db.vehicles, selectedVehicleId],
  );

  const activeFleet = db.vehicles.filter((v) => v.is_active);
  const pendingSignups = db.chauffeur_driver_signups.filter((s) => s.status === "pending");

  function downloadText(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generateQrStub(vehicle: Vehicle) {
    const qrPayload = `CORT:VEHICLE:${vehicle.id}:${vehicle.plate_no}`;
    const content = [
      "Cort Ops - Vehicle QR Sticker (MOCK)",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      `Vehicle_ID: ${vehicle.id}`,
      `Plate: ${vehicle.plate_no}`,
      `Make/Model: ${vehicle.make} ${vehicle.model}`,
      "",
      "QR_PAYLOAD:",
      qrPayload,
      "",
      "Note: Replace with real QR/PDF generator later.",
    ].join("\n");
    downloadText(`cort-vehicle-qr-${vehicle.plate_no || vehicle.id}.txt`, content);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm font-medium text-muted">Fleet Management</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Fleet</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("vehicles")}
          className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold ${
            tab === "vehicles" ? "border-purple bg-purple/5 text-purple" : "border-border bg-white text-ink hover:bg-surface"
          }`}
        >
          Vehicles
        </button>
        <button
          type="button"
          onClick={() => setTab("drivers")}
          className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold ${
            tab === "drivers" ? "border-purple bg-purple/5 text-purple" : "border-border bg-white text-ink hover:bg-surface"
          }`}
        >
          Driver Management
        </button>
      </div>

      {tab === "vehicles" ? (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-xl border border-border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-navy">Vehicle Repository</div>
              <button
                type="button"
                onClick={() => {
                  const v = makeNewVehicle();
                  upsertVehicle(v);
                  setSelectedVehicleId(v.id);
                }}
                className="inline-flex h-9 items-center justify-center rounded-md bg-orange px-3 text-xs font-semibold text-white hover:opacity-95"
              >
                Add Vehicle
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {db.vehicles.map((v) => {
                const active = v.id === selectedVehicleId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`flex w-full flex-col gap-1 rounded-lg border px-3 py-3 text-left ${
                      active ? "border-blue bg-blue/5" : "border-border bg-white hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-ink">{v.plate_no || "—"}</div>
                      <span className={`text-xs font-semibold ${v.is_active ? "text-success" : "text-danger"}`}>
                        {v.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="truncate text-xs text-muted">
                      {(v.make || "Make") + " " + (v.model || "Model")} · {v.year || "Year"}
                    </div>
                    <div className="text-[11px] text-muted">Vehicle_ID: {v.id}</div>
                  </button>
                );
              })}
              {db.vehicles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-surface p-4 text-sm text-muted">
                  No vehicles yet.
                </div>
              ) : null}
            </div>
          </section>

          <section className="min-w-0">
            {!selectedVehicle ? (
              <div className="rounded-xl border border-border bg-white p-6 text-sm text-muted">
                Select a vehicle to edit.
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold tracking-wider text-muted">VEHICLE</div>
                    <div className="mt-1 text-lg font-semibold text-navy">
                      {selectedVehicle.plate_no || "New Vehicle"}
                    </div>
                    <div className="mt-1 text-xs text-muted">Vehicle_ID: {selectedVehicle.id}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => generateQrStub(selectedVehicle)}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
                    >
                      Generate QR Sticker
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this vehicle? This will unassign it from shuttle pricing/drivers (mock).")) {
                          deleteVehicle(selectedVehicle.id);
                          setSelectedVehicleId(db.vehicles[0]?.id ?? "");
                        }
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-md border border-danger/30 bg-white px-4 text-sm font-semibold text-danger hover:bg-danger/5"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Plate Number</span>
                    <input
                      value={selectedVehicle.plate_no}
                      onChange={(e) => upsertVehicle({ ...selectedVehicle, plate_no: e.target.value })}
                      className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Make</span>
                    <input
                      value={selectedVehicle.make}
                      onChange={(e) => upsertVehicle({ ...selectedVehicle, make: e.target.value })}
                      className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Model</span>
                    <input
                      value={selectedVehicle.model}
                      onChange={(e) => upsertVehicle({ ...selectedVehicle, model: e.target.value })}
                      className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Year</span>
                    <input
                      type="number"
                      value={selectedVehicle.year}
                      onChange={(e) => upsertVehicle({ ...selectedVehicle, year: Number(e.target.value) })}
                      className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Color</span>
                    <input
                      value={selectedVehicle.color}
                      onChange={(e) => upsertVehicle({ ...selectedVehicle, color: e.target.value })}
                      className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs font-semibold tracking-wider text-muted">Ownership</span>
                    <select
                      value={selectedVehicle.ownership}
                      onChange={(e) => upsertVehicle({ ...selectedVehicle, ownership: e.target.value as Vehicle["ownership"] })}
                      className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                      <option value="owned">Owned</option>
                      <option value="partner">Partner</option>
                    </select>
                  </label>
                </div>

                <div className="mt-6 rounded-lg border border-border bg-surface p-4">
                  <div className="text-xs font-semibold tracking-wider text-muted">CONSUMPTION MASTER (CRUCIAL FOR BILLING)</div>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-ink">Fuel Avg (KM/L) — In-City</span>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedVehicle.fuel_avg_in_city_km_per_l}
                        onChange={(e) =>
                          upsertVehicle({ ...selectedVehicle, fuel_avg_in_city_km_per_l: Number(e.target.value) })
                        }
                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-ink">Fuel Avg (KM/L) — Out-Station</span>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedVehicle.fuel_avg_out_station_km_per_l}
                        onChange={(e) =>
                          upsertVehicle({ ...selectedVehicle, fuel_avg_out_station_km_per_l: Number(e.target.value) })
                        }
                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      />
                    </label>
                  </div>

                  <label className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2">
                    <span className="text-sm font-semibold text-ink">Active</span>
                    <input
                      type="checkbox"
                      checked={selectedVehicle.is_active}
                      onChange={(e) => upsertVehicle({ ...selectedVehicle, is_active: e.target.checked })}
                      className="h-5 w-5 accent-purple"
                    />
                  </label>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-white p-6">
            <div className="text-sm font-semibold text-navy">Shuttle Drivers (Private)</div>
            <div className="mt-2 text-sm text-muted">
              Create account (username/password) and assign to a Vehicle_ID.
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Full Name</span>
                <input
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  className="h-10 w-64 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                  placeholder="Driver Name"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  createShuttleDriver(newDriverName.trim() || "Shuttle Driver");
                  setNewDriverName("");
                }}
                className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
              >
                Create Account
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Username / Password</th>
                    <th className="px-3 py-2 text-left">Assigned Vehicle</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {db.shuttle_drivers.map((d) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-ink">{d.full_name}</div>
                        <div className="text-xs text-muted">Driver_ID: {d.id}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs">{d.username}</div>
                        <div className="font-mono text-xs text-muted">{d.password}</div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={d.vehicle_id ?? ""}
                          onChange={(e) => assignShuttleDriverVehicle(d.id, e.target.value || null)}
                          className="h-9 rounded-md border border-border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                        >
                          <option value="">Unassigned</option>
                          {activeFleet.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.plate_no} — {v.make} {v.model}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setShuttleDriverActive(d.id, !d.is_active)}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-ink hover:bg-surface"
                        >
                          {d.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {db.shuttle_drivers.length === 0 ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm text-muted" colSpan={4}>
                        No shuttle drivers yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-6">
            <div className="text-sm font-semibold text-navy">Chauffeur Drivers (Public Queue)</div>
            <div className="mt-2 text-sm text-muted">
              View pending signups and approve/reject.
            </div>

            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Driver</th>
                    <th className="px-3 py-2 text-left">Docs</th>
                    <th className="px-3 py-2 text-left">Vehicle</th>
                    <th className="px-3 py-2 text-right">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {pendingSignups.map((s: ChauffeurDriverSignup) => (
                    <tr key={s.id}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-ink">{s.full_name}</div>
                        <div className="text-xs text-muted">{s.phone}</div>
                        <div className="text-xs text-muted">Signup_ID: {s.id}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs">CNIC: {s.cnic}</div>
                        <div className="font-mono text-xs text-muted">LIC: {s.license_no}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-sm text-ink">
                          {s.vehicle_make} {s.vehicle_model} ({s.vehicle_year})
                        </div>
                        <div className="text-xs text-muted">Plate: {s.plate_no}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => decideChauffeurSignup(s.id, "approved")}
                            className="inline-flex h-8 items-center justify-center rounded-md bg-success px-3 text-xs font-semibold text-white hover:opacity-95"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => decideChauffeurSignup(s.id, "rejected")}
                            className="inline-flex h-8 items-center justify-center rounded-md bg-danger px-3 text-xs font-semibold text-white hover:opacity-95"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingSignups.length === 0 ? (
                    <tr>
                      <td className="px-3 py-8 text-center text-sm text-muted" colSpan={4}>
                        No pending signups.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-xs text-muted">
              Approved/rejected records remain in mock DB (not shown here) for audit.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


