import { configureStore } from '@reduxjs/toolkit';
import adminCompaniesReducer from './slices/adminCompaniesSlice';
import adminVehiclesReducer from './slices/adminVehiclesSlice';
import adminDriversReducer from './slices/adminDriversSlice';
import adminPricingReducer from './slices/adminPricingSlice';
import adminVendorsReducer from './slices/adminVendorsSlice';
import superAdminDashboardReducer from './slices/superAdminDashboardSlice';
import vendorLogsReducer from './slices/vendorLogsSlice';
import adminRoutesReducer from './slices/adminRoutesSlice';
import employeesReducer from './slices/employeeSlice';

export const adminStore = configureStore({
    reducer: {
        adminCompanies: adminCompaniesReducer,
        adminVehicles: adminVehiclesReducer,
        adminDrivers: adminDriversReducer,
        adminPricing: adminPricingReducer,
        adminVendors: adminVendorsReducer,
        superAdminDashboard: superAdminDashboardReducer,
        vendorLogs: vendorLogsReducer,
        adminRoutes: adminRoutesReducer,
        employees: employeesReducer,
    },
});

export type AdminRootState = ReturnType<typeof adminStore.getState>;
export type AdminDispatch = typeof adminStore.dispatch;
