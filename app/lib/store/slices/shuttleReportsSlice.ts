import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiClient, ShuttleReport } from "../../services/api-client";

interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface ShuttleReportsState {
    reports: ShuttleReport[];
    pagination: PaginationMeta;
    filters: {
        startDate: string;
        endDate: string;
    };
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: ShuttleReportsState = {
    reports: [],
    pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    filters: { startDate: "", endDate: "" },
    status: 'idle',
    error: null,
};

interface FetchShuttleReportsParams {
    companyId: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
}

export const fetchShuttleReports = createAsyncThunk(
    'shuttleReports/fetchShuttleReports',
    async (params: FetchShuttleReportsParams, { rejectWithValue }) => {
        try {
            const response = await apiClient.getShuttleReports(params.companyId, {
                startDate: params.startDate || undefined,
                endDate: params.endDate || undefined,
                page: params.page || 1,
                limit: params.limit || 10,
            });

            // Normalise paginated response envelope
            let reportsData: ShuttleReport[] = [];
            let pagination: PaginationMeta = { total: 0, page: 1, limit: 10, totalPages: 0 };

            const raw = response as any;
            if (raw?.data?.data && Array.isArray(raw.data.data)) {
                reportsData = raw.data.data;
                pagination = raw.data.pagination ?? raw.pagination ?? pagination;
            } else if (raw?.data && Array.isArray(raw.data)) {
                reportsData = raw.data;
                pagination = raw.pagination ?? pagination;
            } else if (Array.isArray(raw)) {
                reportsData = raw;
            }

            return {
                data: reportsData,
                pagination,
                filters: {
                    startDate: params.startDate || "",
                    endDate: params.endDate || "",
                },
            };
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch shuttle reports');
        }
    }
);

const shuttleReportsSlice = createSlice({
    name: 'shuttleReports',
    initialState,
    reducers: {
        setShuttleReportFilters: (
            state,
            action: PayloadAction<{ startDate?: string; endDate?: string }>
        ) => {
            if (action.payload.startDate !== undefined) {
                state.filters.startDate = action.payload.startDate;
            }
            if (action.payload.endDate !== undefined) {
                state.filters.endDate = action.payload.endDate;
            }
        },
        clearShuttleReports: (state) => {
            state.reports = [];
            state.pagination = { total: 0, page: 1, limit: 10, totalPages: 0 };
            state.filters = { startDate: "", endDate: "" };
            state.status = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchShuttleReports.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchShuttleReports.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.reports = action.payload.data;
                state.pagination = action.payload.pagination;
                state.filters = action.payload.filters;
            })
            .addCase(fetchShuttleReports.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const { setShuttleReportFilters, clearShuttleReports } = shuttleReportsSlice.actions;

// Selectors — keyed off CompanyRootState shape; cast via `any` to keep slice self-contained
export const selectShuttleReports = (state: any) => state.shuttleReports.reports as ShuttleReport[];
export const selectShuttleReportsStatus = (state: any) => state.shuttleReports.status as ShuttleReportsState['status'];
export const selectShuttleReportsError = (state: any) => state.shuttleReports.error as string | null;
export const selectShuttleReportsFilters = (state: any) => state.shuttleReports.filters as ShuttleReportsState['filters'];
export const selectShuttleReportsPagination = (state: any) => state.shuttleReports.pagination as PaginationMeta;

export default shuttleReportsSlice.reducer;
