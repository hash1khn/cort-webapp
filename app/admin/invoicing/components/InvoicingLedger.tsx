"use client";

import Pagination from "../../../components/ui/Pagination";
import { Modal } from "../../components/ui/Modal";
import { InvoiceStatsCards } from "./InvoiceStatsCards";
import type { useInvoices } from "../hooks/useInvoices";

type InvoicingLedgerProps = {
  inv: ReturnType<typeof useInvoices>;
};

export function InvoicingLedger({ inv: ledger }: InvoicingLedgerProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Financial Engine</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            General Ledger
          </h1>
        </div>
        <button
          type="button"
          onClick={() => ledger.setShowShuttleModal(true)}
          disabled={!ledger.canUpdate}
          className="inline-flex items-center justify-center rounded-lg bg-[#f47f00] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#d97000] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          Generate Shuttle Invoice
        </button>
      </div>

      <InvoiceStatsCards stats={ledger.stats} />

      <div className="rounded-xl border border-border bg-[var(--bg-card)] overflow-hidden shadow-sm flex flex-col">
        {/* Filter Bar */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
            Filter by Company
          </label>
          <select
            value={ledger.filterCompanyId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              ledger.setFilterCompanyId(val ? Number(val) : undefined);
              ledger.setCurrentPage(1);
            }}
            className="rounded-lg border border-border bg-[var(--bg-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f47f00]/40 min-w-[180px]"
          >
            <option value="">All Companies</option>
            {ledger.companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {ledger.filterCompanyId && (
            <button
              onClick={() => { ledger.setFilterCompanyId(undefined); ledger.setCurrentPage(1); }}
              className="text-xs text-[#f47f00] hover:text-[#d97000] font-medium underline"
            >
              Clear filter
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Billing Period</th>
                <th className="px-4 py-3">Generated At</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-right">Amount Received</th>
                <th className="px-4 py-3 text-right">Amount Receivable</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.isLoading && ledger.invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    Loading ledger.invoices...
                  </td>
                </tr>
              ) : ledger.invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    No ledger.invoices generated yet.
                  </td>
                </tr>
              ) : (
                ledger.invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--text-primary)]">{invoice.invoice_number}</div>
                      <div className="text-xs text-[var(--text-muted)]">ID #{invoice.id}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">{invoice.companies?.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      <div>{ledger.formatInvoicePeriod(invoice)}</div>
                      <div className="text-xs text-[var(--text-muted)]">({ledger.getInvoicePeriodType(invoice).toLowerCase()})</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {new Date(invoice.generated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--text-primary)]">
                      PKR {Number(invoice.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {invoice.amount_paid != null && Number(invoice.amount_paid) > 0
                        ? `PKR ${Number(invoice.amount_paid).toLocaleString()}`
                        : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {invoice.status === 'PAID'
                        ? <span className="text-green-600">Fully Paid</span>
                        : `PKR ${Math.max(0, Number(invoice.total_amount) - Number(invoice.amount_paid ?? 0)).toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={invoice.status || 'DRAFT'}
                        onChange={(e) => ledger.handleStatusUpdate(invoice.id, e.target.value)}
                        disabled={!ledger.canUpdate}
                        className={`rounded px-2 py-1 text-xs font-medium border border-border disabled:opacity-50 disabled:cursor-not-allowed ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'UNPAID' ? 'bg-red-100 text-red-700' :
                          invoice.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-zinc-100 text-zinc-700'
                          }`}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="UNPAID">UNPAID</option>
                        <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => ledger.viewPdf(invoice.id)}
                          disabled={ledger.viewingId === invoice.id}
                          className="text-zinc-600 hover:text-zinc-800 font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                          title="View Invoice"
                        >
                          {ledger.viewingId === invoice.id ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>

                        <button
                          onClick={() => ledger.downloadPdf(invoice.id, invoice.invoice_number)}
                          disabled={ledger.downloadingId === invoice.id}
                          className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                          title="Download PDF"
                        >
                          {ledger.downloadingId === invoice.id ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" x2="12" y1="15" y2="3" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => ledger.handleSendEmail(invoice.id, invoice.invoice_number)}
                          disabled={ledger.sendingEmailId === invoice.id || !ledger.canUpdate}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                          title="Send Email to Company"
                        >
                          {ledger.sendingEmailId === invoice.id ? (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect width="20" height="16" x="2" y="4" rx="2" />
                              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => ledger.handleDeleteInvoice(invoice.id, invoice.invoice_number)}
                          disabled={ledger.deletingInvoiceId === invoice.id || !ledger.canDelete}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                          title="Delete Invoice"
                        >
                          {ledger.deletingInvoiceId === invoice.id ? "..." : "Delete"}
                        </button>
                        {/* Settle button — only for shuttle invoices not yet fully paid */}
                        {invoice.shuttle_contract_id && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && ledger.canUpdate && (
                          <button
                            type="button"
                            onClick={() => ledger.openSettleModal(invoice)}
                            className="text-green-700 hover:text-green-900 font-semibold text-xs border border-green-300 rounded px-2 py-1 hover:bg-green-50"
                            title="Record Payment"
                          >
                            Settle
                          </button>
                        )}
                        {invoice.shuttle_contract_id && (
                          <button
                            type="button"
                            onClick={() => ledger.openLogsModal(invoice)}
                            className="text-blue-700 hover:text-blue-900 font-semibold text-xs border border-blue-300 rounded px-2 py-1 hover:bg-blue-50"
                            title="View Payment Logs"
                          >
                            Logs
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {ledger.pagination.total > 0 && (
          <div className="border-t border-border">
            <Pagination
              currentPage={ledger.currentPage}
              totalPages={ledger.totalPages}
              onPageChange={(page) => ledger.setCurrentPage(page)}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={ledger.showShuttleModal}
        onClose={() => {
          if (!ledger.isGeneratingShuttle) ledger.setShowShuttleModal(false);
        }}
        title="Generate Shuttle Invoice"
        size="xl"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Company
            </label>
            <select
              value={ledger.selectedCompanyId}
              onChange={(e) => ledger.setSelectedCompanyId(e.target.value)}
              className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-[var(--bg-card)]"
            >
              {ledger.companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>



          {/* Route-level invoice overrides (quantity for both billing types) */}
          {ledger.shuttleRoutes.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block">
                Route Inputs For This Invoice
              </label>
              <p className="text-xs text-[var(--text-muted)]">
                Set quantity for each route (monthly and per-trip). For per-trip routes, also set trips. Any route with Quantity = 0 is excluded.
              </p>
              <div className="rounded-lg border border-[var(--border-default)] divide-y divide-slate-100 overflow-hidden">
                {ledger.shuttleRoutes.map((route) => (
                  <div key={route.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{route.particulars}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {route.vehicle_type} | Contract Qty: {route.quantity} | {route.billing_type === "PER_TRIP" ? "Per Trip" : "Monthly"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-[var(--text-muted)]">Qty:</span>
                      <input
                        type="number"
                        min={0}
                        value={ledger.routeQuantities[route.id] ?? String(Number(route.quantity ?? 0))}
                        onChange={(e) =>
                          ledger.setRouteQuantities((prev) => ({ ...prev, [route.id]: e.target.value }))
                        }
                        className="w-16 h-8 rounded border border-[var(--border-default)] px-2 text-sm text-center outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                      />
                      {route.billing_type === "PER_TRIP" && (
                        <>
                          <span className="text-xs text-[var(--text-muted)]">Trips:</span>
                          <input
                            type="number"
                            min={0}
                            value={ledger.routeTrips[route.id] ?? "0"}
                            onChange={(e) =>
                              ledger.setRouteTrips((prev) => ({ ...prev, [route.id]: e.target.value }))
                            }
                            className="w-16 h-8 rounded border border-[var(--border-default)] px-2 text-sm text-center outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                          />
                          <span className="text-xs text-[var(--text-muted)]">Date:</span>
                          <input
                            type="date"
                            value={ledger.routeTripDates[route.id] ?? ""}
                            onChange={(e) =>
                              ledger.setRouteTripDates((prev) => ({ ...prev, [route.id]: e.target.value }))
                            }
                            className="h-8 rounded border border-[var(--border-default)] px-2 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                          />
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Billing Period
            </label>
            <select
              value={ledger.billingPeriod}
              onChange={(e) => ledger.setBillingPeriod(e.target.value as "MONTHLY" | "WEEKLY")}
              className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-[var(--bg-card)]"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>

          {ledger.billingPeriod === "MONTHLY" ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Billing Month
              </label>
              <input
                type="month"
                value={ledger.billingMonthRaw}
                onChange={(e) => ledger.setBillingMonthRaw(e.target.value)}
                className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Week Start Date
                </label>
                <input
                  type="date"
                  value={ledger.weeklyStartDate}
                  onChange={(e) => ledger.setWeeklyStartDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Week End Date
                </label>
                <input
                  type="date"
                  value={ledger.weeklyEndDate}
                  onChange={(e) => ledger.setWeeklyEndDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Continued Vehicles (Optional)
            </label>
            <input
              type="number"
              min={0}
              value={ledger.continuedVehicles}
              onChange={(e) => ledger.setContinuedVehicles(e.target.value)}
              placeholder="e.g. 8"
              className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Fuel Billing
            </label>
            <select
              value={ledger.fuelMode}
              onChange={(e) => ledger.setFuelMode(e.target.value as "CONTRACT" | "SELECTED")}
              className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-[var(--bg-card)]"
            >
              <option value="CONTRACT">Same as contract (no fuel revision)</option>
              <option value="SELECTED">Adjust to selected fuel (this invoice only)</option>
            </select>
            {ledger.shuttleContractFuel?.fuelBasePrice && (
              <p className="text-xs text-[var(--text-muted)]">
                Contract petrol base: PKR {ledger.shuttleContractFuel.fuelBasePrice}/L
                {ledger.shuttleContractFuel.dieselBasePrice
                  ? ` · Diesel base: PKR ${ledger.shuttleContractFuel.dieselBasePrice}/L`
                  : ""}
              </p>
            )}
          </div>

          {ledger.fuelMode === "SELECTED" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Petrol Price (PKR/L)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={ledger.selectedFuelPrice}
                  onChange={(e) => ledger.setSelectedFuelPrice(e.target.value)}
                  placeholder="e.g. 264.61"
                  className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                />
              </div>
              {ledger.shuttleRoutes.some((r) => r.fuel_type === "DIESEL") && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Diesel Price (PKR/L)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={ledger.selectedDieselPrice}
                    onChange={(e) => ledger.setSelectedDieselPrice(e.target.value)}
                    placeholder="e.g. 276.34"
                    className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                  />
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)] sm:col-span-2">
                Fuel on this invoice is revised against the contract base using these prices. Global fuel settings are not changed.
              </p>
              {ledger.fuelAdjustmentPreview ? (
                <div className="sm:col-span-2 rounded-lg border border-[var(--border-default)] overflow-hidden">
                  <div className="px-3 py-2 bg-[var(--bg-subtle)] space-y-1">
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Fuel Adjustment Preview
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Contract threshold: {ledger.fuelAdjustmentPreview.revisionLabel}. Selected petrol is{" "}
                      {ledger.fuelAdjustmentPreview.petrolPercentChange >= 0 ? "+" : ""}
                      {(ledger.fuelAdjustmentPreview.petrolPercentChange * 100).toFixed(1)}% vs contract
                      {ledger.fuelAdjustmentPreview.willPetrolAdjust
                        ? " — fuel will be revised."
                        : " — within threshold, fuel stays as contract."}
                      {ledger.fuelAdjustmentPreview.dieselPercentChange != null && (
                        <>
                          {" "}Diesel is {ledger.fuelAdjustmentPreview.dieselPercentChange >= 0 ? "+" : ""}
                          {(ledger.fuelAdjustmentPreview.dieselPercentChange * 100).toFixed(1)}% vs contract
                          {ledger.fuelAdjustmentPreview.willDieselAdjust
                            ? " — diesel fuel will be revised."
                            : " — diesel stays as contract."}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[var(--bg-subtle)]">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)]">Route</th>
                          <th className="px-3 py-2 text-left font-semibold text-[var(--text-muted)]">Fuel</th>
                          <th className="px-3 py-2 text-right font-semibold text-[var(--text-muted)]">Contract / veh</th>
                          <th className="px-3 py-2 text-right font-semibold text-[var(--text-muted)]">Adjusted / veh</th>
                          <th className="px-3 py-2 text-right font-semibold text-[var(--text-muted)]">This invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.fuelAdjustmentPreview.rows.map((row) => {
                          const changed = Math.abs(row.adjustedFuelPerVehicle - row.baseFuelPerVehicle) > 0.005;
                          return (
                            <tr key={row.routeId} className="border-t border-[var(--border-default)]">
                              <td className="px-3 py-2">
                                <div className="font-medium text-[var(--text-primary)]">{row.particulars}</div>
                                <div className="text-[var(--text-muted)]">{row.vehicleType}</div>
                              </td>
                              <td className="px-3 py-2 text-[var(--text-secondary)]">{row.fuelType}</td>
                              <td className="px-3 py-2 text-right">
                                {row.baseFuelPerVehicle.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold ${changed ? "text-orange-600" : "text-green-600"}`}>
                                {row.adjustedFuelPerVehicle.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-right text-[var(--text-secondary)]">
                                {row.billed
                                  ? row.billedAdjustedFuel.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  : "Excluded"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-default)] px-3 py-2 text-xs">
                    <span className="text-[var(--text-muted)]">
                      Contract fuel total: PKR {ledger.fuelAdjustmentPreview.contractFuelTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      Adjusted fuel total: PKR {ledger.fuelAdjustmentPreview.adjustedFuelTotal.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {Math.abs(ledger.fuelAdjustmentPreview.delta) >= 0.01 && (
                        <span className={ledger.fuelAdjustmentPreview.delta > 0 ? " text-orange-600" : " text-green-600"}>
                          {" "}({ledger.fuelAdjustmentPreview.delta > 0 ? "+" : ""}
                          {ledger.fuelAdjustmentPreview.delta.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--text-muted)] sm:col-span-2">
                  Enter a petrol price to preview the fuel adjustment for this invoice.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Amount Vs Contract
            </label>
            <select
              value={ledger.amountMode}
              onChange={(e) => ledger.setAmountMode(e.target.value as "EXACT" | "LESS" | "MORE")}
              className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-[var(--bg-card)]"
            >
              <option value="EXACT">Exact as contract</option>
              <option value="LESS">Less than contract</option>
              <option value="MORE">More than contract</option>
            </select>
          </div>

          {ledger.amountMode !== "EXACT" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Amount Difference (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={ledger.amountDelta}
                onChange={(e) => ledger.setAmountDelta(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Invoice Discount (Optional)
            </label>
            <select
              value={ledger.shuttleDiscountType}
              onChange={(e) => { ledger.setShuttleDiscountType(e.target.value as any); ledger.setShuttleDiscountValue(""); }}
              className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-[var(--bg-card)]"
            >
              <option value="NONE">No Discount</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT">Flat Amount (PKR)</option>
            </select>
          </div>

          {ledger.shuttleDiscountType !== "NONE" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {ledger.shuttleDiscountType === "PERCENTAGE" ? "Discount %" : "Discount Amount (PKR)"}
              </label>
              <input
                type="number"
                min={0}
                value={ledger.shuttleDiscountValue}
                onChange={(e) => ledger.setShuttleDiscountValue(e.target.value)}
                placeholder={ledger.shuttleDiscountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
                className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>
          )}

          <div className="pt-2 border-t border-[var(--border-default)]">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="isVendorCar"
                checked={ledger.isVendorCar}
                onChange={(e) => ledger.setIsVendorCar(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#f47f00] focus:ring-[#f47f00]"
              />
              <label htmlFor="isVendorCar" className="text-sm font-semibold text-[var(--text-secondary)] cursor-pointer">
                Vehicle is from a Vendor (External)
              </label>
            </div>

            {ledger.isVendorCar && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Vendor
                  </label>
                  <select
                    value={ledger.selectedVendorId}
                    onChange={(e) => ledger.setSelectedVendorId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-[var(--bg-card)]"
                  >
                    {ledger.allVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Vendor Cost (Internal)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={ledger.vendorCost}
                    onChange={(e) => ledger.setVendorCost(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => !ledger.isGeneratingShuttle && ledger.setShowShuttleModal(false)}
              className="px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              disabled={ledger.isGeneratingShuttle}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={ledger.handleGenerateShuttleInvoice}
              disabled={ledger.isGeneratingShuttle || !ledger.canUpdate}
              className="inline-flex items-center justify-center rounded-lg bg-[#0c225e] px-5 py-2 text-sm font-bold text-white hover:bg-[#0a1a4a] disabled:opacity-70"
            >
              {ledger.isGeneratingShuttle ? "Generating..." : "Generate Invoice"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Settle Shuttle Invoice Modal */}
      <Modal
        isOpen={ledger.showSettleModal}
        onClose={() => {
          if (!ledger.isSettling) {
            ledger.setShowSettleModal(false);
            ledger.setSettlingInvoice(null);
          }
        }}
        title="Record Payment"
      >
        {ledger.settlingInvoice && (
          <div className="space-y-4">
            {/* Compute effective remaining: total - paid (handles stale amount_remaining = 0 on older ledger.invoices) */}
            {/* We use a destructured const via a wrapper so we can share the value below */}
            {(({ total, paid, remaining }: { total: number; paid: number; remaining: number }) => (
              <>
            {/* Summary */}
            <div className="rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Invoice</span>
                <span className="font-semibold text-[var(--text-primary)]">{ledger.settlingInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Total Amount</span>
                <span className="font-semibold">PKR {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Already Paid</span>
                <span className="font-semibold text-green-700">PKR {paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Remaining</span>
                <span className="font-semibold text-red-600">PKR {remaining.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Amount Received (PKR)
              </label>
              <input
                type="number"
                min={0.01}
                value={ledger.settleAmount}
                onChange={(e) => ledger.setSettleAmount(e.target.value)}
                placeholder={`Max: PKR ${remaining.toLocaleString()}`}
                className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Payment Type
              </label>
              <div className="flex gap-2">
                {(["PARTIAL", "FINAL"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      ledger.setSettlePaymentType(type);
                      if (type === "FINAL") ledger.setSettleAmount(String(remaining));
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      ledger.settlePaymentType === type
                        ? "bg-[#0c225e] text-white border-[#0c225e]"
                        : "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[#0c225e]"
                    }`}
                  >
                    {type === "PARTIAL" ? "Partial" : "Full / Final"}
                  </button>
                ))}
              </div>
            </div>
              </>
            ))({
              total: Number(ledger.settlingInvoice.total_amount),
              paid: Number(ledger.settlingInvoice.amount_paid ?? 0),
              remaining: Math.max(0, Number(ledger.settlingInvoice.total_amount) - Number(ledger.settlingInvoice.amount_paid ?? 0)),
            })}

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Payment Date
              </label>
              <input
                type="date"
                value={ledger.settlePaymentDate}
                onChange={(e) => ledger.setSettlePaymentDate(e.target.value)}
                className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Payment Method (Optional)
              </label>
              <select
                value={ledger.settlePaymentMethod}
                onChange={(e) => ledger.setSettlePaymentMethod(e.target.value)}
                className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-[var(--bg-card)]"
              >
                <option value="">Select method...</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Online Transfer">Online Transfer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={ledger.settleNotes}
                onChange={(e) => ledger.setSettleNotes(e.target.value)}
                placeholder="e.g. Cheque #12345"
                className="w-full h-10 rounded-lg border border-[var(--border-default)] px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => !ledger.isSettling && ledger.setShowSettleModal(false)}
                className="px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                disabled={ledger.isSettling}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={ledger.handleSettleInvoice}
                disabled={ledger.isSettling || !ledger.settleAmount}
                className="inline-flex items-center justify-center rounded-lg bg-green-700 px-5 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-70"
              >
                {ledger.isSettling ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Logs Modal */}
      <Modal
        isOpen={ledger.showLogsModal}
        onClose={() => {
          ledger.setShowLogsModal(false);
          ledger.setActiveInvoiceLogs(null);
        }}
        title={`Payment History: ${ledger.activeInvoiceLogs?.invoice_number || ""}`}
        size="lg"
      >
        <div className="space-y-4">
          {ledger.isLoadingLogs ? (
            <div className="py-10 text-center text-[var(--text-muted)]">Loading history...</div>
          ) : ledger.activeInvoiceLogs?.shuttle_invoice_payments?.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-[var(--border-default)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-subtle)] text-xs font-semibold uppercase text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Method</th>
                    <th className="px-4 py-2">Notes</th>
                    <th className="px-4 py-2">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ledger.activeInvoiceLogs.shuttle_invoice_payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(p.payment_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-[var(--text-primary)]">
                        PKR {Number(p.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{p.payment_method || "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs">{p.notes || "—"}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">
                        {p.users?.full_name || "System"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-[var(--text-muted)]">No payment records found.</div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => ledger.setShowLogsModal(false)}
              className="px-4 py-2 text-sm font-bold text-white bg-[#0c225e] rounded-lg hover:bg-[#0a1a4a]"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
