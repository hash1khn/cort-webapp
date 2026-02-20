"use client";

import { memo } from "react";
import { PaymentSummary } from "../../../../lib/services/api-client";
import { cx } from "../../../components/ui/cx";

export const PaymentSummaryCard = memo(function PaymentSummaryCard({ summary }: { summary: PaymentSummary | null }) {
    if (!summary) return null;

    const invoiceAmount = parseFloat(summary.invoice_amount);
    const totalPaid = parseFloat(summary.total_paid);
    const remaining = parseFloat(summary.amount_remaining);

    const percentPaid = invoiceAmount > 0 ? (totalPaid / invoiceAmount) * 100 : 0;

    return (
        <div className="bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                    Payment Status
                </h4>
                <span className={cx(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    summary.payment_status === 'FULLY_PAID' ? "bg-green-600/10 text-green-700" :
                        summary.payment_status === 'PARTIALLY_PAID' ? "bg-yellow/10 text-yellow" :
                            "bg-red-500/10 text-red-600"
                )}>
                    {summary.payment_status.replace(/_/g, " ")}
                </span>
            </div>

            <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm">
                    <span className="text-muted">Invoice Total:</span>
                    <span className="font-bold text-ink">PKR {invoiceAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-muted">Amount Paid:</span>
                    <span className="font-semibold text-green-600">PKR {totalPaid.toLocaleString()}</span>
                </div>
                <div className="h-px bg-border my-2"></div>
                <div className="flex justify-between text-sm">
                    <span className="font-semibold text-ink">Balance Due:</span>
                    <span className="font-bold text-lg text-orange">
                        PKR {remaining.toLocaleString()}
                    </span>
                </div>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(percentPaid, 100)}%` }}
                />
            </div>
            <div className="text-right text-[10px] text-muted mt-1">
                {percentPaid.toFixed(1)}% paid
            </div>
        </div>
    );
});
