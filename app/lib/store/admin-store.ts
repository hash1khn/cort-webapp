import { configureStore } from '@reduxjs/toolkit';
import adminCompaniesReducer from './slices/adminCompaniesSlice';
import adminVehiclesReducer from './slices/adminVehiclesSlice';
import adminDriversReducer from './slices/adminDriversSlice';
import adminBookingsReducer from './slices/adminBookingsSlice';
import adminInvoicingReducer from './slices/adminInvoicingSlice';
import adminPricingReducer from './slices/adminPricingSlice';
import adminVendorsReducer from './slices/adminVendorsSlice';
import adminReportsReducer from './slices/adminReportsSlice';
import superAdminDashboardReducer from './slices/superAdminDashboardSlice';
import vendorLogsReducer from './slices/vendorLogsSlice';
import expensesReducer from './slices/expensesSlice';
import adminRoutesReducer from './slices/adminRoutesSlice';
import employeesReducer from './slices/employeeSlice';

export const adminStore = configureStore({
    reducer: {
        adminCompanies: adminCompaniesReducer,
        adminVehicles: adminVehiclesReducer,
        adminDrivers: adminDriversReducer,
        adminBookings: adminBookingsReducer,
        adminInvoicing: adminInvoicingReducer,
        adminPricing: adminPricingReducer,
        adminVendors: adminVendorsReducer,
        adminReports: adminReportsReducer,
        superAdminDashboard: superAdminDashboardReducer,
        vendorLogs: vendorLogsReducer,
        expenses: expensesReducer,
        adminRoutes: adminRoutesReducer,
        employees: employeesReducer,
    },
});

export type AdminRootState = ReturnType<typeof adminStore.getState>;
export type AdminDispatch = typeof adminStore.dispatch;
