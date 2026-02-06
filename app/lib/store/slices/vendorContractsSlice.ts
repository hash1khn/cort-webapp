import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient, VendorContract, CreateVendorContractRequest, UpdateVendorContractRequest, QueryVendorContractParams, ContractStatus } from '../../services/api-client';
import { RootState } from '../store';

interface VendorContractsState {
    contracts: VendorContract[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    filters: {
        month: string;
        vendor_id: number | undefined;
        vehicle_id: number | undefined;
        status: ContractStatus | undefined;
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

const initialState: VendorContractsState = {
    contracts: [],
    status: 'idle',
    actionStatus: 'idle',
    error: null,
    filters: {
        month: '',
        vendor_id: undefined,
        vehicle_id: undefined,
        status: undefined,
    },
    pagination: {
        page: 1,
        limit: 50,
        total: 0,
        pages: 0,
    },
};

// Async Thunks

export const fetchVendorContracts = createAsyncThunk(
    'vendorContracts/fetchAll',
    async (params: QueryVendorContractParams, { rejectWithValue }) => {
        try {
            const response = await apiClient.getAllVendorContracts(params);
            return {
                data: response.data.data,
                pagination: response.data.pagination,
                filters: params,
            };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch vendor contracts');
        }
    }
);

export const createVendorContract = createAsyncThunk(
    'vendorContracts/create',
    async (data: CreateVendorContractRequest, { rejectWithValue, dispatch, getState }) => {
        try {
            const response = await apiClient.createVendorContract(data);
            // Refresh the list after creation
            const state = getState() as RootState;
            dispatch(fetchVendorContracts({
                ...state.vendorContracts.filters,
                page: state.vendorContracts.pagination.page,
                limit: state.vendorContracts.pagination.limit,
            }));
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create vendor contract');
        }
    }
);

export const updateVendorContract = createAsyncThunk(
    'vendorContracts/update',
    async ({ id, data }: { id: number; data: UpdateVendorContractRequest }, { rejectWithValue, dispatch, getState }) => {
        try {
            const response = await apiClient.updateVendorContract(id, data);
            // Refresh the list after update
            const state = getState() as RootState;
            dispatch(fetchVendorContracts({
                ...state.vendorContracts.filters,
                page: state.vendorContracts.pagination.page,
                limit: state.vendorContracts.pagination.limit,
            }));
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update vendor contract');
        }
    }
);

export const deleteVendorContract = createAsyncThunk(
    'vendorContracts/delete',
    async (id: number, { rejectWithValue, dispatch, getState }) => {
        try {
            await apiClient.deleteVendorContract(id);
            // Refresh the list after deletion
            const state = getState() as RootState;
            dispatch(fetchVendorContracts({
                ...state.vendorContracts.filters,
                page: state.vendorContracts.pagination.page,
                limit: state.vendorContracts.pagination.limit,
            }));
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to delete vendor contract');
        }
    }
);

export const vendorContractsSlice = createSlice({
    name: 'vendorContracts',
    initialState,
    reducers: {
        clearVendorContracts: (state) => {
            state.contracts = [];
            state.status = 'idle';
            state.error = null;
        },
        resetActionStatus: (state) => {
            state.actionStatus = 'idle';
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            // Fetch contracts
            .addCase(fetchVendorContracts.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchVendorContracts.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.contracts = action.payload.data;
                state.pagination = action.payload.pagination;
                state.filters = action.payload.filters as any;
            })
            .addCase(fetchVendorContracts.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            // Create contract
            .addCase(createVendorContract.pending, (state) => {
                state.actionStatus = 'loading';
                state.error = null;
            })
            .addCase(createVendorContract.fulfilled, (state) => {
                state.actionStatus = 'succeeded';
            })
            .addCase(createVendorContract.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.error = action.payload as string;
            })
            // Update contract
            .addCase(updateVendorContract.pending, (state) => {
                state.actionStatus = 'loading';
                state.error = null;
            })
            .addCase(updateVendorContract.fulfilled, (state) => {
                state.actionStatus = 'succeeded';
            })
            .addCase(updateVendorContract.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.error = action.payload as string;
            })
            // Delete contract
            .addCase(deleteVendorContract.pending, (state) => {
                state.actionStatus = 'loading';
                state.error = null;
            })
            .addCase(deleteVendorContract.fulfilled, (state) => {
                state.actionStatus = 'succeeded';
            })
            .addCase(deleteVendorContract.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const { clearVendorContracts, resetActionStatus } = vendorContractsSlice.actions;

export const selectVendorContracts = (state: RootState) => state.vendorContracts.contracts;
export const selectVendorContractsStatus = (state: RootState) => state.vendorContracts.status;
export const selectVendorContractsActionStatus = (state: RootState) => state.vendorContracts.actionStatus;
export const selectVendorContractsError = (state: RootState) => state.vendorContracts.error;
export const selectVendorContractsFilters = (state: RootState) => state.vendorContracts.filters;
export const selectVendorContractsPagination = (state: RootState) => state.vendorContracts.pagination;

export default vendorContractsSlice.reducer;
