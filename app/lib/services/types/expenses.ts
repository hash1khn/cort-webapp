export enum ExpenseCategory {
    MARKETING = 'MARKETING',
    INTEREST = 'INTEREST',
    RENT = 'RENT',
    LOGISTICS = 'LOGISTICS',
    OFFICE_ACCESSORIES = 'OFFICE_ACCESSORIES',
    TRAVELLING = 'TRAVELLING',
    BANK_CHARGES = 'BANK_CHARGES',
    ENTERTAINMENT = 'ENTERTAINMENT',
    SUBSCRIPTION = 'SUBSCRIPTION',
    MISC = 'MISC',
    TOLL = 'TOLL',
    PARKING = 'PARKING',
}

/** Categories that can optionally be tagged to a booking, feeding that booking's invoice + Chauffeur COGS. */
export const BOOKING_TAGGABLE_CATEGORIES = [ExpenseCategory.TOLL, ExpenseCategory.PARKING];

export interface Expense {
    id: number;
    category: ExpenseCategory;
    amount: number;
    date: string;
    description: string | null;
    payment_status: string | null;
    paid_at: string | null;
    created_at: string;
    updated_at: string;
    booking_id: number | null;
}

export interface CreateExpenseRequest {
    category: ExpenseCategory;
    amount: number;
    date: string;
    description?: string;
    booking_id?: number;
}

export interface ExpenseFilterParams {
    startDate?: string;
    endDate?: string;
    category?: ExpenseCategory;
    page?: number;
    limit?: number;
}

export interface ExpensesListResult {
    data: Expense[];
    pagination: {
        page: number;
        pages: number;
        total: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    totalAmount: number;
}
