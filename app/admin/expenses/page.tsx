"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
    fetchExpenses,
    createExpense,
    deleteExpense,
    markExpenseAsPaid,
    setFilters,
    setPage,
} from "../../lib/store/slices/expensesSlice";
import {
    Expense,
    ExpenseCategory,
    CreateExpenseRequest,
} from "../../lib/services/api-client";

export default function ExpensesPage() {
    const dispatch = useAppDispatch();
    const { items: expenses, isLoading, error, filters, pagination } = useAppSelector(
        (state) => state.expenses
    );

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStartDate, setFilterStartDate] = useState("");
    const [filterEndDate, setFilterEndDate] = useState("");
    const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "">("");

    useEffect(() => {
        const p: any = { page: 1, limit: 10 };
        if (filterStartDate) p.startDate = new Date(filterStartDate).toISOString();
        if (filterEndDate) p.endDate = new Date(filterEndDate).toISOString();
        if (filterCategory) p.category = filterCategory;

        dispatch(setFilters(p));
        dispatch(fetchExpenses(p));
    }, [dispatch, filterStartDate, filterEndDate, filterCategory]);

    const handlePageChange = (newPage: number) => {
        const p = { ...filters, page: newPage };
        dispatch(setFilters(p));
        dispatch(fetchExpenses(p));
    };

    const handleCreate = async (data: CreateExpenseRequest) => {
        await dispatch(createExpense(data)).unwrap();
        setIsModalOpen(false);
    };

    const handleDelete = async (id: number) => {
        if (confirm("Are you sure you want to delete this expense?")) {
            await dispatch(deleteExpense(id));
        }
    };

    const handleMarkAsPaid = async (id: number) => {
        if (confirm("Mark this expense as paid?")) {
            await dispatch(markExpenseAsPaid(id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">General Expenses</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90"
                >
                    Add Expense
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 shadow-sm">
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">Start Date</span>
                    <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none"
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">End Date</span>
                    <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none"
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">Category</span>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none"
                    >
                        <option value="">All Categories</option>
                        {Object.values(ExpenseCategory).map((cat) => (
                            <option key={cat} value={cat}>
                                {cat.replace(/_/g, " ")}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    onClick={() => {
                        setFilterStartDate("");
                        setFilterEndDate("");
                        setFilterCategory("");
                    }}
                    className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    Clear
                </button>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Category
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Paid At
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Amount
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {isLoading && (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-sm text-gray-500">
                                    Loading expenses...
                                </td>
                            </tr>
                        )}
                        {error && (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-sm text-red-500">
                                    {error}
                                </td>
                            </tr>
                        )}
                        {!isLoading && !expenses?.length && (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-sm text-gray-500">
                                    No expenses found.
                                </td>
                            </tr>
                        )}
                        {expenses?.map((expense: Expense) => (
                            <tr key={expense.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                    {format(new Date(expense.date), "MMM d, yyyy")}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold leading-5 text-blue-800">
                                        {expense.category.replace(/_/g, " ")}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {expense.description || "-"}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${expense.payment_status === "PAID"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-yellow-100 text-yellow-800"
                                        }`}>
                                        {expense.payment_status || "UNPAID"}
                                    </span>
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                                    {expense.paid_at ? format(new Date(expense.paid_at), "MMM d, HH:mm") : "-"}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                                    {Number(expense.amount).toLocaleString()}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                    {expense.payment_status !== "PAID" && (
                                        <button
                                            onClick={() => handleMarkAsPaid(expense.id)}
                                            className="text-navy hover:text-navy/80 font-semibold"
                                        >
                                            Mark as Paid
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(expense.id)}
                                        className="text-red-600 hover:text-red-900 ml-4"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination Controls */}
                {pagination && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={!pagination.hasPrev}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={!pagination.hasNext}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing page <span className="font-medium">{pagination.page}</span> of{" "}
                                    <span className="font-medium">{pagination.pages}</span> ({pagination.total} results)
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={!pagination.hasPrev}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={!pagination.hasNext}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Next</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <AddExpenseModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleCreate}
                />
            )}
        </div>
    );
}

function AddExpenseModal({
    isOpen,
    onClose,
    onSubmit,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateExpenseRequest) => Promise<void>;
}) {
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState<ExpenseCategory | "">("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [description, setDescription] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category || !date) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                amount: Number(amount),
                category: category as ExpenseCategory,
                date: new Date(date).toISOString(),
                description,
            });
        } catch (err: any) {
            alert("Failed to create expense: " + (err.message || "Unknown error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="mb-4 text-xl font-bold">Add New Expense</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Category <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={category}
                            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        >
                            <option value="">Select Category</option>
                            {Object.values(ExpenseCategory).map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Amount (SR) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
                        >
                            {isSubmitting ? "Saving..." : "Save Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
