"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
  fetchAdminInvoices,
  fetchInvoiceStats,
  updateInvoiceStatus,
  downloadInvoicePdf,
  selectAdminInvoices,
  selectAdminInvoiceStats,
  selectAdminInvoicingStatus,
  selectAdminInvoicingActionStatus
} from "../../lib/store/slices/adminInvoicingSlice";

export default function InvoicingPage() {
  const dispatch = useAppDispatch();
  const invoices = useAppSelector(selectAdminInvoices);
  const stats = useAppSelector(selectAdminInvoiceStats);
  const status = useAppSelector(selectAdminInvoicingStatus);
  const actionStatus = useAppSelector(selectAdminInvoicingActionStatus);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchAdminInvoices());
    dispatch(fetchInvoiceStats());
  }, [dispatch]);

  const downloadPdf = async (id: number, invoiceNumber: string) => {
    if (downloadingId) return;
    setDownloadingId(id);
    try {
      await dispatch(downloadInvoicePdf({ id, invoiceNumber })).unwrap();
    } catch (e) {
      console.error("Failed to download PDF", e);
      alert("Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

      await dispatch(updateInvoiceStatus({ id, status: newStatus })).unwrap();

      // Also refresh stats as they might change with status
      dispatch(fetchInvoiceStats());

      alert("Status updated successfully");
    } catch (error: any) {
      console.error("Failed to update status:", error);
      alert("Failed to update status: " + error);
    }
  };

  const isInvoicesLoading = status === 'loading';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Financial Engine</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            General Ledger
          </h1>
        </div>
      </div>

      {/* Financial Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted uppercase">Unpaid / Collectable</div>
          <div className="mt-2 text-2xl font-bold text-red-600">
            PKR {stats.totalCollectable.toLocaleString()}
          </div>
          <div className="text-xs text-muted mt-1">Pending payments</div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-muted uppercase">Total Collected</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            PKR {stats.totalCollected.toLocaleString()}
          </div>
          <div className="text-xs text-muted mt-1">Successfully recognized revenue</div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm opacity-70">
          <div className="text-xs font-semibold text-muted uppercase">Overdue Amount</div>
          <div className="mt-2 text-2xl font-bold text-orange-600">
            PKR {stats.totalOverdue.toLocaleString()}
          </div>
          <div className="text-xs text-muted mt-1">Included in Collectable</div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Reference Month</th>
                <th className="px-4 py-3">Generated At</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isInvoicesLoading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-medium text-navy">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-navy">{inv.companies?.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-navy">{inv.billing_month}</td>
                    <td className="px-4 py-3 text-navy">
                      {new Date(inv.generated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-navy">
                      PKR {Number(inv.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={inv.status || 'DRAFT'}
                        onChange={(e) => handleStatusUpdate(inv.id, e.target.value)}
                        className={`rounded px-2 py-1 text-xs font-medium border border-border ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          inv.status === 'UNPAID' ? 'bg-red-100 text-red-700' :
                            'bg-zinc-100 text-zinc-700'
                          }`}
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="UNPAID">UNPAID</option>
                        <option value="PAID">PAID</option>
                        <option value="OVERDUE">OVERDUE</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                        disabled={downloadingId === inv.id}
                        className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                      >
                        {downloadingId === inv.id ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Downloading...
                          </>
                        ) : 'Download PDF'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
