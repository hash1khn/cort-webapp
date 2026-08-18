export interface DashboardData {
    takingCare: {
        unassignedBookings: number;
        ridesCompleted: number;
        completedTrend: string;
    };
    nothingToDo: {
        pendingApprovals: number;
        delayedRides: number;
        unresolvedIssues: number;
        isAllClear: boolean;
    };
    valueDelivered: {
        estimatedSavings: number; // in PKR
        activeRides: number;
        shuttleTrips: number;
        avgTripCost: number;
        avgTripTotalSpendLifetime: number; // in PKR
        shuttleTotalTripsLifetime: number;
    };
    cost: {
        totalSpendMTD: number; // in PKR
        spendTrend: string; // e.g. "+5%"
        costPerEmployee: number; // in PKR
        budget: number; // in PKR
    };
    employeeUsage: {
        activeEmployees: number;
        totalEmployees: number;
        avgRidesPerEmployee: number;
        topPassenger: {
            name: string;
            rides: number;
            department: string;
        };
        departmentUsage: Array<{ name: string; percentage: number }>;
    };
    smartInsights: string[]; // List of insight strings
    seasonality: {
        highDemandDay: string;
        lowDemandDay: string;
    };
    adminHealth: {
        registeredVsActiveRatio: number; // 0-1
        deptAdoptionRate: number; // 0-100
        bookingVsActualRatio: number; // 0-1
    };
    services: {
        chauffeur: number;
        shuttles: number;
        events: number;
        eventShuttle: number;
    };
    mobility: {
        activeRides: number;
        employeesTraveling: number;
        shuttlesRunning: number;
        chauffeurRides: number;
        upcomingBookings: number;
    };
    costLeakage: {
        insights: {
            id: string;
            title: string;
            description: string;
            savings: number;
            longDescription: string;
            iconType: string;
            affectedEmployees: { name: string; dept: string; currentCost: number }[];
            revisedRouteName: string;
            revisedRouteStops: string[];
        }[];
    };
}
