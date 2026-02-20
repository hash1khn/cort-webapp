import React, { useState } from 'react';
import { useAppDispatch } from '../../lib/store/hooks';
import { fetchDashboardStats } from '../../lib/store/slices/dashboardSlice';
import { apiClient } from '../../lib/services/api-client';
import { CreditCard, Loader2 } from 'lucide-react';

interface EditBudgetFormProps {
    companyId: string;
    currentBudget: number;
    onSuccess: () => void;
    onCancel: () => void;
}

export default function EditBudgetForm({ companyId, currentBudget, onSuccess, onCancel }: EditBudgetFormProps) {
    const dispatch = useAppDispatch();
    const [budget, setBudget] = useState<string>(currentBudget.toString());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const newBudget = parseInt(budget.replace(/,/g, ''), 10);

        if (isNaN(newBudget) || newBudget < 0) {
            setError("Please enter a valid positive number.");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.updateCompany(companyId, { monthly_budget: newBudget });
            // Refresh dashboard data to reflect the new budget
            await dispatch(fetchDashboardStats(companyId)).unwrap();
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Failed to update company budget.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
                <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm border border-rose-100 flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-rose-500 mt-2 shrink-0" />
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monthly Budget (PKR)
                </label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <CreditCard className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        required
                        min="0"
                        value={budget}
                        onChange={(e) => {
                            // Only allow numbers
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setBudget(val);
                        }}
                        className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow transition-colors"
                        placeholder="e.g. 1500000"
                    />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                    Set a monthly limit to track your spending effectively.
                </p>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isSubmitting || !budget}
                    className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-medium transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        'Save Budget'
                    )}
                </button>
            </div>
        </form>
    );
}
