"use client";

import { useEffect, useState } from "react";
import { apiClient, Company, Invoice } from "../../lib/services/api-client";

export default function InvoicingPage() {
  // Invoices State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Modal State
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<number | "">("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch Invoices
  // Fetch Invoices
  const fetchInvoices = async () => {
    setIsInvoicesLoading(true);
    try {
      const response = await apiClient.getAllInvoices();
      // Backend returns { data: [...], status: ..., message: ... }
      if (response && response.data && Array.isArray(response.data)) {
        setInvoices(response.data);
      } else if (Array.isArray(response)) {
        setInvoices(response);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
    } finally {
      setIsInvoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // Prefetch companies for modal
    apiClient.getCompanies({ limit: 100 }).then(res => {
      if (res.data && res.data.data) {
        setCompanies(res.data.data);
      }
    });
  }, []);

  const handleGenerateInvoice = async () => {
    if (!selectedCompany) return;
    setIsGenerating(true);
    try {
      await apiClient.generateMonthlyInvoice({
        companyId: Number(selectedCompany),
        year: Number(selectedYear),
        month: Number(selectedMonth)
      });
      setShowGenerateModal(false);
      fetchInvoices();
      alert("Invoice generated successfully!");
    } catch (error: any) {
      alert("Failed to generate invoice: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPdf = async (id: number, invoiceNumber: string) => {
    try {
      await apiClient.downloadInvoicePdf(id, invoiceNumber);
    } catch (e) {
      console.error("Failed to download PDF", e);
      alert("Failed to download PDF");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Financial Engine</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
            Invoicing
          </h1>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowGenerateModal(true)}
          className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy/90"
        >
          Generate Invoice
        </button>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-medium uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Billing Month</th>
                <th className="px-4 py-3">Generated At</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isInvoicesLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
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
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Invoice Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-navy mb-4">Generate Monthly Invoice</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Company</label>
                <select
                  className="w-full rounded-md border border-border p-2 text-sm"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(Number(e.target.value))}
                >
                  <option value="">Select Company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Month</label>
                  <select
                    className="w-full rounded-md border border-border p-2 text-sm"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1">Year</label>
                  <select
                    className="w-full rounded-md border border-border p-2 text-sm"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                  >
                    <option value={2024}>2024</option>
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-navy"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoice}
                disabled={isGenerating || !selectedCompany}
                className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
