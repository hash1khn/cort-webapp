import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient, ChauffeurBooking } from '../../services/api-client';

interface BookingsState {
    bookings: ChauffeurBooking[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
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
        totalPages: 1,
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
    async ({ companyId, page, limit, status, search }: { companyId: number, page: number, limit: number, status?: string, search?: string }, { rejectWithValue }) => {
        try {
            const res = await apiClient.getCompanyChauffeurBookings(companyId, {
                page,
                limit,
                status: status || undefined,
                search: search || undefined,
            });

            return {
                bookings: res.data.data,
                pagination: res.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 }
            };
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
                state.bookings = action.payload.bookings;
                state.pagination.page = Number(action.payload.pagination.page);
                state.pagination.limit = Number(action.payload.pagination.limit);
                state.pagination.total = Number(action.payload.pagination.total);
                state.pagination.totalPages = Number(action.payload.pagination.pages);
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
