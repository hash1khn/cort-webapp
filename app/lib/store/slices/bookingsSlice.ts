import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient, ChauffeurBooking } from '../../services/api-client';

interface BookingsState {
    bookings: ChauffeurBooking[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
    filters: {
        search: string;
        status: string;
    };
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
}

const initialState: BookingsState = {
    bookings: [],
    pagination: {
        page: 1,
        limit: 10,
        total: 0,
        pages: 1,
    },
    filters: {
        search: '',
        status: '',
    },
    status: 'idle',
    error: null,
};

export const fetchBookings = createAsyncThunk(
    'bookings/fetchBookings',
    async (params: { companyId: number } & any, { rejectWithValue }) => {
        try {
            const { companyId, ...queryParams } = params;
            const res = await apiClient.getCompanyChauffeurBookings(companyId, queryParams);
            return res.data; // { data: [], pagination: {} }
        } catch (err) {
            return rejectWithValue(err instanceof Error ? err.message : 'Failed to fetch bookings');
        }
    }
);

export const bookingsSlice = createSlice({
    name: 'bookings',
    initialState,
    reducers: {
        setPage: (state, action: PayloadAction<number>) => {
            state.pagination.page = action.payload;
        },
        setFilters: (state, action: PayloadAction<{ search?: string; status?: string }>) => {
            if (action.payload.search !== undefined) state.filters.search = action.payload.search;
            if (action.payload.status !== undefined) state.filters.status = action.payload.status;
            state.pagination.page = 1; // Reset to page 1 on filter change
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBookings.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchBookings.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.bookings = action.payload.data;
                if (action.payload.pagination) {
                    state.pagination = {
                        ...state.pagination,
                        ...action.payload.pagination,
                        // Match common naming variations
                        pages: action.payload.pagination.pages || state.pagination.pages
                    };
                }
            })
            .addCase(fetchBookings.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            });
    },
});

export const { setPage, setFilters } = bookingsSlice.actions;

export const selectBookings = (state: RootState) => state.bookings.bookings;
export const selectPagination = (state: RootState) => state.bookings.pagination;
export const selectBookingsStatus = (state: RootState) => state.bookings.status;
export const selectFilters = (state: RootState) => state.bookings.filters;

export default bookingsSlice.reducer;
