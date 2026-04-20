export interface SuperAdminDashboardStats {
    totalRevenue: MetricComparison;
    totalCOGS: MetricComparison;
    grossProfit: MetricComparison;
    netMargin: MetricComparison;
    ridesBreakdown: BreakdownItem[];
    expensesBreakdown: BreakdownItem[];
    fuelExpenses: BreakdownItem[];
    repairExpenses: BreakdownItem[];
    oilMaintenanceExpenses: BreakdownItem[];
    revenueByClient: BreakdownItem[];
    profitPerRide: number;
    costPerRide: number;
    totalReceivables: number;
    totalPayables: number;
    currentPeriodReceivables: number | null;
    currentPeriodPayables: number | null;
    alerts: any[];
    totalUnassignedBookings: number;
    receivablesByClient: BreakdownItem[];
    overdueInvoices: OverdueInvoice[];
    revenueBreakdown: BreakdownItem[];
    problemReports: ProblemReport[];
}

export interface OverdueInvoice {
    id: number;
    invoice_number: string;
    company_name: string;
    total_amount: number;
    generated_at: string;
    status: string;
}

export interface MetricComparison {
    current: number;
    previous: number;
    percentageChange: number;
    trend: string;
}

export interface BreakdownItem {
    name: string;
    value: number;
}

export interface ProblemReport {
    id: number;
    message: string;
    created_at: string;
    reported_by_user_id: string;
    company_id: number | null;
    reporter_name: string;
    reporter_email: string;
    reporter_role: string;
    company_name: string | null;
}
