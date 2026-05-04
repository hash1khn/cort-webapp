import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient } from '../../services/api-client';
import { CompanyFeature } from '../../services/types/multi-mode';

const STALE_TIME_MS = 120_000; // 2 minutes — company profile rarely changes
const FEATURES_STALE_TIME_MS = 300_000; // 5 minutes — feature flags change rarely

// Session-storage cache key for feature flags (cleared on logout)
const FEATURES_CACHE_KEY = 'cort_company_features_v1';

function readFeaturesCache(): Pick<CompanyState, 'features' | 'featuresLastFetched'> {
    if (typeof window === 'undefined') return { features: [], featuresLastFetched: null };
    try {
        const raw = sessionStorage.getItem(FEATURES_CACHE_KEY);
        if (!raw) return { features: [], featuresLastFetched: null };
        const parsed = JSON.parse(raw) as { features: CompanyFeature[]; lastFetched: number };
        if (Array.isArray(parsed.features) && parsed.lastFetched) {
            return { features: parsed.features, featuresLastFetched: parsed.lastFetched };
        }
    } catch { /* ignore */ }
    return { features: [], featuresLastFetched: null };
}

function writeFeaturesCache(features: CompanyFeature[]) {
    if (typeof window === 'undefined') return;
    try {
        sessionStorage.setItem(FEATURES_CACHE_KEY, JSON.stringify({ features, lastFetched: Date.now() }));
    } catch { /* ignore */ }
}

function clearFeaturesCache() {
    if (typeof window === 'undefined') return;
    try { sessionStorage.removeItem(FEATURES_CACHE_KEY); } catch { /* ignore */ }
}

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
    monthly_budget: number;
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
    lastFetched: number | null;
    features: CompanyFeature[];
    featuresStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    featuresLastFetched: number | null;
}

const cachedFeatures = readFeaturesCache();

const initialState: CompanyState = {
    company: null,
    status: 'idle',
    error: null,
    lastFetched: null,
    // Seed from sessionStorage so feature-gated nav items appear instantly on next load
    features: cachedFeatures.features,
    featuresStatus: cachedFeatures.features.length > 0 ? 'succeeded' : 'idle',
    featuresLastFetched: cachedFeatures.featuresLastFetched,
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
                monthly_budget: rawCompany.monthly_budget || 1500000,
                vehicle_whitelists: rawCompany.vehicle_whitelists || [],
            };

            return companyObj;
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to load company');
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as RootState;
            const { lastFetched, status } = state.company;
            if (status === 'loading') return false;
            if (lastFetched && Date.now() - lastFetched < STALE_TIME_MS) return false;
            return true;
        }
    }
);

export const fetchCompanyFeatures = createAsyncThunk(
    'company/fetchFeatures',
    async (companyId: number, { rejectWithValue }) => {
        try {
            const res = await apiClient.getCompanyFeatures(companyId);
            return res.data;
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to load features');
        }
    },
    {
        condition: (_, { getState }) => {
            const state = getState() as RootState;
            const { featuresStatus, featuresLastFetched } = state.company;
            if (featuresStatus === 'loading') return false;
            if (featuresLastFetched && Date.now() - featuresLastFetched < FEATURES_STALE_TIME_MS) return false;
            return true;
        }
    }
);

export const companySlice = createSlice({    name: 'company',
    initialState,
    reducers: {
        clearCompany: (state) => {
            state.company = null;
            state.status = 'idle';
            state.error = null;
            state.features = [];
            state.featuresStatus = 'idle';
            state.featuresLastFetched = null;
            clearFeaturesCache();
        },
        invalidateCompanyCache: (state) => {
            state.lastFetched = null;
            state.featuresLastFetched = null;
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
                state.lastFetched = Date.now();
                state.company = action.payload;
            })
            .addCase(fetchCompanyProfile.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            .addCase(fetchCompanyFeatures.pending, (state) => {
                state.featuresStatus = 'loading';
            })
            .addCase(fetchCompanyFeatures.fulfilled, (state, action) => {
                state.featuresStatus = 'succeeded';
                state.featuresLastFetched = Date.now();
                state.features = action.payload;
                writeFeaturesCache(action.payload);
            })
            .addCase(fetchCompanyFeatures.rejected, (state) => {
                state.featuresStatus = 'failed';
            });
    },
});

export const { clearCompany, invalidateCompanyCache } = companySlice.actions;

export const selectCompany = (state: RootState) => state.company.company;
export const selectCompanyStatus = (state: RootState) => state.company.status;
export const selectCompanyError = (state: RootState) => state.company.error;
export const selectCompanyFeatures = (state: RootState) => state.company.features;
export const selectCompanyFeaturesStatus = (state: RootState) => state.company.featuresStatus;

export default companySlice.reducer;
