/**
 * Demo mock data for the Live Mobility Command Center.
 * Shown when no real active trips are returned from the API.
 */

export interface DemoMobilityStats {
    activeRides: number;
    employeesTraveling: number;
    shuttlesRunning: number;
    chauffeurRides: number;
    upcomingBookings: number;
}

export interface DemoTripEmployee {
    id: number;
    users: { full_name: string; department?: string };
    route_stops?: { name: string };
}

export interface DemoTripEntry {
    id: number;
    type: 'shuttle' | 'chauffeur';
    label: string;
    restLat: number;
    restLng: number;
    rawTrip?: Record<string, unknown>;
    mockEmployees?: DemoTripEmployee[];
}

export const DEMO_MOBILITY_STATS: DemoMobilityStats = {
    activeRides: 4,
    employeesTraveling: 32,
    shuttlesRunning: 2,
    chauffeurRides: 2,
    upcomingBookings: 8,
};

const DHA_EMPLOYEES: DemoTripEmployee[] = [
    { id: 1, users: { full_name: 'Ayesha Khan', department: 'Finance' }, route_stops: { name: 'Clifton Block 5' } },
    { id: 2, users: { full_name: 'Bilal Hussain', department: 'Engineering' }, route_stops: { name: 'Teen Talwar' } },
    { id: 3, users: { full_name: 'Fatima Rizvi', department: 'HR' }, route_stops: { name: 'Clifton Block 5' } },
    { id: 4, users: { full_name: 'Hassan Malik', department: 'Operations' }, route_stops: { name: 'Teen Talwar' } },
    { id: 5, users: { full_name: 'Sana Javed', department: 'Marketing' }, route_stops: { name: 'Clifton Block 5' } },
    { id: 6, users: { full_name: 'Omar Sheikh', department: 'Engineering' }, route_stops: { name: 'I.I. Chundrigar Road' } },
];

const GULSHAN_EMPLOYEES: DemoTripEmployee[] = [
    { id: 7, users: { full_name: 'Zainab Ali', department: 'Sales' }, route_stops: { name: 'Gulshan Block 4' } },
    { id: 8, users: { full_name: 'Usman Tariq', department: 'IT' }, route_stops: { name: 'NIPA Chowrangi' } },
    { id: 9, users: { full_name: 'Mariam Noor', department: 'Legal' }, route_stops: { name: 'Gulshan Block 4' } },
    { id: 10, users: { full_name: 'Imran Qureshi', department: 'Finance' }, route_stops: { name: 'NIPA Chowrangi' } },
    { id: 11, users: { full_name: 'Hira Siddiqui', department: 'HR' }, route_stops: { name: 'Gulshan Block 4' } },
];

const DEMO_SHUTTLES: DemoTripEntry[] = [
    {
        id: -1,
        type: 'shuttle',
        label: 'DHA Express ↑ AM — IN_PROGRESS · 18 emp',
        restLat: 24.8138,
        restLng: 67.0299,
        mockEmployees: DHA_EMPLOYEES,
        rawTrip: {
            id: -1,
            direction: 'MORNING',
            status: 'IN_PROGRESS',
            route_id: 4,
            current_stop_id: 102,
            routes: {
                name: 'DHA Express',
                vehicles: { model: 'Toyota Coaster', plate_number: 'KHI-4521' },
                _count: { employee_route_assignments: 18 },
                route_stops: [
                    { id: 101, name: 'Clifton Block 5' },
                    { id: 102, name: 'Teen Talwar' },
                    { id: 103, name: 'I.I. Chundrigar Road' },
                ],
            },
        },
    },
    {
        id: -2,
        type: 'shuttle',
        label: 'Gulshan Corridor ↓ PM — IN_PROGRESS · 14 emp',
        restLat: 24.9207,
        restLng: 67.0881,
        mockEmployees: GULSHAN_EMPLOYEES,
        rawTrip: {
            id: -2,
            direction: 'EVENING',
            status: 'IN_PROGRESS',
            route_id: 7,
            current_stop_id: 202,
            routes: {
                name: 'Gulshan Corridor',
                vehicles: { model: 'Hino Rosa', plate_number: 'KHI-7834' },
                _count: { employee_route_assignments: 14 },
                route_stops: [
                    { id: 201, name: 'Gulshan Block 4' },
                    { id: 202, name: 'NIPA Chowrangi' },
                    { id: 203, name: 'Shahrah-e-Faisal' },
                ],
            },
        },
    },
];

const DEMO_CHAUFFEURS: DemoTripEntry[] = [
    {
        id: -101,
        type: 'chauffeur',
        label: 'Chauffeur · Sarah Ahmed — OTW',
        restLat: 24.871,
        restLng: 67.063,
    },
    {
        id: -102,
        type: 'chauffeur',
        label: 'Chauffeur · Kamran Iqbal — IN_PROGRESS',
        restLat: 24.8456,
        restLng: 67.0342,
    },
];

export function getDemoMobilityTrips(options: {
    hasShuttle: boolean;
    hasChauffeur: boolean;
}): DemoTripEntry[] {
    const trips: DemoTripEntry[] = [];
    if (options.hasShuttle) trips.push(...DEMO_SHUTTLES);
    if (options.hasChauffeur) trips.push(...DEMO_CHAUFFEURS);
    // If neither service is enabled, show the full demo fleet
    if (trips.length === 0) trips.push(...DEMO_SHUTTLES, ...DEMO_CHAUFFEURS);
    return trips;
}

export function isDemoTripId(tripId: number): boolean {
    return tripId < 0;
}

export function getDemoEmployeesForTrip(tripId: number): DemoTripEmployee[] {
    const shuttle = DEMO_SHUTTLES.find((t) => t.id === tripId);
    return shuttle?.mockEmployees ?? [];
}
