import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
import dashboardReducer from './slices/dashboardSlice';
import bookingsReducer from './slices/bookingsSlice';
import contractReducer from './slices/contractSlice';
import employeesReducer from './slices/employeeSlice';

import invoiceReducer from './slices/invoiceSlice';
import companyReportsReducer from './slices/companyReportsSlice';
import adminCompaniesReducer from './slices/adminCompaniesSlice';
import adminVehiclesReducer from './slices/adminVehiclesSlice';
import adminDriversReducer from './slices/adminDriversSlice';
import adminBookingsReducer from './slices/adminBookingsSlice';
import adminInvoicingReducer from './slices/adminInvoicingSlice';
import adminPricingReducer from './slices/adminPricingSlice';
import adminVendorsReducer from './slices/adminVendorsSlice';
import adminReportsReducer from './slices/adminReportsSlice';
import vendorContractsReducer from './slices/vendorContractsSlice';
import superAdminDashboardReducer from './slices/superAdminDashboardSlice';

export const store = configureStore({
    reducer: {
        company: companyReducer,
        dashboard: dashboardReducer,
        bookings: bookingsReducer,
        contract: contractReducer,
        employees: employeesReducer,
        invoices: invoiceReducer,
        companyReports: companyReportsReducer,
        adminCompanies: adminCompaniesReducer,
        adminVehicles: adminVehiclesReducer,
        adminDrivers: adminDriversReducer,
        adminBookings: adminBookingsReducer,
        adminInvoicing: adminInvoicingReducer,
        adminPricing: adminPricingReducer,
        adminVendors: adminVendorsReducer,
        adminReports: adminReportsReducer,
        vendorContracts: vendorContractsReducer,
        superAdminDashboard: superAdminDashboardReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
