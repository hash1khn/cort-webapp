"use client";

import { useMemo, useState } from "react";
import {
  makeNewChauffeurContract,
  makeNewShuttleAssetPricing,
  useAdminStore,
} from "../store/AdminStore";
import type { ChauffeurBaseRate, ChauffeurContract, ShuttleAssetPricing } from "../store/types";

export default function PricingPage() {
  const { db, setFuelPrice, upsertChauffeurContract, upsertShuttleAssetPricing, deleteShuttleAssetPricing } =
    useAdminStore();
  const [fuel, setFuel] = useState(String(db.fuel_price_pkr.toFixed(2)));
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(db.companies[0]?.id ?? "");

  const company = useMemo(
    () => db.companies.find((c) => c.id === selectedCompanyId) ?? null,
    [db.companies, selectedCompanyId],
  );

  const chauffeurContract = useMemo(() => {
    if (!company) return null;
    return db.chauffeur_contracts.find((c) => c.company_id === company.id) ?? null;
  }, [db.chauffeur_contracts, company]);

  const shuttlePricing = useMemo(() => {
    if (!company) return [];
    return db.shuttle_asset_pricing.filter((p) => p.company_id === company.id);
  }, [db.shuttle_asset_pricing, company]);

  const whitelistedModels = company?.allowed_vehicle_models ?? [];
  const activeFleet = db.vehicles.filter((v) => v.is_active);

  function parseMoney(input: string) {
    const v = Number(input.replace(/,/g, "").trim());
    return Number.isFinite(v) ? v : null;
  }

  function fuelRevisionPreview(c: ChauffeurContract) {
    if (!c.is_auto_revision_enabled) return null;
    const delta = db.fuel_price_pkr - c.base_fuel_price_pkr;
    const adjustment = delta * c.contract_pct;
    return { delta, adjustment };
  }

  function upsertRate(contract: ChauffeurContract, model: string, patch: Partial<ChauffeurBaseRate>) {
    const idx = contract.base_rates.findIndex((r) => r.model === model);
    const base: ChauffeurBaseRate =
      idx >= 0
        ? contract.base_rates[idx]!
        : { model, rate_5hr: 0, rate_10hr: 0, rate_24hr: 0, monthly_10hr: 0, monthly_24hr: 0 };
    const next = { ...base, ...patch };
    const nextRates = [...contract.base_rates];
    if (idx >= 0) nextRates[idx] = next;
    else nextRates.push(next);
    nextRates.sort((a, b) => a.model.localeCompare(b.model));
    upsertChauffeurContract({ ...contract, base_rates: nextRates });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm font-medium text-muted">Client Contract Configuration</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Contracts & Pricing</h1>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold tracking-wider text-muted">SCOPE</div>
            <div className="mt-1 text-sm text-muted">
              Create Chauffeur + Shuttle pricing per company. Fuel price updates can trigger “auto revision” previews.
            </div>
          </div>

          <label className="flex min-w-[260px] flex-col gap-1">
            <span className="text-sm font-medium text-ink">Company</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
            >
              {db.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="text-xs font-semibold tracking-wider text-muted">GLOBAL FUEL CONFIGURATION</div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Current Fuel Price (PKR)</span>
            <input
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
              className="h-10 w-56 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              const v = parseMoney(fuel);
              if (v === null) return alert("Enter a valid number.");
              setFuelPrice(v);
              setFuel(String(v.toFixed(2)));
            }}
            className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
          >
            Update Price
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">Stored in mock DB and used for revision previews + invoicing later.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-wider text-muted">CHAUFFEUR CONTRACT</div>
              <div className="mt-1 text-sm text-muted">
                Prerequisite: company must have Chauffeur enabled. Base rates are per whitelisted vehicle.
              </div>
            </div>
            {company && !company.services_enabled.chauffeur_enabled ? (
              <div className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                Disabled for this company
              </div>
            ) : null}
          </div>

          {!company ? null : !company.services_enabled.chauffeur_enabled ? (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              Enable Chauffeur Service in Companies → this section will unlock.
            </div>
          ) : (
            <>
              {!chauffeurContract ? (
                <button
                  type="button"
                  onClick={() => upsertChauffeurContract(makeNewChauffeurContract(company.id, db.fuel_price_pkr))}
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
                >
                  Create Chauffeur Contract
                </button>
              ) : (
                <div className="mt-4 flex flex-col gap-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold tracking-wider text-muted">Base Fuel Price (PKR)</span>
                      <input
                        value={String(chauffeurContract.base_fuel_price_pkr)}
                        onChange={(e) => {
                          const v = parseMoney(e.target.value);
                          if (v === null) return;
                          upsertChauffeurContract({ ...chauffeurContract, base_fuel_price_pkr: v });
                        }}
                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold tracking-wider text-muted">Contract % (e.g. 0.2)</span>
                      <input
                        value={String(chauffeurContract.contract_pct)}
                        onChange={(e) => {
                          const v = Number(e.target.value.trim());
                          if (!Number.isFinite(v)) return;
                          upsertChauffeurContract({ ...chauffeurContract, contract_pct: v });
                        }}
                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold tracking-wider text-muted">Overtime (Per Hour)</span>
                      <input
                        value={String(chauffeurContract.overtime_rate_per_hour)}
                        onChange={(e) => {
                          const v = parseMoney(e.target.value);
                          if (v === null) return;
                          upsertChauffeurContract({ ...chauffeurContract, overtime_rate_per_hour: v });
                        }}
                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold tracking-wider text-muted">Outstation Allowance (Per Day)</span>
                      <input
                        value={String(chauffeurContract.outstation_allowance_per_day)}
                        onChange={(e) => {
                          const v = parseMoney(e.target.value);
                          if (v === null) return;
                          upsertChauffeurContract({ ...chauffeurContract, outstation_allowance_per_day: v });
                        }}
                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs font-semibold tracking-wider text-muted">Driver Accommodation (Per Night)</span>
                      <input
                        value={String(chauffeurContract.driver_accommodation_per_night)}
                        onChange={(e) => {
                          const v = parseMoney(e.target.value);
                          if (v === null) return;
                          upsertChauffeurContract({ ...chauffeurContract, driver_accommodation_per_night: v });
                        }}
                        className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                      />
                    </label>
                    <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
                      <span className="text-sm font-semibold text-ink">Auto Revision</span>
                      <input
                        type="checkbox"
                        checked={chauffeurContract.is_auto_revision_enabled}
                        onChange={(e) =>
                          upsertChauffeurContract({
                            ...chauffeurContract,
                            is_auto_revision_enabled: e.target.checked,
                          })
                        }
                        className="h-5 w-5 accent-purple"
                      />
                    </label>
                  </div>

                  {(() => {
                    const prev = fuelRevisionPreview(chauffeurContract);
                    if (!prev) return null;
                    return (
                      <div className="rounded-lg border border-border bg-surface p-3">
                        <div className="text-xs font-semibold tracking-wider text-muted">
                          FUEL REVISION PREVIEW (MOCK)
                        </div>
                        <div className="mt-2 text-sm text-ink">
                          Current fuel − base fuel ={" "}
                          <span className="font-mono">{prev.delta.toFixed(2)}</span> PKR → adjustment{" "}
                          <span className="font-mono">{prev.adjustment.toFixed(2)}</span> PKR (delta × contract%).
                        </div>
                      </div>
                    );
                  })()}

                  <div className="rounded-lg border border-border">
                    <div className="border-b border-border bg-surface px-3 py-2">
                      <div className="text-xs font-semibold tracking-wider text-muted">
                        BASE RATES (WHITELISTED VEHICLES)
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[720px] w-full text-sm">
                        <thead className="bg-white text-xs font-semibold tracking-wider text-muted">
                          <tr>
                            <th className="px-3 py-2 text-left">Vehicle Type</th>
                            <th className="px-3 py-2 text-left">5Hr</th>
                            <th className="px-3 py-2 text-left">10Hr</th>
                            <th className="px-3 py-2 text-left">24Hr</th>
                            <th className="px-3 py-2 text-left">Monthly (10hr)</th>
                            <th className="px-3 py-2 text-left">Monthly (24hr)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-white">
                          {whitelistedModels.length === 0 ? (
                            <tr>
                              <td className="px-3 py-6 text-sm text-muted" colSpan={6}>
                                No whitelisted vehicles. Add models in Companies → Vehicle Whitelisting.
                              </td>
                            </tr>
                          ) : (
                            whitelistedModels.map((model) => {
                              const r =
                                chauffeurContract.base_rates.find((x) => x.model === model) ??
                                ({ model, rate_5hr: 0, rate_10hr: 0, rate_24hr: 0, monthly_10hr: 0, monthly_24hr: 0 } as ChauffeurBaseRate);
                              return (
                                <tr key={model}>
                                  <td className="px-3 py-2 font-semibold text-ink">{model}</td>
                                  {(["rate_5hr", "rate_10hr", "rate_24hr", "monthly_10hr", "monthly_24hr"] as const).map(
                                    (key) => (
                                      <td key={key} className="px-3 py-2">
                                        <input
                                          value={String(r[key])}
                                          onChange={(e) => {
                                            const v = parseMoney(e.target.value);
                                            if (v === null) return;
                                            upsertRate(chauffeurContract, model, { [key]: v } as Partial<ChauffeurBaseRate>);
                                          }}
                                          className="h-9 w-28 rounded-md border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                                        />
                                      </td>
                                    ),
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-wider text-muted">SHUTTLE CONTRACT</div>
              <div className="mt-1 text-sm text-muted">
                Fixed asset pricing per vehicle (attached to Vehicle_ID, not passenger).
              </div>
            </div>
            {company && !company.services_enabled.shuttle_enabled ? (
              <div className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                Disabled for this company
              </div>
            ) : null}
          </div>

          {!company ? null : !company.services_enabled.shuttle_enabled ? (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              Enable Shuttle Service in Companies → this section will unlock.
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <button
                type="button"
                onClick={() => {
                  const draft = makeNewShuttleAssetPricing(company.id);
                  // best-effort default vehicle
                  draft.vehicle_id = activeFleet[0]?.id ?? "";
                  upsertShuttleAssetPricing(draft);
                }}
                className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
              >
                Add Vehicle Pricing
              </button>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Vehicle</th>
                      <th className="px-3 py-2 text-left">Fixed Monthly (PKR)</th>
                      <th className="px-3 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {shuttlePricing.map((p: ShuttleAssetPricing) => {
                      const v = db.vehicles.find((x) => x.id === p.vehicle_id);
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-2">
                            <select
                              value={p.vehicle_id}
                              onChange={(e) =>
                                upsertShuttleAssetPricing({ ...p, vehicle_id: e.target.value })
                              }
                              className="h-9 rounded-md border border-border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                            >
                              {activeFleet.map((veh) => (
                                <option key={veh.id} value={veh.id}>
                                  {veh.plate_no} — {veh.make} {veh.model}
                                </option>
                              ))}
                            </select>
                            <div className="mt-0.5 text-xs text-muted">
                              {v ? `Vehicle_ID: ${v.id}` : "Select a vehicle"}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={String(p.fixed_monthly_amount_pkr)}
                              onChange={(e) => {
                                const v2 = parseMoney(e.target.value);
                                if (v2 === null) return;
                                upsertShuttleAssetPricing({ ...p, fixed_monthly_amount_pkr: v2 });
                              }}
                              className="h-9 w-48 rounded-md border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => deleteShuttleAssetPricing(p.id)}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-danger/30 bg-white px-3 text-xs font-semibold text-danger hover:bg-danger/5"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {shuttlePricing.length === 0 ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-sm text-muted" colSpan={3}>
                          No shuttle asset pricing rows yet. Click “Add Vehicle Pricing”.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


