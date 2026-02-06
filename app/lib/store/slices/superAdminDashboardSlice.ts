import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '../../services/api-client';
import { SuperAdminDashboardStats } from '../../types/admin-dashboard';

interface DashboardState {
    stats: SuperAdminDashboardStats | null;
    loading: boolean;
    error: string | null;
    dateRange: { startDate: string; endDate: string } | null;
}

const initialState: DashboardState = {
    stats: null,
    loading: false,
    error: null,
    dateRange: null,
};

export const fetchDashboardStats = createAsyncThunk(
    'superAdminDashboard/fetchStats',
    async (params: { startDate?: string; endDate?: string } | undefined, { rejectWithValue }) => {
        try {
            const data = await apiClient.getSuperAdminDashboardStats(params?.startDate, params?.endDate);
            return data as unknown as SuperAdminDashboardStats; // Cast because apiClient return type was inline (TODO: fix apiClient return type)
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch dashboard stats');
        }
    }
);

const superAdminDashboardSlice = createSlice({
    name: 'superAdminDashboard',
    initialState,
    reducers: {
        setDateRange: (state, action: PayloadAction<{ startDate: string; endDate: string }>) => {
            state.dateRange = action.payload;
        },
        clearDashboardState: (state) => {
            state.stats = null;
            state.loading = false;
            state.error = null;
            state.dateRange = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDashboardStats.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.loading = false;
                state.stats = action.payload;
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setDateRange, clearDashboardState } = superAdminDashboardSlice.actions;
export default superAdminDashboardSlice.reducer;
