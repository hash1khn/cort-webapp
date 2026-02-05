import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient } from '../../services/api-client';

// Define types based on backend structure
export interface Company {
    id: number;
    name: string;
    email: string;
    logo_url: string | null;
    services_enabled: {
        shuttle_enabled: boolean;
        chauffeur_enabled: boolean;
    };
    vehicle_whitelists?: Array<{
        id: number;
        company_id: number;
        allowed_vehicle_model: string;
    }>;
}

interface CompanyState {
    company: Company | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: CompanyState = {
    company: null,
    status: 'idle',
    error: null,
};

// Async thunk to fetch company profile
export const fetchCompanyProfile = createAsyncThunk(
    'company/fetchProfile',
    async (companyId: string, { rejectWithValue }) => {
        try {
            const rawCompanyData = await apiClient.getCompany(companyId);
            const rawCompany = rawCompanyData.data || rawCompanyData;

            const companyObj: Company = {
                id: rawCompany.id,
                name: rawCompany.name,
                email: rawCompany.email,
                logo_url: rawCompany.logo_url || null,
                services_enabled: {
                    shuttle_enabled: rawCompany.is_shuttle_enabled || false,
                    chauffeur_enabled: rawCompany.is_chauffeur_enabled || false,
                },
                vehicle_whitelists: rawCompany.vehicle_whitelists || [],
            };

            return companyObj;
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to load company');
        }
    }
);

export const companySlice = createSlice({
    name: 'company',
    initialState,
    reducers: {
        clearCompany: (state) => {
            state.company = null;
            state.status = 'idle';
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCompanyProfile.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchCompanyProfile.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.company = action.payload;
            })
            .addCase(fetchCompanyProfile.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const { clearCompany } = companySlice.actions;

export const selectCompany = (state: RootState) => state.company.company;
export const selectCompanyStatus = (state: RootState) => state.company.status;
export const selectCompanyError = (state: RootState) => state.company.error;

export default companySlice.reducer;
