import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient, Company, CreateCompanyRequest, UpdateCompanyRequest, QueryCompanyParams } from '../../services/api-client';

interface AdminCompaniesState {
    companies: Company[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed'; // For create/update/delete actions
    actionError: string | null;
}

const initialState: AdminCompaniesState = {
    companies: [],
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
    },
    status: 'idle',
    error: null,
    actionStatus: 'idle',
    actionError: null,
};

// Async Thunks

export const fetchAdminCompanies = createAsyncThunk(
    'adminCompanies/fetchCompanies',
    async (params: QueryCompanyParams = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.getCompanies(params);
            return response.data;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch companies');
        }
    }
);

export const createAdminCompany = createAsyncThunk(
    'adminCompanies/createCompany',
    async (data: CreateCompanyRequest, { rejectWithValue }) => {
        try {
            const response = await apiClient.createCompany(data);
            return response.data; // Should return the created company
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to create company');
        }
    }
);

export const updateAdminCompany = createAsyncThunk(
    'adminCompanies/updateCompany',
    async ({ id, data }: { id: number; data: UpdateCompanyRequest }, { rejectWithValue }) => {
        try {
            const response = await apiClient.updateCompany(id, data);
            return response.data; // Should return the updated company
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to update company');
        }
    }
);

export const deleteAdminCompany = createAsyncThunk(
    'adminCompanies/deleteCompany',
    async (id: number, { rejectWithValue }) => {
        try {
            await apiClient.deleteCompany(id);
            return id;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to delete company');
        }
    }
);

export const resetCompanyPassword = createAsyncThunk(
    'adminCompanies/resetPassword',
    async ({ id, password }: { id: number; password: string }, { rejectWithValue }) => {
        try {
            await apiClient.resetCompanyPassword(id, password);
            return { id, success: true };
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to reset password');
        }
    }
);


export const adminCompaniesSlice = createSlice({
    name: 'adminCompanies',
    initialState,
    reducers: {
        resetActionStatus: (state) => {
            state.actionStatus = 'idle';
            state.actionError = null;
        },
        clearAdminCompanies: (state) => {
            state.companies = [];
            state.status = 'idle';
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Companies
            .addCase(fetchAdminCompanies.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAdminCompanies.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.companies = action.payload.data;
                state.pagination = {
                    page: Number(action.payload.pagination?.page) || 1,
                    limit: Number(action.payload.pagination?.limit) || 10,
                    total: Number(action.payload.pagination?.total) || 0,
                    totalPages: Number(action.payload.pagination?.pages) || 1,
                };
            })
            .addCase(fetchAdminCompanies.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            // Create Company
            .addCase(createAdminCompany.pending, (state) => {
                state.actionStatus = 'loading';
                state.actionError = null;
            })
            .addCase(createAdminCompany.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                // Optimistic update or just invalidation. Since we usually reload, maybe just status update is enough? 
                // Let's prepend to list for responsiveness if it's not paginated strictly or refresh is handled by component
                // Ideally, we should refetch or add to list. 
                // For now, let's just add it if it doesn't break pagination logic too much
                state.companies.unshift(action.payload as unknown as Company);
            })
            .addCase(createAdminCompany.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.actionError = action.payload as string;
            })
            // Update Company
            .addCase(updateAdminCompany.pending, (state) => {
                state.actionStatus = 'loading';
                state.actionError = null;
            })
            .addCase(updateAdminCompany.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                const index = state.companies.findIndex(c => c.id === (action.payload as unknown as Company).id);
                if (index !== -1) {
                    state.companies[index] = action.payload as unknown as Company;
                }
            })
            .addCase(updateAdminCompany.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.actionError = action.payload as string;
            })
            // Delete Company
            .addCase(deleteAdminCompany.pending, (state) => {
                state.actionStatus = 'loading';
                state.actionError = null;
            })
            .addCase(deleteAdminCompany.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                state.companies = state.companies.filter(c => c.id !== action.payload);
            })
            .addCase(deleteAdminCompany.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.actionError = action.payload as string;
            })
            // Reset Password (just status update)
            .addCase(resetCompanyPassword.pending, (state) => {
                state.actionStatus = 'loading';
                state.actionError = null;
            })
            .addCase(resetCompanyPassword.fulfilled, (state) => {
                state.actionStatus = 'succeeded';
            })
            .addCase(resetCompanyPassword.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.actionError = action.payload as string;
            });
    },
});

export const { resetActionStatus, clearAdminCompanies } = adminCompaniesSlice.actions;

export const selectAdminCompanies = (state: RootState) => state.adminCompanies.companies;
export const selectAdminCompaniesStatus = (state: RootState) => state.adminCompanies.status;
export const selectAdminCompaniesError = (state: RootState) => state.adminCompanies.error;
export const selectAdminCompaniesActionStatus = (state: RootState) => state.adminCompanies.actionStatus;
export const selectAdminCompaniesActionError = (state: RootState) => state.adminCompanies.actionError;
export const selectAdminCompaniesPagination = (state: RootState) => state.adminCompanies.pagination;

export default adminCompaniesSlice.reducer;
