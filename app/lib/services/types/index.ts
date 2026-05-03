// Barrel file — re-exports all domain types for convenient imports

// Common
export type { PaginatedResponse } from './common';

// Auth (re-export from existing auth-types)
export type { LoginRequest, LoginResponse, ProfileResponse, SignupRequest } from '../../types/auth-types';

// Companies
export type {
    CreateCompanyRequest,
    UpdateCompanyRequest,
    QueryCompanyParams,
    VehicleWhitelist,
    Company,
    CompanyResponse,
} from './companies';

// Employees
export type {
    CreateEmployeeRequest,
    UpdateEmployeeRequest,
    Employee,
    QueryEmployeeParams,
    EmployeeResponse,
} from './employees';

// Drivers
export {
    DriverType,
    DriverStatus,
    DriverStatusAction,
} from './drivers';
export type {
    CreateDriverRequest,
    UpdateDriverRequest,
    UpdateDriverStatusRequest,
    QueryDriverParams,
    Driver,
    DriverResponse,
    RideReview,
} from './drivers';

// Vehicles
export {
    VehicleCategory,
    OwnershipType,
} from './vehicles';
export type {
    CreateVehicleRequest,
    UpdateVehicleRequest,
    QueryVehicleParams,
    Vehicle,
    VehicleResponse,
} from './vehicles';

// Vendors
export {
    ContractStatus,
} from './vendors';
export type {
    CreateVendorRequest,
    UpdateVendorRequest,
    QueryVendorParams,
    Vendor,
    VendorResponse,
    CreateVendorContractRequest,
    UpdateVendorContractRequest,
    QueryVendorContractParams,
    VendorContract,
    VendorContractResponse,
    QueryVendorLogsParams,
    VendorStats,
    VendorStatsResponse,
    VendorLog,
    VendorLogsResponse,
    BulkPayVendorLogsDto,
    CreateVendorPaymentRequest,
    VendorPaymentTransaction,
} from './vendors';

// Bookings
export {
    BookingType,
    PackageType,
    TripType,
    TripStatus,
} from './bookings';
export type {
    PickupLocation,
    CreateChauffeurBookingRequest,
    ChauffeurBooking,
    ChauffeurTripLog,
    DailyTripLog,
    ChauffeurTripDailyLog,
    QueryChauffeurBookingParams,
    ChauffeurBookingResponse,
    PaymentTransaction,
    PaymentSummary,
    AddPaymentRequest,
} from './bookings';

// Pricing / Contracts
export type {
    ChauffeurContractRate,
    ChauffeurContract,
    CreateChauffeurContractRequest,
    UpdateChauffeurContractRequest,
    ChauffeurContractResponse,
    SingleChauffeurContractResponse,
    SystemSetting,
    SystemSettingResponse,
    ShuttleContractRoute,
    ShuttleContract,
    CreateShuttleContractRequest,
    FixedTermContract,
    FixedTermContractPayment,
    CreateFixedTermContractRequest,
    UpdateFixedTermContractRequest,
    SettleFixedTermContractRequest,
} from './pricing';

// Fleet (Fuel & Maintenance)
export {
    MaintenanceType,
} from './fleet';
export type {
    CreateFuelRecordRequest,
    BulkPayFuelRequest,
    UpdateFuelRecordRequest,
    QueryFuelRecordParams,
    FuelRecord,
    FuelRecordResponse,
    FuelStatsResponse,
    CreateMaintenanceRecordRequest,
    UpdateMaintenanceRecordRequest,
    QueryMaintenanceRecordParams,
    MaintenanceRecord,
    MaintenanceRecordResponse,
    UpcomingMaintenanceResponse,
} from './fleet';

// Invoices
export type {
    QueryInvoiceParams,
    Invoice,
} from './invoices';

// Reports
export type {
    ChauffeurReport,
    ShuttleReport,
    ShuttlePassengerLog,
    ReportQueryParams,
} from './reports';

// Expenses
export {
    ExpenseCategory,
} from './expenses';
export type {
    Expense,
    CreateExpenseRequest,
    ExpenseFilterParams,
} from './expenses';

// Multi-mode fleet platform
export type {
    Pagination,
    CompanyFeatureKey,
    CompanyFeature,
    ExternalVendor,
    CompanyVendorLink,
    VendorDashboardStats,
    BookingVendorRequest,
    VendorVehicle,
    VendorDriver,
    VendorRoute,
    PoolVehicle,
    PoolDriver,
    TrackerConfig,
} from './multi-mode';
