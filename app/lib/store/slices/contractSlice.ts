import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient } from '../../services/api-client';

const STALE_TIME_MS = 120_000; // 2 minutes — contracts rarely change

interface ContractState {
    contract: any | null;
    allowedVehicleModels: string[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    lastFetched: number | null;
}

const initialState: ContractState = {
    contract: null,
    allowedVehicleModels: [],
    status: 'idle',
    error: null,
    lastFetched: null,
};

export const fetchContract = createAsyncThunk(
    'contract/fetchContract',
    async (_, { rejectWithValue }) => {
        try {
            const res = await apiClient.getMyContract();
            return res.data;
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch contract');
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as RootState;
            const { lastFetched, status } = state.contract;
            if (status === 'loading') return false;
            if (lastFetched && Date.now() - lastFetched < STALE_TIME_MS) return false;
            return true;
        }
    }
);

export const contractSlice = createSlice({
    name: 'contract',
    initialState,
    reducers: {
        // Optional: Action to populate whitelist from company profile if contract fails or doesn't exist
        setAllowedModelsFromProfile: (state, action) => {
            state.allowedVehicleModels = action.payload;
        },
        invalidateContractCache: (state) => {
            state.lastFetched = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchContract.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchContract.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.lastFetched = Date.now();
                state.contract = action.payload;
                if (action.payload?.chauffeur_contract_rates) {
                    state.allowedVehicleModels = action.payload.chauffeur_contract_rates.map((r: any) => r.vehicle_model);
                }
            })
            .addCase(fetchContract.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const { setAllowedModelsFromProfile, invalidateContractCache } = contractSlice.actions;

export const selectContract = (state: RootState) => state.contract.contract;
export const selectAllowedVehicleModels = (state: RootState) => state.contract.allowedVehicleModels;

export default contractSlice.reducer;
