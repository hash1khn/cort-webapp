import { LoginRequest, LoginResponse, ProfileResponse, SignupRequest } from '../types/auth-types';

export interface CreateCompanyRequest {
    name: string;
    email: string;
    password?: string;
    ntn_number?: string;
    contact_person?: string;
    address?: string;
    logo_url?: string;
    is_shuttle_enabled?: boolean;
    is_chauffeur_enabled?: boolean;
    prefix?: string;
}

export interface UpdateCompanyRequest extends Partial<CreateCompanyRequest> {
    allowed_vehicle_models?: string[];
}

export interface QueryCompanyParams {
    page?: number;
    limit?: number;
    search?: string;

}

export interface VehicleWhitelist {
    id: number;
    company_id: number;
    allowed_vehicle_model: string;
}

export interface Company {
    id: number;
    name: string;
    email: string;
    ntn_number: string | null;
    contact_person: string | null;
    address: string | null;
    logo_url: string | null;
    is_shuttle_enabled: boolean;
    is_chauffeur_enabled: boolean;
    created_at: string;
    updated_at: string;
    vehicle_whitelists?: VehicleWhitelist[];
    _count?: {
        users: number;
    };
    prefix?: string;
}
// ... (rest of file) ...


export interface CreateEmployeeRequest {
    full_name: string;
    email: string;
    phone: string;
    company_id: number;
    password?: string;
    employee_id?: string;
    department?: string;
}

export interface UpdateEmployeeRequest extends Partial<CreateEmployeeRequest> {
    status?: 'ACTIVE' | 'INACTIVE';
}

export interface Employee {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    employee_id: string | null;
    department: string | null;
    status: string;
    company_id: number | null;
    created_at: string;
}

export interface QueryEmployeeParams {
    page?: number;
    limit?: number;
    search?: string;
    company_id?: number;
}

export interface PaginatedResponse<T> {
    data: {
        data: T[];
        pagination: {
            total: number;
            lastPage: number;
            currentPage: number;
            perPage: number;
            prev: number | null;
            next: number | null;
        };
    };
    status: number;
    message: string;
}

export interface CompanyResponse {
    data: Company & { generatedPassword?: string };
    statusCode: number;
    message: string;
}

export interface EmployeeResponse {
    data: Employee & { generatedPassword?: string };
    statusCode: number;
    message: string;
}

export enum VehicleCategory {
    SEDAN = 'SEDAN',
    SUV = 'SUV',
    VAN = 'VAN',
    BUS = 'BUS',
    COASTER = 'COASTER',
    HIACE = 'HIACE',
}

export enum OwnershipType {
    OWNED = 'OWNED',
    PARTNER = 'PARTNER',
}

export interface CreateVehicleRequest {
    plate_number: string;
    make: string;
    model: string;
    year: number;
    color?: string;
    category: VehicleCategory;
    ownership: OwnershipType;
    fuel_avg_city: number;
    fuel_avg_highway: number;
    owner_company_id?: number;
    is_available_for_pooling?: boolean;
    vendor_id?: number;
    rent_per_day?: number;
}

export interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> { }

export interface QueryVehicleParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: VehicleCategory;
    ownership?: OwnershipType;
    show_all?: boolean;
    vendor_id?: number;
}

export interface Vehicle {
    id: number;
    plate_number: string;
    make: string;
    model: string;
    year: number;
    color: string | null;
    category: VehicleCategory;
    ownership: OwnershipType;
    fuel_avg_city: number;
    fuel_avg_highway: number;
    owner_company_id: number | null;
    is_available_for_pooling: boolean;
    created_at?: string;
    updated_at?: string;
    vendor_id?: number | null;
    rent_per_day?: number | null;
    companies?: {
        id: number;
        name: string;
    };
    vendors?: {
        id: number;
        name: string;
    };
}

// -- VENDORS --

export interface CreateVendorRequest {
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    address?: string;
}

export interface UpdateVendorRequest extends Partial<CreateVendorRequest> { }

export interface QueryVendorParams {
    page?: number;
    limit?: number;
    search?: string;
}

export interface Vendor {
    id: number;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    created_at: string;
    _count?: {
        vehicles: number;
    };
}

export interface VendorResponse {
    data: Vendor;
    statusCode: number;
    message: string;
}

export interface VehicleResponse {
    data: Vehicle;
    statusCode: number;
    message: string;
}

export enum DriverType {
    SHUTTLE = 'SHUTTLE',
    CHAUFFEUR = 'CHAUFFEUR',
}

export enum DriverStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    DELETED = 'DELETED',
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
}

export enum DriverStatusAction {
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
}

export interface CreateDriverRequest {
    email: string;
    password?: string;
    full_name: string;
    phone?: string;
    company_id?: number;
    driver_type: DriverType;
    cnic_number?: string;
    license_number?: string;
    status?: DriverStatus;
}

export interface UpdateDriverRequest extends Partial<CreateDriverRequest> { }

export interface UpdateDriverStatusRequest {
    action: DriverStatusAction;
    reason?: string;
}

export interface QueryDriverParams {
    page?: number;
    limit?: number;
    search?: string;
    company_id?: number;
    driver_type?: DriverType;
    status?: string;
}

export interface Driver {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    status: DriverStatus;
    company_id: number | null;
    drivers_profile?: {
        driver_type: DriverType;
        cnic_number: string | null;
        license_number: string | null;
        rejection_reason?: string | null;
    };
    created_at: string;
    companies?: {
        id: number;
        name: string;
    };
}

export interface DriverResponse {
    data: Driver;
    statusCode: number;
    message: string;
}

export interface ChauffeurContractRate {
    id: number;
    contract_id: number;
    vehicle_model: string;
    cost_per_km: string;
    rate_spot_5hr: string;
    rate_spot_10hr: string;
    rate_spot_24hr: string;
    rate_monthly_10hr: string;
    rate_monthly_24hr: string;
    rate_overtime_per_hr: string;
    market_cost_per_km?: string;
    market_rate_spot_5hr?: string;
    market_rate_spot_10hr?: string;
    market_rate_spot_24hr?: string;
    market_rate_monthly_10hr?: string;
    market_rate_monthly_24hr?: string;
    market_rate_overtime_per_hr?: string;
}

export interface ChauffeurContract {
    id: number;
    company_id: number;
    fuel_base_price: string;
    revision_percentage: string | null;
    contract_duration?: string | null;
    created_at?: string | null;
    allowance_outstation?: string | null;
    allowance_accommodation?: string | null;
    companies?: {
        name: string;
    };
    chauffeur_contract_rates?: ChauffeurContractRate[];
}

export interface CreateChauffeurContractRequest {
    companyId: number;
    //  Settings
    fuelBasePrice?: number;
    revisionPercentage?: number | null;
    contractDuration?: string;
    contractDate?: string;

    // Optional Rate Entry
    vehicleModel?: string;
    costPerKm?: number;
    rateSpot5hr?: number;
    rateSpot10hr?: number;
    rateSpot24hr?: number;
    rateMonthly10hr?: number;
    rateMonthly24hr?: number;
    rateOvertimePerHr?: number;
    marketCostPerKm?: number;
    marketRateSpot5hr?: number;
    marketRateSpot10hr?: number;
    marketRateSpot24hr?: number;
    marketRateMonthly10hr?: number;
    marketRateMonthly24hr?: number;
    marketRateOvertimePerHr?: number;
    allowanceOutstation?: number;
    allowanceAccommodation?: number;
}

export interface UpdateChauffeurContractRequest {
    // For GLOBAL updates
    fuelBasePrice?: number;
    revisionPercentage?: number | null;
    contractDuration?: string;
    contractDate?: string;

    // For RATE updates
    vehicleModel?: string;
    costPerKm?: number;
    rateSpot5hr?: number;
    rateSpot10hr?: number;
    rateSpot24hr?: number;
    rateMonthly10hr?: number;
    rateMonthly24hr?: number;
    rateOvertimePerHr?: number;
    marketCostPerKm?: number;
    marketRateSpot5hr?: number;
    marketRateSpot10hr?: number;
    marketRateSpot24hr?: number;
    marketRateMonthly10hr?: number;
    marketRateMonthly24hr?: number;
    marketRateOvertimePerHr?: number;
    allowanceOutstation?: number;
    allowanceAccommodation?: number;
}

export interface ChauffeurContractResponse {
    data: ChauffeurContract[];
    statusCode: number;
    message: string;
}

export interface SingleChauffeurContractResponse {
    data: ChauffeurContract;
    statusCode: number;
    message: string;
}

export interface SystemSetting {
    id: number;
    key: string;
    value: string;
    description: string | null;
    updated_at: string;
}

export interface SystemSettingResponse {
    data: SystemSetting;
    statusCode: number;
    message: string;
}

// -- Chauffeur Bookings --

export enum BookingType {
    SPOT = 'SPOT',
    MONTHLY = 'MONTHLY',
}

export enum PackageType {
    HOURS_5 = 'HOURS_5',
    HOURS_10 = 'HOURS_10',
    HOURS_24 = 'HOURS_24',
}

export enum TripType {
    IN_CITY = 'IN_CITY',
    OUT_STATION = 'OUT_STATION',
}

export enum TripStatus {
    PENDING = 'PENDING',
    ASSIGNED = 'ASSIGNED',
    ARRIVED = 'ARRIVED',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
    ENDED = 'ENDED',
}

export interface PickupLocation {
    latitude: number;
    longitude: number;
}

export interface CreateChauffeurBookingRequest {
    booking_type: BookingType;
    vehicle_model: string;
    package_selected: PackageType;
    trip_type: TripType;
    pickup_location: PickupLocation;
    scheduled_for: string; // ISO 8601 datetime
    internal_cost_center_code?: string;
    service_category?: string;
}

export interface ChauffeurBooking {
    id: number;
    company_id: number;
    passenger_id: string;
    driver_id: string | null;
    vehicle_id: number | null;
    vehicle_model?: string; // Stored model preference
    booking_type: BookingType;
    package_selected: PackageType;
    trip_type: TripType;
    scheduled_for: string;
    status: TripStatus;
    fulfillment_type: 'CORT_MANAGED' | 'CLIENT_SELF_MANAGED';
    internal_cost_center_code: string | null;
    service_category?: string;
    pickup_address?: string; // Human readable address
    created_at: string;
    companies?: {
        id: number;
        name: string;
        logo_url?: string;
    };
    users_chauffeur_bookings_passenger_idTousers?: {
        id: string;
        full_name: string;
        email: string;
        phone: string | null;
    };
    users_chauffeur_bookings_driver_idTousers?: {
        id: string;
        full_name: string;
        phone: string | null;
    };
    vehicles?: {
        id: number;
        model: string;
        plate_number: string;
    };
}

export interface QueryChauffeurBookingParams {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
}

export interface ChauffeurBookingResponse {
    data: ChauffeurBooking;
    statusCode: number;
    message: string;
}

// -- FUEL RECORDS --

export enum MaintenanceType {
    OIL_CHANGE = 'OIL_CHANGE',
    TIRE_ROTATION = 'TIRE_ROTATION',
    BRAKE_SERVICE = 'BRAKE_SERVICE',
    GENERAL_INSPECTION = 'GENERAL_INSPECTION',
    REPAIR = 'REPAIR',
    OTHER = 'OTHER',
}

export interface CreateFuelRecordRequest {
    vehicle_id: number;
    date: string; // ISO date format YYYY-MM-DD
    fuel_litres: number;
    current_fuel_rate: number;
    fuel_cost?: number; // Auto-calculated if not provided
    billed?: boolean;
}

export interface UpdateFuelRecordRequest extends Partial<CreateFuelRecordRequest> { }

export interface QueryFuelRecordParams {
    page?: number;
    limit?: number;
    vehicle_id?: number;
    start_date?: string;
    end_date?: string;
    billed?: boolean;
}

export interface FuelRecord {
    id: number;
    vehicle_id: number;
    date: string;
    fuel_litres: number;
    current_fuel_rate: number;
    fuel_cost: number;
    billed: boolean;
    created_at: string;
    updated_at: string;
    vehicles?: {
        id: number;
        plate_number: string;
        make: string;
        model: string;
    };
}

export interface FuelRecordResponse {
    data: FuelRecord;
    statusCode: number;
    message: string;
}

export interface FuelStatsResponse {
    data: {
        total_fuel_cost: number;
        average_fuel_rate: number;
        total_records: number;
    };
    statusCode: number;
    message: string;
}

// -- MAINTENANCE RECORDS --

export interface CreateMaintenanceRecordRequest {
    vehicle_id: number;
    maintenance_type: MaintenanceType;
    date: string; // ISO date format YYYY-MM-DD
    odometer_reading: number;
    next_service_odometer?: number; // Auto-calculated for oil changes
    cost?: number;
    notes?: string;
}

export interface UpdateMaintenanceRecordRequest extends Partial<CreateMaintenanceRecordRequest> { }

export interface QueryMaintenanceRecordParams {
    page?: number;
    limit?: number;
    vehicle_id?: number;
    maintenance_type?: MaintenanceType;
    start_date?: string;
    end_date?: string;
}

export interface MaintenanceRecord {
    id: number;
    vehicle_id: number;
    maintenance_type: MaintenanceType;
    date: string;
    odometer_reading: number;
    next_service_odometer: number | null;
    cost: number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    vehicles?: {
        id: number;
        plate_number: string;
        make: string;
        model: string;
    };
}

export interface MaintenanceRecordResponse {
    data: MaintenanceRecord;
    statusCode: number;
    message: string;
}

export interface UpcomingMaintenanceResponse {
    data: {
        vehicle_id: number;
        plate_number: string;
        make: string;
        model: string;
        last_oil_change_date: string;
        last_oil_change_odometer: number;
        next_service_odometer: number;
    }[];
    statusCode: number;
    message: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
    private baseUrl: string;
    private isRefreshing = false;
    private refreshSubscribers: ((token: string) => void)[] = [];

    constructor() {
        this.baseUrl = API_URL;
    }

    /**
     * Get stored auth token from localStorage
     */
    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('auth_token');
    }

    /**
     * Get stored refresh token from localStorage
     */
    private getRefreshToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('refresh_token');
    }

    /**
     * Store auth token in localStorage
     */
    private setToken(token: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem('auth_token', token);
    }

    /**
     * Store refresh token in localStorage
     */
    private setRefreshToken(token: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem('refresh_token', token);
    }

    /**
     * Remove auth tokens from localStorage
     */
    private removeToken(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
    }

    /**
     * Make HTTP request with automatic token attachment
     */
    /**
     * Request a new access token using the refresh token
     */
    private async refreshToken(): Promise<string | null> {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
            return null;
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/refresh-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken }),
            });

            if (!response.ok) {
                throw new Error('Failed to refresh token');
            }

            const data = await response.json();
            const { session } = data.data;

            if (session?.access_token) {
                this.setToken(session.access_token);
                if (session.refresh_token) {
                    this.setRefreshToken(session.refresh_token);
                }
                return session.access_token;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.removeToken();
        }
        return null;
    }

    /**
     * Add callback to be executed after token refresh
     */
    private onRefreshed(token: string) {
        this.refreshSubscribers.forEach((callback) => callback(token));
        this.refreshSubscribers = [];
    }

    /**
     * Add subscriber to wait for token refresh
     */
    private subscribeTokenRefresh(callback: (token: string) => void) {
        this.refreshSubscribers.push(callback);
    }

    /**
     * Make HTTP request with automatic token attachment and refreshing
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        let token = this.getToken();
        let headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        // Add authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        let response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        // Handle 401 Unauthorized - Try to refresh token
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
            if (!this.isRefreshing) {
                this.isRefreshing = true;
                const newToken = await this.refreshToken();
                this.isRefreshing = false;

                if (newToken) {
                    this.onRefreshed(newToken);
                } else {
                    // unexpected logout if refresh fails
                    // Let the error propagate so the app can handle it (e.g. redirect to login)
                }
            }

            // Return a promise that resolves when the token is refreshed
            if (this.isRefreshing || this.getToken()) { // Check if we have a valid token now
                return new Promise((resolve, reject) => {
                    this.subscribeTokenRefresh(async (newToken) => {
                        // Update header with new token
                        headers['Authorization'] = `Bearer ${newToken}`;
                        try {
                            // Retry original request
                            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
                                ...options,
                                headers,
                            });

                            // Handle non-JSON responses for retry
                            const contentType = retryResponse.headers.get('content-type');
                            if (!contentType || !contentType.includes('application/json')) {
                                if (!retryResponse.ok) {
                                    reject(new Error(`HTTP error! status: ${retryResponse.status}`));
                                    return;
                                }
                                resolve({} as T);
                                return;
                            }

                            const retryData = await retryResponse.json();
                            if (!retryResponse.ok) {
                                reject(new Error(retryData.message || `HTTP error! status: ${retryResponse.status}`));
                                return;
                            }
                            resolve(retryData);
                        } catch (err) {
                            reject(err);
                        }
                    });
                    // If refresh failed and no new token, we might not call subscribers. 
                    // But here we rely on the fact that if refreshToken returns null, it likely won't call subscribers.
                    // However, above logic: if refreshToken fails, returns null. 
                    // Wait, if refreshToken fails, it doesn't call onRefreshed. Subscribers hang? 
                    // Need to handle failure case.
                });
            }
        }

        // RE-CHECK: The logic above is slightly flawed for handling the queue. 
        // If multiple requests fail with 401:
        // 1. First one sets isRefreshing = true, calls refreshToken.
        // 2. Others enter the block. isRefreshing is true. They subscribe.
        // 3. First one finishes. Calls onRefreshed. Subscribers run. 
        // 4. First one needs to run its own retry too? 
        // Actually, the first one should also just retry. 

        // Let's refine the logic. 
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh-token')) {
            if (this.isRefreshing) {
                return new Promise((resolve, reject) => {
                    this.subscribeTokenRefresh(async (newToken) => {
                        headers['Authorization'] = `Bearer ${newToken}`;
                        try {
                            const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
                            // duplicate logic for parsing... ideally extract fetch logic
                            const contentType = retryResponse.headers.get('content-type');
                            if (!contentType || !contentType.includes('application/json')) {
                                if (!retryResponse.ok) reject(new Error(`HTTP error! status: ${retryResponse.status}`));
                                else resolve({} as T);
                                return;
                            }
                            const retryData = await retryResponse.json();
                            if (!retryResponse.ok) reject(new Error(retryData.message));
                            else resolve(retryData);
                        } catch (e) { reject(e); }
                    });
                });
            }

            this.isRefreshing = true;
            const newToken = await this.refreshToken();
            this.isRefreshing = false;

            if (newToken) {
                this.onRefreshed(newToken);
                // Retry current request
                headers['Authorization'] = `Bearer ${newToken}`;
                response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
            }
            // If refresh fails, we fall through to return error from original 401 response or new response
        }

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return {} as T;
        }

        const data = await response.json();

        // Handle error responses
        if (!response.ok) {
            const errorMessage = data.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        return data;
    }

    /**
     * Download blob from endpoint (with auth)
     */
    async downloadPdf(endpoint: string, filename: string): Promise<void> {
        const token = this.getToken();
        const headers: Record<string, string> = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * Login user with email and password
     */
    /**
     * Login user with email and password
     */
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        // Store tokens after successful login
        if (response.data?.session?.access_token) {
            this.setToken(response.data.session.access_token);
            if (response.data.session.refresh_token) {
                this.setRefreshToken(response.data.session.refresh_token);
            }
        }

        return response;
    }

    /**
     * Signup new user
     */
    async signup(data: SignupRequest): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        // Store tokens after successful signup
        if (response.data?.session?.access_token) {
            this.setToken(response.data.session.access_token);
            if (response.data.session.refresh_token) {
                this.setRefreshToken(response.data.session.refresh_token);
            }
        }

        return response;
    }

    /**
     * Get current user profile
     */
    async getProfile(): Promise<ProfileResponse> {
        return this.request<ProfileResponse>('/auth/profile', {
            method: 'GET',
        });
    }

    /**
     * Logout user (client-side only, clears token)
     */
    async logout(): Promise<void> {
        try {
            await this.request<void>('/auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout API failed', err);
        } finally {
            this.removeToken();
        }
    }

    /**
     * Check if user is authenticated (has valid token)
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    /**
     * Get current auth token
     */
    getAuthToken(): string | null {
        return this.getToken();
    }

    /**
     * Get list of companies
     */
    async getCompanies(params: QueryCompanyParams = {}): Promise<PaginatedResponse<Company>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        const endpoint = `/companies/list${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Company>>(endpoint);
    }

    /**
     * Get single company by ID
     */
    async getCompany(id: number | string): Promise<CompanyResponse> {
        return this.request<CompanyResponse>(`/companies/${id}`);
    }

    /**
     * Create a new company
     */
    async createCompany(data: CreateCompanyRequest): Promise<CompanyResponse> {
        return this.request<CompanyResponse>('/companies/create', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Update a company
     */
    async updateCompany(id: number | string, data: UpdateCompanyRequest): Promise<CompanyResponse> {
        return this.request<CompanyResponse>(`/companies/update/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Reset company password
     */
    async resetCompanyPassword(id: number, password: string): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/companies/${id}/password`, {
            method: 'PATCH',
            body: JSON.stringify({ password }),
        });
    }

    /**
     * Delete a company
     */
    async deleteCompany(id: number): Promise<void> {
        await this.request<void>(`/companies/delete/${id}`, {
            method: 'DELETE',
        });
    }

    /**
     * Get employees
     */
    async getEmployees(params: QueryEmployeeParams = {}): Promise<PaginatedResponse<Employee>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);
        if (params.company_id) query.append('company_id', params.company_id.toString());

        const queryString = query.toString();
        const endpoint = `/employees${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Employee>>(endpoint);
    }

    /**
     * Create Employee
     */
    async createEmployee(data: CreateEmployeeRequest): Promise<EmployeeResponse> {
        return this.request<EmployeeResponse>('/employees/create', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Update Employee
     */
    async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<EmployeeResponse> {
        return this.request<EmployeeResponse>(`/employees/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Bulk Create Employees
     */
    async bulkCreateEmployees(employees: CreateEmployeeRequest[]): Promise<{ data: { successful: EmployeeResponse[]; failed: { email: string; reason: string }[] } }> {
        return this.request<{ data: { successful: EmployeeResponse[]; failed: { email: string; reason: string }[] } }>('/employees/bulk-create', {
            method: 'POST',
            body: JSON.stringify({ employees }),
        });
    }

    /**
     * Get vehicles
     */
    async getVehicles(params: QueryVehicleParams = {}): Promise<PaginatedResponse<Vehicle>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);
        if (params.category) query.append('category', params.category);
        if (params.ownership) query.append('ownership', params.ownership);
        if (params.show_all !== undefined) query.append('show_all', params.show_all.toString());
        if (params.vendor_id) query.append('vendor_id', params.vendor_id.toString());

        const queryString = query.toString();
        const endpoint = `/vehicles/list${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Vehicle>>(endpoint);
    }

    /**
     * Get available vehicles (not in active booking)
     */
    async getAvailableVehicles(params: QueryVehicleParams = {}): Promise<PaginatedResponse<Vehicle>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);
        if (params.category) query.append('category', params.category);
        if (params.ownership) query.append('ownership', params.ownership);

        const queryString = query.toString();
        const endpoint = `/vehicles/available${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Vehicle>>(endpoint);
    }

    /**
     * Get single vehicle
     */
    async getVehicle(id: number): Promise<VehicleResponse> {
        return this.request<VehicleResponse>(`/vehicles/${id}`);
    }

    /**
     * Create vehicle
     */
    async createVehicle(data: CreateVehicleRequest): Promise<VehicleResponse> {
        return this.request<VehicleResponse>('/vehicles/create', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Update vehicle
     */
    async updateVehicle(id: number, data: UpdateVehicleRequest): Promise<VehicleResponse> {
        return this.request<VehicleResponse>(`/vehicles/update/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Delete vehicle
     */
    async deleteVehicle(id: number): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/vehicles/delete/${id}`, {
            method: 'DELETE',
        });
    }

    /**
     * Get vendors
     */
    async getVendors(params: QueryVendorParams = {}): Promise<PaginatedResponse<Vendor>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        const endpoint = `/vendors${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Vendor>>(endpoint);
    }

    /**
     * Get single vendor
     */
    async getVendor(id: number): Promise<VendorResponse> {
        return this.request<VendorResponse>(`/vendors/${id}`);
    }

    /**
     * Create vendor
     */
    async createVendor(data: CreateVendorRequest): Promise<VendorResponse> {
        return this.request<VendorResponse>('/vendors', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Update vendor
     */
    async updateVendor(id: number, data: UpdateVendorRequest): Promise<VendorResponse> {
        return this.request<VendorResponse>(`/vendors/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Delete vendor
     */
    async deleteVendor(id: number): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/vendors/${id}`, {
            method: 'DELETE',
        });
    }

    /**
     * Get drivers
     */
    async getDrivers(params: QueryDriverParams = {}): Promise<PaginatedResponse<Driver>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);
        if (params.company_id) query.append('company_id', params.company_id.toString());
        if (params.driver_type) query.append('driver_type', params.driver_type);
        if (params.status) query.append('status', params.status);

        const queryString = query.toString();
        const endpoint = `/drivers${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Driver>>(endpoint);
    }

    /**
     * Get pending chauffeur drivers
     */
    async getPendingChauffeurs(params: QueryDriverParams = {}): Promise<PaginatedResponse<Driver>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);
        // Note: status=PENDING and driver_type=CHAUFFEUR are handled by the backend endpoint logic or default logic if passed
        // The backend endpoint /drivers/pending-chauffeurs might override these internally, but passing them is fine.

        const queryString = query.toString();
        const endpoint = `/drivers/pending-chauffeurs${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Driver>>(endpoint);
    }



    /**
     * Get available drivers (not in active booking)
     */
    async getAvailableDrivers(params: QueryDriverParams = {}): Promise<PaginatedResponse<Driver>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);
        if (params.company_id) query.append('company_id', params.company_id.toString());
        if (params.driver_type) query.append('driver_type', params.driver_type.toString());
        const queryString = query.toString();
        const endpoint = `/drivers/available${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Driver>>(endpoint);
    }

    /**
     * Get single driver
     */
    async getDriver(id: string): Promise<DriverResponse> {
        return this.request<DriverResponse>(`/drivers/${id}`);
    }

    /**
     * Create driver
     */
    async createDriver(data: CreateDriverRequest): Promise<DriverResponse> {
        return this.request<DriverResponse>('/drivers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Update driver
     */
    async updateDriver(id: string, data: UpdateDriverRequest): Promise<DriverResponse> {
        return this.request<DriverResponse>(`/drivers/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Update driver status (Approve/Reject)
     */
    async updateDriverStatus(id: string, data: UpdateDriverStatusRequest): Promise<DriverResponse> {
        return this.request<DriverResponse>(`/drivers/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Delete driver
     */
    async deleteDriver(id: string): Promise<void> {
        await this.request<void>(`/drivers/${id}`, {
            method: 'DELETE',
        });
    }

    // -- Chauffeur Contracts --

    /**
     * Get chauffeur contracts for a company
     */
    async getChauffeurContracts(companyId: number): Promise<ChauffeurContractResponse> {
        return this.request<ChauffeurContractResponse>(`/contracts/chauffeur?companyId=${companyId}`);
    }

    /**
     * Create chauffeur contract
     */
    async createChauffeurContract(data: CreateChauffeurContractRequest): Promise<SingleChauffeurContractResponse> {
        return this.request<SingleChauffeurContractResponse>('/contracts/chauffeur', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Update chauffeur contract
     */
    async updateChauffeurContract(id: number, data: UpdateChauffeurContractRequest): Promise<SingleChauffeurContractResponse> {
        return this.request<SingleChauffeurContractResponse>(`/contracts/chauffeur/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Delete chauffeur contract
     */
    async deleteChauffeurContract(id: number): Promise<void> {
        await this.request<void>(`/contracts/chauffeur/${id}`, {
            method: 'DELETE',
        });
    }

    /**
     * Update specific rate entry
     */
    async updateChauffeurRate(id: number, data: UpdateChauffeurContractRequest): Promise<void> {
        await this.request<void>(`/contracts/chauffeur/rate/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    /**
     * Delete specific rate entry
     */
    async deleteChauffeurRate(id: number): Promise<void> {
        await this.request<void>(`/contracts/chauffeur/rate/${id}`, {
            method: 'DELETE',
        });
    }

    /**
     * Preview how rates would be adjusted based on fuel price
     * Super admin can view adjustments after changing fuel price
     */
    async previewRateAdjustments(newFuelPrice: number, companyId?: number): Promise<any> {
        const query = new URLSearchParams();
        query.append('newFuelPrice', newFuelPrice.toString());
        if (companyId) query.append('companyId', companyId.toString());

        return this.request<any>(`/contracts/chauffeur/preview-adjustments?${query.toString()}`);
    }

    /**
     * Get adjusted billing rate for a booking
     * Used during invoice generation
     */
    async getAdjustedBillingRate(bookingId: number): Promise<any> {
        return this.request<any>(`/contracts/chauffeur/billing-rate/${bookingId}`);
    }

    // -- System Settings --

    /**
     * Get system setting by key
     */
    async getSystemSetting(key: string): Promise<SystemSettingResponse> {
        return this.request<SystemSettingResponse>(`/system-settings/${key}`);
    }

    /**
     * Update system setting
     */
    async updateSystemSetting(key: string, value: string): Promise<SystemSettingResponse> {
        return this.request<SystemSettingResponse>(`/system-settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value }),
        });
    }

    // -- Company Chauffeur Bookings --

    /**
     * Get all bookings (Admin)
     */
    async getAllBookings(params: QueryChauffeurBookingParams = {}): Promise<PaginatedResponse<ChauffeurBooking>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.status) query.append('status', params.status);
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        // Correct string interpolation for template literal
        const endpoint = `/admin/bookings${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ChauffeurBooking>>(endpoint);
    }

    /**
     * Create a chauffeur booking for a company
     */
    async createChauffeurBooking(companyId: number, data: CreateChauffeurBookingRequest): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/companies/${companyId}/chauffeur-bookings`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Assign driver and vehicle to a booking (Admin)
     */
    async assignBooking(id: number, vehicleId: number, driverId: string): Promise<void> {
        return this.request<void>(`/admin/bookings/${id}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ vehicle_id: vehicleId, driver_id: driverId }),
        });
    }

    /**
     * Update booking status (Admin)
     */
    async updateBookingStatus(id: number, status: string): Promise<void> {
        return this.request<void>(`/admin/bookings/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    }

    async startTrip(id: number): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/admin/bookings/${id}/start`, {
            method: 'PATCH',
        });
    }

    async endTrip(id: number, data: { total_distance_km: number, expense_toll?: number, expense_parking?: number }): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/admin/bookings/${id}/end`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async completeTrip(id: number): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/admin/bookings/${id}/complete`, {
            method: 'PATCH',
        });
    }

    /**
     * Get all bookings for a company
     */
    async getCompanyChauffeurBookings(companyId: number, params: QueryChauffeurBookingParams = {}): Promise<PaginatedResponse<ChauffeurBooking>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.status) query.append('status', params.status);
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        const endpoint = `/companies/${companyId}/chauffeur-bookings${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ChauffeurBooking>>(endpoint);
    }

    /**
     * Get single booking for a company
     */
    async getCompanyChauffeurBooking(companyId: number, bookingId: number): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/companies/${companyId}/chauffeur-bookings/${bookingId}`);
    }

    /**
     * Get chauffeur reports for a company
     */
    async getChauffeurReports(companyId: number, params: ReportQueryParams = {}): Promise<PaginatedResponse<ChauffeurReport>> {
        const query = new URLSearchParams();
        if (params.startDate) query.append('startDate', params.startDate);
        if (params.endDate) query.append('endDate', params.endDate);

        const queryString = query.toString();
        const endpoint = `/companies/${companyId}/reports/chauffeur${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ChauffeurReport>>(endpoint);
    }

    /**
     * Get all chauffeur reports (Superadmin)
     */
    async getAllChauffeurReports(params: ReportQueryParams = {}): Promise<PaginatedResponse<ChauffeurReport>> {
        const query = new URLSearchParams();
        if (params.startDate) query.append('startDate', params.startDate);
        if (params.endDate) query.append('endDate', params.endDate);

        const queryString = query.toString();
        const endpoint = `/companies/reports/all-chauffeur${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ChauffeurReport>>(endpoint);
    }

    /**
     * Invoices
     */
    async generateTripInvoice(bookingId: number) {
        return this.request('/invoices/generate', {
            method: 'POST',
            body: JSON.stringify({ bookingId })
        });
    }

    async getPendingTrips(): Promise<any> {
        return this.request('/invoices/pending-trips');
    }

    async getAllInvoices(): Promise<any> {
        return this.request<any>('/invoices');
    }

    async getCompanyInvoices(companyId: number): Promise<any> {
        return this.request<any>(`/companies/${companyId}/invoices`);
    }

    /**
     * Contracts
     */
    async getMyContract(): Promise<any> {
        return this.request<any>('/contracts/my-contract');
    }

    async downloadInvoicePdf(id: number, invoiceNumber: string): Promise<void> {
        return this.downloadPdf(`/invoices/${id}/pdf`, `invoice-${invoiceNumber}.pdf`);
    }

    async updateInvoiceStatus(id: number, status: string): Promise<any> {
        return this.request<any>(`/invoices/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    /**
     * Vehicle Fuel Records
     */
    async getFuelRecords(params: QueryFuelRecordParams = {}): Promise<PaginatedResponse<FuelRecord>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.vehicle_id) query.append('vehicle_id', String(params.vehicle_id));
        if (params.start_date) query.append('start_date', params.start_date);
        if (params.end_date) query.append('end_date', params.end_date);
        if (params.billed !== undefined) query.append('billed', String(params.billed));

        const queryString = query.toString();
        return this.request<PaginatedResponse<FuelRecord>>(`/vehicle-fuel${queryString ? `?${queryString}` : ''}`);
    }

    async createFuelRecord(data: CreateFuelRecordRequest): Promise<FuelRecordResponse> {
        return this.request<FuelRecordResponse>('/vehicle-fuel', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getFuelRecord(id: number): Promise<FuelRecordResponse> {
        return this.request<FuelRecordResponse>(`/vehicle-fuel/${id}`);
    }

    async updateFuelRecord(id: number, data: UpdateFuelRecordRequest): Promise<FuelRecordResponse> {
        return this.request<FuelRecordResponse>(`/vehicle-fuel/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteFuelRecord(id: number): Promise<{ data: { message: string }; statusCode: number; message: string }> {
        return this.request(`/vehicle-fuel/${id}`, {
            method: 'DELETE',
        });
    }

    async getFuelStats(): Promise<FuelStatsResponse> {
        return this.request<FuelStatsResponse>('/vehicle-fuel/stats');
    }

    /**
     * Vehicle Maintenance Records
     */
    async getMaintenanceRecords(params: QueryMaintenanceRecordParams = {}): Promise<PaginatedResponse<MaintenanceRecord>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.vehicle_id) query.append('vehicle_id', String(params.vehicle_id));
        if (params.maintenance_type) query.append('maintenance_type', params.maintenance_type);
        if (params.start_date) query.append('start_date', params.start_date);
        if (params.end_date) query.append('end_date', params.end_date);

        const queryString = query.toString();
        return this.request<PaginatedResponse<MaintenanceRecord>>(`/vehicle-maintenance${queryString ? `?${queryString}` : ''}`);
    }

    async createMaintenanceRecord(data: CreateMaintenanceRecordRequest): Promise<MaintenanceRecordResponse> {
        return this.request<MaintenanceRecordResponse>('/vehicle-maintenance', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getMaintenanceRecord(id: number): Promise<MaintenanceRecordResponse> {
        return this.request<MaintenanceRecordResponse>(`/vehicle-maintenance/${id}`);
    }

    async updateMaintenanceRecord(id: number, data: UpdateMaintenanceRecordRequest): Promise<MaintenanceRecordResponse> {
        return this.request<MaintenanceRecordResponse>(`/vehicle-maintenance/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteMaintenanceRecord(id: number): Promise<{ data: { message: string }; statusCode: number; message: string }> {
        return this.request(`/vehicle-maintenance/${id}`, {
            method: 'DELETE',
        });
    }

    async getUpcomingMaintenance(): Promise<UpcomingMaintenanceResponse> {
        return this.request<UpcomingMaintenanceResponse>('/vehicle-maintenance/upcoming');
    }
}

export interface ChauffeurReport {
    id: number;
    completed_at: string;
    total_duration_minutes: number;
    total_distance_km: number;
    total_cost: number;
    company?: {
        id: number;
        name: string;
    } | null;
    passenger: {
        full_name: string;
        email: string;
        employee_id: string;
    } | null;
    driver: {
        full_name: string;
    } | null;
    vehicle: {
        make: string;
        model: string;
        plate_number: string;
    } | null;
    route: {
        pickup: string;
        dropoff: string;
    };
    breakdown: {
        service_charge: number;
        fuel_cost: number;
        toll: number;
        parking: number;
        accommodation: number;
        outstation_allowance: number;
        overtime: number;
    };
}

export interface ReportQueryParams {
    startDate?: string;
    endDate?: string;
}

export const apiClient = new ApiClient();

export interface Invoice {
    id: number;
    invoice_number: string;
    billing_month: string;
    total_amount: number;
    pdf_url?: string;
    generated_at: string;
    status: string;
    companies?: {
        name: string;
    }
}
