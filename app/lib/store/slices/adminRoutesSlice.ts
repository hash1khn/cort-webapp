import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { apiClient } from '../../services/api-client';

// Define Route interface based on API response
export interface RouteStop {
    id: number;
    route_id: number;
    name: string;
    sequence_order: number;
    lat: number;
    lng: number;
    morning_eta?: string;
    evening_eta?: string;
}

export interface Route {
    id: number;
    name: string;
    company_id: number | null;
    status: 'ACTIVE' | 'INACTIVE';
    created_at: string;
    updated_at: string;
    route_stops?: RouteStop[];
    company?: {
        id: number;
        name: string;
    };
    assigned_vehicle_id?: number;
    assigned_driver_id?: string;
    vehicles?: {
        plate_number: string;
        model: string;
    };
    users?: {
        full_name: string;
        phone: string;
    };
}

export interface CreateRouteRequest {
    name: string;
    company_id: number;
    assigned_vehicle_id?: number;
    assigned_driver_id?: string;
    stops: {
        name: string;
        lat: number;
        lng: number;
        morning_eta?: string;
        evening_eta?: string;
        sequence_order: number;
    }[];
}

// Employee Assignment Interface
export interface EmployeeAssignment {
    user_id: string;
    route_id: number;
    pickup_stop_id: number;
    users?: {
        full_name: string;
        email: string;
        phone: string;
    };
    route_stops?: {
        name: string;
    };
}

export interface AssignEmployeeRequest {
    user_id: string;
    route_id: number;
    pickup_stop_id: number;
}

interface AdminRoutesState {
    routes: Route[];
    currentRoute: Route | null; // For detail view
    assignments: EmployeeAssignment[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error: string | null;
    actionStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
    actionError: string | null;
    assignmentStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
}

const initialState: AdminRoutesState = {
    routes: [],
    currentRoute: null,
    assignments: [],
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
    assignmentStatus: 'idle',
};

// Async Thunks

export const fetchAdminRoute = createAsyncThunk(
    'adminRoutes/fetchRoute',
    async (id: number, { rejectWithValue }) => {
        try {
            // Assuming this endpoint exists, or we use request
            return await apiClient.request<Route>(`/routes/${id}`);
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch route');
        }
    }
);

export const fetchAdminRoutes = createAsyncThunk(
    'adminRoutes/fetchRoutes',
    async (params: { company_id?: number } = {}, { rejectWithValue }) => {
        try {
            const query = new URLSearchParams();
            if (params.company_id) query.append('company_id', params.company_id.toString());

            return await apiClient.request<Route[]>(`/routes?${query.toString()}`);
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch routes');
        }
    }
);

export const createAdminRoute = createAsyncThunk(
    'adminRoutes/createRoute',
    async (data: CreateRouteRequest, { rejectWithValue }) => {
        try {
            return await apiClient.request<Route>('/routes', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to create route');
        }
    }
);


export const updateAdminRoute = createAsyncThunk(
    'adminRoutes/updateRoute',
    async ({ id, data }: { id: number; data: Partial<CreateRouteRequest> }, { rejectWithValue }) => {
        try {
            return await apiClient.request<Route>(`/routes/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to update route');
        }
    }
);

export const deleteAdminRoute = createAsyncThunk(
    'adminRoutes/deleteRoute',
    async (id: number, { rejectWithValue }) => {
        try {
            await apiClient.request<void>(`/routes/${id}`, {
                method: 'DELETE',
            });
            return id;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to delete route');
        }
    }
);

// Assignment Thunks
export const fetchRouteAssignments = createAsyncThunk(
    'adminRoutes/fetchAssignments',
    async (routeId: number, { rejectWithValue }) => {
        try {
            return await apiClient.request<EmployeeAssignment[]>(`/employee-route-assignments/route/${routeId}`);
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to fetch assignments');
        }
    }
);

export const assignEmployeeToRoute = createAsyncThunk(
    'adminRoutes/assignEmployee',
    async (data: AssignEmployeeRequest, { rejectWithValue }) => {
        try {
            return await apiClient.request<EmployeeAssignment>('/employee-route-assignments/assign', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to assign employee');
        }
    }
);

export const removeEmployeeFromRoute = createAsyncThunk(
    'adminRoutes/removeEmployee',
    async (userId: string, { rejectWithValue }) => {
        try {
            await apiClient.request<void>(`/employee-route-assignments/remove/${userId}`, {
                method: 'DELETE',
            });
            return userId;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to remove employee assignment');
        }
    }
);


// Stop Management Thunks
export const createRouteStop = createAsyncThunk(
    'adminRoutes/createRouteStop',
    async ({ routeId, data }: { routeId: number; data: any }, { rejectWithValue }) => {
        try {
            return await apiClient.request<RouteStop>(`/routes/${routeId}/stops`, {
                method: 'POST',
                body: JSON.stringify(data),
            });
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to create stop');
        }
    }
);

export const updateRouteStop = createAsyncThunk(
    'adminRoutes/updateRouteStop',
    async ({ stopId, data }: { stopId: number; data: any }, { rejectWithValue }) => {
        try {
            return await apiClient.request<RouteStop>(`/routes/stops/${stopId}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            });
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to update stop');
        }
    }
);

export const deleteRouteStop = createAsyncThunk(
    'adminRoutes/deleteRouteStop',
    async (stopId: number, { rejectWithValue }) => {
        try {
            await apiClient.request<void>(`/routes/stops/${stopId}`, {
                method: 'DELETE',
            });
            return stopId;
        } catch (err: any) {
            return rejectWithValue(err.message || 'Failed to delete stop');
        }
    }
);

export const adminRoutesSlice = createSlice({
    name: 'adminRoutes',
    initialState,
    reducers: {
        resetRouteActionStatus: (state) => {
            state.actionStatus = 'idle';
            state.actionError = null;
        },
        resetAssignmentStatus: (state) => {
            state.assignmentStatus = 'idle';
        },
        clearCurrentRoute: (state) => {
            state.currentRoute = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Routes
            .addCase(fetchAdminRoutes.pending, (state) => {
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchAdminRoutes.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.routes = action.payload;
            })
            .addCase(fetchAdminRoutes.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            // Fetch Single Route
            .addCase(fetchAdminRoute.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(fetchAdminRoute.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.currentRoute = action.payload;
            })
            .addCase(fetchAdminRoute.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.payload as string;
            })
            // Create Route
            .addCase(createAdminRoute.pending, (state) => {
                state.actionStatus = 'loading';
                state.actionError = null;
            })
            .addCase(createAdminRoute.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                state.routes.push(action.payload);
            })
            .addCase(createAdminRoute.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.actionError = action.payload as string;
            })
            // Update Route
            .addCase(updateAdminRoute.pending, (state) => {
                state.actionStatus = 'loading';
                state.actionError = null;
            })
            .addCase(updateAdminRoute.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                // Update in list
                const index = state.routes.findIndex(r => r.id === action.payload.id);
                if (index !== -1) {
                    state.routes[index] = action.payload;
                }
                // Update currentRoute if it matches
                if (state.currentRoute && state.currentRoute.id === action.payload.id) {
                    state.currentRoute = { ...state.currentRoute, ...action.payload };
                }
            })
            .addCase(updateAdminRoute.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.actionError = action.payload as string;
            })
            // Delete Route
            .addCase(deleteAdminRoute.pending, (state) => {
                state.actionStatus = 'loading';
                state.actionError = null;
            })
            .addCase(deleteAdminRoute.fulfilled, (state, action) => {
                state.actionStatus = 'succeeded';
                state.routes = state.routes.filter(r => r.id !== action.payload);
            })
            .addCase(deleteAdminRoute.rejected, (state, action) => {
                state.actionStatus = 'failed';
                state.actionError = action.payload as string;
            })
            // Assignments
            .addCase(fetchRouteAssignments.fulfilled, (state, action) => {
                state.assignments = action.payload;
            })
            .addCase(assignEmployeeToRoute.pending, (state) => {
                state.assignmentStatus = 'loading';
            })
            .addCase(assignEmployeeToRoute.fulfilled, (state, action) => {
                state.assignmentStatus = 'succeeded';
                // Optimistically add to list if it belongs to current route
                state.assignments.push(action.payload);
            })
            .addCase(assignEmployeeToRoute.rejected, (state, action) => {
                state.assignmentStatus = 'failed';
            })
            .addCase(removeEmployeeFromRoute.fulfilled, (state, action) => {
                state.assignments = state.assignments.filter(a => a.user_id !== action.payload);
            })
            // Stop Management
            .addCase(createRouteStop.fulfilled, (state, action) => {
                if (state.currentRoute) {
                    state.currentRoute.route_stops = [...(state.currentRoute.route_stops || []), action.payload];
                    state.currentRoute.route_stops.sort((a, b) => a.sequence_order - b.sequence_order);
                }
            })
            .addCase(updateRouteStop.fulfilled, (state, action) => {
                if (state.currentRoute && state.currentRoute.route_stops) {
                    const index = state.currentRoute.route_stops.findIndex(s => s.id === action.payload.id);
                    if (index !== -1) {
                        state.currentRoute.route_stops[index] = action.payload;
                        state.currentRoute.route_stops.sort((a, b) => a.sequence_order - b.sequence_order);
                    }
                }
            })
            .addCase(deleteRouteStop.fulfilled, (state, action) => {
                if (state.currentRoute && state.currentRoute.route_stops) {
                    state.currentRoute.route_stops = state.currentRoute.route_stops.filter(s => s.id !== action.payload);
                }
            });
    },
});

export const { resetRouteActionStatus, resetAssignmentStatus, clearCurrentRoute } = adminRoutesSlice.actions;

export const selectAdminRoutes = (state: RootState) => state.adminRoutes.routes;
export const selectCurrentRoute = (state: RootState) => state.adminRoutes.currentRoute;
export const selectRouteAssignments = (state: RootState) => state.adminRoutes.assignments;
export const selectAdminRoutesStatus = (state: RootState) => state.adminRoutes.status;
export const selectAdminRoutesError = (state: RootState) => state.adminRoutes.error;
export const selectAdminRoutesActionStatus = (state: RootState) => state.adminRoutes.actionStatus;
export const selectAssignmentStatus = (state: RootState) => state.adminRoutes.assignmentStatus;

export default adminRoutesSlice.reducer;
