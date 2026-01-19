"use client";

import { useMemo, useState } from "react";
import { useCompanyStore } from "../../store/CompanyStore";
import { useAdminStore } from "../../../admin/store/AdminStore";
import type { ChauffeurContract } from "../../../admin/store/types";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function money(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

export default function ChauffeurReportsPage() {
  const { company, employees } = useCompanyStore();
  const { db } = useAdminStore();
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  const chauffeurContract = useMemo(
    () => (company ? db.chauffeur_contracts.find((c) => c.company_id === company.id) ?? null : null),
    [db.chauffeur_contracts, company],
  );

  const chauffeurTrips = useMemo(() => {
    if (!company) return [];
    // Filter by month and completed status
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

  const fuelAdjustmentPerTrip = useMemo(() => {
    if (!chauffeurContract) return 0;
    if (!chauffeurContract.is_auto_revision_enabled) return 0;
    const delta = db.fuel_price_pkr - chauffeurContract.base_fuel_price_pkr;
    return delta * chauffeurContract.contract_pct;
  }, [chauffeurContract, db.fuel_price_pkr]);

  const breakdown = useMemo(() => {
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

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled.chauffeur_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="rounded-xl border border-border bg-white p-6 text-center">
          <div className="text-lg font-semibold text-navy">Chauffeur Service Disabled</div>
          <div className="mt-2 text-sm text-muted">
            Chauffeur service is not enabled for your company. Please contact Cort Super Admin.
          </div>
        </div>
      </div>
    );
  }

  function handleExport() {
    if (!company || !chauffeurContract) return;
    const lines = [
      `Cort Chauffeur Report (Invoice 1151 Format)`,
      `Company: ${company.name}`,
      `Month: ${month}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      `Fuel_Current_PKR,${db.fuel_price_pkr}`,
      `Fuel_Base_PKR,${chauffeurContract.base_fuel_price_pkr}`,
      `Contract_Pct,${chauffeurContract.contract_pct}`,
      `Fuel_Adjustment_Per_Trip_PKR,${fuelAdjustmentPerTrip}`,
      "",
      "booking_id,scheduled_at,employee_id,passenger,vehicle_model,package,trip_type,package_cost_pkr,fuel_cost_pkr,total_pkr",
      ...chauffeurTrips.map((t) => {
        const emp = employees.find((e) => e.id === t.passenger_employee_id);
        const pkgCost = getRate(chauffeurContract, t.vehicle_model, t.package);
        const fuelCost = fuelAdjustmentPerTrip;
        const total = pkgCost + fuelCost;
        return [
          t.id,
          t.scheduled_at,
          emp?.employee_id ?? "",
          emp?.full_name ?? "",
          t.vehicle_model,
          t.package,
          t.trip_type,
          pkgCost,
          fuelCost,
          total,
        ].join(",");
      }),
      "",
      `PACKAGE_TOTAL_PKR,${breakdown.packageTotal}`,
      `FUEL_TOTAL_PKR,${breakdown.fuelTotal}`,
      `TOTAL_PKR,${breakdown.grandTotal}`,
    ];
    downloadText(`chauffeur-report-${company.name}-${month}.csv`, lines.join("\n"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Financial Reporting</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Chauffeur Reports</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
            />
          </label>
          <button
            type="button"
            onClick={handleExport}
            disabled={!chauffeurContract}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4">
          <div className="text-xs font-semibold tracking-wider text-muted">CHAUFFEUR REPORT (INVOICE 1151 FORMAT)</div>
          <div className="mt-1 text-sm text-muted">
            View-only report showing completed trips with package cost and fuel cost breakdown. Matches Invoice 1151 format.
          </div>
        </div>

        {!chauffeurContract ? (
          <div className="py-12 text-center">
            <div className="text-sm text-muted">No chauffeur contract found.</div>
            <div className="mt-1 text-xs text-muted">Contact Cort Super Admin to configure pricing contracts.</div>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-border bg-surface p-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-muted">Current Fuel Price</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-ink">
                    {money(db.fuel_price_pkr)} PKR
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Base Fuel Price (Contract)</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-ink">
                    {money(chauffeurContract.base_fuel_price_pkr)} PKR
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted">Fuel Adjustment Per Trip</div>
                  <div className="mt-1 font-mono text-sm font-semibold text-ink">
                    {money(fuelAdjustmentPerTrip)} PKR
                  </div>
                </div>
              </div>
            </div>

            {chauffeurTrips.length === 0 ? (
              <div className="py-12 text-center">
                <div className="text-sm text-muted">No completed trips in this month.</div>
                <div className="mt-1 text-xs text-muted">
                  Completed trips will appear here once drivers mark bookings as completed.
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                      <tr>
                        <th className="px-3 py-2 text-left">Booking</th>
                        <th className="px-3 py-2 text-left">Passenger</th>
                        <th className="px-3 py-2 text-left">Vehicle / Package</th>
                        <th className="px-3 py-2 text-left">Trip Type</th>
                        <th className="px-3 py-2 text-right">Package Cost</th>
                        <th className="px-3 py-2 text-right">Fuel Cost</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {chauffeurTrips.map((t) => {
                        const emp = employees.find((e) => e.id === t.passenger_employee_id);
                        const pkgCost = getRate(chauffeurContract, t.vehicle_model, t.package);
                        const fuelCost = fuelAdjustmentPerTrip;
                        const total = pkgCost + fuelCost;
                        return (
                          <tr key={t.id}>
                            <td className="px-3 py-2">
                              <div className="font-mono text-xs text-ink">{t.id.slice(0, 8)}...</div>
                              <div className="text-xs text-muted">
                                {new Date(t.scheduled_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-ink">{emp?.full_name ?? "—"}</div>
                              {emp?.employee_id && (
                                <div className="text-xs text-muted">{emp.employee_id}</div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="text-ink">{t.vehicle_model}</div>
                              <div className="text-xs text-muted">{t.package.replace(/_/g, " ")}</div>
                            </td>
                            <td className="px-3 py-2">
                              <span className="rounded-full bg-blue/10 px-2 py-0.5 text-xs font-semibold text-blue">
                                {t.trip_type.replace(/_/g, " ")}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-ink">{money(pkgCost)}</td>
                            <td className="px-3 py-2 text-right text-ink">{money(fuelCost)}</td>
                            <td className="px-3 py-2 text-right font-semibold text-ink">{money(total)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-surface">
                      <tr>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-ink" colSpan={4}>
                          Totals
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-ink">
                          {money(breakdown.packageTotal)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-ink">
                          {money(breakdown.fuelTotal)}
                        </td>
                        <td className="px-3 py-2 text-right text-sm font-semibold text-ink">
                          {money(breakdown.grandTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-xs text-muted">
                  <strong>Note:</strong> This report shows calculated costs based on the contract pricing. Package
                  costs are from the rate card, and fuel costs are calculated using the auto-revision formula (if
                  enabled). Actual invoicing is managed by Cort Super Admin.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

