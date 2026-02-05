
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Invoice, apiClient } from '../../services/api-client';

interface InvoiceState {
    invoices: Invoice[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: InvoiceState = {
    invoices: [],
    status: 'idle',
    error: null,
};

export const fetchInvoices = createAsyncThunk(
    'invoices/fetchInvoices',
    async (companyId: number, { rejectWithValue }) => {
        try {
            const response = await apiClient.getCompanyInvoices(companyId);
            const data = response.data || response;
            return Array.isArray(data) ? data : [];
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
                state.invoices = action.payload;
            })
            .addCase(fetchInvoices.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const selectInvoices = (state: RootState) => state.invoices.invoices;
export const selectInvoicesStatus = (state: RootState) => state.invoices.status;
export const selectInvoicesError = (state: RootState) => state.invoices.error;

export default invoiceSlice.reducer;
