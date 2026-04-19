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
    profile_picture?: File;
}

export interface UpdateDriverRequest extends Partial<Omit<CreateDriverRequest, 'profile_picture'>> {
    profile_picture?: File;
}

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
        current_vehicle_id: number | null;
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
