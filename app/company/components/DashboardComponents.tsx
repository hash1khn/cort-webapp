
import React from 'react';
import {
    CheckCircle,
    AlertCircle,
    TrendingDown,
    TrendingUp,
    Users,
    Car,
    Bus,
    MapPin,
    Clock,
    CreditCard,
    Zap,
    Calendar,
    ShieldCheck,
    Star,
    Activity,
    FileText,
    Settings
} from 'lucide-react';
import { DashboardData } from '../types';

// --- Shared Components ---

export const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white border border-slate-100 shadow-sm rounded-3xl p-6 h-full transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md ${className}`}>
        {children}
    </div>
);

export const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        {children}
    </h3>
);

// --- Charts & Visuals ---

const Sparkline = ({ data = [40, 30, 45, 50, 42, 55, 60], color = "#6366f1" }: { data?: number[], color?: string }) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((d, i) => `${(i / (data.length - 1)) * 60},${20 - ((d - min) / range) * 20}`).join(' ');

    return (
        <svg width="60" height="20" className="opacity-70">
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const DonutChart = ({ data }: { data: { label: string; value: number; color: string }[] }) => {
    const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);
    let currentOffset = 0;

    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                {total === 0 ? (
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="#e2e8f0"
                        strokeWidth="12"
                    />
                ) : (
                    data.map((item, i) => {
                        const percentage = total > 0 ? (item.value / total) * 100 : 0;
                        const circumference = 2 * Math.PI * 40; // r=40
                        const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -currentOffset;
                        currentOffset += (percentage / 100) * circumference;

                        return (
                            <circle
                                key={i}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke={item.color}
                                strokeWidth="12"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-500 hover:opacity-80"
                            />
                        );
                    })
                )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{total}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">Total Rides</span>
            </div>
        </div>
    );
};

const HeatmapPlaceholder = () => (
    <div className="relative w-full h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 mt-2">
        {/* Abstract Map Roads */}
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 100" preserveAspectRatio="none">
            <path d="M0,50 Q50,40 100,50 T200,50" stroke="#94a3b8" strokeWidth="2" fill="none" />
            <path d="M40,0 Q50,50 60,100" stroke="#94a3b8" strokeWidth="2" fill="none" />
            <path d="M140,0 Q130,50 120,100" stroke="#94a3b8" strokeWidth="2" fill="none" />
            <path d="M20,20 L180,80" stroke="#94a3b8" strokeWidth="1" fill="none" />
        </svg>
        {/* Hotspots */}
        <div className="absolute top-1/2 left-1/3 w-8 h-8 bg-purple-500/30 rounded-full blur-md animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-indigo-500/30 rounded-full blur-md animate-pulse delay-75"></div>
        <div className="absolute bottom-1/4 left-1/4 w-10 h-10 bg-blue-500/20 rounded-full blur-xl"></div>
    </div>
)

// --- Sections ---

export const TakingCareSection = ({ data }: { data: DashboardData['takingCare'] }) => {
    const isZero = data.unassignedBookings === 0;

    return (
        <div className="grid grid-cols-1 gap-4 h-full">
            <Card className={`${isZero ? 'bg-slate-50 border-slate-200' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none'} relative overflow-hidden group transition-all`}>
                <div className={`absolute top-0 right-0 p-4 transition-opacity ${isZero ? 'opacity-5 text-slate-400' : 'opacity-10 text-white'}`}>
                    <AlertCircle size={80} />
                </div>
                <div className="relative z-10">
                    <div className={`${isZero ? 'text-slate-500' : 'text-indigo-100'} font-medium text-sm mb-1 uppercase tracking-wider`}>Un-Assigned Bookings</div>
                    <div className={`text-5xl font-black ${isZero ? 'text-slate-300' : 'text-white'}`}>{data.unassignedBookings}</div>
                    <div className={`mt-2 text-sm ${isZero ? 'text-slate-400' : 'text-indigo-100 flex items-center gap-2'}`}>
                        {isZero ? "All caught up" : <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">Requires attention</span>}
                    </div>
                </div>
            </Card>

            <Card className="bg-white border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 text-emerald-500 opacity-5 group-hover:opacity-10 transition-opacity">
                    <CheckCircle size={80} />
                </div>
                <div className="relative z-10">
                    <div className="text-slate-500 font-medium text-sm mb-1 uppercase tracking-wider">Rides Completed</div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-5xl font-black text-slate-900">{data.ridesCompleted}</div>
                        <div className="text-sm font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full">{data.completedTrend}</div>
                    </div>
                    <div className="mt-2 text-slate-400 text-sm">Successfully completed items</div>
                </div>
            </Card>
        </div>
    );
};

export const NothingToDoSection = ({ data }: { data: DashboardData['nothingToDo'] }) => {
    return (
        <Card className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-none flex items-center justify-between shadow-lg h-full">
            <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                    <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                    <div className="font-bold text-xl">You are all caught up!</div>
                    <div className="text-emerald-100 text-sm flex gap-3 mt-1">
                        <span className="opacity-80">No pending approvals</span>
                        <span className="opacity-80">System healthy</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export const ValueDeliveredSection = ({ data }: { data: DashboardData['valueDelivered'] }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-start justify-between">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Total Savings</div>
                    <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                </div>
                <div>
                    <div className="text-5xl font-black text-slate-800 tracking-tight mb-2">
                        <span className="text-2xl text-slate-400 font-normal mr-1">PKR</span>
                        {(data.estimatedSavings / 1000).toFixed(0)}k
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Estimated MTD</div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-start justify-between">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Avg Trip Cost</div>
                    <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                    <div className="text-5xl font-black text-slate-800 tracking-tight mb-2">
                        <span className="text-2xl text-slate-400 font-normal mr-1">PKR</span>
                        {(data.avgTripCost / 1000).toFixed(1)}k
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Per completed ride</div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-start justify-between">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Active Chauffeur Rides</div>
                    {data.activeRides > 0 ? (
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                    ) : (
                        <span className="inline-flex rounded-full h-3 w-3 bg-slate-200"></span>
                    )}
                </div>
                <div>
                    <div className="text-5xl font-black text-slate-800 tracking-tight mb-2">{data.activeRides}</div>
                    <div className="text-xs text-emerald-500 font-bold mt-1">In progress</div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <div className="flex items-start justify-between">
                    <div className="text-slate-500 text-xs font-bold uppercase tracking-wide">Shuttle Trips</div>
                    <Bus className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                    <div className="text-5xl font-black text-slate-800 tracking-tight mb-2">{data.shuttleTrips}</div>
                    <div className="text-xs text-slate-400 mt-1">Total runs MTD</div>
                </div>
            </div>
        </div>
    );
};

export const OutstandingAmountRow = ({ amount, invoices = [] }: { amount: number; invoices?: any[] }) => {
    return (
        <Card className="group border-l-4 border-l-orange-500 shadow-sm relative overflow-visible">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none hidden sm:block">
                <FileText size={100} className="text-orange-500" />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4 sm:gap-6">
                    <div className="p-3 bg-orange-50 rounded-2xl text-orange-600">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div>
                        <div className="text-slate-500 text-sm font-bold uppercase tracking-wide">Outstanding Balance</div>
                        <div className="group/info text-xs text-slate-400 flex items-center gap-1 relative cursor-default">
                            Total unpaid & overdue invoices
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block ml-1 animate-pulse"></span>

                            {/* Hover Tooltip/List */}
                            {invoices.length > 0 && (
                                <div className="invisible group-hover/info:visible absolute bottom-full left-0 mb-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden transform transition-all duration-200 opacity-0 group-hover/info:opacity-100 translate-y-2 group-hover/info:translate-y-0">
                                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                                        Recent Outstanding Invoices
                                    </div>
                                    <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                                        {invoices.map((inv, idx) => (
                                            <div key={idx} className="px-4 py-2 hover:bg-slate-50 transition-colors">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-mono text-[10px] text-slate-700 font-bold">{inv.invoice_number}</span>
                                                    <span className="text-rose-600 font-bold text-xs">PKR {Number(inv.total_amount).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-0.5">
                                                    <span className="text-[10px] text-slate-400">
                                                        {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${inv.status === 'OVERDUE' ? 'bg-rose-50 text-rose-600' : 'bg-orange-50 text-orange-600'
                                                        }`}>
                                                        {inv.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {invoices.length >= 10 && (
                                        <div className="bg-slate-50 px-4 py-1.5 text-[9px] text-slate-400 text-center border-t border-slate-100">
                                            Showing top 10 invoices
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                    <span className="text-xl sm:text-2xl text-slate-400 font-normal mr-2">PKR</span>
                    {amount.toLocaleString()}
                </div>
            </div>
        </Card>
    )
}


export const CostVisibilitySection = ({
    data,
    onEditBudget
}: {
    data: DashboardData['cost'];
    onEditBudget?: () => void;
}) => {
    const budget = data.budget || 1500000;
    const percentageUsed = Math.min((data.totalSpendMTD / budget) * 100, 100);

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <SectionTitle><CreditCard className="w-5 h-5 text-purple-500" /> Cost Visibility</SectionTitle>
                {onEditBudget && (
                    <button
                        onClick={onEditBudget}
                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold transition-colors bg-slate-50 hover:bg-indigo-50 px-2 py-1 rounded-md"
                    >
                        <Settings className="w-3 h-3" /> Edit Budget
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                <div className="flex flex-col gap-6">
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-slate-500 text-sm font-medium">Total Spend (MTD)</div>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${data.spendTrend.startsWith('-') ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {data.spendTrend}
                            </div>
                        </div>

                        <div className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                            <span className="text-xl text-slate-400 font-medium mr-1">PKR</span>
                            {(data.totalSpendMTD / 1000).toLocaleString()}k
                        </div>
                    </div>

                    {/* Bullet Graph / Progress Bar */}
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <div className="text-xs text-slate-400 font-semibold uppercase">Budget Usage</div>
                            <div className="text-xs text-right font-bold text-slate-600">{percentageUsed.toFixed(0)}%</div>
                        </div>
                        <div className="overflow-hidden h-3 mb-2 text-xs flex rounded-full bg-slate-100 border border-slate-200">
                            <div style={{ width: `${percentageUsed}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${percentageUsed > 90 ? 'bg-rose-500' : 'bg-slate-800'}`}></div>
                        </div>
                        <div className="text-[10px] text-slate-400 flex justify-between uppercase font-medium">
                            <span>0</span>
                            <span>{(budget / 1000).toLocaleString()}k Goal</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col h-full border-t md:border-t-0 md:border-l border-slate-100 md:pl-8 pt-6 md:pt-0">
                    <div className="flex flex-col">
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-slate-500 text-sm font-medium">Cost per Traveler</div>
                        </div>
                        <div className="text-4xl font-extrabold text-slate-900 tracking-tight">PKR {data.costPerEmployee.toLocaleString()}</div>
                        <div className="text-xs text-slate-400 mt-2">Average spend across {data.costPerEmployee > 5000 ? 'active' : 'all'} employees</div>
                    </div>


                    <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-slate-500 uppercase">Projection</div>
                                <div className="text-sm font-semibold text-slate-700">On track to stay within budget</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

export const SmartInsightsSection = ({ insights, seasonality }: { insights: string[], seasonality: DashboardData['seasonality'] }) => {
    return (
        <Card>
            <SectionTitle><span className="flex items-center gap-2"><div className="animate-pulse w-2 h-2 bg-indigo-500 rounded-full"></div> Smart Insights</span></SectionTitle>

            <div className="space-y-4">
                {insights.map((insight, idx) => (
                    <div
                        key={idx}
                        className="group flex flex-col gap-1 pb-3 border-b border-slate-100 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-2 -mx-2 rounded-lg transition-colors"
                        title="Click to view details"
                    >
                        <div className="flex justify-between items-start gap-2">
                            <div className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                                <span className="text-indigo-500 font-bold mr-2">Ok.</span>
                                {insight}
                            </div>
                        </div>
                        {/* Small Sparkline for demand trends */}
                        <div className="self-end mt-1">
                            <Sparkline color="#818cf8" data={[30 + Math.random() * 20, 40 + Math.random() * 20, 35, 50, 45, 60, 55]} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-bold">Peak Day</div>
                    <div className="text-slate-800 font-bold text-lg">{seasonality.highDemandDay}</div>
                </div>
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide font-bold">Quiet Day</div>
                    <div className="text-slate-800 font-bold text-lg">{seasonality.lowDemandDay}</div>
                </div>
            </div>
        </Card>
    )
}

export const EmployeeUsageSection = ({ data }: { data: DashboardData['employeeUsage'] }) => {
    return (
        <Card>
            <SectionTitle><Users className="w-5 h-5 text-indigo-500" /> Employee Adoption</SectionTitle>

            <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1 min-w-[120px]">
                    <div className="text-3xl font-bold text-slate-800">{data.activeEmployees}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Active Passengers</div>
                </div>
                <div className="hidden sm:block w-px h-10 bg-slate-200"></div>
                <div className="flex-1 min-w-[120px]">
                    <div className="text-3xl font-bold text-slate-800">{data.avgRidesPerEmployee}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold">Avg Rides/Emp</div>
                </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl mb-6 border border-indigo-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 shrink-0">
                    <Star className="w-5 h-5 fill-indigo-600" />
                </div>
                <div>
                    <div className="text-xs text-indigo-400 font-bold uppercase">Top Passenger</div>
                    <div className="font-bold text-slate-800 text-sm">{data.topPassenger.name} <span className="font-normal text-slate-500">({data.topPassenger.rides} rides)</span></div>
                </div>
            </div>

            {/* Horizontal Stacked Bar Chart for Departments */}
            <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Department Breakdown</div>
                <div className="flex w-full h-8 rounded-lg overflow-hidden my-2">
                    {data.departmentUsage.map((dept, i) => (
                        <div
                            key={i}
                            style={{ width: `${dept.percentage}%` }}
                            className={`h-full flex items-center justify-center text-[10px] font-bold text-white transition-all hover:opacity-90 cursor-help
                    ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-teal-500' : 'bg-slate-300'}
                  `}
                            title={`${dept.name}: ${dept.percentage}%`}
                        >
                            {dept.percentage > 10 && `${dept.percentage}%`}
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                    {data.departmentUsage.map((dept, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                            <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-blue-500' : i === 2 ? 'bg-teal-500' : 'bg-slate-300'}`} />
                            <span className="text-slate-600 font-medium">{dept.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    )
}

export const AdoptionHealthSection = ({ data }: { data: DashboardData['adminHealth'] }) => {
    return (
        <Card className="h-full">
            <SectionTitle><ShieldCheck className="w-5 h-5 text-emerald-500" /> System Health</SectionTitle>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 font-medium">Active Users</div>
                    <div className="text-sm font-bold text-slate-800">{(data.registeredVsActiveRatio * 100).toFixed(0)}%</div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${data.registeredVsActiveRatio * 100}%` }} />
                </div>

                <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-slate-600 font-medium">Dept. Adoption</div>
                    <div className="text-sm font-bold text-slate-800">{data.deptAdoptionRate}%</div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${data.deptAdoptionRate}%` }} />
                </div>

                <div className="flex justify-between text-xs text-slate-400 pt-2">
                    <span>System wide health checked today</span>
                    <span className="text-emerald-500 font-bold">Good</span>
                </div>
            </div>
        </Card>
    )
}

export const ServiceUsageSection = ({ data }: { data: DashboardData['services'] }) => {
    const chartData = [
        { label: 'Chauffeur', value: data.chauffeur, color: '#3b82f6' }, // blue-500
        { label: 'Shuttle/Bus', value: data.shuttles, color: '#6366f1' }, // indigo-500
        { label: 'Event Shuttle', value: data.eventShuttle, color: '#e2e8f0' } // slate-200
    ];

    return (
        <Card>
            <SectionTitle><Car className="w-5 h-5 text-blue-500" /> Service Split</SectionTitle>

            <div className="flex flex-col items-center justify-center h-full py-2">
                <DonutChart data={chartData} />

                <div className="flex justify-center gap-4 mt-6 w-full">
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mb-1"></div>
                        <div className="text-lg font-bold text-slate-800">{data.chauffeur}%</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Chauffeur</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-indigo-500 mb-1"></div>
                        <div className="text-lg font-bold text-slate-800">{data.shuttles}%</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Shuttle</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-slate-200 mb-1"></div>
                        <div className="text-lg font-bold text-slate-800">{data.eventShuttle}%</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Event Shuttle</div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

export const PremiumTeaser = () => {
    return (
        <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-amber-700/60 text-xs font-medium cursor-not-allowed grayscale-[0.3] hover:grayscale-0 transition-all opacity-70 hover:opacity-100">
                <Star className="w-3 h-3 fill-amber-500/50" />
                Advanced analytics & custom reports available on request
            </div>
        </div>
    )
}
