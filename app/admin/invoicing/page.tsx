"use client";

import { useMemo, useState } from "react";
import { useAdminStore } from "../store/AdminStore";
import type { ChauffeurContract } from "../store/types";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function getRate(contract: ChauffeurContract, model: string, pkg: string) {
  const row = contract.base_rates.find((r) => r.model === model);
  if (!row) return 0;
  switch (pkg) {
    case "5hr":
      return row.rate_5hr;
    case "10hr":
      return row.rate_10hr;
    case "24hr":
      return row.rate_24hr;
    case "monthly_10hr":
      return row.monthly_10hr;
    case "monthly_24hr":
      return row.monthly_24hr;
    default:
      return 0;
  }
}

export default function InvoicingPage() {
  const { db } = useAdminStore();
  const [companyId, setCompanyId] = useState<string>(db.companies[0]?.id ?? "");
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  const company = useMemo(() => db.companies.find((c) => c.id === companyId) ?? null, [db.companies, companyId]);
  const chauffeurContract = useMemo(
    () => (company ? db.chauffeur_contracts.find((c) => c.company_id === company.id) ?? null : null),
    [db.chauffeur_contracts, company],
  );

  const shuttleRows = useMemo(() => {
    if (!company) return [];
    return db.shuttle_asset_pricing.filter((p) => p.company_id === company.id);
  }, [db.shuttle_asset_pricing, company]);

  const chauffeurTrips = useMemo(() => {
    if (!company) return [];
    // Mock month filter: by scheduled_at
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    return db.chauffeur_bookings.filter((b) => {
      if (b.company_id !== company.id) return false;
      if (b.status !== "completed") return false;
      const t = new Date(b.scheduled_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
  }, [db.chauffeur_bookings, company, month]);

  const shuttleTotal = shuttleRows.reduce((acc, r) => acc + r.fixed_monthly_amount_pkr, 0);

  const fuelAdjustmentPerTrip = useMemo(() => {
    if (!chauffeurContract) return 0;
    if (!chauffeurContract.is_auto_revision_enabled) return 0;
    const delta = db.fuel_price_pkr - chauffeurContract.base_fuel_price_pkr;
    return delta * chauffeurContract.contract_pct;
  }, [chauffeurContract, db.fuel_price_pkr]);

  const chauffeurBreakdown = useMemo(() => {
    if (!company) return { packageTotal: 0, fuelTotal: 0, grandTotal: 0 };
    if (!chauffeurContract) return { packageTotal: 0, fuelTotal: 0, grandTotal: 0 };
    const packageTotal = chauffeurTrips.reduce(
      (acc, t) => acc + getRate(chauffeurContract, t.vehicle_model, t.package),
      0,
    );
    const fuelTotal = chauffeurTrips.length * fuelAdjustmentPerTrip;
    const grandTotal = packageTotal + fuelTotal;
    return { packageTotal, fuelTotal, grandTotal };
  }, [company, chauffeurContract, chauffeurTrips, fuelAdjustmentPerTrip]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-sm font-medium text-muted">Financial Engine</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Invoicing</h1>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-wider text-muted">INVOICE GENERATION</div>
            <div className="mt-1 text-sm text-muted">
              Shuttle invoice sums fixed monthly asset pricing. Chauffeur invoice sums completed bookings priced by contract.
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Company</span>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-10 w-72 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
              >
                {db.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Month</span>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-wider text-muted">SHUTTLE INVOICE (1150)</div>
              <div className="mt-1 text-sm text-muted">Lists assigned vehicles and sums fixed monthly amount.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!company) return;
                const lines = [
                  `Cort Shuttle Invoice (Mock)`,
                  `Company: ${company.name}`,
                  `Month: ${month}`,
                  `Generated: ${new Date().toLocaleString()}`,
                  "",
                  "vehicle_id,plate,make,model,fixed_monthly_amount_pkr",
                  ...shuttleRows.map((r) => {
                    const v = db.vehicles.find((x) => x.id === r.vehicle_id);
                    return [
                      r.vehicle_id,
                      v?.plate_no ?? "",
                      v?.make ?? "",
                      v?.model ?? "",
                      r.fixed_monthly_amount_pkr,
                    ].join(",");
                  }),
                  "",
                  `TOTAL_PKR,${shuttleTotal}`,
                ];
                downloadText(`cort-invoice-shuttle-${company.name}-${month}.csv`, lines.join("\n"));
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
            >
              Export CSV
            </button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-sm">
              <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2 text-left">Vehicle</th>
                  <th className="px-3 py-2 text-left">Fixed Monthly (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {shuttleRows.map((r) => {
                  const v = db.vehicles.find((x) => x.id === r.vehicle_id);
                  return (
                    <tr key={r.id}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-ink">
                          {v ? `${v.plate_no} — ${v.make} ${v.model}` : r.vehicle_id}
                        </div>
                        <div className="text-xs text-muted">Vehicle_ID: {r.vehicle_id}</div>
                      </td>
                      <td className="px-3 py-2 text-ink">{money(r.fixed_monthly_amount_pkr)}</td>
                    </tr>
                  );
                })}
                {shuttleRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-sm text-muted" colSpan={2}>
                      No shuttle asset pricing rows for this company. Configure in Contracts & Pricing.
                    </td>
                  </tr>
                ) : null}
              </tbody>
              <tfoot className="bg-surface">
                <tr>
                  <td className="px-3 py-2 text-right text-sm font-semibold text-ink">Total</td>
                  <td className="px-3 py-2 text-sm font-semibold text-ink">{money(shuttleTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold tracking-wider text-muted">CHAUFFEUR INVOICE (1151)</div>
              <div className="mt-1 text-sm text-muted">
                Aggregates completed bookings and applies the rate card + fuel revision (mock).
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!company) return;
                const lines = [
                  `Cort Chauffeur Invoice (Mock)`,
                  `Company: ${company.name}`,
                  `Month: ${month}`,
                  `Generated: ${new Date().toLocaleString()}`,
                  "",
                  `Fuel_Current_PKR,${db.fuel_price_pkr}`,
                  `Fuel_Base_PKR,${chauffeurContract?.base_fuel_price_pkr ?? ""}`,
                  `Contract_Pct,${chauffeurContract?.contract_pct ?? ""}`,
                  `Fuel_Adjustment_Per_Trip_PKR,${fuelAdjustmentPerTrip}`,
                  "",
                  "booking_id,scheduled_at,employee_id,passenger,vehicle_model,package,package_cost_pkr,fuel_cost_pkr,total_pkr",
                  ...chauffeurTrips.map((t) => {
                    const comp = db.companies.find((c) => c.id === t.company_id);
                    const emp = comp?.employees.find((e) => e.id === t.passenger_employee_id);
                    const pkgCost = chauffeurContract ? getRate(chauffeurContract, t.vehicle_model, t.package) : 0;
                    const fuelCost = fuelAdjustmentPerTrip;
                    const total = pkgCost + fuelCost;
                    return [
                      t.id,
                      t.scheduled_at,
                      emp?.employee_id ?? "",
                      emp?.full_name ?? "",
                      t.vehicle_model,
                      t.package,
                      pkgCost,
                      fuelCost,
                      total,
                    ].join(",");
                  }),
                  "",
                  `PACKAGE_TOTAL_PKR,${chauffeurBreakdown.packageTotal}`,
                  `FUEL_TOTAL_PKR,${chauffeurBreakdown.fuelTotal}`,
                  `TOTAL_PKR,${chauffeurBreakdown.grandTotal}`,
                ];
                downloadText(`cort-invoice-chauffeur-${company.name}-${month}.csv`, lines.join("\n"));
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
            >
              Export CSV
            </button>
          </div>

          {!company?.services_enabled.chauffeur_enabled ? (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              Chauffeur is disabled for this company.
            </div>
          ) : !chauffeurContract ? (
            <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-sm text-muted">
              No chauffeur contract found. Configure in Contracts & Pricing first.
            </div>
          ) : (
            <>
              <div className="mt-4 rounded-lg border border-border bg-surface p-3 text-sm text-ink">
                Fuel adjustment per trip (mock): <span className="font-mono">{money(fuelAdjustmentPerTrip)}</span> PKR
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">Booking</th>
                      <th className="px-3 py-2 text-left">Passenger</th>
                      <th className="px-3 py-2 text-left">Model / Package</th>
                      <th className="px-3 py-2 text-left">Package Cost</th>
                      <th className="px-3 py-2 text-left">Fuel Cost</th>
                      <th className="px-3 py-2 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {chauffeurTrips.map((t) => {
                      const emp = company.employees.find((e) => e.id === t.passenger_employee_id);
                      const pkgCost = getRate(chauffeurContract, t.vehicle_model, t.package);
                      const fuelCost = fuelAdjustmentPerTrip;
                      const total = pkgCost + fuelCost;
                      return (
                        <tr key={t.id}>
                          <td className="px-3 py-2">
                            <div className="font-mono text-xs">{t.id}</div>
                            <div className="text-xs text-muted">{new Date(t.scheduled_at).toLocaleString()}</div>
                          </td>
                          <td className="px-3 py-2 text-muted">{emp?.full_name ?? "—"}</td>
                          <td className="px-3 py-2">
                            <div className="text-ink">{t.vehicle_model}</div>
                            <div className="text-xs text-muted">{t.package}</div>
                          </td>
                          <td className="px-3 py-2 text-ink">{money(pkgCost)}</td>
                          <td className="px-3 py-2 text-ink">{money(fuelCost)}</td>
                          <td className="px-3 py-2 font-semibold text-ink">{money(total)}</td>
                        </tr>
                      );
                    })}
                    {chauffeurTrips.length === 0 ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-sm text-muted" colSpan={6}>
                          No completed bookings in this month. Mark bookings as “completed” in Ops: Chauffeur.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                  <tfoot className="bg-surface">
                    <tr>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-ink" colSpan={3}>
                        Totals
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-ink">{money(chauffeurBreakdown.packageTotal)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-ink">{money(chauffeurBreakdown.fuelTotal)}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-ink">{money(chauffeurBreakdown.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


