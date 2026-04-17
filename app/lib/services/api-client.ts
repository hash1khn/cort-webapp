import { LoginRequest, LoginResponse, ProfileResponse, SignupRequest, StaffPermissions } from '../types/auth-types';
import {
    PaginatedResponse,
    // Companies
    CreateCompanyRequest, QueryCompanyParams, Company, CompanyResponse, UpdateCompanyRequest,
    // Employees
    CreateEmployeeRequest, QueryEmployeeParams, Employee, EmployeeResponse, UpdateEmployeeRequest,
    // Vehicles
    CreateVehicleRequest, QueryVehicleParams, Vehicle, VehicleResponse, UpdateVehicleRequest,
    // Vendors
    CreateVendorRequest, QueryVendorParams, Vendor, VendorResponse, UpdateVendorRequest,
    CreateVendorContractRequest, QueryVendorContractParams, VendorContract, VendorContractResponse, UpdateVendorContractRequest,
    QueryVendorLogsParams, VendorLogsResponse, VendorStatsResponse, CreateVendorPaymentRequest, VendorPaymentTransaction,
    // Drivers
    CreateDriverRequest, QueryDriverParams, Driver, DriverResponse, UpdateDriverRequest, UpdateDriverStatusRequest,
    // Pricing / Contracts
    ChauffeurContractResponse, CreateChauffeurContractRequest, SingleChauffeurContractResponse, UpdateChauffeurContractRequest,
    SystemSettingResponse,
    ShuttleContract,
    ShuttleContractRoute,
    CreateShuttleContractRequest,
    // Bookings
    CreateChauffeurBookingRequest, ChauffeurBooking, ChauffeurBookingResponse, QueryChauffeurBookingParams,
    DailyTripLog, AddPaymentRequest,
    // Fleet
    CreateFuelRecordRequest, QueryFuelRecordParams, FuelRecord, FuelRecordResponse, UpdateFuelRecordRequest,
    BulkPayFuelRequest, FuelStatsResponse,
    CreateMaintenanceRecordRequest, QueryMaintenanceRecordParams, MaintenanceRecord, MaintenanceRecordResponse,
    UpdateMaintenanceRecordRequest, UpcomingMaintenanceResponse,
    // Reports
    ChauffeurReport, ShuttleReport, ReportQueryParams,
    // Invoices
    QueryInvoiceParams, Invoice,
    // Expenses
    Expense, CreateExpenseRequest, ExpenseFilterParams,
} from './types';

// Re-export all types for backward compatibility
export * from './types';
export type { LoginRequest, LoginResponse, ProfileResponse, SignupRequest } from '../types/auth-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

class ApiClient {
    private baseUrl: string;
    private isRefreshing = false;
    private refreshSubscribers: { resolve: (token: string) => void; reject: (error: any) => void }[] = [];

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
        this.refreshSubscribers.forEach(({ resolve }) => resolve(token));
        this.refreshSubscribers = [];
    }

    /**
     * Add callback to be executed after token refresh failure
     */
    private onRefreshFailed(error: any) {
        this.refreshSubscribers.forEach(({ reject }) => reject(error));
        this.refreshSubscribers = [];
    }

    /**
     * Add subscriber to wait for token refresh
     */
    private subscribeTokenRefresh(resolve: (token: string) => void, reject: (error: any) => void) {
        this.refreshSubscribers.push({ resolve, reject });
    }

    /**
     * Helper to parse and handle API responses
     */
    private async parseResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return {} as T;
        }

        const data = await response.json();

        if (!response.ok) {
            const errorMessage = data.message || `HTTP error! status: ${response.status}`;
            throw new Error(errorMessage);
        }

        return data;
    }

    /**
     * Make HTTP request with automatic token attachment and refreshing
     */
    public async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
        });

        // Handle 401 Unauthorized - Try to refresh token
        // Skip for login which specifically handles 401 for invalid credentials
        // And skip for refresh-token itself to avoid infinite loops
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh-token')) {
            if (this.isRefreshing) {
                return new Promise((resolve, reject) => {
                    this.subscribeTokenRefresh(
                        async (newToken) => {
                            try {
                                resolve(await this.request(endpoint, options));
                            } catch (e) {
                                reject(e);
                            }
                        },
                        (err) => reject(err)
                    );
                });
            }

            this.isRefreshing = true;
            try {
                const newToken = await this.refreshToken();
                this.isRefreshing = false;

                if (newToken) {
                    this.onRefreshed(newToken);
                    return this.request(endpoint, options);
                } else {
                    const error = new Error('Session expired');
                    this.onRefreshFailed(error);
                    throw error;
                }
            } catch (err) {
                this.isRefreshing = false;
                this.onRefreshFailed(err);
                throw err;
            }
        }

        return this.parseResponse<T>(response);
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

        // Try to get filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        console.log(contentDisposition)
        let finalFilename = filename;

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                finalFilename = filenameMatch[1];
            }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFilename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    }

    /**
     * View PDF in a new tab (with auth)
     */
    async viewPdf(endpoint: string): Promise<void> {
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
        window.open(url, '_blank');
    }

    // ===== AUTH =====

    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        if (response.data?.session?.access_token) {
            this.setToken(response.data.session.access_token);
            if (response.data.session.refresh_token) {
                this.setRefreshToken(response.data.session.refresh_token);
            }
        }

        return response;
    }

    async signup(data: SignupRequest): Promise<LoginResponse> {
        const response = await this.request<LoginResponse>('/auth/signup', {
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (response.data?.session?.access_token) {
            this.setToken(response.data.session.access_token);
            if (response.data.session.refresh_token) {
                this.setRefreshToken(response.data.session.refresh_token);
            }
        }

        return response;
    }

    async getProfile(): Promise<ProfileResponse> {
        return this.request<ProfileResponse>('/auth/profile', {
            method: 'GET',
        });
    }

    async logout(): Promise<void> {
        try {
            await this.request<void>('/auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout API failed', err);
        } finally {
            this.removeToken();
        }
    }

    async forgotPassword(email: string): Promise<void> {
        const redirectTo =
            typeof window !== 'undefined'
                ? `${window.location.origin}/admin/reset-password`
                : `${process.env.NEXT_PUBLIC_APP_URL || ''}/admin/reset-password`;

        await this.request<void>('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email, redirectTo }),
        });
    }

    async resetPassword(accessToken: string, newPassword: string): Promise<void> {
        await this.request<void>('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ accessToken, newPassword }),
        });
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    getAuthToken(): string | null {
        return this.getToken();
    }

    // ===== COMPANIES =====

    async getCompanies(params: QueryCompanyParams = {}): Promise<PaginatedResponse<Company>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        const endpoint = `/companies/list${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Company>>(endpoint);
    }

    async getCompany(id: number | string): Promise<CompanyResponse> {
        return this.request<CompanyResponse>(`/companies/${id}`);
    }

    async createCompany(data: CreateCompanyRequest): Promise<CompanyResponse> {
        return this.request<CompanyResponse>('/companies/create', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateCompany(id: number | string, data: UpdateCompanyRequest): Promise<CompanyResponse> {
        return this.request<CompanyResponse>(`/companies/update/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async resetCompanyPassword(id: number, password: string): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/companies/${id}/password`, {
            method: 'PATCH',
            body: JSON.stringify({ password }),
        });
    }

    async deleteCompany(id: number): Promise<void> {
        await this.request<void>(`/companies/delete/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== EMPLOYEES =====

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

    async createEmployee(data: CreateEmployeeRequest): Promise<EmployeeResponse> {
        return this.request<EmployeeResponse>('/employees/create', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<EmployeeResponse> {
        return this.request<EmployeeResponse>(`/employees/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async bulkCreateEmployees(employees: CreateEmployeeRequest[]): Promise<{ data: { successful: EmployeeResponse[]; failed: { email: string; reason: string }[] } }> {
        return this.request<{ data: { successful: EmployeeResponse[]; failed: { email: string; reason: string }[] } }>('/employees/bulk-create', {
            method: 'POST',
            body: JSON.stringify({ employees }),
        });
    }

    // ===== VEHICLES =====

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

    async getVehicle(id: number): Promise<VehicleResponse> {
        return this.request<VehicleResponse>(`/vehicles/${id}`);
    }

    async createVehicle(data: CreateVehicleRequest): Promise<VehicleResponse> {
        return this.request<VehicleResponse>('/vehicles/create', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateVehicle(id: number, data: UpdateVehicleRequest): Promise<VehicleResponse> {
        return this.request<VehicleResponse>(`/vehicles/update/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteVehicle(id: number): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/vehicles/delete/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== VENDORS =====

    async getVendors(params: QueryVendorParams = {}): Promise<PaginatedResponse<Vendor>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        const endpoint = `/vendors${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Vendor>>(endpoint);
    }

    async getVendor(id: number): Promise<VendorResponse> {
        return this.request<VendorResponse>(`/vendors/${id}`);
    }

    async createVendor(data: CreateVendorRequest): Promise<VendorResponse> {
        return this.request<VendorResponse>('/vendors', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateVendor(id: number, data: UpdateVendorRequest): Promise<VendorResponse> {
        return this.request<VendorResponse>(`/vendors/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteVendor(id: number): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/vendors/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== VENDOR CONTRACTS =====

    async getAllVendorContracts(params: QueryVendorContractParams = {}): Promise<PaginatedResponse<VendorContract>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.month) query.append('month', params.month);
        if (params.vendor_id) query.append('vendor_id', params.vendor_id.toString());
        if (params.vehicle_id) query.append('vehicle_id', params.vehicle_id.toString());
        if (params.status) query.append('status', params.status);

        const queryString = query.toString();
        const endpoint = `/vendors/contracts/list${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<VendorContract>>(endpoint);
    }

    async getVendorContractById(id: number): Promise<VendorContractResponse> {
        return this.request<VendorContractResponse>(`/vendors/contracts/${id}`);
    }

    async createVendorContract(data: CreateVendorContractRequest): Promise<VendorContractResponse> {
        return this.request<VendorContractResponse>('/vendors/contracts', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateVendorContract(id: number, data: UpdateVendorContractRequest): Promise<VendorContractResponse> {
        return this.request<VendorContractResponse>(`/vendors/contracts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteVendorContract(id: number): Promise<{ message: string }> {
        return this.request<{ message: string }>(`/vendors/contracts/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== VENDOR LOGS =====

    async getVendorLogs(params: QueryVendorLogsParams): Promise<VendorLogsResponse> {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.vendor_id) queryParams.append('vendor_id', params.vendor_id.toString());
        if (params.start_date) queryParams.append('start_date', params.start_date);
        if (params.end_date) queryParams.append('end_date', params.end_date);
        if (params.payment_status) queryParams.append('payment_status', params.payment_status);

        return this.request<VendorLogsResponse>(`/vendors/logs/list?${queryParams.toString()}`);
    }

    async getVendorStats(vendor_id?: number): Promise<VendorStatsResponse> {
        const queryParams = new URLSearchParams();
        if (vendor_id) queryParams.append('vendor_id', vendor_id.toString());
        return this.request<VendorStatsResponse>(`/vendors/stats/summary?${queryParams.toString()}`);
    }

    async markVendorLogsAsPaid(ids: number[]) {
        return this.request<{ message: string; updatedCount: number }>('/vendors/logs/bulk-pay', {
            method: 'POST',
            body: JSON.stringify({ ids })

        });
    }

    async updateVendorTripLog(bookingId: number, vendorDistanceKm: number) {
        return this.request<{ success: boolean; vendor_cost: number }>(`/vendors/logs/${bookingId}`, {
            method: 'PATCH',
            body: JSON.stringify({ vendor_distance_km: vendorDistanceKm }),
        });
    }

    async createVendorPayment(data: CreateVendorPaymentRequest): Promise<VendorPaymentTransaction> {
        return this.request<VendorPaymentTransaction>('/vendors/payments', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getVendorPaymentHistory(bookingId: number): Promise<VendorPaymentTransaction[]> {
        return this.request<VendorPaymentTransaction[]>(`/vendors/payments/${bookingId}`);
    }

    // ===== DRIVERS =====

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

    async getPendingChauffeurs(params: QueryDriverParams = {}): Promise<PaginatedResponse<Driver>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        const endpoint = `/drivers/pending-chauffeurs${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Driver>>(endpoint);
    }

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

    async getDriver(id: string): Promise<DriverResponse> {
        return this.request<DriverResponse>(`/drivers/${id}`);
    }

    async createDriver(data: CreateDriverRequest): Promise<DriverResponse> {
        return this.request<DriverResponse>('/drivers', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateDriver(id: string, data: UpdateDriverRequest): Promise<DriverResponse> {
        return this.request<DriverResponse>(`/drivers/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async updateDriverStatus(id: string, data: UpdateDriverStatusRequest): Promise<DriverResponse> {
        return this.request<DriverResponse>(`/drivers/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteDriver(id: string): Promise<void> {
        await this.request<void>(`/drivers/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== CHAUFFEUR CONTRACTS =====

    async getChauffeurContracts(companyId: number): Promise<ChauffeurContractResponse> {
        return this.request<ChauffeurContractResponse>(`/contracts/chauffeur?companyId=${companyId}`);
    }

    async createChauffeurContract(data: CreateChauffeurContractRequest): Promise<SingleChauffeurContractResponse> {
        return this.request<SingleChauffeurContractResponse>('/contracts/chauffeur', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateChauffeurContract(id: number, data: UpdateChauffeurContractRequest): Promise<SingleChauffeurContractResponse> {
        return this.request<SingleChauffeurContractResponse>(`/contracts/chauffeur/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteChauffeurContract(id: number): Promise<void> {
        await this.request<void>(`/contracts/chauffeur/${id}`, {
            method: 'DELETE',
        });
    }

    async updateChauffeurRate(id: number, data: UpdateChauffeurContractRequest): Promise<void> {
        await this.request<void>(`/contracts/chauffeur/rate/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async deleteChauffeurRate(id: number): Promise<void> {
        await this.request<void>(`/contracts/chauffeur/rate/${id}`, {
            method: 'DELETE',
        });
    }

    async previewRateAdjustments(newFuelPrice: number, companyId?: number, newDieselPrice?: number): Promise<any> {
        const query = new URLSearchParams();
        query.append('newFuelPrice', newFuelPrice.toString());
        if (companyId) query.append('companyId', companyId.toString());
        if (newDieselPrice != null) query.append('newDieselPrice', newDieselPrice.toString());

        return this.request<any>(`/contracts/chauffeur/preview-adjustments?${query.toString()}`);
    }

    async getAdjustedBillingRate(bookingId: number): Promise<any> {
        return this.request<any>(`/contracts/chauffeur/billing-rate/${bookingId}`);
    }

    // ===== SHUTTLE CONTRACTS =====

    async getShuttleContract(companyId: number): Promise<{ data: ShuttleContract | null }> {
        return this.request<{ data: ShuttleContract | null }>(`/contracts/shuttle/${companyId}`);
    }

    async createOrUpdateShuttleContract(data: CreateShuttleContractRequest): Promise<{ data: ShuttleContract }> {
        return this.request<{ data: ShuttleContract }>('/contracts/shuttle', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // ===== SYSTEM SETTINGS =====

    async getSystemSetting(key: string): Promise<SystemSettingResponse> {
        return this.request<SystemSettingResponse>(`/system-settings/${key}`);
    }

    async updateSystemSetting(key: string, value: string): Promise<SystemSettingResponse> {
        return this.request<SystemSettingResponse>(`/system-settings/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value }),
        });
    }

    // ===== CHAUFFEUR BOOKINGS =====

    async getBookingStats(): Promise<{ data: { total: number; pending: number; assigned: number; arrived: number; in_progress: number; ended: number; completed: number; cancelled: number } }> {
        return this.request<any>('/admin/bookings/stats');
    }

    async getAllBookings(params: QueryChauffeurBookingParams = {}): Promise<PaginatedResponse<ChauffeurBooking>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.status) query.append('status', params.status);
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        const endpoint = `/admin/bookings${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ChauffeurBooking>>(endpoint);
    }

    async deleteBooking(id: number): Promise<void> {
        return this.request<void>(`/admin/bookings/${id}`, {
            method: 'DELETE',
        });
    }

    async createChauffeurBooking(companyId: number, data: CreateChauffeurBookingRequest): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/companies/${companyId}/chauffeur-bookings`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async assignBooking(id: number, vehicleId: number, driverId: string): Promise<void> {
        return this.request<void>(`/admin/bookings/${id}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ vehicle_id: vehicleId, driver_id: driverId }),
        });
    }

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

    async endTrip(id: number, data: { total_distance_km: number, expense_toll?: number, expense_parking?: number, expense_toll_image_url?: string, expense_parking_image_url?: string, start_time?: string, end_time?: string, daily_logs?: DailyTripLog[] }): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/admin/bookings/${id}/end`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async updateDailyLogs(id: number, data: { daily_logs: DailyTripLog[] }): Promise<{ success: boolean }> {
        return this.request<{ success: boolean }>(`/admin/bookings/${id}/daily-logs`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async completeTrip(id: number): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/admin/bookings/${id}/complete`, {
            method: 'PATCH',
        });
    }

    async recalculateBooking(id: number, data: {
        package_selected?: string;
        booking_type?: string;
        no_of_days?: number;
        total_duration_minutes?: number;
        total_distance_km?: number;
        expense_toll?: number;
        expense_parking?: number;
        daily_logs?: DailyTripLog[];
    }): Promise<{ success: boolean; invoice_amount: number; invoice_number: string; savings: number }> {
        return this.request(`/admin/bookings/${id}/recalculate`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async updateBookingInfo(id: number, data: {
        package_selected?: string;
        booking_type?: string;
        no_of_days?: number;
        total_duration_minutes?: number;
        total_distance_km?: number;
        expense_toll?: number;
        expense_parking?: number;
        daily_logs?: DailyTripLog[];
    }): Promise<{ success: boolean }> {
        return this.request(`/admin/bookings/${id}/info`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async addPayment(bookingId: number, data: AddPaymentRequest) {
        return this.request(`/admin/bookings/${bookingId}/payments`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getPaymentHistory(bookingId: number) {
        return this.request(`/admin/bookings/${bookingId}/payments`, {
            method: 'GET',
        });
    }

    async getPaymentSummary(bookingId: number) {
        return this.request(`/admin/bookings/${bookingId}/payment-summary`, {
            method: 'GET',
        });
    }

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

    async getCompanyChauffeurBooking(companyId: number, bookingId: number): Promise<ChauffeurBookingResponse> {
        return this.request<ChauffeurBookingResponse>(`/companies/${companyId}/chauffeur-bookings/${bookingId}`);
    }

    async getCompanyDashboardStats(companyId: string | number): Promise<any> {
        return this.request<any>(`/companies/${companyId}/dashboard-stats`);
    }

    async getTodayShuttleTrips(companyId: string | number): Promise<any> {
        return this.request<any>(`/shuttle-trips/today?company_id=${companyId}`);
    }

    async getActiveBookingLocations(): Promise<any> {
        return this.request<any>(`/admin/bookings/active-locations`);
    }

    async getActiveCompanyChauffeurBookings(companyId: string | number): Promise<any> {
        // Fetch bookings that are currently in-progress for this company
        return this.request<any>(
            `/companies/${companyId}/chauffeur-bookings?status=IN_PROGRESS&limit=50`,
        );
    }

    async getEmployeesByCompany(companyId: string | number): Promise<any> {
        return this.request<any>(`/employees/company/${companyId}`);
    }

    async toggleEmployeeStatus(id: string, activate: boolean): Promise<any> {
        return this.request<any>(`/employees/${id}/${activate ? 'activate' : 'deactivate'}`, {
            method: 'POST',
        });
    }

    // ===== REPORTS =====

    async getChauffeurReports(companyId: number, params: ReportQueryParams = {}): Promise<PaginatedResponse<ChauffeurReport>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.startDate) query.append('startDate', params.startDate);
        if (params.endDate) query.append('endDate', params.endDate);

        const queryString = query.toString();
        const endpoint = `/companies/${companyId}/reports/chauffeur${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ChauffeurReport>>(endpoint);
    }

    async getAllChauffeurReports(params: ReportQueryParams = {}): Promise<PaginatedResponse<ChauffeurReport>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.startDate) query.append('startDate', params.startDate);
        if (params.endDate) query.append('endDate', params.endDate);

        const queryString = query.toString();
        const endpoint = `/companies/reports/all-chauffeur${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ChauffeurReport>>(endpoint);
    }

    async getShuttleReports(companyId: number, params: ReportQueryParams = {}): Promise<PaginatedResponse<ShuttleReport>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.startDate) query.append('startDate', params.startDate);
        if (params.endDate) query.append('endDate', params.endDate);

        const queryString = query.toString();
        const endpoint = `/companies/${companyId}/reports/shuttle${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ShuttleReport>>(endpoint);
    }

    async getAllShuttleReports(params: ReportQueryParams = {}): Promise<PaginatedResponse<ShuttleReport>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.startDate) query.append('startDate', params.startDate);
        if (params.endDate) query.append('endDate', params.endDate);

        const queryString = query.toString();
        const endpoint = `/companies/reports/all-shuttle${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<ShuttleReport>>(endpoint);
    }

    // ===== INVOICES =====

    async generateTripInvoice(bookingId: number) {
        return this.request('/invoices/generate', {
            method: 'POST',
            body: JSON.stringify({ bookingId })
        });
    }

    async generateShuttleInvoice(
        contractId: number,
        options?: {
            billingMonth?: string;
            continuedVehicles?: number;
            amountMode?: 'EXACT' | 'LESS' | 'MORE';
            amountDelta?: number;
            billingPeriod?: 'MONTHLY' | 'WEEKLY';
            weeklyStartDate?: string;
            weeklyEndDate?: string;
            routeTrips?: { routeId: number; tripsCount: number; tripDate?: string }[];
            discountType?: 'NONE' | 'PERCENTAGE' | 'FLAT';
            discountValue?: number;
            vendorId?: number;
            vendorCost?: number;
        }
    ) {
        return this.request('/invoices/generate/shuttle', {
            method: 'POST',
            body: JSON.stringify({ contractId, ...options }),
        });
    }

    async settleShuttleInvoice(
        invoiceId: number,
        data: { amount: number; paymentType?: 'PARTIAL' | 'FINAL'; paymentMethod?: string; notes?: string }
    ) {
        return this.request(`/invoices/${invoiceId}/settle`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getShuttleInvoicePayments(invoiceId: number): Promise<any> {
        return this.request(`/invoices/${invoiceId}/payments`);
    }

    async getPendingTrips(): Promise<any> {
        return this.request('/invoices/pending-trips');
    }

    async getAllInvoices(params: QueryInvoiceParams = {}): Promise<PaginatedResponse<Invoice>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', String(params.page));
        if (params.limit) query.append('limit', String(params.limit));
        if (params.status) query.append('status', params.status);
        if (params.company_id) query.append('company_id', String(params.company_id));

        const queryString = query.toString();
        const endpoint = `/invoices${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Invoice>>(endpoint);
    }

    async getInvoiceStats(): Promise<any> {
        return this.request<any>('/invoices/stats');
    }

    async getCompanyInvoices(companyId: number, params: QueryInvoiceParams = {}): Promise<PaginatedResponse<Invoice>> {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);

        const queryString = query.toString();
        const endpoint = `/companies/${companyId}/invoices${queryString ? `?${queryString}` : ''}`;

        return this.request<PaginatedResponse<Invoice>>(endpoint);
    }

    async getMyContract(): Promise<any> {
        return this.request<any>('/contracts/my-contract');
    }

    async downloadInvoicePdf(id: number, invoiceNumber: string): Promise<void> {
        return this.downloadPdf(`/invoices/${id}/pdf`, `invoice-${invoiceNumber}.pdf`);
    }

    async viewInvoicePdf(id: number): Promise<void> {
        return this.viewPdf(`/invoices/${id}/pdf`);
    }

    async sendInvoiceEmail(id: number): Promise<any> {
        return this.request<any>(`/invoices/${id}/send-email`, {
            method: 'POST',
        });
    }

    async updateInvoiceStatus(id: number, status: string): Promise<any> {
        return this.request<any>(`/invoices/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }

    async deleteInvoice(id: number): Promise<any> {
        return this.request<any>(`/invoices/${id}`, {
            method: 'DELETE',
        });
    }

    // ===== FUEL RECORDS =====

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

    async markFuelRecordsAsPaid(data: BulkPayFuelRequest): Promise<{ message: string }> {
        return this.request<{ message: string }>('/vehicle-fuel/bulk-pay', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getFuelStats(): Promise<FuelStatsResponse> {
        return this.request<FuelStatsResponse>('/vehicle-fuel/stats');
    }

    // ===== MAINTENANCE RECORDS =====

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

    // ===== DASHBOARD =====

    async getSuperAdminDashboardStats(startDate?: string, endDate?: string) {
        let query = '';
        if (startDate && endDate) {
            query = `?startDate=${startDate}&endDate=${endDate}`;
        }
        return this.request<{
            totalRevenue: { current: number; previous: number; percentageChange: number; trend: string };
            totalCOGS: { current: number; previous: number; percentageChange: number; trend: string };
            grossProfit: { current: number; previous: number; percentageChange: number; trend: string };
            netMargin: { current: number; previous: number; percentageChange: number; trend: string };
            ridesBreakdown: { name: string; value: number }[];
            expensesBreakdown: { name: string; value: number }[];
            fuelExpenses: { name: string; value: number }[];
            repairExpenses: { name: string; value: number }[];
            oilMaintenanceExpenses: { name: string; value: number }[];
            revenueByClient: { name: string; value: number }[];
            profitPerRide: number;
            costPerRide: number;
            totalReceivables: number;
            totalPayables: number;
            alerts: any[];
        }>(`/admin/reports/dashboard${query}`);
    }

    // ---------------------------------------------------------------------------
    // Web Push
    // ---------------------------------------------------------------------------

    async getVapidPublicKey(): Promise<string> {
        const res = await this.request<{ publicKey: string }>('/notifications/web-push/vapid-key');
        return res.publicKey;
    }

    async saveWebPushSubscription(sub: { endpoint: string; p256dh: string; auth: string; userAgent?: string }): Promise<void> {
        await this.request<void>('/notifications/web-push/subscription', {
            method: 'POST',
            body: JSON.stringify(sub),
        });
    }

    async deleteWebPushSubscription(): Promise<void> {
        await this.request<void>('/notifications/web-push/subscription', { method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();

export const ExpensesApi = {
    getAll: async (params?: ExpenseFilterParams) => {
        const query = new URLSearchParams();
        if (params?.startDate) query.append('startDate', params.startDate);
        if (params?.endDate) query.append('endDate', params.endDate);
        if (params?.category) query.append('category', params.category);
        if (params?.page) query.append('page', String(params.page));
        if (params?.limit) query.append('limit', String(params.limit));

        return apiClient.request<PaginatedResponse<Expense>>(`/expenses?${query.toString()}`);
    },

    create: async (data: CreateExpenseRequest) => {
        return apiClient.request<Expense>('/expenses', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    delete: async (id: number) => {
        return apiClient.request<void>(`/expenses/${id}`, {
            method: 'DELETE',
        });
    },

    markAsPaid: async (id: number) => {
        return apiClient.request<Expense>(`/expenses/${id}/pay`, {
            method: 'POST',
        });
    },
};

// ===== PERMISSIONS / INTERNAL STAFF =====

export interface InternalStaffMember {
    id: string;
    email: string;
    full_name: string;
    phone: string | null;
    status: string | null;
    created_at: string | null;
    permissions: StaffPermissions;
    permissions_updated_at: string | null;
}

export interface CreateInternalStaffRequest {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    permissions?: Partial<StaffPermissions>;
}

export const PermissionsApi = {
    listStaff: () =>
        apiClient.request<{ success: boolean; data: InternalStaffMember[] }>('/permissions/staff'),

    getStaff: (id: string) =>
        apiClient.request<{ success: boolean; data: InternalStaffMember }>(`/permissions/staff/${id}`),

    createStaff: (data: CreateInternalStaffRequest) =>
        apiClient.request<{ success: boolean; data: InternalStaffMember }>('/permissions/staff', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updatePermissions: (id: string, permissions: Partial<StaffPermissions>) =>
        apiClient.request<{ success: boolean; data: { user_id: string; permissions: StaffPermissions } }>(
            `/permissions/staff/${id}/permissions`,
            {
                method: 'PUT',
                body: JSON.stringify({ permissions }),
            },
        ),

    deactivate: (id: string) =>
        apiClient.request<{ success: boolean; message: string }>(`/permissions/staff/${id}/deactivate`, {
            method: 'PATCH',
        }),

    reactivate: (id: string) =>
        apiClient.request<{ success: boolean; message: string }>(`/permissions/staff/${id}/reactivate`, {
            method: 'PATCH',
        }),
};

