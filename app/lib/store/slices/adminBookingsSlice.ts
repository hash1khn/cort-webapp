import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    apiClient,
    ChauffeurBooking,
    Vehicle,
    Driver,
    QueryChauffeurBookingParams,
    PaymentTransaction,
    PaymentSummary,
    AddPaymentRequest
} from '../../services/api-client';
import { RootState } from '../store';

interface AdminBookingsState {
    bookings: ChauffeurBooking[];
    availableVehicles: Vehicle[];
    availableDrivers: Driver[];
    selectedBooking: ChauffeurBooking | null;
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    pagination: {
        total: number;
        pages: number;
        page: number;
        limit: number;
    };
    paymentHistory: PaymentTransaction[];
    paymentSummary: PaymentSummary | null;
    paymentLoading: boolean;
}

const initialState: AdminBookingsState = {
    bookings: [],
    availableVehicles: [],
    availableDrivers: [],
    selectedBooking: null,
    status: 'idle',
    actionStatus: 'idle',
    error: null,
    pagination: {
        total: 0,
        pages: 0,
        page: 1,
        limit: 10,
    },
    paymentHistory: [],
    paymentSummary: null,
    paymentLoading: false,
};

// Async Thunks

export const fetchAdminBookings = createAsyncThunk(
    'adminBookings/fetchAdminBookings',
    async (params: QueryChauffeurBookingParams = {}, { rejectWithValue }) => {
        try {
            const response = await apiClient.getAllBookings(params);
            return response.data; // { data: [], pagination: {} }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch bookings');
        }
    }
);

export const fetchAvailableVehicles = createAsyncThunk(
    'adminBookings/fetchAvailableVehicles',
    async (params: any = { limit: 100 }, { rejectWithValue }) => {
        try {
            const response = await apiClient.getAvailableVehicles(params);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch available vehicles');
        }
    }
);

export const fetchAvailableDrivers = createAsyncThunk(
    'adminBookings/fetchAvailableDrivers',
    async (params: any = { limit: 100, driver_type: 'CHAUFFEUR' }, { rejectWithValue }) => {
        try {
            const response = await apiClient.getAvailableDrivers(params);
            return response.data.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch available drivers');
        }
    }
);

export const assignBooking = createAsyncThunk(
    'adminBookings/assignBooking',
    async ({ bookingId, vehicleId, driverId }: { bookingId: number, vehicleId: number, driverId: string }, { rejectWithValue }) => {
        try {
            await apiClient.assignBooking(bookingId, vehicleId, driverId);
            return { bookingId, vehicleId, driverId };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to assign booking');
        }
    }
);

export const updateBookingStatus = createAsyncThunk(
    'adminBookings/updateBookingStatus',
    async ({ id, status }: { id: number, status: string }, { rejectWithValue }) => {
        try {
            await apiClient.updateBookingStatus(id, status);
            return { id, status };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update booking status');
        }
    }
);

export const startTrip = createAsyncThunk(
    'adminBookings/startTrip',
    async (id: number, { rejectWithValue }) => {
        try {
            await apiClient.startTrip(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to start trip');
        }
    }
);

export const endTrip = createAsyncThunk(
    'adminBookings/endTrip',
    async ({ id, data }: { id: number, data: any }, { rejectWithValue }) => {
        try {
            await apiClient.endTrip(id, data);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to end trip');
        }
    }
);

export const completeTrip = createAsyncThunk(
    'adminBookings/completeTrip',
    async (id: number, { rejectWithValue }) => {
        try {
            const res = await apiClient.completeTrip(id);
            return { id, result: res };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to complete trip');
        }
    }
);

export const generateTripInvoice = createAsyncThunk(
    'adminBookings/generateTripInvoice',
    async (id: number, { rejectWithValue }) => {
        try {
            await apiClient.generateTripInvoice(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to generate invoice');
        }
    }
);

export const addPayment = createAsyncThunk(
    'adminBookings/addPayment',
    async ({ bookingId, data }: { bookingId: number; data: AddPaymentRequest }, { rejectWithValue }) => {
        try {
            const response: any = await apiClient.addPayment(bookingId, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to add payment');
        }
    }
);

export const fetchPaymentHistory = createAsyncThunk(
    'adminBookings/fetchPaymentHistory',
    async (bookingId: number, { rejectWithValue }) => {
        try {
            const response: any = await apiClient.getPaymentHistory(bookingId);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch payment history');
        }
    }
);

export const fetchPaymentSummary = createAsyncThunk(
    'adminBookings/fetchPaymentSummary',
    async (bookingId: number, { rejectWithValue }) => {
        try {
            const response: any = await apiClient.getPaymentSummary(bookingId);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch payment summary');
        }
    }
);

// Slice
const adminBookingsSlice = createSlice({
    name: 'adminBookings',
    initialState,
    reducers: {
        selectBooking(state, action: PayloadAction<ChauffeurBooking | null>) {
            state.selectedBooking = action.payload;
        },
        resetActionStatus(state) {
            state.actionStatus = 'idle';
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Bookings
            .addCase(fetchAdminBookings.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAdminBookings.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.bookings = action.payload.data;
                if (action.payload.pagination) {
                    state.pagination = action.payload.pagination;
                }
            })
            .addCase(fetchAdminBookings.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })

            // Fetch Resources
            .addCase(fetchAvailableVehicles.fulfilled, (state, action) => {
                state.availableVehicles = action.payload;
            })
            .addCase(fetchAvailableDrivers.fulfilled, (state, action) => {
                state.availableDrivers = action.payload;
            })

            // Actions
            .addCase(assignBooking.pending, (state) => { state.actionStatus = 'loading'; })
            .addCase(assignBooking.fulfilled, (state) => { state.actionStatus = 'succeeded'; })
            .addCase(assignBooking.rejected, (state) => { state.actionStatus = 'failed'; })

            .addCase(updateBookingStatus.pending, (state) => { state.actionStatus = 'loading'; })
            .addCase(updateBookingStatus.fulfilled, (state) => { state.actionStatus = 'succeeded'; })
            .addCase(updateBookingStatus.rejected, (state) => { state.actionStatus = 'failed'; })

            .addCase(startTrip.pending, (state) => { state.actionStatus = 'loading'; })
            .addCase(startTrip.fulfilled, (state) => { state.actionStatus = 'succeeded'; })
            .addCase(startTrip.rejected, (state) => { state.actionStatus = 'failed'; })

            .addCase(endTrip.pending, (state) => { state.actionStatus = 'loading'; })
            .addCase(endTrip.fulfilled, (state) => { state.actionStatus = 'succeeded'; })
            .addCase(endTrip.rejected, (state) => { state.actionStatus = 'failed'; })

            .addCase(completeTrip.pending, (state) => { state.actionStatus = 'loading'; })
            .addCase(completeTrip.fulfilled, (state) => { state.actionStatus = 'succeeded'; })
            .addCase(completeTrip.rejected, (state) => { state.actionStatus = 'failed'; })

            .addCase(generateTripInvoice.pending, (state) => { state.actionStatus = 'loading'; })
            .addCase(generateTripInvoice.fulfilled, (state) => { state.actionStatus = 'succeeded'; })
            .addCase(generateTripInvoice.rejected, (state) => { state.actionStatus = 'failed'; })

            // Payment actions
            .addCase(addPayment.pending, (state) => { state.paymentLoading = true; })
            .addCase(addPayment.fulfilled, (state) => { state.paymentLoading = false; })
            .addCase(addPayment.rejected, (state) => { state.paymentLoading = false; })

            .addCase(fetchPaymentHistory.pending, (state) => { state.paymentLoading = true; })
            .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
                state.paymentHistory = action.payload;
                state.paymentLoading = false;
            })
            .addCase(fetchPaymentHistory.rejected, (state) => { state.paymentLoading = false; })

            .addCase(fetchPaymentSummary.pending, (state) => { state.paymentLoading = true; })
            .addCase(fetchPaymentSummary.fulfilled, (state, action) => {
                state.paymentSummary = action.payload;
                state.paymentLoading = false;
            })
            .addCase(fetchPaymentSummary.rejected, (state) => { state.paymentLoading = false; });
    },
});

export const { selectBooking, resetActionStatus } = adminBookingsSlice.actions;

export const selectAdminBookings = (state: RootState) => state.adminBookings.bookings;
export const selectAdminBookingsStatus = (state: RootState) => state.adminBookings.status;
export const selectAdminBookingsError = (state: RootState) => state.adminBookings.error;
export const selectAdminBookingsPagination = (state: RootState) => state.adminBookings.pagination;
export const selectAvailableVehicles = (state: RootState) => state.adminBookings.availableVehicles;
export const selectAvailableDrivers = (state: RootState) => state.adminBookings.availableDrivers;
export const selectAdminActionStatus = (state: RootState) => state.adminBookings.actionStatus;
export const selectPaymentHistory = (state: RootState) => state.adminBookings.paymentHistory;
export const selectPaymentSummary = (state: RootState) => state.adminBookings.paymentSummary;
export const selectPaymentLoading = (state: RootState) => state.adminBookings.paymentLoading;

export default adminBookingsSlice.reducer;
