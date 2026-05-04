"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, Company } from "../../lib/services/api-client";
import { ShuttleContractRoute } from "../../lib/services/types/pricing";
import Pagination from "../../components/ui/Pagination";
import { Modal } from "../components/ui/Modal";
import { PermissionGate } from "../components/PermissionGate";
import { AdminCan, useAdminAbility } from "../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../lib/abilities/admin-subjects";

interface Invoice {
  id: number;
  invoice_number: string;
  billing_month: string;
  billing_period?: "MONTHLY" | "WEEKLY" | null;
  period_start?: string | null;
  period_end?: string | null;
  generated_at: string;
  total_amount: number | string;
  status: string;
  companies?: { name: string } | null;
  shuttle_contract_id?: number | null;
  amount_paid?: number | string | null;
  amount_remaining?: number | string | null;
  payment_status?: string | null;
}

interface InvoiceStats {
  totalCollectable: number;
  totalCollected: number;
  totalOverdue: number;
}

interface PaginationMeta {
  page: number;
  pages: number;
  total: number;
}

export default function InvoicingPage() {
  return (
    <PermissionGate permission="invoicing">
      <AdminCan I="read" a="Invoicing">
        <InvoicingPageContent />
      </AdminCan>
    </PermissionGate>
  );
}

function InvoicingPageContent() {
  const ability = useAdminAbility();
  const canUpdate = ability.can("update", ADMIN_SUBJECTS.invoicing);
  const canDelete = ability.can("delete", ADMIN_SUBJECTS.invoicing);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({ totalCollectable: 0, totalCollected: 0, totalOverdue: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCompanyId, setFilterCompanyId] = useState<number | undefined>(undefined);

  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<number | null>(null);
  const [isGeneratingShuttle, setIsGeneratingShuttle] = useState(false);

  const [showShuttleModal, setShowShuttleModal] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [billingMonthRaw, setBillingMonthRaw] = useState<string>("");
  const [billingPeriod, setBillingPeriod] = useState<"MONTHLY" | "WEEKLY">("MONTHLY");
  const [weeklyStartDate, setWeeklyStartDate] = useState<string>("");
  const [weeklyEndDate, setWeeklyEndDate] = useState<string>("");
  const [continuedVehicles, setContinuedVehicles] = useState<string>("");
  const [amountMode, setAmountMode] = useState<"EXACT" | "LESS" | "MORE">("EXACT");
  const [amountDelta, setAmountDelta] = useState<string>("");
  const [shuttleDiscountType, setShuttleDiscountType] = useState<"NONE" | "PERCENTAGE" | "FLAT">("NONE");
  const [shuttleDiscountValue, setShuttleDiscountValue] = useState<string>("");
  const [deletingInvoiceId, setDeletingInvoiceId] = useState<number | null>(null);

  // Shuttle route input state (all contract routes)
  const [shuttleRoutes, setShuttleRoutes] = useState<ShuttleContractRoute[]>([]);
  const [routeTrips, setRouteTrips] = useState<Record<number, string>>({});
  const [routeQuantities, setRouteQuantities] = useState<Record<number, string>>({});
  const [routeTripDates, setRouteTripDates] = useState<Record<number, string>>({});

  // Vendor state for shuttle invoice
  const [isVendorCar, setIsVendorCar] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [vendorCost, setVendorCost] = useState<string>("");
  const [allVendors, setAllVendors] = useState<{ id: number; name: string }[]>([]);

  // Settle modal state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settlingInvoice, setSettlingInvoice] = useState<Invoice | null>(null);
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settlePaymentType, setSettlePaymentType] = useState<"PARTIAL" | "FINAL">("PARTIAL");
  const [settlePaymentMethod, setSettlePaymentMethod] = useState<string>("");
  const [settleNotes, setSettleNotes] = useState<string>("");
  const [settlePaymentDate, setSettlePaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSettling, setIsSettling] = useState(false);

  // View logs state
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [activeInvoiceLogs, setActiveInvoiceLogs] = useState<any>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchInvoices = useCallback(async (page: number, companyId?: number) => {
    setIsLoading(true);
    try {
      const res = await apiClient.getAllInvoices({ page, ...(companyId ? { company_id: companyId } : {}) }) as any;
      const raw = res?.data ?? res;
      setInvoices(raw?.data ?? []);
      const meta = raw?.pagination ?? {};
      setPagination({ page: meta.page ?? page, pages: meta.pages ?? 1, total: meta.total ?? 0 });
    } catch (e) {
      console.error("Failed to fetch invoices", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async (companyId?: number) => {
    try {
      const res = await apiClient.getInvoiceStats(companyId) as any;
      const raw = res?.data ?? res;
      setStats({
        totalCollectable: raw?.totalCollectable ?? 0,
        totalCollected: raw?.totalCollected ?? 0,
        totalOverdue: raw?.totalOverdue ?? 0,
      });
    } catch (e) {
      console.error("Failed to fetch invoice stats", e);
    }
  }, []);

  useEffect(() => {
    fetchInvoices(currentPage, filterCompanyId);
  }, [currentPage, filterCompanyId, fetchInvoices]);

  useEffect(() => {
    fetchStats(filterCompanyId);
  }, [filterCompanyId, fetchStats]);

  // Load companies for shuttle invoice generation
  useEffect(() => {
    (async () => {
      try {
        const [compRes, vendRes] = await Promise.all([
          apiClient.getCompanies({ limit: 100 }),
          apiClient.getVendors({ limit: 100 })
        ]);
        const companyList = compRes.data.data;
        const vendorList = vendRes.data.data;
        setCompanies(companyList);
        setAllVendors(vendorList);
        if (companyList.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(String(companyList[0].id));
        }
        if (vendorList.length > 0 && !selectedVendorId) {
          setSelectedVendorId(String(vendorList[0].id));
        }
      } catch (e) {
        console.error("Failed to load companies/vendors for shuttle invoices", e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load shuttle contract routes when company changes
  useEffect(() => {
    if (!selectedCompanyId) return;
    (async () => {
      try {
        const res = await apiClient.getShuttleContract(Number(selectedCompanyId));
        const routes: ShuttleContractRoute[] = res?.data?.shuttle_contract_routes ?? [];
        setShuttleRoutes(routes);
        const initial: Record<number, string> = {};
        const initialQuantities: Record<number, string> = {};
        const initialDates: Record<number, string> = {};
        routes.forEach((r) => {
          initial[r.id] = r.billing_type === "PER_TRIP" ? "0" : "1";
          initialQuantities[r.id] = String(Number(r.quantity ?? 0));
          initialDates[r.id] = "";
        });
        setRouteTrips(initial);
        setRouteQuantities(initialQuantities);
        setRouteTripDates(initialDates);
      } catch {
        setShuttleRoutes([]);
        setRouteTrips({});
        setRouteQuantities({});
      }
    })();
  }, [selectedCompanyId]);

  const handleSendEmail = async (id: number, invoiceNumber: string) => {
    if (sendingEmailId) return;
    if (!confirm(`Send invoice #${invoiceNumber} via email?`)) return;

    setSendingEmailId(id);
    try {
      await apiClient.sendInvoiceEmail(id);
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
      await apiClient.downloadInvoicePdf(id, invoiceNumber);
    } catch (e) {
      console.error("Failed to download PDF", e);
      alert("Failed to download PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const viewPdf = async (id: number) => {
    if (viewingId) return;
    setViewingId(id);
    try {
      await apiClient.viewInvoicePdf(id);
    } catch (e) {
      console.error("Failed to view PDF", e);
      alert("Failed to view PDF");
    } finally {
      setViewingId(null);
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    if (!confirm(`Are you sure you want to change status to ${newStatus}?`)) return;
    try {
      await apiClient.updateInvoiceStatus(id, newStatus);
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: newStatus } : inv));
      fetchStats(filterCompanyId);
      alert("Status updated successfully");
    } catch (error: any) {
      console.error("Failed to update status:", error);
      alert("Failed to update status: " + error);
    }
  };

  const isInvoicesLoading = isLoading;
  const totalPages = pagination.pages;

  const formatPeriodDate = (value: string) => {
    const hasTimeComponent = value.includes("T");
    const dt = hasTimeComponent ? new Date(value) : new Date(`${value}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatInvoicePeriod = (invoice: Invoice) => {
    if (invoice.period_start && invoice.period_end) {
      const start = formatPeriodDate(invoice.period_start);
      const end = formatPeriodDate(invoice.period_end);
      return start === end ? start : `${start} to ${end}`;
    }

    const raw = invoice.billing_month ?? "";

    // Backward-compatible parsing for legacy weekly key format: "4/2026 W0401-0407"
    const weeklyMatch = raw.match(/^(\d{1,2})\/(\d{4})\s+W(\d{4})-(\d{4})$/);
    if (weeklyMatch) {
      const year = Number(weeklyMatch[2]);
      const startMonth = Number(weeklyMatch[3].slice(0, 2));
      const startDay = Number(weeklyMatch[3].slice(2, 4));
      const endMonth = Number(weeklyMatch[4].slice(0, 2));
      const endDay = Number(weeklyMatch[4].slice(2, 4));

      const start = new Date(year, startMonth - 1, startDay);
      const end = new Date(year, endMonth - 1, endDay);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const startText = start.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const endText = end.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        return `${startText} to ${endText}`;
      }
    }

    const monthlyMatch = raw.match(/^(\d{1,2})\/(\d{4})$/);
    if (monthlyMatch) {
      const month = Number(monthlyMatch[1]);
      const year = Number(monthlyMatch[2]);
      const dt = new Date(year, month - 1, 1);
      if (!Number.isNaN(dt.getTime())) {
        return dt.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
      }
    }

    return raw;
  };

  const getInvoicePeriodType = (invoice: Invoice): "WEEKLY" | "MONTHLY" => {
    if (invoice.billing_period === "WEEKLY" || invoice.billing_period === "MONTHLY") {
      return invoice.billing_period;
    }

    const raw = invoice.billing_month ?? "";
    return /\s+W\d{4}-\d{4}$/.test(raw) ? "WEEKLY" : "MONTHLY";
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleGenerateShuttleInvoice = async () => {
    if (!selectedCompanyId) {
      alert("Please select a company.");
      return;
    }

    let billingMonth: string | undefined;

    if (billingPeriod === "MONTHLY") {
      if (!billingMonthRaw) {
        alert("Please select a billing month.");
        return;
      }

      const [year, month] = billingMonthRaw.split("-");
      if (!year || !month) {
        alert("Invalid billing month.");
        return;
      }
      billingMonth = `${Number(month)}/${year}`;
    } else {
      if (!weeklyStartDate || !weeklyEndDate) {
        alert("Please select weekly start and end dates.");
        return;
      }

      const start = new Date(weeklyStartDate);
      const end = new Date(weeklyEndDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        alert("Invalid weekly date range.");
        return;
      }
      if (start > end) {
        alert("Weekly start date cannot be after end date.");
        return;
      }
    }

    setIsGeneratingShuttle(true);
    try {
      const contractRes = await apiClient.getShuttleContract(Number(selectedCompanyId));
      const contract = contractRes.data;
      if (!contract) {
        alert("No shuttle contract found for the selected company.");
        return;
      }

      await apiClient.generateShuttleInvoice(contract.id, {
        billingMonth,
        continuedVehicles: continuedVehicles !== "" ? Number(continuedVehicles) : undefined,
        amountMode,
        amountDelta: amountMode !== "EXACT" && amountDelta !== "" ? Number(amountDelta) : undefined,
        billingPeriod,
        weeklyStartDate: billingPeriod === "WEEKLY" ? weeklyStartDate : undefined,
        weeklyEndDate: billingPeriod === "WEEKLY" ? weeklyEndDate : undefined,
        routeTrips: shuttleRoutes.length > 0
          ? shuttleRoutes.map((r) => ({
              routeId: r.id,
              tripsCount: r.billing_type === "PER_TRIP" ? Number(routeTrips[r.id] ?? 0) : 0,
              quantity: Number(routeQuantities[r.id] ?? r.quantity ?? 0),
              tripDate: r.billing_type === "PER_TRIP" ? (routeTripDates[r.id] || undefined) : undefined,
            }))
          : undefined,
        discountType: shuttleDiscountType !== "NONE" ? shuttleDiscountType : undefined,
        discountValue: shuttleDiscountType !== "NONE" && shuttleDiscountValue !== "" ? Number(shuttleDiscountValue) : undefined,
        vendorId: isVendorCar ? Number(selectedVendorId) : undefined,
        vendorCost: isVendorCar && vendorCost !== "" ? Number(vendorCost) : undefined,
      });

      // Refresh invoices and stats
      fetchInvoices(currentPage, filterCompanyId);
      fetchStats(filterCompanyId);

      alert("Shuttle invoice generated successfully.");
      setShowShuttleModal(false);
      setBillingMonthRaw("");
      setBillingPeriod("MONTHLY");
      setWeeklyStartDate("");
      setWeeklyEndDate("");
      setContinuedVehicles("");
      setAmountMode("EXACT");
      setAmountDelta("");
      setShuttleDiscountType("NONE");
      setShuttleDiscountValue("");
      setIsVendorCar(false);
      setVendorCost("");

      const resetTrips: Record<number, string> = {};
      const resetQuantities: Record<number, string> = {};
      shuttleRoutes.forEach((r) => {
        resetTrips[r.id] = r.billing_type === "PER_TRIP" ? "0" : "1";
        resetQuantities[r.id] = String(Number(r.quantity ?? 0));
      });
      setRouteTrips(resetTrips);
      setRouteQuantities(resetQuantities);
    } catch (e: any) {
      console.error("Failed to generate shuttle invoice", e);
      alert(`Failed to generate shuttle invoice: ${e?.message || e}`);
    } finally {
      setIsGeneratingShuttle(false);
    }
  };

  const openSettleModal = (inv: Invoice) => {
    setSettlingInvoice(inv);
    setSettleAmount("");
    setSettlePaymentType("PARTIAL");
    setSettlePaymentMethod("");
    setSettleNotes("");
    setSettlePaymentDate(new Date().toISOString().split('T')[0]);
    setShowSettleModal(true);
  };

  const handleSettleInvoice = async () => {
    if (!settlingInvoice) return;
    const amount = Number(settleAmount);
    if (!settleAmount || isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    setIsSettling(true);
    try {
      await apiClient.settleShuttleInvoice(settlingInvoice.id, {
        amount,
        paymentType: settlePaymentType,
        paymentMethod: settlePaymentMethod || undefined,
        notes: settleNotes || undefined,
        paymentDate: settlePaymentDate || undefined,
      });
      fetchInvoices(currentPage, filterCompanyId);
      fetchStats(filterCompanyId);
      alert(`Payment of PKR ${amount.toLocaleString()} recorded successfully.`);
      setShowSettleModal(false);
      setSettlingInvoice(null);
    } catch (e: any) {
      alert(`Failed to record payment: ${e?.message || e}`);
    } finally {
      setIsSettling(false);
    }
  };

  const openLogsModal = async (inv: Invoice) => {
    setIsLoadingLogs(true);
    setShowLogsModal(true);
    try {
      const res = await apiClient.getShuttleInvoicePayments(inv.id);
      setActiveInvoiceLogs(res.data);
    } catch (e) {
      console.error("Failed to fetch logs", e);
      alert("Failed to fetch payment logs");
      setShowLogsModal(false);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleDeleteInvoice = async (id: number, invoiceNumber: string) => {
    setDeletingInvoiceId(id);
    try {
      await apiClient.deleteInvoice(id);
      setInvoices(prev => prev.filter(inv => inv.id !== id));
      fetchStats(filterCompanyId);
      alert("Invoice deleted successfully.");
    } catch (e: any) {
      alert(`Failed to delete invoice: ${e?.message || e}`);
    } finally {
      setDeletingInvoiceId(null);
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
          type="button"
          onClick={() => setShowShuttleModal(true)}
          disabled={!canUpdate}
          className="inline-flex items-center justify-center rounded-lg bg-[#f47f00] px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-[#d97000] transition-all disabled:opacity-50 disabled:pointer-events-none"
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
        {/* Filter Bar */}
        <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide whitespace-nowrap">
            Filter by Company
          </label>
          <select
            value={filterCompanyId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setFilterCompanyId(val ? Number(val) : undefined);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm text-navy shadow-sm focus:outline-none focus:ring-2 focus:ring-[#f47f00]/40 min-w-[180px]"
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {filterCompanyId && (
            <button
              onClick={() => { setFilterCompanyId(undefined); setCurrentPage(1); }}
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
              {isInvoicesLoading && invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-navy">{inv.invoice_number}</div>
                      <div className="text-xs text-slate-400">ID #{inv.id}</div>
                    </td>
                    <td className="px-4 py-3 text-navy">{inv.companies?.name || "Unknown"}</td>
                    <td className="px-4 py-3 text-navy">
                      <div>{formatInvoicePeriod(inv)}</div>
                      <div className="text-xs text-slate-500">({getInvoicePeriodType(inv).toLowerCase()})</div>
                    </td>
                    <td className="px-4 py-3 text-navy">
                      {new Date(inv.generated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-navy">
                      PKR {Number(inv.total_amount).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      {inv.amount_paid != null && Number(inv.amount_paid) > 0
                        ? `PKR ${Number(inv.amount_paid).toLocaleString()}`
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {inv.status === 'PAID'
                        ? <span className="text-green-600">Fully Paid</span>
                        : `PKR ${Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid ?? 0)).toLocaleString()}`}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={inv.status || 'DRAFT'}
                        onChange={(e) => handleStatusUpdate(inv.id, e.target.value)}
                        disabled={!canUpdate}
                        className={`rounded px-2 py-1 text-xs font-medium border border-border disabled:opacity-50 disabled:cursor-not-allowed ${inv.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          inv.status === 'UNPAID' ? 'bg-red-100 text-red-700' :
                          inv.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
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
                          onClick={() => viewPdf(inv.id)}
                          disabled={viewingId === inv.id}
                          className="text-zinc-600 hover:text-zinc-800 font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                          title="View Invoice"
                        >
                          {viewingId === inv.id ? (
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
                          type="button"
                          onClick={() => handleSendEmail(inv.id, inv.invoice_number)}
                          disabled={sendingEmailId === inv.id || !canUpdate}
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
                        <button
                          type="button"
                          onClick={() => handleDeleteInvoice(inv.id, inv.invoice_number)}
                          disabled={deletingInvoiceId === inv.id || !canDelete}
                          className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                          title="Delete Invoice"
                        >
                          {deletingInvoiceId === inv.id ? "..." : "Delete"}
                        </button>
                        {/* Settle button — only for shuttle invoices not yet fully paid */}
                        {inv.shuttle_contract_id && inv.status !== 'PAID' && inv.status !== 'CANCELLED' && canUpdate && (
                          <button
                            type="button"
                            onClick={() => openSettleModal(inv)}
                            className="text-green-700 hover:text-green-900 font-semibold text-xs border border-green-300 rounded px-2 py-1 hover:bg-green-50"
                            title="Record Payment"
                          >
                            Settle
                          </button>
                        )}
                        {inv.shuttle_contract_id && (
                          <button
                            type="button"
                            onClick={() => openLogsModal(inv)}
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
        size="xl"
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



          {/* Route-level invoice overrides (quantity for both billing types) */}
          {shuttleRoutes.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                Route Inputs For This Invoice
              </label>
              <p className="text-xs text-slate-500">
                Set quantity for each route (monthly and per-trip). For per-trip routes, also set trips. Any route with Quantity = 0 is excluded.
              </p>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {shuttleRoutes.map((route) => (
                  <div key={route.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{route.particulars}</div>
                      <div className="text-xs text-slate-400">
                        {route.vehicle_type} | Contract Qty: {route.quantity} | {route.billing_type === "PER_TRIP" ? "Per Trip" : "Monthly"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-500">Qty:</span>
                      <input
                        type="number"
                        min={0}
                        value={routeQuantities[route.id] ?? String(Number(route.quantity ?? 0))}
                        onChange={(e) =>
                          setRouteQuantities((prev) => ({ ...prev, [route.id]: e.target.value }))
                        }
                        className="w-16 h-8 rounded border border-slate-200 px-2 text-sm text-center outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                      />
                      {route.billing_type === "PER_TRIP" && (
                        <>
                          <span className="text-xs text-slate-500">Trips:</span>
                          <input
                            type="number"
                            min={0}
                            value={routeTrips[route.id] ?? "0"}
                            onChange={(e) =>
                              setRouteTrips((prev) => ({ ...prev, [route.id]: e.target.value }))
                            }
                            className="w-16 h-8 rounded border border-slate-200 px-2 text-sm text-center outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                          />
                          <span className="text-xs text-slate-500">Date:</span>
                          <input
                            type="date"
                            value={routeTripDates[route.id] ?? ""}
                            onChange={(e) =>
                              setRouteTripDates((prev) => ({ ...prev, [route.id]: e.target.value }))
                            }
                            className="h-8 rounded border border-slate-200 px-2 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
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
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Billing Period
            </label>
            <select
              value={billingPeriod}
              onChange={(e) => setBillingPeriod(e.target.value as "MONTHLY" | "WEEKLY")}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-white"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </div>

          {billingPeriod === "MONTHLY" ? (
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
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Week Start Date
                </label>
                <input
                  type="date"
                  value={weeklyStartDate}
                  onChange={(e) => setWeeklyStartDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Week End Date
                </label>
                <input
                  type="date"
                  value={weeklyEndDate}
                  onChange={(e) => setWeeklyEndDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Continued Vehicles (Optional)
            </label>
            <input
              type="number"
              min={0}
              value={continuedVehicles}
              onChange={(e) => setContinuedVehicles(e.target.value)}
              placeholder="e.g. 8"
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Amount Vs Contract
            </label>
            <select
              value={amountMode}
              onChange={(e) => setAmountMode(e.target.value as "EXACT" | "LESS" | "MORE")}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-white"
            >
              <option value="EXACT">Exact as contract</option>
              <option value="LESS">Less than contract</option>
              <option value="MORE">More than contract</option>
            </select>
          </div>

          {amountMode !== "EXACT" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amount Difference (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={amountDelta}
                onChange={(e) => setAmountDelta(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Invoice Discount (Optional)
            </label>
            <select
              value={shuttleDiscountType}
              onChange={(e) => { setShuttleDiscountType(e.target.value as any); setShuttleDiscountValue(""); }}
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-white"
            >
              <option value="NONE">No Discount</option>
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FLAT">Flat Amount (PKR)</option>
            </select>
          </div>

          {shuttleDiscountType !== "NONE" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {shuttleDiscountType === "PERCENTAGE" ? "Discount %" : "Discount Amount (PKR)"}
              </label>
              <input
                type="number"
                min={0}
                value={shuttleDiscountValue}
                onChange={(e) => setShuttleDiscountValue(e.target.value)}
                placeholder={shuttleDiscountType === "PERCENTAGE" ? "e.g. 10" : "e.g. 5000"}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>
          )}

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                id="isVendorCar"
                checked={isVendorCar}
                onChange={(e) => setIsVendorCar(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-[#f47f00] focus:ring-[#f47f00]"
              />
              <label htmlFor="isVendorCar" className="text-sm font-semibold text-slate-700 cursor-pointer">
                Vehicle is from a Vendor (External)
              </label>
            </div>

            {isVendorCar && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Vendor
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-white"
                  >
                    {allVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Vendor Cost (Internal)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={vendorCost}
                    onChange={(e) => setVendorCost(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
                  />
                </div>
              </div>
            )}
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
              type="button"
              onClick={handleGenerateShuttleInvoice}
              disabled={isGeneratingShuttle || !canUpdate}
              className="inline-flex items-center justify-center rounded-lg bg-[#0c225e] px-5 py-2 text-sm font-bold text-white hover:bg-[#0a1a4a] disabled:opacity-70"
            >
              {isGeneratingShuttle ? "Generating..." : "Generate Invoice"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Settle Shuttle Invoice Modal */}
      <Modal
        isOpen={showSettleModal}
        onClose={() => {
          if (!isSettling) {
            setShowSettleModal(false);
            setSettlingInvoice(null);
          }
        }}
        title="Record Payment"
      >
        {settlingInvoice && (
          <div className="space-y-4">
            {/* Compute effective remaining: total - paid (handles stale amount_remaining = 0 on older invoices) */}
            {/* We use a destructured const via a wrapper so we can share the value below */}
            {(({ total, paid, remaining }: { total: number; paid: number; remaining: number }) => (
              <>
            {/* Summary */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice</span>
                <span className="font-semibold text-navy">{settlingInvoice.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount</span>
                <span className="font-semibold">PKR {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Already Paid</span>
                <span className="font-semibold text-green-700">PKR {paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining</span>
                <span className="font-semibold text-red-600">PKR {remaining.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Amount Received (PKR)
              </label>
              <input
                type="number"
                min={0.01}
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder={`Max: PKR ${remaining.toLocaleString()}`}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payment Type
              </label>
              <div className="flex gap-2">
                {(["PARTIAL", "FINAL"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setSettlePaymentType(type);
                      if (type === "FINAL") setSettleAmount(String(remaining));
                    }}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${
                      settlePaymentType === type
                        ? "bg-[#0c225e] text-white border-[#0c225e]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-[#0c225e]"
                    }`}
                  >
                    {type === "PARTIAL" ? "Partial" : "Full / Final"}
                  </button>
                ))}
              </div>
            </div>
              </>
            ))({
              total: Number(settlingInvoice.total_amount),
              paid: Number(settlingInvoice.amount_paid ?? 0),
              remaining: Math.max(0, Number(settlingInvoice.total_amount) - Number(settlingInvoice.amount_paid ?? 0)),
            })}

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payment Date
              </label>
              <input
                type="date"
                value={settlePaymentDate}
                onChange={(e) => setSettlePaymentDate(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Payment Method (Optional)
              </label>
              <select
                value={settlePaymentMethod}
                onChange={(e) => setSettlePaymentMethod(e.target.value)}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] bg-white"
              >
                <option value="">Select method...</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Online Transfer">Online Transfer</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={settleNotes}
                onChange={(e) => setSettleNotes(e.target.value)}
                placeholder="e.g. Cheque #12345"
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00]"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => !isSettling && setShowSettleModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
                disabled={isSettling}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettleInvoice}
                disabled={isSettling || !settleAmount}
                className="inline-flex items-center justify-center rounded-lg bg-green-700 px-5 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-70"
              >
                {isSettling ? "Recording..." : "Record Payment"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment Logs Modal */}
      <Modal
        isOpen={showLogsModal}
        onClose={() => {
          setShowLogsModal(false);
          setActiveInvoiceLogs(null);
        }}
        title={`Payment History: ${activeInvoiceLogs?.invoice_number || ""}`}
        size="lg"
      >
        <div className="space-y-4">
          {isLoadingLogs ? (
            <div className="py-10 text-center text-slate-500">Loading history...</div>
          ) : activeInvoiceLogs?.shuttle_invoice_payments?.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Amount</th>
                    <th className="px-4 py-2">Method</th>
                    <th className="px-4 py-2">Notes</th>
                    <th className="px-4 py-2">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeInvoiceLogs.shuttle_invoice_payments.map((p: any) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(p.payment_date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-navy">
                        PKR {Number(p.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.payment_method || "—"}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{p.notes || "—"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.users?.full_name || "System"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-slate-500">No payment records found.</div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setShowLogsModal(false)}
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
