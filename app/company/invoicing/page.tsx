"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, Invoice } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";
import { Card } from "../components/DashboardComponents";
import { PageHeader, TABLE_CARD_CLASS, TABLE_TOP_BAR_CLASS, TABLE_HEADER_CELL_CLASS, TABLE_CELL_CLASS, TABLE_PAGINATION_WRAPPER_CLASS } from "../components/PageLayout";
import TableSkeleton from "@/app/components/ui/TableSkeleton";
import Pagination from "@/app/components/ui/Pagination";

interface PaginationMeta {
    page: number;
    pages: number;
    total: number;
}

export default function CompanyInvoicingPage() {
    const { user } = useAuth();

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0 });
    const [isLoading, setIsLoading] = useState(false);
    const [errorState, setErrorState] = useState<string | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [viewingId, setViewingId] = useState<number | null>(null);
    const [page, setPage] = useState(1);

    const fetchInvoices = useCallback(async (p: number) => {
        if (!user?.company_id) return;
        setIsLoading(true);
        try {
            const res = await apiClient.getCompanyInvoices(user.company_id, { page: p, limit: 10 }) as any;
            const raw = res?.data ?? res;
            setInvoices(raw?.data ?? raw ?? []);
            const meta = raw?.pagination ?? {};
            setPagination({ page: meta.page ?? p, pages: meta.pages ?? 1, total: meta.total ?? 0 });
        } catch (e: any) {
            setErrorState(e?.message ?? "Failed to load invoices");
        } finally {
            setIsLoading(false);
        }
    }, [user?.company_id]);

    useEffect(() => {
        fetchInvoices(page);
    }, [page, fetchInvoices]);

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

    // Loading skeleton is now handled inside the table to preserve headers
    /* if (isLoading) {
        return <TablePageSkeleton />;
    } */

    if (errorState) {
        return <div className="p-12 text-center text-rose-500 bg-rose-50 rounded-2xl m-6 border border-rose-200">{errorState}</div>;
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
            <PageHeader
                label="Financials"
                title="Data & Billing"
                description="Track your monthly service usage, view generated invoices, and manage payment settlements."
            />

            <Card className={`min-h-[500px] ${TABLE_CARD_CLASS}`}>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead className="bg-[var(--surface-subtle)]/50">
                            <tr className="border-b border-[var(--border-light)]">
                                <th className={TABLE_HEADER_CELL_CLASS}>Invoice #</th>
                                <th className={TABLE_HEADER_CELL_CLASS}>Billing Month</th>
                                <th className={TABLE_HEADER_CELL_CLASS}>Generated At</th>
                                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Total Amount</th>
                                <th className={TABLE_HEADER_CELL_CLASS}>Status</th>
                                <th className={`${TABLE_HEADER_CELL_CLASS} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-light)]/50">
                            {isLoading && invoices.length === 0 ? (
                                <TableSkeleton columns={6} rows={8} />
                            ) : invoices.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center align-top">
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
                                        <td className={`${TABLE_CELL_CLASS} font-bold text-[var(--cort-navy)] font-mono`}>#{inv.invoice_number}</td>
                                        <td className={`${TABLE_CELL_CLASS} font-medium text-[var(--cort-navy)]`}>{inv.billing_month}</td>
                                        <td className={`${TABLE_CELL_CLASS} text-[var(--text-muted)]`}>
                                            {new Date(inv.generated_at).toLocaleDateString()}
                                        </td>
                                        <td className={`${TABLE_CELL_CLASS} text-right font-bold text-[var(--cort-navy)] text-base`}>
                                            <span className="text-[var(--text-muted)] text-xs font-normal mr-1">PKR</span>
                                            {Number(inv.total_amount).toLocaleString()}
                                        </td>
                                        <td className={TABLE_CELL_CLASS}>
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                inv.status === 'UNPAID' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    'bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border-light)]'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${inv.status === 'PAID' ? 'bg-emerald-400' :
                                                    inv.status === 'UNPAID' ? 'bg-rose-400' :
                                                        'bg-[var(--text-muted)]'
                                                    }`}></span>
                                                {inv.status || 'DRAFT'}
                                            </span>
                                        </td>
                                        <td className={`${TABLE_CELL_CLASS} text-right`}>
                                            <div className="flex items-center justify-end gap-4">
                                                <button
                                                    onClick={() => viewPdf(inv.id)}
                                                    disabled={viewingId === inv.id}
                                                    className="text-[var(--cort-navy)] hover:text-[var(--cort-navy)]/80 font-medium text-sm disabled:opacity-50 disabled:cursor-wait inline-flex items-center gap-1.5"
                                                >
                                                    {viewingId === inv.id ? (
                                                        <>
                                                            <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            Viewing...
                                                        </>
                                                    ) : 'View Invoice'}
                                                </button>
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
                                            </div>
                                        </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination?.pages > 1 && (
                    <div className={TABLE_PAGINATION_WRAPPER_CLASS}>
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.pages}
                            onPageChange={setPage}
                        />
                    </div>
                )}
            </Card>
        </div>
    );
}
