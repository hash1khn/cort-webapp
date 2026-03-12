import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
import dashboardReducer from './slices/dashboardSlice';
import bookingsReducer from './slices/bookingsSlice';
import contractReducer from './slices/contractSlice';
import employeesReducer from './slices/employeeSlice';

import adminCompaniesReducer from './slices/adminCompaniesSlice';
import adminVehiclesReducer from './slices/adminVehiclesSlice';
import adminDriversReducer from './slices/adminDriversSlice';
import adminPricingReducer from './slices/adminPricingSlice';
import adminVendorsReducer from './slices/adminVendorsSlice';
import superAdminDashboardReducer from './slices/superAdminDashboardSlice';
import vendorLogsReducer from './slices/vendorLogsSlice';
import adminRoutesReducer from './slices/adminRoutesSlice';

export const store = configureStore({
    reducer: {
        company: companyReducer,
        dashboard: dashboardReducer,
        bookings: bookingsReducer,
        contract: contractReducer,
        employees: employeesReducer,
        adminCompanies: adminCompaniesReducer,
        adminVehicles: adminVehiclesReducer,
        adminDrivers: adminDriversReducer,
        adminPricing: adminPricingReducer,
        adminVendors: adminVendorsReducer,
        superAdminDashboard: superAdminDashboardReducer,
        vendorLogs: vendorLogsReducer,
        adminRoutes: adminRoutesReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
