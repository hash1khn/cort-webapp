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

export interface EmployeeResponse {
    data: Employee & { password?: string };
    statusCode: number;
    message: string;
}
