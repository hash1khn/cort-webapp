"use client";

import { useMemo, useState } from "react";
import { useCompanyStore } from "../../store/CompanyStore";
import { useAdminStore } from "../../../admin/store/AdminStore";

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

export default function ShuttleReportsPage() {
  const { company } = useCompanyStore();
  const { db } = useAdminStore();
  const [month, setMonth] = useState<string>(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  const routes = useMemo(() => {
    if (!company) return [];
    return db.shuttle_routes.filter((r) => r.company_id === company.id);
  }, [db.shuttle_routes, company]);

  const shuttlePricing = useMemo(() => {
    if (!company) return [];
    return db.shuttle_asset_pricing.filter((p) => p.company_id === company.id);
  }, [db.shuttle_asset_pricing, company]);

  // Match routes with their vehicles and pricing
  const reportData = useMemo(() => {
    return routes.map((route) => {
      const vehicle = route.vehicle_id
        ? db.vehicles.find((v) => v.id === route.vehicle_id)
        : null;
      const pricing = shuttlePricing.find((p) => p.vehicle_id === route.vehicle_id);
      const driver = route.driver_id
        ? db.shuttle_drivers.find((d) => d.id === route.driver_id)
        : null;

      return {
        route,
        vehicle,
        pricing,
        driver,
      };
    });
  }, [routes, db.vehicles, shuttlePricing, db.shuttle_drivers]);

  const totalAmount = useMemo(() => {
    return reportData.reduce((acc, item) => {
      return acc + (item.pricing?.fixed_monthly_amount_pkr ?? 0);
    }, 0);
  }, [reportData]);

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

  function handleExport() {
    const lines = [
      `Cort Shuttle Report (Invoice 1150 Format)`,
      `Company: ${company.name}`,
      `Month: ${month}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "route_name,route_id,date,vehicle_plate,vehicle_make,vehicle_model,fixed_monthly_amount_pkr",
      ...reportData.map((item) => {
        const date = new Date().toISOString().split("T")[0]; // Current date as placeholder
        return [
          item.route.name,
          item.route.id,
          date,
          item.vehicle?.plate_no ?? "",
          item.vehicle?.make ?? "",
          item.vehicle?.model ?? "",
          item.pricing?.fixed_monthly_amount_pkr ?? 0,
        ].join(",");
      }),
      "",
      `TOTAL_PKR,${totalAmount}`,
    ];
    downloadText(`shuttle-report-${company.name}-${month}.csv`, lines.join("\n"));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Financial Reporting</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Shuttle Reports</h1>
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
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4">
          <div className="text-xs font-semibold tracking-wider text-muted">SHUTTLE REPORT (INVOICE 1150 FORMAT)</div>
          <div className="mt-1 text-sm text-muted">
            View-only report showing routes, vehicles, and fixed monthly amounts. Matches Invoice 1150 format.
          </div>
        </div>

        {reportData.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-sm text-muted">No routes or vehicles assigned yet.</div>
            <div className="mt-1 text-xs text-muted">Contact Cort Super Admin to configure shuttle routes.</div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Route Name</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Vehicle</th>
                    <th className="px-3 py-2 text-left">Driver</th>
                    <th className="px-3 py-2 text-right">Fixed Monthly (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {reportData.map((item) => (
                    <tr key={item.route.id}>
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{item.route.name}</div>
                        <div className="text-xs text-muted">Route ID: {item.route.id}</div>
                      </td>
                      <td className="px-3 py-2 text-muted">
                        {new Date().toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2">
                        {item.vehicle ? (
                          <div>
                            <div className="font-medium text-ink">
                              {item.vehicle.plate_no} — {item.vehicle.make} {item.vehicle.model}
                            </div>
                            <div className="text-xs text-muted">
                              {item.vehicle.year} • {item.vehicle.color}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {item.driver ? (
                          <div className="text-ink">{item.driver.full_name}</div>
                        ) : (
                          <span className="text-muted">Not assigned</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-ink">
                        {item.pricing ? money(item.pricing.fixed_monthly_amount_pkr) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface">
                  <tr>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-ink" colSpan={4}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right text-sm font-semibold text-ink">
                      {money(totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-border bg-surface p-4 text-xs text-muted">
              <strong>Note:</strong> This report shows the fixed monthly pricing for assigned vehicles per route.
              Actual trip counts and billing are managed by Cort Super Admin in the invoicing system.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

