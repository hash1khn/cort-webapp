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
    alerts: any[];
    totalUnassignedBookings: number;
    receivablesByClient: BreakdownItem[];
    overdueInvoices: OverdueInvoice[];
    revenueBreakdown: BreakdownItem[];
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
