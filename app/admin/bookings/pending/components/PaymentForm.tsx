"use client";

import { useState, memo } from "react";
import { apiClient } from "../../../../lib/services/api-client";

export const PaymentForm = memo(function PaymentForm({ bookingId, onSuccess }: { bookingId: number; onSuccess: () => void }) {
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("CASH");
    const [notes, setNotes] = useState("");
    const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!amount || parseFloat(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.addPayment(bookingId, {
                amount: parseFloat(amount),
                payment_type: "PARTIAL",
                payment_method: paymentMethod,
                notes: notes || undefined,
                payment_date: paymentDate || undefined,
            });

            alert("Payment recorded successfully!");
            setAmount("");
            setNotes("");
            onSuccess();
        } catch (error: any) {
            alert("Failed to record payment: " + error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-blue/5 border border-blue/20 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Record Payment
            </h4>
            <div className="space-y-3">
                <div>
                    <label className="text-xs font-medium text-ink block mb-1">
                        Amount (PKR) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-blue/40"
                        placeholder="Enter amount"
                        required
                    />
                </div>

                <div>
                    <label className="text-xs font-medium text-ink block mb-1">
                        Payment Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-blue/40"
                        required
                    />
                </div>

                <div>
                    <label className="text-xs font-medium text-ink block mb-1">
                        Payment Method
                    </label>
                    <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full h-10 px-3 rounded-md border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CARD">Card</option>
                        <option value="CHEQUE">Cheque</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-medium text-ink block mb-1">
                        Notes (Optional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-white text-sm outline-none focus:ring-2 focus:ring-blue/40"
                        rows={2}
                        placeholder="Add notes about this payment..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 rounded-md bg-blue px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                    {isSubmitting ? "Recording..." : "Record Payment"}
                </button>
            </div>
        </form>
    );
});
