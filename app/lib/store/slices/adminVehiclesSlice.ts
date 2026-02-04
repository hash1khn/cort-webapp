import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import {
    apiClient,
    Vehicle,
    CreateVehicleRequest,
    UpdateVehicleRequest,
    QueryVehicleParams,
    FuelRecord,
    CreateFuelRecordRequest,
    UpdateFuelRecordRequest,
    QueryFuelRecordParams,
    MaintenanceRecord,
    CreateMaintenanceRecordRequest,
    UpdateMaintenanceRecordRequest,
    QueryMaintenanceRecordParams,
    MaintenanceType
} from '../../services/api-client';

interface AdminVehiclesState {
    // Vehicles
    vehicles: Vehicle[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    actionError: string | null;
    vehicleFilters: {
        search: string;
        category: string;
        ownership: string;
    };

    // Fuel
    fuelRecords: FuelRecord[];
    fuelStats: { total_fuel_cost: number; average_fuel_rate: number; total_records: number } | null;
    fuelStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    fuelError: string | null;
    fuelActionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    fuelFilters: {
        filterVehicleId: number | "ALL";
        filterBilled: boolean | "ALL";
        startDate: string;
        endDate: string;
    };

    // Maintenance
    maintenanceRecords: MaintenanceRecord[];
    upcomingMaintenance: any[];
    maintenanceStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    maintenanceError: string | null;
    maintenanceActionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    maintenanceFilters: {
        filterVehicleId: number | "ALL";
        filterType: MaintenanceType | "ALL";
        startDate: string;
        endDate: string;
    };
}

const initialState: AdminVehiclesState = {
    // Vehicles
    vehicles: [],
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    },
    status: 'idle',
    error: null,
    actionStatus: 'idle',
    actionError: null,
    vehicleFilters: {
        search: "",
        category: "",
        ownership: ""
    },

    // Fuel
    fuelRecords: [],
    fuelStats: null,
    fuelStatus: 'idle',
    fuelError: null,
    fuelActionStatus: 'idle',
    fuelFilters: {
        filterVehicleId: "ALL",
        filterBilled: "ALL",
        startDate: "",
        endDate: ""
    },

    // Maintenance
    maintenanceRecords: [],
    upcomingMaintenance: [],
    maintenanceStatus: 'idle',
    maintenanceError: null,
    maintenanceActionStatus: 'idle',
    maintenanceFilters: {
        filterVehicleId: "ALL",
        filterType: "ALL",
        startDate: "",
        endDate: ""
    }
};

// --- Vehicles Thunks ---

export const fetchAdminVehicles = createAsyncThunk(
    'adminVehicles/fetchVehicles',
    async (params: QueryVehicleParams = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.getVehicles(params);
            return {
                data: response.data,
                filters: {
                    search: params.search || "",
                    category: (params as any).category || "",
                    ownership: (params as any).ownership || ""
                }
            };
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch vehicles');
        }
    }
);

export const createAdminVehicle = createAsyncThunk(
    'adminVehicles/createVehicle',
    async (data: CreateVehicleRequest, { rejectWithValue }) => {
        try {
            const response = await apiClient.createVehicle(data);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to create vehicle');
        }
    }
);

export const updateAdminVehicle = createAsyncThunk(
    'adminVehicles/updateVehicle',
    async ({ id, data }: { id: number; data: UpdateVehicleRequest }, { rejectWithValue }) => {
        try {
            const response = await apiClient.updateVehicle(id, data);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to update vehicle');
        }
    }
);

export const deleteAdminVehicle = createAsyncThunk(
    'adminVehicles/deleteVehicle',
    async (id: number, { rejectWithValue }) => {
        try {
            await apiClient.deleteVehicle(id);
            return id;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to delete vehicle');
        }
    }
);

// --- Fuel Thunks ---

export const fetchFuelRecords = createAsyncThunk(
    'adminVehicles/fetchFuelRecords',
    async (params: QueryFuelRecordParams = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.getFuelRecords(params);
            return {
                data: response.data,
                filters: {
                    filterVehicleId: params.vehicle_id || "ALL" as number | "ALL",
                    filterBilled: params.billed !== undefined ? params.billed : "ALL" as boolean | "ALL",
                    startDate: params.start_date || "",
                    endDate: params.end_date || ""
                }
            };
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch fuel records');
        }
    }
);

export const fetchFuelStats = createAsyncThunk(
    'adminVehicles/fetchFuelStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.getFuelStats();
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch fuel stats');
        }
    }
);

export const createFuelRecord = createAsyncThunk(
    'adminVehicles/createFuelRecord',
    async (data: CreateFuelRecordRequest, { rejectWithValue }) => {
        try {
            const response = await apiClient.createFuelRecord(data);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to create fuel record');
        }
    }
);

export const updateFuelRecord = createAsyncThunk(
    'adminVehicles/updateFuelRecord',
    async ({ id, data }: { id: number; data: UpdateFuelRecordRequest }, { rejectWithValue }) => {
        try {
            await apiClient.updateFuelRecord(id, data);
            return { id, changes: data }; // Optimistic update or re-fetch can be used
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to update fuel record');
        }
    }
);

export const deleteFuelRecord = createAsyncThunk(
    'adminVehicles/deleteFuelRecord',
    async (id: number, { rejectWithValue }) => {
        try {
            await apiClient.deleteFuelRecord(id);
            return id;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to delete fuel record');
        }
    }
);

// --- Maintenance Thunks ---

export const fetchMaintenanceRecords = createAsyncThunk(
    'adminVehicles/fetchMaintenanceRecords',
    async (params: QueryMaintenanceRecordParams = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.getMaintenanceRecords(params);
            return {
                data: response.data,
                filters: {
                    filterVehicleId: params.vehicle_id || "ALL" as number | "ALL",
                    filterType: params.maintenance_type || "ALL" as MaintenanceType | "ALL",
                    startDate: params.start_date || "",
                    endDate: params.end_date || ""
                }
            };
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch maintenance records');
        }
    }
);

export const fetchUpcomingMaintenance = createAsyncThunk(
    'adminVehicles/fetchUpcomingMaintenance',
    async (_, { rejectWithValue }) => {
        try {
            const response = await apiClient.getUpcomingMaintenance();
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch upcoming maintenance');
        }
    }
);

export const createMaintenanceRecord = createAsyncThunk(
    'adminVehicles/createMaintenanceRecord',
    async (data: CreateMaintenanceRecordRequest, { rejectWithValue }) => {
        try {
            const response = await apiClient.createMaintenanceRecord(data);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to create maintenance record');
        }
    }
);

export const updateMaintenanceRecord = createAsyncThunk(
    'adminVehicles/updateMaintenanceRecord',
    async ({ id, data }: { id: number; data: UpdateMaintenanceRecordRequest }, { rejectWithValue }) => {
        try {
            await apiClient.updateMaintenanceRecord(id, data);
            return { id, changes: data };
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to update maintenance record');
        }
    }
);

export const deleteMaintenanceRecord = createAsyncThunk(
    'adminVehicles/deleteMaintenanceRecord',
    async (id: number, { rejectWithValue }) => {
        try {
            await apiClient.deleteMaintenanceRecord(id);
            return id;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to delete maintenance record');
        }
    }
);


export const adminVehiclesSlice = createSlice({
    name: 'adminVehicles',
    initialState,
    reducers: {
        resetVehicleActionStatus: (state) => {
            state.actionStatus = 'idle';
            state.actionError = null;
        },
        resetFuelActionStatus: (state) => {
            state.fuelActionStatus = 'idle';
        },
        resetMaintenanceActionStatus: (state) => {
            state.maintenanceActionStatus = 'idle';
        },
        clearAdminVehicles: (state) => {
            return initialState;
        }
    },
    extraReducers: (builder) => {
        builder
            // --- Vehicles ---
            .addCase(fetchAdminVehicles.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAdminVehicles.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.vehicles = action.payload.data.data;
                state.vehicleFilters = action.payload.filters;
                if (action.payload.data.pagination) {
                    state.pagination = {
                        page: Number(action.payload.data.pagination.page),
                        limit: Number(action.payload.data.pagination.limit),
                        total: Number(action.payload.data.pagination.total),
                        totalPages: Number(action.payload.data.pagination.pages),
                    };
                }
            })
            .addCase(fetchAdminVehicles.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            .addCase(createAdminVehicle.pending, (state) => { state.actionStatus = 'loading'; state.actionError = null; })
            .addCase(createAdminVehicle.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                state.vehicles.unshift(action.payload as unknown as Vehicle);
            })
            .addCase(createAdminVehicle.rejected, (state, action) => { state.actionStatus = 'failed'; state.actionError = action.payload as string; })

            .addCase(updateAdminVehicle.pending, (state) => { state.actionStatus = 'loading'; state.actionError = null; })
            .addCase(updateAdminVehicle.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                const index = state.vehicles.findIndex(v => v.id === (action.payload as unknown as Vehicle).id);
                if (index !== -1) state.vehicles[index] = action.payload as unknown as Vehicle;
            })
            .addCase(updateAdminVehicle.rejected, (state, action) => { state.actionStatus = 'failed'; state.actionError = action.payload as string; })

            .addCase(deleteAdminVehicle.fulfilled, (state, action) => {
                state.vehicles = state.vehicles.filter(v => v.id !== action.payload);
            })

            // --- Fuel ---
            .addCase(fetchFuelRecords.pending, (state) => { state.fuelStatus = 'loading'; })
            .addCase(fetchFuelRecords.fulfilled, (state, action) => {
                state.fuelStatus = 'succeeded';
                state.fuelRecords = action.payload.data.data || action.payload.data;
                state.fuelFilters = action.payload.filters;
            })
            .addCase(fetchFuelRecords.rejected, (state, action) => { state.fuelStatus = 'failed'; state.fuelError = action.payload as string; })

            .addCase(fetchFuelStats.fulfilled, (state, action) => {
                state.fuelStats = action.payload;
            })

            .addCase(createFuelRecord.pending, (state) => { state.fuelActionStatus = 'loading'; })
            .addCase(createFuelRecord.fulfilled, (state) => { state.fuelActionStatus = 'succeeded'; })
            .addCase(createFuelRecord.rejected, (state) => { state.fuelActionStatus = 'failed'; })

            .addCase(updateFuelRecord.pending, (state) => { state.fuelActionStatus = 'loading'; })
            .addCase(updateFuelRecord.fulfilled, (state, action) => {
                state.fuelActionStatus = 'succeeded';
                // Optional: update local state if needed, or rely on re-fetch
                const index = state.fuelRecords.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.fuelRecords[index] = { ...state.fuelRecords[index], ...action.payload.changes as any };
                }
            })
            .addCase(updateFuelRecord.rejected, (state) => { state.fuelActionStatus = 'failed'; })

            .addCase(deleteFuelRecord.fulfilled, (state, action) => {
                state.fuelRecords = state.fuelRecords.filter(r => r.id !== action.payload);
            })

            // --- Maintenance ---
            .addCase(fetchMaintenanceRecords.pending, (state) => { state.maintenanceStatus = 'loading'; })
            .addCase(fetchMaintenanceRecords.fulfilled, (state, action) => {
                state.maintenanceStatus = 'succeeded';
                state.maintenanceRecords = action.payload.data.data || action.payload.data;
                state.maintenanceFilters = action.payload.filters;
            })
            .addCase(fetchMaintenanceRecords.rejected, (state, action) => { state.maintenanceStatus = 'failed'; state.maintenanceError = action.payload as string; })

            .addCase(fetchUpcomingMaintenance.fulfilled, (state, action) => {
                state.upcomingMaintenance = action.payload;
            })

            .addCase(createMaintenanceRecord.pending, (state) => { state.maintenanceActionStatus = 'loading'; })
            .addCase(createMaintenanceRecord.fulfilled, (state) => { state.maintenanceActionStatus = 'succeeded'; })
            .addCase(createMaintenanceRecord.rejected, (state) => { state.maintenanceActionStatus = 'failed'; })

            .addCase(updateMaintenanceRecord.pending, (state) => { state.maintenanceActionStatus = 'loading'; })
            .addCase(updateMaintenanceRecord.fulfilled, (state, action) => {
                state.maintenanceActionStatus = 'succeeded';
                const index = state.maintenanceRecords.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.maintenanceRecords[index] = { ...state.maintenanceRecords[index], ...action.payload.changes as any };
                }
            })
            .addCase(updateMaintenanceRecord.rejected, (state) => { state.maintenanceActionStatus = 'failed'; })

            .addCase(deleteMaintenanceRecord.fulfilled, (state, action) => {
                state.maintenanceRecords = state.maintenanceRecords.filter(r => r.id !== action.payload);
            });
    },
});

export const { resetVehicleActionStatus, resetFuelActionStatus, resetMaintenanceActionStatus, clearAdminVehicles } = adminVehiclesSlice.actions;

export const selectAdminVehicles = (state: RootState) => state.adminVehicles.vehicles;
export const selectAdminVehiclesStatus = (state: RootState) => state.adminVehicles.status;
export const selectAdminVehiclesError = (state: RootState) => state.adminVehicles.error;
export const selectAdminVehiclesActionStatus = (state: RootState) => state.adminVehicles.actionStatus;
export const selectVehicleFilters = (state: RootState) => state.adminVehicles.vehicleFilters;

export const selectFuelRecords = (state: RootState) => state.adminVehicles.fuelRecords;
export const selectFuelStats = (state: RootState) => state.adminVehicles.fuelStats;
export const selectFuelStatus = (state: RootState) => state.adminVehicles.fuelStatus;
export const selectFuelActionStatus = (state: RootState) => state.adminVehicles.fuelActionStatus;
export const selectFuelFilters = (state: RootState) => state.adminVehicles.fuelFilters;

export const selectMaintenanceRecords = (state: RootState) => state.adminVehicles.maintenanceRecords;
export const selectUpcomingMaintenance = (state: RootState) => state.adminVehicles.upcomingMaintenance;
export const selectMaintenanceStatus = (state: RootState) => state.adminVehicles.maintenanceStatus;
export const selectMaintenanceActionStatus = (state: RootState) => state.adminVehicles.maintenanceActionStatus;
export const selectMaintenanceFilters = (state: RootState) => state.adminVehicles.maintenanceFilters;

export default adminVehiclesSlice.reducer;
