import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiClient, ChauffeurReport } from "../../services/api-client";
import { RootState } from "../store";

interface CompanyReportsState {
    reports: ChauffeurReport[];
    filters: {
        startDate: string;
        endDate: string;
    };
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: CompanyReportsState = {
    reports: [],
    filters: {
        startDate: "",
        endDate: ""
    },
    status: 'idle',
    error: null
};

interface FetchReportsParams {
    companyId: number;
    startDate?: string;
    endDate?: string;
}

export const fetchChauffeurReports = createAsyncThunk(
    'companyReports/fetchChauffeurReports',
    async (params: FetchReportsParams, { rejectWithValue }) => {
        try {
            const response = await apiClient.getChauffeurReports(params.companyId, {
                startDate: params.startDate || undefined,
                endDate: params.endDate || undefined,
            });

            // Extract data array from response
            let reportsData: ChauffeurReport[] = [];
            if (response.data && Array.isArray(response.data.data)) {
                reportsData = response.data.data;
            } else if (Array.isArray(response.data)) {
                reportsData = response.data as any;
            }

            return {
                data: reportsData,
                filters: {
                    startDate: params.startDate || "",
                    endDate: params.endDate || ""
                }
            };
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch chauffeur reports');
        }
    }
);

const companyReportsSlice = createSlice({
    name: 'companyReports',
    initialState,
    reducers: {
        setFilters: (state, action: PayloadAction<{ startDate?: string; endDate?: string }>) => {
            if (action.payload.startDate !== undefined) {
                state.filters.startDate = action.payload.startDate;
            }
            if (action.payload.endDate !== undefined) {
                state.filters.endDate = action.payload.endDate;
            }
        },
        clearReports: (state) => {
            state.reports = [];
            state.filters = { startDate: "", endDate: "" };
            state.status = 'idle';
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchChauffeurReports.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchChauffeurReports.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.reports = action.payload.data;
                state.filters = action.payload.filters;
            })
            .addCase(fetchChauffeurReports.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    }
});

export const { setFilters, clearReports } = companyReportsSlice.actions;

// Selectors
export const selectReports = (state: RootState) => state.companyReports.reports;
export const selectReportsStatus = (state: RootState) => state.companyReports.status;
export const selectReportsError = (state: RootState) => state.companyReports.error;
export const selectReportsFilters = (state: RootState) => state.companyReports.filters;

export default companyReportsSlice.reducer;
