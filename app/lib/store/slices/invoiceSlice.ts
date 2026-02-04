
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { Invoice } from '../../services/api-client';

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
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('No auth token found');

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const res = await fetch(`${API_URL}/companies/${companyId}/invoices`, { headers });
            if (!res.ok) throw new Error('Failed to fetch invoices');

            const data = await res.json();
            // API client says: returns response.data if array, or response if array. 
            // Let's assume standard structure or handle both.
            // Based on InvoicingPage: response.data or response directly.
            return (data.data && Array.isArray(data.data)) ? data.data : (Array.isArray(data) ? data : []);
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
