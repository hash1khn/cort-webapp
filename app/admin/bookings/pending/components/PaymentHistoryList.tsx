"use client";

import { memo } from "react";
import { PaymentTransaction } from "../../../../lib/services/api-client";

export const PaymentHistoryList = memo(function PaymentHistoryList({ payments }: { payments: PaymentTransaction[] }) {
    if (!payments || payments.length === 0) {
        return (
            <div className="text-center py-6 text-sm text-muted">
                No payments recorded yet
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Payment History ({payments.length})
            </h4>
            <div className="max-h-64 overflow-y-auto space-y-2">
                {payments.map((payment) => (
                    <div
                        key={payment.id}
                        className="flex items-center justify-between bg-surface/30 p-3 rounded-md border border-border"
                    >
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-ink">
                                    PKR {parseFloat(payment.amount).toLocaleString()}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue/10 text-blue font-medium">
                                    {payment.payment_method || "N/A"}
                                </span>
                            </div>
                            <div className="text-[11px] text-muted mt-0.5">
                                {new Date(payment.payment_date).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                })}
                                {payment.users_received_by && (
                                    <span> • By: {payment.users_received_by.full_name}</span>
                                )}
                            </div>
                            {payment.notes && (
                                <div className="text-xs text-muted italic mt-1">
                                    {payment.notes}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
