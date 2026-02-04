import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
    apiClient,
    Invoice
} from '../../services/api-client';
import { RootState } from '../store';

interface AdminInvoicingState {
    invoices: Invoice[];
    stats: {
        totalCollectable: number;
        totalCollected: number;
        totalOverdue: number;
    };
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: AdminInvoicingState = {
    invoices: [],
    stats: {
        totalCollectable: 0,
        totalCollected: 0,
        totalOverdue: 0,
    },
    status: 'idle',
    actionStatus: 'idle',
    error: null,
};

// Async Thunks

export const fetchAdminInvoices = createAsyncThunk(
    'adminInvoicing/fetchAdminInvoices',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.getAllInvoices();
            // Handle both array response or object with data property
            if (response && (response as any).data && Array.isArray((response as any).data)) {
                return (response as any).data;
            } else if (Array.isArray(response)) {
                return response;
            }
            return [];
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch invoices');
        }
    }
);

export const fetchInvoiceStats = createAsyncThunk(
    'adminInvoicing/fetchInvoiceStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.getInvoiceStats();
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch invoice stats');
        }
    }
);

export const updateInvoiceStatus = createAsyncThunk(
    'adminInvoicing/updateInvoiceStatus',
    async ({ id, status }: { id: number, status: string }, { rejectWithValue }) => {
        try {
            await apiClient.updateInvoiceStatus(id, status);
            return { id, status };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update invoice status');
        }
    }
);

export const downloadInvoicePdf = createAsyncThunk(
    'adminInvoicing/downloadInvoicePdf',
    async ({ id, invoiceNumber }: { id: number, invoiceNumber: string }, { rejectWithValue }) => {
        try {
            await apiClient.downloadInvoicePdf(id, invoiceNumber);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to download PDF');
        }
    }
);

// Slice
const adminInvoicingSlice = createSlice({
    name: 'adminInvoicing',
    initialState,
    reducers: {
        resetActionStatus(state) {
            state.actionStatus = 'idle';
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Invoices
            .addCase(fetchAdminInvoices.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAdminInvoices.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.invoices = action.payload;
            })
            .addCase(fetchAdminInvoices.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })

            // Fetch Stats
            .addCase(fetchInvoiceStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            })

            // Update Status
            .addCase(updateInvoiceStatus.pending, (state) => {
                state.actionStatus = 'loading';
            })
            .addCase(updateInvoiceStatus.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                const index = state.invoices.findIndex(inv => inv.id === action.payload.id);
                if (index !== -1) {
                    state.invoices[index] = { ...state.invoices[index], status: action.payload.status };
                }
            })
            .addCase(updateInvoiceStatus.rejected, (state, action) => {
                state.actionStatus = 'failed';
            })

            // Download PDF
            .addCase(downloadInvoicePdf.pending, (state) => {
                state.actionStatus = 'loading';
            })
            .addCase(downloadInvoicePdf.fulfilled, (state) => {
                state.actionStatus = 'succeeded';
            })
            .addCase(downloadInvoicePdf.rejected, (state) => {
                state.actionStatus = 'failed';
            });
    },
});

export const { resetActionStatus } = adminInvoicingSlice.actions;

export const selectAdminInvoices = (state: RootState) => state.adminInvoicing.invoices;
export const selectAdminInvoiceStats = (state: RootState) => state.adminInvoicing.stats;
export const selectAdminInvoicingStatus = (state: RootState) => state.adminInvoicing.status;
export const selectAdminInvoicingError = (state: RootState) => state.adminInvoicing.error;
export const selectAdminInvoicingActionStatus = (state: RootState) => state.adminInvoicing.actionStatus;

export default adminInvoicingSlice.reducer;
