export interface CreateEmployeeRequest {
    full_name: string;
    email: string;
    phone?: string;
    company_id: number;
    password?: string;
    employee_id?: string;
    department?: string;
    department_id?: number;
    home_address?: string;
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
    department_id?: number | null;
    departments?: { id: number; name: string } | null;
    home_address?: string | null;
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
    data: Employee & { generatedPassword?: string };
    statusCode: number;
    message: string;
}
