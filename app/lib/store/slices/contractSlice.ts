import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient } from '../../services/api-client';

interface ContractState {
    contract: any | null;
    allowedVehicleModels: string[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: ContractState = {
    contract: null,
    allowedVehicleModels: [],
    status: 'idle',
    error: null,
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
    }
);

export const contractSlice = createSlice({
    name: 'contract',
    initialState,
    reducers: {
        // Optional: Action to populate whitelist from company profile if contract fails or doesn't exist
        setAllowedModelsFromProfile: (state, action) => {
            state.allowedVehicleModels = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchContract.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchContract.fulfilled, (state, action) => {
                state.status = 'succeeded';
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

export const { setAllowedModelsFromProfile } = contractSlice.actions;

export const selectContract = (state: RootState) => state.contract.contract;
export const selectAllowedVehicleModels = (state: RootState) => state.contract.allowedVehicleModels;

export default contractSlice.reducer;
