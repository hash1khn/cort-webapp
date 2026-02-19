import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ExpensesApi, Expense, CreateExpenseRequest, ExpenseFilterParams } from '../../services/api-client';

interface ExpensesState {
    items: Expense[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
    isLoading: boolean;
    error: string | null;
    filters: ExpenseFilterParams;
}

const initialState: ExpensesState = {
    items: [],
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1,
        hasNext: false,
        hasPrev: false,
    },
    isLoading: false,
    error: null,
    filters: {
        page: 1,
        limit: 10,
    },
};

export const fetchExpenses = createAsyncThunk(
    'expenses/fetchExpenses',
    async (params: ExpenseFilterParams | undefined, { rejectWithValue }) => {
        try {
            const response = await ExpensesApi.getAll(params);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createExpense = createAsyncThunk(
    'expenses/createExpense',
    async (data: CreateExpenseRequest, { rejectWithValue, dispatch, getState }) => {
        try {
            const response = await ExpensesApi.create(data);
            // Re-fetch expenses after creation to keep list updated with current filters
            const state = getState() as any; // Quick cast or use RootState if circular dependency allows
            dispatch(fetchExpenses(state.expenses.filters));
            return response;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deleteExpense = createAsyncThunk(
    'expenses/deleteExpense',
    async (id: number, { rejectWithValue, dispatch, getState }) => {
        try {
            await ExpensesApi.delete(id);
            // Re-fetch
            const state = getState() as any;
            dispatch(fetchExpenses(state.expenses.filters));
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const markExpenseAsPaid = createAsyncThunk(
    'expenses/markExpenseAsPaid',
    async (id: number, { rejectWithValue, dispatch, getState }) => {
        try {
            await ExpensesApi.markAsPaid(id);
            // Re-fetch
            const state = getState() as any;
            dispatch(fetchExpenses(state.expenses.filters));
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const expensesSlice = createSlice({
    name: 'expenses',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<ExpenseFilterParams>) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        clearFilters: (state) => {
            state.filters = { page: 1, limit: 10 };
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.filters.page = action.payload;
        }
    },
    extraReducers: (builder) => {
        // Fetch
        builder.addCase(fetchExpenses.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchExpenses.fulfilled, (state, action) => {
            state.isLoading = false;
            // The API returns { data: { data: [], pagination: {} }, ... }
            if (action.payload && action.payload.data) {
                state.items = action.payload.data.data;
                state.pagination = action.payload.data.pagination;
            }
        });
        builder.addCase(fetchExpenses.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Create
        builder.addCase(createExpense.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(createExpense.fulfilled, (state) => {
            state.isLoading = false;
        });
        builder.addCase(createExpense.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Delete
        builder.addCase(deleteExpense.pending, (state) => {
            // loading? separate deleting state?
            // For simple UI, we might just re-use isLoading or ignore optimistic updates for now
        });
        builder.addCase(deleteExpense.fulfilled, (state) => {
            // Already refetched via thunk
        });
    }
});

export const { setFilters, clearFilters, setPage } = expensesSlice.actions;
export default expensesSlice.reducer;
