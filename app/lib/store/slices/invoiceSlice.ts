import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Invoice, apiClient, QueryInvoiceParams, PaginatedResponse } from '../../services/api-client';

interface InvoiceState {
    invoices: Invoice[];
    pagination: {
        total: number;
        limit: number;
        page: number;
        totalPages: number;
    };
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: InvoiceState = {
    invoices: [],
    pagination: {
        total: 0,
        limit: 10,
        page: 1,
        totalPages: 0,
    },
    status: 'idle',
    error: null,
};

export const fetchInvoices = createAsyncThunk<{ data: Invoice[], pagination: InvoiceState['pagination'] }, { companyId: number, params?: QueryInvoiceParams }>(
    'invoices/fetchInvoices',
    async ({ companyId, params }, { rejectWithValue }) => {
        try {
            const response: any = await apiClient.getCompanyInvoices(companyId, params);

            // Handle different pagination response shapes safely

            // 1. Structure: { data: [...], pagination: { total, pages, page, limit } }
            if (response && response.data && Array.isArray(response.data) && response.pagination) {
                return {
                    data: response.data,
                    pagination: {
                        total: response.pagination.total || 0,
                        limit: response.pagination.limit || 10,
                        page: response.pagination.page || 1,
                        totalPages: response.pagination.pages || response.pagination.totalPages || 0
                    }
                };
            }

            // 2. Structure: { data: { data: [...], pagination: { ... } } }
            if (response && response.data && response.data.data && Array.isArray(response.data.data) && response.data.pagination) {
                return {
                    data: response.data.data,
                    pagination: {
                        total: response.data.pagination.total || 0,
                        limit: response.data.pagination.limit || 10,
                        page: response.data.pagination.page || 1,
                        totalPages: response.data.pagination.pages || response.data.pagination.totalPages || 0
                    }
                };
            }

            // Fallback for non-paginated arrays
            const rawData = response?.data || response;
            return {
                data: Array.isArray(rawData) ? rawData : [],
                pagination: { total: 0, limit: 10, page: 1, totalPages: 0 }
            };
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch invoices');
        }
    }
);

export const invoiceSlice = createSlice({
    name: 'invoices',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchInvoices.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchInvoices.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.invoices = action.payload.data;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchInvoices.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const selectInvoices = (state: RootState) => state.invoices.invoices;
export const selectInvoicesPagination = (state: RootState) => state.invoices.pagination;
export const selectInvoicesStatus = (state: RootState) => state.invoices.status;
export const selectInvoicesError = (state: RootState) => state.invoices.error;

export default invoiceSlice.reducer;
