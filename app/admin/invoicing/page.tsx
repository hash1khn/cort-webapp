"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { apiClient, Company } from "../../lib/services/api-client";
import {
  fetchAdminInvoices,
  fetchInvoiceStats,
  updateInvoiceStatus,
  downloadInvoicePdf,
  selectAdminInvoices,
  selectAdminInvoiceStats,
  selectAdminInvoicingStatus,
  selectAdminInvoicingActionStatus,
  selectAdminInvoicingPagination,
  sendInvoiceEmail
} from "../../lib/store/slices/adminInvoicingSlice";
import Pagination from "../../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";

export default function InvoicingPage() {
  const dispatch = useAppDispatch();
  const invoices = useAppSelector(selectAdminInvoices);
  const stats = useAppSelector(selectAdminInvoiceStats);
  const status = useAppSelector(selectAdminInvoicingStatus);
  const actionStatus = useAppSelector(selectAdminInvoicingActionStatus);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);
  const [isGeneratingShuttle, setIsGeneratingShuttle] = useState(false);

  const pagination = useAppSelector(selectAdminInvoicingPagination);
  const [currentPage, setCurrentPage] = useState(1);

  const [showShuttleModal, setShowShuttleModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [billingMonthRaw, setBillingMonthRaw] = useState<string>("");

  useEffect(() => {
    dispatch(fetchAdminInvoices({ page: currentPage }));
    dispatch(fetchInvoiceStats());
  }, [dispatch, currentPage]);

  // Load companies for shuttle invoice generation
  useEffect(() => {
    (async () => {
      try {
        const res = await apiClient.getCompanies({ limit: 100 });
        const companyList = res.data.data;
        setCompanies(companyList);
        if (companyList.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(String(companyList[0].id));
        }
      } catch (e) {
        console.error("Failed to load companies for shuttle invoices", e);
      }
    })();
  }, [selectedCompanyId]);

  const handleSendEmail = async (id: number, invoiceNumber: string) => {
    if (sendingEmailId) return;
    if (!confirm(`Send invoice #${invoiceNumber} via email?`)) return;

    setSendingEmailId(id);
    try {
      await dispatch(sendInvoiceEmail(id)).unwrap();
      alert(`Invoice #${invoiceNumber} sent successfully.`);
    } catch (e: any) {
      console.error("Failed to send email", e);
      alert(`Failed to send email: ${e}`);
    } finally {
      setSendingEmailId(null);
    }
  };

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
  const totalPages = pagination.pages;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleGenerateShuttleInvoice = async () => {
    if (!selectedCompanyId) {
      alert("Please select a company.");
      return;
    }
    if (!billingMonthRaw) {
      alert("Please select a billing month.");
      return;
    }

    const [year, month] = billingMonthRaw.split("-");
    if (!year || !month) {
      alert("Invalid billing month.");
      return;
    }
    const billingMonth = `${Number(month)}/${year}`;

    setIsGeneratingShuttle(true);
    try {
      const contractRes = await apiClient.getShuttleContract(Number(selectedCompanyId));
      const contract = contractRes.data;
      if (!contract) {
        alert("No shuttle contract found for the selected company.");
        return;
      }

      await apiClient.generateShuttleInvoice(contract.id, billingMonth);

      // Refresh invoices and stats
      dispatch(fetchAdminInvoices({ page: currentPage }));
      dispatch(fetchInvoiceStats());

      alert("Shuttle invoice generated successfully.");
      setShowShuttleModal(false);
      setBillingMonthRaw("");
    } catch (e: any) {
      console.error("Failed to generate shuttle invoice", e);
      alert(`Failed to generate shuttle invoice: ${e?.message || e}`);
    } finally {
      setIsGeneratingShuttle(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Financial Engine</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            General Ledger
          </h1>
        </div>
        <button
          onClick={() => setShowShuttleModal(true)}
          className="inline-flex items-center justify-center rounded-lg bg-[#f47f00] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#d97000] transition-all"
        >
          Generate Shuttle Invoice
        </button>
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

      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm flex flex-col">
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                          disabled={downloadingId === inv.id}
                          className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                          title="Download PDF"
                        >
                          {downloadingId === inv.id ? (
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
                          onClick={() => handleSendEmail(inv.id, inv.invoice_number)}
                          disabled={sendingEmailId === inv.id}
                          className="text-gray-600 hover:text-gray-800 font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                          title="Send Email to Company"
                        >
                          {sendingEmailId === inv.id ? (
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="border-t border-border">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={showShuttleModal}
        onClose={() => {
          if (!isGeneratingShuttle) setShowShuttleModal(false);
        }}
        title="Generate Shuttle Invoice"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Company
            </label>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-white"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Billing Month
            </label>
            <input
              type="month"
              value={billingMonthRaw}
              onChange={(e) => setBillingMonthRaw(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => !isGeneratingShuttle && setShowShuttleModal(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
              disabled={isGeneratingShuttle}
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateShuttleInvoice}
              disabled={isGeneratingShuttle}
              className="inline-flex items-center justify-center rounded-lg bg-[#0c225e] px-5 py-2 text-sm font-bold text-white hover:bg-[#0a1a4a] disabled:opacity-70"
            >
              {isGeneratingShuttle ? "Generating..." : "Generate Invoice"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
