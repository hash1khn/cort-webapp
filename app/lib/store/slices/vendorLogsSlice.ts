import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    apiClient,
    QueryVendorLogsParams,
    VendorLog,
    VendorStats
} from '../../services/api-client';
import { RootState } from '../store';

interface VendorLogsState {
    logs: VendorLog[];
    stats: VendorStats | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    filters: QueryVendorLogsParams;
    pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

const initialState: VendorLogsState = {
    logs: [],
    stats: null,
    status: 'idle',
    error: null,
    filters: {
        page: 1,
        limit: 10
    },
    pagination: {
        total: 0,
        pages: 1,
        page: 1,
        limit: 10,
        hasNext: false,
        hasPrev: false
    }
};

// Async Thunks
export const fetchVendorLogs = createAsyncThunk(
    'vendorLogs/fetchVendorLogs',
    async (params: QueryVendorLogsParams, { rejectWithValue }) => {
        try {
            const response = await apiClient.getVendorLogs(params);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch vendor logs');
        }
    }
);

export const fetchVendorStats = createAsyncThunk(
    'vendorLogs/fetchVendorStats',
    async (vendorId: number | undefined, { rejectWithValue }) => {
        try {
            const response = await apiClient.getVendorStats(vendorId);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch vendor stats');
        }
    }
);

export const markVendorLogsAsPaid = createAsyncThunk(
    'vendorLogs/markVendorLogsAsPaid',
    async (ids: number[], { rejectWithValue }) => {
        try {
            const response = await apiClient.markVendorLogsAsPaid(ids);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to mark logs as paid');
        }
    }
);

const vendorLogsSlice = createSlice({
    name: 'vendorLogs',
    initialState,
    reducers: {
        setFilters(state, action: PayloadAction<QueryVendorLogsParams>) {
            state.filters = { ...state.filters, ...action.payload };
            // Reset page to 1 if filters other than page/limit change
            if (!action.payload.page && !action.payload.limit) {
                state.filters.page = 1;
            }
        },
        clearFilters(state) {
            state.filters = { page: 1, limit: 10 };
        },
        resetVendorLogsState(state) {
            return initialState;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Logs
            .addCase(fetchVendorLogs.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchVendorLogs.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.logs = action.payload.data;
                state.pagination = action.payload.pagination;
            })
            .addCase(fetchVendorLogs.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })

            // Fetch Stats
            .addCase(fetchVendorStats.fulfilled, (state, action) => {
                state.stats = action.payload;
            })

            // Mark Vendor Logs as Paid
            .addCase(markVendorLogsAsPaid.fulfilled, (state, action) => {
                const ids = action.meta.arg;
                state.logs = state.logs.map(log =>
                    ids.includes(log.booking_id)
                        ? { ...log, vendor_payment_status: 'PAID' }
                        : log
                );
            });
    },
});

export const { setFilters, clearFilters, resetVendorLogsState } = vendorLogsSlice.actions;

export const selectVendorLogs = (state: RootState) => state.vendorLogs.logs;
export const selectVendorStats = (state: RootState) => state.vendorLogs.stats;
export const selectVendorLogsStatus = (state: RootState) => state.vendorLogs.status;
export const selectVendorLogsFilters = (state: RootState) => state.vendorLogs.filters;
export const selectVendorLogsPagination = (state: RootState) => state.vendorLogs.pagination;

export default vendorLogsSlice.reducer;
