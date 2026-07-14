"use client";

import { useEffect, useState, useCallback } from "react";
import { format, parse } from "date-fns";
import {
    ExpensesApi,
    Expense,
    ExpenseCategory,
    CreateExpenseRequest,
    UpdateExpenseRequest,
} from "../../lib/services/api-client";
import { PermissionGate } from "../components/PermissionGate";
import { AdminCan, useAdminAbility } from "../../lib/abilities/AdminAbilityProvider";
import { ADMIN_SUBJECTS } from "../../lib/abilities/admin-subjects";
import { adminStatCard } from "../components/ui/admin-styles";
import { BookingTagPicker, TaggedBooking } from "../components/BookingTagPicker";

function getCurrentMonthValue() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthDateRange(month: string) {
    const [year, monthNum] = month.split("-").map(Number);
    const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { startDate, endDate };
}

function getFilterPeriodLabel(month: string, startDate: string, endDate: string) {
    if (month) {
        return format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy");
    }
    if (startDate && endDate) {
        return `${format(new Date(startDate), "MMM d, yyyy")} – ${format(new Date(endDate), "MMM d, yyyy")}`;
    }
    if (startDate) {
        return `From ${format(new Date(startDate), "MMM d, yyyy")}`;
    }
    if (endDate) {
        return `Until ${format(new Date(endDate), "MMM d, yyyy")}`;
    }
    return "All time";
}

interface PaginationMeta {
    page: number;
    pages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export default function ExpensesPage() {
    return (
        <PermissionGate permission="expenses">
            <AdminCan I="read" a="Expenses">
                <ExpensesPageContent />
            </AdminCan>
        </PermissionGate>
    );
}

function ExpensesPageContent() {
    const ability = useAdminAbility();
    const canCreate = ability.can("create", ADMIN_SUBJECTS.expenses);
    const canUpdate = ability.can("update", ADMIN_SUBJECTS.expenses);
    const canDelete = ability.can("delete", ADMIN_SUBJECTS.expenses);

    const initialMonth = getCurrentMonthValue();
    const initialRange = getMonthDateRange(initialMonth);

    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [pagination, setPagination] = useState<PaginationMeta>({ page: 1, pages: 1, total: 0, hasNext: false, hasPrev: false });
    const [totalAmount, setTotalAmount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [filterMonth, setFilterMonth] = useState(initialMonth);
    const [filterStartDate, setFilterStartDate] = useState(initialRange.startDate);
    const [filterEndDate, setFilterEndDate] = useState(initialRange.endDate);
    const [filterCategory, setFilterCategory] = useState<ExpenseCategory | "">("");
    const [currentPage, setCurrentPage] = useState(1);

    const fetchExpenses = useCallback(async (page: number, startDate: string, endDate: string, category: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const params: any = { page, limit: 10 };
            if (startDate) params.startDate = new Date(startDate).toISOString();
            if (endDate) params.endDate = new Date(endDate).toISOString();
            if (category) params.category = category;
            const res = await ExpensesApi.getAll(params);
            const raw = res as any;
            setExpenses(raw?.data?.data ?? raw?.data ?? []);
            const meta = raw?.data?.pagination ?? raw?.pagination ?? {};
            setPagination({
                page: meta.page ?? page,
                pages: meta.pages ?? 1,
                total: meta.total ?? 0,
                hasNext: meta.hasNext ?? false,
                hasPrev: meta.hasPrev ?? false,
            });
            setTotalAmount(Number(raw?.data?.totalAmount ?? 0));
        } catch (e: any) {
            setError(e.message || "Failed to load expenses");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchExpenses(1, filterStartDate, filterEndDate, filterCategory);
        }, 400);
        return () => clearTimeout(timer);
    }, [filterStartDate, filterEndDate, filterCategory, fetchExpenses]);

    useEffect(() => {
        fetchExpenses(currentPage, filterStartDate, filterEndDate, filterCategory);
    }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

    const openCreateModal = () => {
        setModalMode("create");
        setEditingExpense(null);
        setIsModalOpen(true);
    };

    const openEditModal = (expense: Expense) => {
        setModalMode("edit");
        setEditingExpense(expense);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingExpense(null);
        setModalMode("create");
    };

    const handleCreate = async (data: CreateExpenseRequest) => {
        await ExpensesApi.create(data);
        closeModal();
        fetchExpenses(currentPage, filterStartDate, filterEndDate, filterCategory);
    };

    const handleUpdate = async (data: UpdateExpenseRequest) => {
        if (!editingExpense) return;
        await ExpensesApi.update(editingExpense.id, data);
        closeModal();
        fetchExpenses(currentPage, filterStartDate, filterEndDate, filterCategory);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this expense?")) return;
        await ExpensesApi.delete(id);
        fetchExpenses(currentPage, filterStartDate, filterEndDate, filterCategory);
    };

    const handleMarkAsPaid = async (id: number) => {
        if (!confirm("Mark this expense as paid?")) return;
        await ExpensesApi.markAsPaid(id);
        fetchExpenses(currentPage, filterStartDate, filterEndDate, filterCategory);
    };

    const handleMonthChange = (month: string) => {
        setFilterMonth(month);
        if (month) {
            const { startDate, endDate } = getMonthDateRange(month);
            setFilterStartDate(startDate);
            setFilterEndDate(endDate);
        } else {
            setFilterStartDate("");
            setFilterEndDate("");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">General Expenses</h1>
                <button
                    type="button"
                    onClick={openCreateModal}
                    disabled={!canCreate}
                    className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50 disabled:pointer-events-none"
                >
                    Add Expense
                </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className={adminStatCard}>
                    <div className="text-xs font-semibold text-[var(--text-muted)] uppercase">Total Expenses</div>
                    <div className="mt-2 text-2xl font-bold text-navy">
                        PKR {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {getFilterPeriodLabel(filterMonth, filterStartDate, filterEndDate)}
                        {pagination.total > 0 && ` · ${pagination.total} expense${pagination.total === 1 ? "" : "s"}`}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 shadow-sm">
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">Month</span>
                    <input
                        type="month"
                        value={filterMonth}
                        onChange={(e) => handleMonthChange(e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none"
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">Start Date</span>
                    <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => {
                            setFilterMonth("");
                            setFilterStartDate(e.target.value);
                        }}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none"
                    />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">End Date</span>
                    <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => {
                            setFilterMonth("");
                            setFilterEndDate(e.target.value);
                        }}
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
                        setFilterMonth("");
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
                                    {expense.booking_id && (
                                        <span
                                            className="ml-1.5 inline-flex rounded-full bg-purple-50 px-2 py-1 text-xs font-semibold leading-5 text-purple-800"
                                            title={`Tagged to booking #${expense.booking_id} — counted in Chauffeur COGS`}
                                        >
                                            #{expense.booking_id}
                                        </span>
                                    )}
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
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(expense)}
                                        disabled={!canUpdate}
                                        className="text-navy hover:text-navy/80 font-semibold disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                                    >
                                        Edit
                                    </button>
                                    {expense.payment_status !== "PAID" && (
                                        <button
                                            type="button"
                                            onClick={() => handleMarkAsPaid(expense.id)}
                                            disabled={!canUpdate}
                                            className="text-navy hover:text-navy/80 font-semibold ml-4 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                                        >
                                            Mark as Paid
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(expense.id)}
                                        disabled={!canDelete}
                                        className="text-red-600 hover:text-red-900 ml-4 disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
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
                                onClick={() => setCurrentPage(p => p - 1)}
                                disabled={!pagination.hasPrev}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => p + 1)}
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
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        disabled={!pagination.hasPrev}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => p + 1)}
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
                <ExpenseFormModal
                    mode={modalMode}
                    expense={editingExpense}
                    onClose={closeModal}
                    onCreate={handleCreate}
                    onUpdate={handleUpdate}
                    submitDisabled={modalMode === "create" ? !canCreate : !canUpdate}
                />
            )}
        </div>
    );
}

function ExpenseFormModal({
    mode,
    expense,
    onClose,
    onCreate,
    onUpdate,
    submitDisabled = false,
}: {
    mode: "create" | "edit";
    expense: Expense | null;
    onClose: () => void;
    onCreate: (data: CreateExpenseRequest) => Promise<void>;
    onUpdate: (data: UpdateExpenseRequest) => Promise<void>;
    submitDisabled?: boolean;
}) {
    const [amount, setAmount] = useState(
        expense ? String(expense.amount) : "",
    );
    const [category, setCategory] = useState<ExpenseCategory | "">(
        expense?.category ?? "",
    );
    const [date, setDate] = useState(
        expense
            ? new Date(expense.date).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0],
    );
    const [description, setDescription] = useState(expense?.description ?? "");
    const [taggedBooking, setTaggedBooking] = useState<TaggedBooking | null>(
        expense?.booking_id
            ? { id: expense.booking_id, label: `Booking #${expense.booking_id}` }
            : null,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !category || !date) return;

        setIsSubmitting(true);
        try {
            const payload = {
                amount: Number(amount),
                category: category as ExpenseCategory,
                date: new Date(date).toISOString(),
                description,
                booking_id: taggedBooking?.id ?? null,
            };
            if (mode === "edit") {
                await onUpdate(payload);
            } else {
                await onCreate(payload);
            }
        } catch (err: any) {
            alert(`Failed to ${mode === "edit" ? "update" : "create"} expense: ` + (err.message || "Unknown error"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                <h2 className="mb-4 text-xl font-bold">
                    {mode === "edit" ? "Edit Expense" : "Add New Expense"}
                </h2>
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
                        <label
                            className="mb-1 block text-sm font-medium text-gray-700"
                            title="If this expense was for a specific ride, tag it here — the actual cost counts toward that booking's Chauffeur COGS. Customer billing is unchanged. Leave blank for a general expense."
                        >
                            Tag to a booking (optional)
                        </label>
                        <BookingTagPicker value={taggedBooking} onChange={setTaggedBooking} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Amount (PKR) <span className="text-red-500">*</span>
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
                            disabled={isSubmitting || submitDisabled}
                            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy/90 disabled:opacity-50"
                        >
                            {isSubmitting
                                ? "Saving..."
                                : mode === "edit"
                                    ? "Save Changes"
                                    : "Save Expense"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
