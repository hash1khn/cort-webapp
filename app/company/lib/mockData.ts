
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
        routesOptimized: number;
        ridesConsolidated: number;
        idleTimeReduced: string; // e.g. "12%"
    };
    cost: {
        totalSpendMTD: number; // in PKR
        spendTrend: string; // e.g. "+5%"
        costPerEmployee: number; // in PKR
    };
    employeeUsage: {
        activeEmployees: number;
        totalEmployees: number;
        avgRidesPerEmployee: number;
        topRider: {
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
        monthlyPattern: string; // e.g. "End-of-month spike"
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
        airport: number;
    };
}

export const MOCK_DASHBOARD_DATA: DashboardData = {
    takingCare: {
        unassignedBookings: 0,
        ridesCompleted: 142,
        completedTrend: "+12%",
    },
    nothingToDo: {
        pendingApprovals: 0,
        delayedRides: 0,
        unresolvedIssues: 0,
        isAllClear: true,
    },
    valueDelivered: {
        estimatedSavings: 154000,
        routesOptimized: 28,
        ridesConsolidated: 45,
        idleTimeReduced: "18%",
    },
    cost: {
        totalSpendMTD: 1250000,
        spendTrend: "-4.2%",
        costPerEmployee: 8500,
    },
    employeeUsage: {
        activeEmployees: 147,
        totalEmployees: 200,
        avgRidesPerEmployee: 3.2,
        topRider: {
            name: "Ahmed Khan",
            rides: 18,
            department: "Sales",
        },
        departmentUsage: [
            { name: "Sales", percentage: 45 },
            { name: "Engineering", percentage: 30 },
            { name: "HR", percentage: 15 },
            { name: "Ops", percentage: 10 },
        ],
    },
    smartInsights: [
        "Mondays have 18% higher demand than other weekdays.",
        "Night rides increased 12% this month due to late shifts.",
        "End-of-month demand is consistently 22% higher.",
    ],
    seasonality: {
        highDemandDay: "Monday",
        lowDemandDay: "Friday",
        monthlyPattern: "Peak in last week",
    },
    adminHealth: {
        registeredVsActiveRatio: 0.73,
        deptAdoptionRate: 85,
        bookingVsActualRatio: 0.98,
    },
    services: {
        chauffeur: 65,
        shuttles: 25,
        events: 5,
        airport: 5,
    },
};
