import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient } from '../../services/api-client';

// Reuse types from CompanyStore initially, can be moved to shared types later
export type DashboardStats = {
    employees: {
        total: number;
        active: number;
        departmentUsage: { name: string; percentage: number }[];
    };
    chauffeur: {
        totalBookings: number;
        completedThisMonth: number;
        totalSpend: number;
        spendTrend: string;
        totalSavings: number;
        completedTrend: string;
        unassignedBookings: number;
        outstandingAmount: number;
        topPassengers: { name: string; trips: number }[];
        outstandingInvoices: {
            invoice_number: string;
            total_amount: number;
            status: string;
            due_date: string;
        }[];
    };
    shuttle: {
        totalRoutes: number;
        monthlyTrips: number;
    };
    alerts: {
        upcomingBookings: number;
    };
    seasonality: {
        highDemandDay: string;
        lowDemandDay: string;
    };
};

interface DashboardState {
    stats: DashboardStats | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastFetched: number | null;
}

const initialState: DashboardState = {
    stats: null,
    status: 'idle',
    error: null,
    lastFetched: null,
};

// Cache valid for 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

export const fetchDashboardStats = createAsyncThunk(
    'dashboard/fetchStats',
    async (companyId: string, { rejectWithValue, getState }) => {
        try {
            const state = getState() as any;
            const dashboardState = state.dashboard;

            // ✅ FIX: Check if data is cached and still valid
            if (
                dashboardState.stats &&
                dashboardState.lastFetched &&
                Date.now() - dashboardState.lastFetched < CACHE_DURATION_MS
            ) {
                // Return cached data without making API call
                return dashboardState.stats;
            }

            const response = await apiClient.getCompanyDashboardStats(companyId);
            return response.data || response;
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch stats');
        }
    }
);

export const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {
        // ✅ FIX: Allow manual cache clearing for refreshes
        clearDashboardCache: (state) => {
            state.lastFetched = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardStats.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.stats = action.payload;
                state.lastFetched = Date.now(); // ✅ FIX: Track when data was fetched
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const { clearDashboardCache } = dashboardSlice.actions;

export const selectDashboardStats = (state: RootState) => state.dashboard.stats;
export const selectDashboardStatus = (state: RootState) => state.dashboard.status;

export default dashboardSlice.reducer;
