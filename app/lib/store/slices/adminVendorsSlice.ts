import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    apiClient,
    Vendor,
    CreateVendorRequest,
    QueryVendorParams
} from '../../services/api-client';
import { RootState } from '../store';

interface AdminVendorsState {
    vendors: Vendor[];
    selectedVendor: Vendor | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    filters: {
        search: string;
    };
    pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
    };
}

const initialState: AdminVendorsState = {
    vendors: [],
    selectedVendor: null,
    status: 'idle',
    actionStatus: 'idle',
    error: null,
    filters: {
        search: ""
    },
    pagination: {
        total: 0,
        pages: 0,
        page: 1,
        limit: 10,
    },
};

// Async Thunks

export const fetchAdminVendors = createAsyncThunk(
    'adminVendors/fetchAdminVendors',
    async (params: QueryVendorParams = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.getVendors(params);
            return {
                data: response.data,
                filters: {
                    search: params.search || ""
                }
            };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch vendors');
        }
    }
);

export const createAdminVendor = createAsyncThunk(
    'adminVendors/createAdminVendor',
    async (data: CreateVendorRequest, { rejectWithValue }) => {
        try {
            const response = await apiClient.createVendor(data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create vendor');
        }
    }
);

export const updateAdminVendor = createAsyncThunk(
    'adminVendors/updateAdminVendor',
    async ({ id, data }: { id: number; data: Partial<CreateVendorRequest> }, { rejectWithValue }) => {
        try {
            await apiClient.updateVendor(id, data);
            return { id, changes: data };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update vendor');
        }
    }
);

export const deleteAdminVendor = createAsyncThunk(
    'adminVendors/deleteAdminVendor',
    async (id: number, { rejectWithValue }) => {
        try {
            await apiClient.deleteVendor(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to delete vendor');
        }
    }
);

const adminVendorsSlice = createSlice({
    name: 'adminVendors',
    initialState,
    reducers: {
        selectVendor(state, action: PayloadAction<Vendor | null>) {
            state.selectedVendor = action.payload;
        },
        resetActionStatus(state) {
            state.actionStatus = 'idle';
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch
            .addCase(fetchAdminVendors.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAdminVendors.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.vendors = action.payload.data.data;
                state.filters = action.payload.filters;
                if (action.payload.data.pagination) {
                    state.pagination = action.payload.data.pagination;
                }
            })
            .addCase(fetchAdminVendors.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })

            // Create
            .addCase(createAdminVendor.pending, (state) => { state.actionStatus = 'loading'; })
            .addCase(createAdminVendor.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                state.vendors.unshift(action.payload);
            })
            .addCase(createAdminVendor.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.error = action.payload as string;
            })

            // Update
            .addCase(updateAdminVendor.pending, (state) => { state.actionStatus = 'loading'; })
            .addCase(updateAdminVendor.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                const index = state.vendors.findIndex(v => v.id === action.payload.id);
                if (index !== -1) {
                    state.vendors[index] = { ...state.vendors[index], ...action.payload.changes };
                }
            })
            .addCase(updateAdminVendor.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.error = action.payload as string;
            })

            // Delete
            .addCase(deleteAdminVendor.fulfilled, (state, action) => {
                state.vendors = state.vendors.filter(v => v.id !== action.payload);
            });
    },
});

export const { selectVendor, resetActionStatus } = adminVendorsSlice.actions;

export const selectAdminVendors = (state: RootState) => state.adminVendors.vendors;
export const selectAdminVendorsStatus = (state: RootState) => state.adminVendors.status;
export const selectAdminVendorsActionStatus = (state: RootState) => state.adminVendors.actionStatus;
export const selectAdminVendorsError = (state: RootState) => state.adminVendors.error;
export const selectVendorFilters = (state: RootState) => state.adminVendors.filters;
export const selectAdminVendorsPagination = (state: RootState) => state.adminVendors.pagination;

export default adminVendorsSlice.reducer;
