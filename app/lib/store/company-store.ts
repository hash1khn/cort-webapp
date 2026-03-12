import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
import dashboardReducer from './slices/dashboardSlice';
import bookingsReducer from './slices/bookingsSlice';
import contractReducer from './slices/contractSlice';
import employeesReducer from './slices/employeeSlice';
import invoiceReducer from './slices/invoiceSlice';
import companyReportsReducer from './slices/companyReportsSlice';
import shuttleReportsReducer from './slices/shuttleReportsSlice';

export const companyStore = configureStore({
    reducer: {
        company: companyReducer,
        dashboard: dashboardReducer,
        bookings: bookingsReducer,
        contract: contractReducer,
        employees: employeesReducer,
        invoices: invoiceReducer,
        companyReports: companyReportsReducer,
        shuttleReports: shuttleReportsReducer,
    },
});

export type CompanyRootState = ReturnType<typeof companyStore.getState>;
export type CompanyDispatch = typeof companyStore.dispatch;
