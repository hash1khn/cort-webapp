"use client";

import { useEffect, useState } from "react";
import { apiClient, Invoice } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { fetchInvoices, selectInvoices, selectInvoicesPagination, selectInvoicesStatus, selectInvoicesError } from "../../lib/store/slices/invoiceSlice";
import { Card } from "../components/DashboardComponents";
import TableSkeleton from "@/app/components/ui/TableSkeleton";
import Pagination from "@/app/components/ui/Pagination";

export default function CompanyInvoicingPage() {
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const invoices = useAppSelector(selectInvoices);
    const pagination = useAppSelector(selectInvoicesPagination);
    const status = useAppSelector(selectInvoicesStatus);
    const errorState = useAppSelector(selectInvoicesError);
    const isLoading = status === 'loading';

    // We can keep local error for download if needed, but fetch error is global
    const [downloadingId, setDownloadingId] = useState<number | null>(null);

    const [page, setPage] = useState(1);

    useEffect(() => {
        if (!user?.company_id) return;

        dispatch(fetchInvoices({ companyId: user.company_id, params: { page, limit: 10 } }));
    }, [dispatch, user?.company_id, page]);

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

    // Loading skeleton is now handled inside the table to preserve headers
    /* if (isLoading) {
        return <TablePageSkeleton />;
    } */

    if (errorState) {
        return <div className="p-12 text-center text-rose-500 bg-rose-50 rounded-2xl m-6 border border-rose-200">{errorState}</div>;
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
            <div>
                <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
                    <span className="text-xs font-medium uppercase tracking-wide">Financials</span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--cort-navy)]">
                    Data & Billing
                </h1>
                <p className="mt-2 text-[var(--text-muted)] max-w-2xl">
                    Track your monthly service usage, view generated invoices, and manage payment settlements.
                </p>
            </div>

            <Card className="min-h-[500px] overflow-hidden !p-0">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-[var(--surface-subtle)]/50">
                            <tr className="border-b border-[var(--border-light)]">
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Billing Month</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Generated At</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Total Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>

                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-light)]/50">
                            {isLoading && invoices.length === 0 ? (
                                <TableSkeleton columns={6} rows={8} />
                            ) : invoices.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
                                            <span className="bg-[var(--surface-subtle)] p-4 rounded-full mb-3">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </span>
                                            <span>No invoices found.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="group hover:bg-[var(--surface-subtle)]/80 transition-colors border-b border-transparent">
                                        <td className="px-6 py-4 font-bold text-[var(--cort-navy)] font-mono">#{inv.invoice_number}</td>
                                        <td className="px-6 py-4 font-medium text-[var(--cort-navy)]">{inv.billing_month}</td>
                                        <td className="px-6 py-4 text-[var(--text-muted)]">
                                            {new Date(inv.generated_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-[var(--cort-navy)] text-base">
                                            <span className="text-[var(--text-muted)] text-xs font-normal mr-1">PKR</span>
                                            {Number(inv.total_amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                inv.status === 'UNPAID' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    'bg-slate-50 text-slate-600 border-slate-200'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${inv.status === 'PAID' ? 'bg-emerald-400' :
                                                    inv.status === 'UNPAID' ? 'bg-rose-400' :
                                                        'bg-slate-400'
                                                    }`}></span>
                                                {inv.status || 'DRAFT'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => downloadPdf(inv.id, inv.invoice_number)}
                                                disabled={downloadingId === inv.id}
                                                className="text-[var(--cort-orange)] hover:text-[var(--cort-orange-hover)] font-medium text-sm disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
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
                {pagination?.totalPages > 1 && (
                    <div className="p-4 border-t border-[var(--border-light)] flex justify-center">
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>
        </div>
    );
}
