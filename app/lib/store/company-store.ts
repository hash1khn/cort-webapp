import { configureStore } from '@reduxjs/toolkit';
import companyReducer from './slices/companySlice';
import dashboardReducer from './slices/dashboardSlice';
import bookingsReducer from './slices/bookingsSlice';
import contractReducer from './slices/contractSlice';
import employeesReducer from './slices/employeeSlice';

export const companyStore = configureStore({
    reducer: {
        company: companyReducer,
        dashboard: dashboardReducer,
        bookings: bookingsReducer,
        contract: contractReducer,
        employees: employeesReducer,
    },
});

export type CompanyRootState = ReturnType<typeof companyStore.getState>;
export type CompanyDispatch = typeof companyStore.dispatch;
