import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient, ChauffeurReport } from '../../services/api-client';
import { RootState } from '../store';

interface AdminReportsState {
    reports: ChauffeurReport[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    filters: {
        startDate: string;
        endDate: string;
    };
}

const initialState: AdminReportsState = {
    reports: [],
    status: 'idle',
    error: null,
    filters: {
        startDate: "",
        endDate: ""
    }
};

// Async Thunks

export const fetchAdminReports = createAsyncThunk(
    'adminReports/fetchReports',
    async (params: { startDate?: string; endDate?: string }, { rejectWithValue }) => {
        try {
            const response = await apiClient.getAllChauffeurReports(params);
            // Handle different response structures if necessary, similar to component logic
            let data: ChauffeurReport[] = [];
            if (response.data && Array.isArray(response.data.data)) {
                data = response.data.data;
            } else if (Array.isArray(response.data)) {
                data = response.data;
            }

            return {
                data,
                filters: {
                    startDate: params.startDate || "",
                    endDate: params.endDate || ""
                }
            };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch reports');
        }
    }
);

export const adminReportsSlice = createSlice({
    name: 'adminReports',
    initialState,
    reducers: {
        clearAdminReports: (state) => {
            state.reports = [];
            state.status = 'idle';
            state.error = null;
            state.filters = { startDate: "", endDate: "" };
        },
        setReportFilters: (state, action: PayloadAction<{ startDate: string; endDate: string }>) => {
            state.filters = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAdminReports.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAdminReports.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.reports = action.payload.data;
                state.filters = action.payload.filters;
            })
            .addCase(fetchAdminReports.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const { clearAdminReports, setReportFilters } = adminReportsSlice.actions;

export const selectAdminReports = (state: RootState) => state.adminReports.reports;
export const selectAdminReportsStatus = (state: RootState) => state.adminReports.status;
export const selectAdminReportsError = (state: RootState) => state.adminReports.error;
export const selectAdminReportsFilters = (state: RootState) => state.adminReports.filters;

export default adminReportsSlice.reducer;

