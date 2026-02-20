import { ChauffeurTripDailyLog } from './bookings';

export interface ChauffeurReport {
    id: number;
    city?: string;
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
        expense_toll_image_url?: string | null;
        expense_parking_image_url?: string | null;
    };
    daily_logs?: ChauffeurTripDailyLog[];
}

export interface ReportQueryParams {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
}
