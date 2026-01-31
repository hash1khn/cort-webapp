"use client";

import { useEffect, useState } from "react";
import { apiClient, Invoice } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";

export default function CompanyInvoicingPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInvoices = async () => {
            if (!user?.company_id) return;

            setIsLoading(true);
            try {
                const response = await apiClient.getCompanyInvoices(user.company_id);
                if (response && response.data && Array.isArray(response.data)) {
                    setInvoices(response.data);
                } else if (Array.isArray(response)) {
                    setInvoices(response);
                } else {
                    setInvoices([]);
                }
            } catch (err: any) {
                console.error("Failed to fetch invoices:", err);
                setError("Failed to load invoices.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInvoices();
    }, [user?.company_id]);



    if (isLoading) {
        return <div className="p-8 text-center text-muted">Loading invoices...</div>;
    }

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-navy">
                    Data & Billing
                </h1>
                <p className="text-sm text-muted">
                    View and download your monthly service invoices
                </p>
            </div>

            <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-max text-left text-sm">
                        <thead className="bg-zinc-50 text-xs font-medium uppercase text-muted">
                            <tr>
                                <th className="px-4 py-3">Invoice #</th>
                                <th className="px-4 py-3">Billing Month</th>
                                <th className="px-4 py-3">Generated At</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Total Amount</th>
                                <th className="px-4 py-3 text-right">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                                        No invoices found.
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-zinc-50/50">
                                        <td className="px-4 py-3 font-medium text-navy">{inv.invoice_number}</td>
                                        <td className="px-4 py-3 text-navy">{inv.billing_month}</td>
                                        <td className="px-4 py-3 text-navy">
                                            {new Date(inv.generated_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${inv.status === 'PAID' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                inv.status === 'UNPAID' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                    'bg-gray-50 text-gray-600 ring-gray-500/10'
                                                }`}>
                                                {inv.status || 'DRAFT'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-navy">
                                            PKR {Number(inv.total_amount).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-navy">
                                            PKR {Number(inv.total_amount).toLocaleString()}
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
