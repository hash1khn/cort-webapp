export enum MaintenanceType {
    OIL_CHANGE = 'OIL_CHANGE',
    TIRE_ROTATION = 'TIRE_ROTATION',
    BRAKE_SERVICE = 'BRAKE_SERVICE',
    GENERAL_INSPECTION = 'GENERAL_INSPECTION',
    REPAIR = 'REPAIR',
    OTHER = 'OTHER',
}

// -- FUEL RECORDS --

export interface CreateFuelRecordRequest {
    vehicle_id: number;
    date: string; // ISO date format YYYY-MM-DD
    fuel_litres: number;
    current_fuel_rate: number;
    fuel_cost?: number; // Auto-calculated if not provided
    billed?: boolean;
}

export interface BulkPayFuelRequest {
    ids: number[];
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
