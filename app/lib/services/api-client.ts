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
}
// ... (rest of file) ...


export interface CreateEmployeeRequest {
    full_name: string;
    email: string;
    phone: string;
    company_id: number;
    password?: string;
    employee_id?: string;
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
}

export interface UpdateVehicleRequest extends Partial<CreateVehicleRequest> { }

export interface QueryVehicleParams {
    page?: number;
    limit?: number;
    search?: string;
    category?: VehicleCategory;
    ownership?: OwnershipType;
    show_all?: boolean;
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
    companies?: {
        id: number;
        name: string;
    };
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
    allowance_outstation: string;
    allowance_accommodation: string;
}

export interface ChauffeurContract {
    id: number;
    company_id: number;
    fuel_base_price: string;
    revision_percentage: string | null;
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

    // Optional Rate Entry
    vehicleModel?: string;
    costPerKm?: number;
    rateSpot5hr?: number;
    rateSpot10hr?: number;
    rateSpot24hr?: number;
    rateMonthly10hr?: number;
    rateMonthly24hr?: number;
    rateOvertimePerHr?: number;
    allowanceOutstation?: number;
    allowanceAccommodation?: number;
}

export interface UpdateChauffeurContractRequest {
    // For GLOBAL updates
    fuelBasePrice?: number;
    revisionPercentage?: number | null;

    // For RATE updates
    vehicleModel?: string;
    costPerKm?: number;
    rateSpot5hr?: number;
    rateSpot10hr?: number;
    rateSpot24hr?: number;
    rateMonthly10hr?: number;
    rateMonthly24hr?: number;
    rateOvertimePerHr?: number;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
    private baseUrl: string;

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
     * Store auth token in localStorage
     */
    private setToken(token: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem('auth_token', token);
    }

    /**
     * Remove auth token from localStorage
     */
    private removeToken(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('auth_token');
    }

    /**
     * Make HTTP request with automatic token attachment
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        // Add authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

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
     * Login user with email and password
     */
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        // Store token after successful login
        if (response.data?.session?.access_token) {
            this.setToken(response.data.session.access_token);
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

        // Store token after successful signup
        if (response.data?.session?.access_token) {
            this.setToken(response.data.session.access_token);
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

        const queryString = query.toString();
        const endpoint = `/vehicles/list${queryString ? `?${queryString}` : ''}`;

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
}


export const apiClient = new ApiClient();

