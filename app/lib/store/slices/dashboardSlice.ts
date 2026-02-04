import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';

// Reuse types from CompanyStore initially, can be moved to shared types later
export type DashboardStats = {
    employees: {
        total: number;
        active: number;
    };
    chauffeur: {
        totalBookings: number;
        activeRides: number;
        completedThisMonth: number;
        totalSpend: number;
        totalSavings: number;
        spotBookings: { total: number; hr5: number; hr10: number; hr24: number };
        monthlyBookings: { total: number; hr10Daily: number; hr24Daily: number };
        topPassengers: { name: string; trips: number }[];
    };
    alerts: {
        upcomingBookings: number;
        budgetUsed: number;
    };
};

interface DashboardState {
    stats: DashboardStats | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: DashboardState = {
    stats: null,
    status: 'idle',
    error: null,
};

export const fetchDashboardStats = createAsyncThunk(
    'dashboard/fetchStats',
    async (companyId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('No auth token found');

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
            const res = await fetch(`${API_URL}/companies/${companyId}/dashboard-stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!res.ok) throw new Error('Failed to fetch dashboard stats');

            const data = await res.json();
            return data.data || data;
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch stats');
        }
    }
);

export const dashboardSlice = createSlice({
    name: 'dashboard',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardStats.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.stats = action.payload;
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const selectDashboardStats = (state: RootState) => state.dashboard.stats;
export const selectDashboardStatus = (state: RootState) => state.dashboard.status;

export default dashboardSlice.reducer;
