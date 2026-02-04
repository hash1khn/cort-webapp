import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    apiClient,
    Driver,
    CreateDriverRequest,
    UpdateDriverRequest,
    QueryDriverParams,
    DriverStatusAction
} from '../../services/api-client';
import { RootState } from '../store';

// Define the state interface
interface AdminDriversState {
    data: Driver[];
    selectedDriver: Driver | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    filters: {
        searchQuery: string;
        activeTab: string;
    };
    pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
    };
}

// Initial state
const initialState: AdminDriversState = {
    data: [],
    selectedDriver: null,
    status: 'idle',
    actionStatus: 'idle',
    error: null,
    filters: {
        searchQuery: "",
        activeTab: "ALL"
    },
    pagination: {
        total: 0,
        pages: 0,
        page: 1,
        limit: 10,
    },
};

// Async thunks

export const fetchAdminDrivers = createAsyncThunk(
    'adminDrivers/fetchAdminDrivers',
    async (params: QueryDriverParams & { activeTab?: string } = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.getDrivers(params);
            return {
                data: response.data,
                filters: {
                    searchQuery: params.search || "",
                    activeTab: params.activeTab || "ALL"
                }
            };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch drivers');
        }
    }
);

export const fetchPendingChauffeurs = createAsyncThunk(
    'adminDrivers/fetchPendingChauffeurs',
    async (params: QueryDriverParams = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.getPendingChauffeurs(params);
            return {
                data: response.data,
                filters: {
                    searchQuery: params.search || "",
                    activeTab: "PENDING_CHAUFFEUR"
                }
            };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch pending chauffeurs');
        }
    }
);

export const createAdminDriver = createAsyncThunk(
    'adminDrivers/createAdminDriver',
    async (data: CreateDriverRequest, { rejectWithValue }) => {
        try {
            const response = await apiClient.createDriver(data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create driver');
        }
    }
);

export const updateAdminDriver = createAsyncThunk(
    'adminDrivers/updateAdminDriver',
    async ({ id, data }: { id: string; data: UpdateDriverRequest }, { rejectWithValue }) => {
        try {
            await apiClient.updateDriver(id, data);
            return { id, changes: data }; // Return id and changes to update state optimistically or re-fetch
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update driver');
        }
    }
);

export const updateAdminDriverStatus = createAsyncThunk(
    'adminDrivers/updateAdminDriverStatus',
    async ({ id, payload }: { id: string; payload: { action: DriverStatusAction; reason?: string } }, { rejectWithValue }) => {
        try {
            await apiClient.updateDriverStatus(id, payload);
            return { id, status: payload.action };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update driver status');
        }
    }
);

export const deleteAdminDriver = createAsyncThunk(
    'adminDrivers/deleteAdminDriver',
    async (id: string, { rejectWithValue }) => {
        try {
            await apiClient.deleteDriver(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to delete driver');
        }
    }
);

// Slice
const adminDriversSlice = createSlice({
    name: 'adminDrivers',
    initialState,
    reducers: {
        selectDriver(state, action: PayloadAction<Driver | null>) {
            state.selectedDriver = action.payload;
        },
        resetDriversStatus(state) {
            state.status = 'idle';
            state.error = null;
        },
        resetDriversActionStatus(state) {
            state.actionStatus = 'idle';
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch Drivers
            .addCase(fetchAdminDrivers.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAdminDrivers.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload.data.data;
                state.filters = action.payload.filters;
                if (action.payload.data.pagination) {
                    state.pagination = action.payload.data.pagination;
                }
            })
            .addCase(fetchAdminDrivers.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            // Fetch Pending Chauffeurs
            .addCase(fetchPendingChauffeurs.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchPendingChauffeurs.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.data = action.payload.data.data;
                state.filters = action.payload.filters;
                if (action.payload.data.pagination) {
                    state.pagination = action.payload.data.pagination;
                }
            })
            .addCase(fetchPendingChauffeurs.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            // Create Driver
            .addCase(createAdminDriver.pending, (state) => {
                state.actionStatus = 'loading';
            })
            .addCase(createAdminDriver.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                state.data.unshift(action.payload as any); // Optimistic update, though types might differ slightly if payload is wrapping data
            })
            .addCase(createAdminDriver.rejected, (state, action) => {
                state.actionStatus = 'failed';
                // state.error = action.payload as string; // Keep main error separate? Or use a separate actionError?
                // Using alert in UI for specific action errors usually, but can store here too
            })
            // Update Driver
            .addCase(updateAdminDriver.pending, (state) => {
                state.actionStatus = 'loading';
            })
            .addCase(updateAdminDriver.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                const index = state.data.findIndex(d => d.id === action.payload.id);
                if (index !== -1) {
                    state.data[index] = { ...state.data[index], ...action.payload.changes };
                }
            })
            .addCase(updateAdminDriver.rejected, (state, action) => {
                state.actionStatus = 'failed';
            })
            // Update Driver Status
            .addCase(updateAdminDriverStatus.pending, (state) => {
                state.actionStatus = 'loading';
            })
            .addCase(updateAdminDriverStatus.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                // We probably need to re-fetch or optimistically update. 
                // Logic for re-fetching is safer in UI usually, but here we can try updating status if we map it right.
                // But status response might not be just the string. Let's rely on re-fetch in UI or basic update here.
            })
            .addCase(updateAdminDriverStatus.rejected, (state, action) => {
                state.actionStatus = 'failed';
            })

            // Delete Driver
            .addCase(deleteAdminDriver.pending, (state) => {
                state.actionStatus = 'loading';
            })
            .addCase(deleteAdminDriver.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                state.data = state.data.filter((d) => d.id !== action.payload);
            })
            .addCase(deleteAdminDriver.rejected, (state, action) => {
                state.actionStatus = 'failed';
            });
    },
});

export const { selectDriver, resetDriversStatus, resetDriversActionStatus } = adminDriversSlice.actions;

export const selectAdminDrivers = (state: RootState) => state.adminDrivers.data;
export const selectAdminDriversStatus = (state: RootState) => state.adminDrivers.status;
export const selectAdminDriversError = (state: RootState) => state.adminDrivers.error;
export const selectAdminDriversActionStatus = (state: RootState) => state.adminDrivers.actionStatus;
export const selectAdminDriversPagination = (state: RootState) => state.adminDrivers.pagination;
export const selectDriverFilters = (state: RootState) => state.adminDrivers.filters;

export default adminDriversSlice.reducer;
