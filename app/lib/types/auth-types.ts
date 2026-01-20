// User roles enum - matches backend
export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    COMPANY_ADMIN = 'COMPANY_ADMIN',
    EMPLOYEE = 'EMPLOYEE',
    DRIVER = 'DRIVER',
}

// User status enum - matches backend
export enum UserStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    SUSPENDED = 'SUSPENDED',
    DELETED = 'DELETED',
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
}

// Authenticated user interface
export interface AuthUser {
    id: string;
    email: string;
    phone: string | null;
    full_name: string;
    role: UserRole;
    company_id: number | null;
    account_status: UserStatus | null;
}

// Supabase session interface
export interface AuthSession {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
    user: {
        id: string;
        email: string;
    };
}

// Login response from backend
export interface LoginResponse {
    success: boolean;
    statusCode: number;
    message: string;
    data: {
        user: AuthUser;
        session: AuthSession;
    };
}

// Profile response from backend
export interface ProfileResponse {
    success: boolean;
    statusCode: number;
    message: string;
    data: AuthUser;
}

// Login request
export interface LoginRequest {
    email: string;
    password: string;
}

// Signup request
export interface SignupRequest {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
}

// Auth context state
export interface AuthState {
    user: AuthUser | null;
    session: AuthSession | null;
    loading: boolean;
    error: string | null;
}

// Auth context methods
export interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    isAuthenticated: boolean;
    isSuperAdmin: boolean;
    isCompanyAdmin: boolean;
    isEmployee: boolean;
    isDriver: boolean;
    hasRole: (roles: UserRole[]) => boolean;
    hasCompanyAccess: (companyId: number) => boolean;
}
