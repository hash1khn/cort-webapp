"use client";

import { useEffect, useState } from "react";
import { apiClient, Company, Invoice } from "../../lib/services/api-client";

export default function InvoicingPage() {
  // Invoices State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Pending Trips State
  const [pendingTrips, setPendingTrips] = useState<any[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

  const fetchPendingTrips = async () => {
    setIsLoadingPending(true);
    try {
      const res = await apiClient.getPendingTrips();
      if (res && res.data) {
        setPendingTrips(res.data);
      }
    } catch (error) {
      console.error("Failed to pending trips", error);
    } finally {
      setIsLoadingPending(false);
    }
  }

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (showGenerateModal) {
      fetchPendingTrips();
    }
  }, [showGenerateModal]);

  const handleGenerateInvoice = async () => {
    if (!selectedTripId) return;
    setIsGenerating(true);
    try {
      await apiClient.generateTripInvoice(selectedTripId);
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

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;

      await apiClient.updateInvoiceStatus(id, newStatus);

      // Update local state
      setInvoices(prev => prev.map(inv =>
        inv.id === id ? { ...inv, status: newStatus } : inv
      ));

      alert("Status updated successfully");
    } catch (error: any) {
      console.error("Failed to update status:", error);
      alert("Failed to update status: " + error.message);
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
          Generate New Invoice
        </button>
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isInvoicesLoading ? (
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
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl flex flex-col max-h-[90vh]">
            <h2 className="text-lg font-semibold text-navy mb-4">Select Trip to Invoice</h2>

            <p className="text-sm text-muted mb-4">
              Below are completed trips that have not been invoiced yet. Select one to generate an invoice.
            </p>

            <div className="flex-1 overflow-y-auto border border-border rounded-md">
              {isLoadingPending ? (
                <div className="p-8 text-center text-muted">Loading pending trips...</div>
              ) : pendingTrips.length === 0 ? (
                <div className="p-8 text-center text-muted">No pending trips found. All completed trips have been invoiced.</div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 border-b">Select</th>
                      <th className="px-4 py-2 border-b">Date</th>
                      <th className="px-4 py-2 border-b">Company</th>
                      <th className="px-4 py-2 border-b">Passenger</th>
                      <th className="px-4 py-2 border-b text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTrips.map(trip => (
                      <tr key={trip.id} className={`hover:bg-zinc-50 cursor-pointer ${selectedTripId === trip.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedTripId(trip.id)}>
                        <td className="px-4 py-3 border-b">
                          <input
                            type="radio"
                            name="tripSelect"
                            checked={selectedTripId === trip.id}
                            onChange={() => setSelectedTripId(trip.id)}
                          />
                        </td>
                        <td className="px-4 py-3 border-b">
                          {trip.chauffeur_trip_logs?.completed_at ? new Date(trip.chauffeur_trip_logs.completed_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-3 border-b font-medium">{trip.companies?.name}</td>
                        <td className="px-4 py-3 border-b">{trip.users_chauffeur_bookings_passenger_idTousers?.full_name}</td>
                        <td className="px-4 py-3 border-b text-right">
                          PKR {Number(trip.chauffeur_trip_logs?.total_invoice_amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-navy"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateInvoice}
                disabled={isGenerating || !selectedTripId}
                className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
