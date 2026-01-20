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
        this.removeToken();
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
}


export const apiClient = new ApiClient();
