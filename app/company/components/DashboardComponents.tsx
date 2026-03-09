
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
    Settings,
    Wallet
} from 'lucide-react';
import { DashboardData } from '../types';

// --- Shared Components ---

export const Card = ({ children, className = "", withLeftBorder = false }: { children: React.ReactNode; className?: string; withLeftBorder?: boolean }) => (
    <div className={`bg-gradient-to-br from-white via-white to-[var(--surface-card)] border border-[var(--border-light)] rounded-[2rem] p-6 h-full shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-0.5 ${withLeftBorder ? 'border-l-4 border-l-[var(--cort-navy)]' : ''} ${className}`}>
        {children}
    </div>
);

export const SectionTitle = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
    <h3 className="text-lg font-bold text-[var(--cort-navy)] mb-4 flex items-center gap-2">
        {icon && <span className="text-[var(--cort-orange)]">{icon}</span>}
        {children}
    </h3>
);

// --- Charts & Visuals ---

const Sparkline = ({ data = [40, 30, 45, 50, 42, 55, 60], color = "var(--cort-orange)" }: { data?: number[], color?: string }) => {
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
        <div className="relative w-40 h-40 flex items-center justify-center -mt-2">
            <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                {total === 0 ? (
                    <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="transparent"
                        stroke="var(--border-light)"
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
                <span className="text-2xl font-bold text-[var(--cort-navy)]">{total}</span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Total Rides</span>
            </div>
        </div>
    );
};

const HeatmapPlaceholder = () => (
    <div className="relative w-full h-24 bg-[var(--surface-muted)] rounded-[2rem] overflow-hidden border border-[var(--border-light)] mt-2">
        {/* Abstract Map Roads */}
        <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 200 100" preserveAspectRatio="none">
            <path d="M0,50 Q50,40 100,50 T200,50" stroke="var(--text-muted)" strokeWidth="2" fill="none" />
            <path d="M40,0 Q50,50 60,100" stroke="var(--text-muted)" strokeWidth="2" fill="none" />
            <path d="M140,0 Q130,50 120,100" stroke="var(--text-muted)" strokeWidth="2" fill="none" />
            <path d="M20,20 L180,80" stroke="var(--text-muted)" strokeWidth="1" fill="none" />
        </svg>
        {/* Hotspots */}
        <div className="absolute top-1/2 left-1/3 w-8 h-8 bg-[var(--cort-navy)]/30 rounded-full blur-md animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-6 h-6 bg-[var(--cort-orange)]/30 rounded-full blur-md animate-pulse delay-75"></div>
        <div className="absolute bottom-1/4 left-1/4 w-10 h-10 bg-[var(--accent-success)]/20 rounded-full blur-xl"></div>
    </div>
)

// --- Sections ---

export const TakingCareSection = ({ data }: { data: DashboardData['takingCare'] }) => {
    const isZero = data.unassignedBookings === 0;

    return (
        <div className="grid grid-cols-1 gap-4 h-full">
            <Card className="relative overflow-hidden group transition-all">
                <div className={`absolute top-0 right-0 p-4 transition-opacity opacity-5 text-[var(--cort-navy)]`}>
                    <AlertCircle size={80} />
                </div>
                <div className="relative z-10">
                    <div className="text-[var(--text-muted)] font-medium text-sm mb-1 uppercase tracking-wider">Un-Assigned Bookings</div>
                    <div className="text-5xl font-black text-[var(--cort-navy)]">{data.unassignedBookings}</div>
                    <div className="mt-2 text-sm text-[var(--text-muted)] flex items-center gap-2">
                        {isZero ? "All caught up" : <span className="bg-[#fef3c7] text-[var(--cort-orange)] font-bold px-2 py-0.5 rounded-full text-xs border border-[#fcd34d]">Requires attention</span>}
                    </div>
                </div>
            </Card>

            <Card className="bg-white border-[var(--border-light)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 text-[var(--accent-success)] opacity-5 group-hover:opacity-10 transition-opacity">
                    <CheckCircle size={80} />
                </div>
                <div className="relative z-10">
                    <div className="text-[var(--text-muted)] font-medium text-sm mb-1 uppercase tracking-wider">Rides Completed</div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-5xl font-black text-[var(--cort-navy)]">{data.ridesCompleted}</div>
                        <div className="text-sm font-bold text-white bg-[var(--accent-success)] px-2 py-1 rounded-full">{data.completedTrend}</div>
                    </div>
                    <div className="mt-2 text-[var(--text-muted)] text-sm">Successfully completed items</div>
                </div>
            </Card>
        </div>
    );
};

export const NothingToDoSection = ({ data }: { data: DashboardData['nothingToDo'] }) => {
    return (
        <Card className="bg-white border border-[var(--border-light)] flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.08)] h-full">
            <div className="flex items-center gap-4">
                <div className="bg-[#d1fae5] p-3 rounded-2xl">
                    <CheckCircle className="w-8 h-8 text-[var(--accent-success)]" />
                </div>
                <div>
                    <div className="font-bold text-xl text-[var(--cort-navy)]">You are all caught up!</div>
                    <div className="text-[var(--text-muted)] text-sm flex gap-3 mt-1">
                        <span className="opacity-90">No pending approvals</span>
                        <span className="opacity-90">System healthy</span>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export const ValueDeliveredSection = ({ data }: { data: DashboardData['valueDelivered'] }) => {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {/* Total Savings */}
            <div className="bg-gradient-to-br from-white via-white to-[var(--surface-card)] p-5 rounded-[2rem] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col justify-between hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 relative overflow-hidden group">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-32 flex items-center justify-center opacity-10 group-hover:opacity-15 transition-opacity">
                    <Zap size={120} className="text-[var(--cort-orange)]" />
                </div>
                <div className="relative z-10">
                    <div className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wide">Total Savings</div>
                </div>
                <div className="relative z-10">
                    <div className="text-5xl font-black text-[var(--cort-navy)] tracking-tight mb-2">
                        <span className="text-2xl text-[var(--text-muted)] font-normal mr-1">PKR</span>
                        {(data.estimatedSavings / 1000).toFixed(0)}k
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Estimated MTD</div>
                </div>
            </div>

            {/* Avg Trip Cost */}
            <div className="bg-[var(--cort-navy)] p-5 rounded-[2rem] border border-[var(--cort-navy)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col justify-between text-white hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 relative overflow-hidden group">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-32 flex items-center justify-center opacity-10 group-hover:opacity-15 transition-opacity">
                    <Activity size={120} className="text-white" />
                </div>
                <div className="relative z-10">
                    <div className="text-white text-opacity-80 text-xs font-bold uppercase tracking-wide">Avg Trip Cost</div>
                </div>
                <div className="relative z-10">
                    <div className="text-5xl font-black text-white tracking-tight mb-2">
                        <span className="text-2xl text-white text-opacity-60 font-normal mr-1">PKR</span>
                        {(data.avgTripCost / 1000).toFixed(1)}k
                    </div>
                    <div className="text-xs text-white text-opacity-60 mt-1">Per completed ride</div>
                </div>
            </div>

            {/* Active Chauffeur Rides */}
            <div className="bg-gradient-to-br from-white via-white to-[var(--surface-card)] p-5 rounded-[2rem] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col justify-between hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 relative overflow-hidden group">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-32 flex items-center justify-center opacity-10 group-hover:opacity-15 transition-opacity">
                    <Car size={120} className="text-[var(--cort-navy)]" />
                </div>
                <div className="relative z-10 flex items-start justify-between">
                    <div className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wide">Active Chauffeur Rides</div>
                    {data.activeRides > 0 ? (
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-success)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent-success)]"></span>
                        </span>
                    ) : (
                        <span className="inline-flex rounded-full h-3 w-3 bg-[var(--border-light)]"></span>
                    )}
                </div>
                <div className="relative z-10 mt-2">
                    <div className="text-5xl font-black text-[var(--cort-navy)] tracking-tight mb-2">{data.activeRides}</div>
                    <div className="text-xs text-[var(--accent-success)] font-bold mt-1">In progress</div>
                </div>
            </div>

            {/* Shuttle Trips */}
            <div className="bg-gradient-to-br from-white via-white to-[var(--surface-card)] p-5 rounded-[2rem] border border-[var(--border-light)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] flex flex-col justify-between hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all hover:-translate-y-0.5 relative overflow-hidden group">
                <div className="pointer-events-none absolute inset-y-0 right-0 w-32 flex items-center justify-center opacity-10 group-hover:opacity-15 transition-opacity">
                    <Bus size={120} className="text-[var(--cort-orange)]" />
                </div>
                <div className="relative z-10">
                    <div className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wide">Shuttle Trips</div>
                </div>
                <div className="relative z-10">
                    <div className="text-5xl font-black text-[var(--cort-navy)] tracking-tight mb-2">{data.shuttleTrips}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">Total runs MTD</div>
                </div>
            </div>
        </div>
    );
};

export const OutstandingAmountRow = ({ amount, invoices = [] }: { amount: number; invoices?: any[] }) => {
    return (
        <Card className="group relative overflow-visible z-20 p-5">
            <div className="pointer-events-none hidden sm:block absolute inset-0 overflow-hidden rounded-[2rem]">
                <div className="absolute inset-y-4 right-0 w-40 flex items-center justify-center opacity-10 transform rotate-12">
                    <Wallet size={120} className="text-[var(--text-muted)]" />
                </div>
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row justify-between h-full gap-8">
                {/* Left: Title & Amount */}
                <div className="flex flex-col justify-between">
                    <div>
                        <div className="text-[var(--cort-navy)] text-[11px] font-black uppercase tracking-widest opacity-80 mb-1">Outstanding Balance</div>
                        <div className="text-5xl font-black text-[var(--accent-danger)] tracking-tight">
                            <span className="text-2xl text-[var(--text-muted)] font-normal mr-2">PKR</span>
                            {amount.toLocaleString()}
                        </div>
                    </div>

                    <div className="mt-4 lg:mt-6">
                        <div className="group/info text-xs text-[var(--text-secondary)] flex items-center gap-2 relative cursor-default font-medium">
                            <span className="opacity-80">Total unpaid & overdue invoices</span>
                            <span className="w-2 h-2 rounded-full bg-[var(--accent-danger)] inline-block animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]"></span>

                            {/* Hover Tooltip/List */}
                            {invoices.length > 0 && (
                                <div className="invisible group-hover/info:visible absolute bottom-full left-0 mb-3 w-64 bg-white border border-[var(--border-light)] rounded-[2rem] shadow-xl z-50 overflow-hidden transform transition-all duration-200 opacity-0 group-hover/info:opacity-100 translate-y-2 group-hover/info:translate-y-0 text-left font-normal">
                                    <div className="bg-[var(--surface-muted)] px-4 py-2 border-b border-[var(--border-light)] text-[var(--cort-navy)] font-bold text-[10px] uppercase">
                                        Recent Outstanding Invoices
                                    </div>
                                    <div className="divide-y divide-[var(--surface-muted)] max-h-48 overflow-y-auto">
                                        {invoices.map((inv, idx) => (
                                            <div key={idx} className="px-4 py-2 hover:bg-[var(--surface-subtle)] transition-colors">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-mono text-[10px] text-[var(--cort-navy)] font-bold">{inv.invoice_number}</span>
                                                    <span className="text-[var(--accent-danger)] font-bold text-xs">PKR {Number(inv.total_amount).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-0.5">
                                                    <span className="text-[10px] text-[var(--text-muted)]">
                                                        {new Date(inv.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${inv.status === 'OVERDUE' ? 'bg-red-50 text-[var(--accent-danger)]' : 'bg-yellow-50 text-[var(--accent-warning)]'
                                                        }`}>
                                                        {inv.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {invoices.length >= 10 && (
                                        <div className="bg-[var(--surface-muted)] px-4 py-1.5 text-[9px] text-[var(--text-muted)] text-center border-t border-[var(--border-light)]">
                                            Showing top 10 invoices
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Center: Breakdown Metrics (Hidden on Mobile) */}
                <div className="hidden lg:flex items-center gap-12 px-12 border-x border-[var(--border-light)] mx-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1">Overdue</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-[var(--accent-danger)]">{invoices.filter(i => i.status === 'OVERDUE').length}</span>
                            <span className="text-xs text-[var(--text-muted)] font-bold">Invoices</span>
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1">Pending</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-[var(--cort-navy)]">{invoices.filter(i => i.status !== 'OVERDUE').length}</span>
                            <span className="text-xs text-[var(--text-muted)] font-bold">Invoices</span>
                        </div>
                    </div>
                </div>

                {/* Right: Status & Action */}
                <div className="flex flex-col justify-between items-end">
                    <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider bg-[var(--surface-muted)] px-3 py-1 rounded-full border border-[var(--border-light)]">
                        Action Required
                    </div>
                    {/* Floating premium detail */}
                    <div className="mt-8 text-right">
                        <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1">Last Update</div>
                        <div className="text-xs font-bold text-[var(--cort-navy)]">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
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
                <SectionTitle><CreditCard className="w-5 h-5 text-[var(--cort-orange)]" /> Cost Visibility</SectionTitle>
                {onEditBudget && (
                    <button
                        onClick={onEditBudget}
                        className="text-xs flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--cort-orange)] font-bold transition-colors bg-[var(--surface-muted)] hover:bg-[#fef3c7] px-2 py-1 rounded-md"
                    >
                        <Settings className="w-3 h-3" /> Edit Budget
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                <div className="flex flex-col gap-6">
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-[var(--text-muted)] text-sm font-medium">Total Spend (MTD)</div>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${data.spendTrend.startsWith('-') ? 'bg-[#d1fae5] text-[var(--accent-success)]' : 'bg-[#fee2e2] text-[var(--accent-danger)]'}`}>
                                {data.spendTrend}
                            </div>
                        </div>

                        <div className="text-4xl font-extrabold text-[var(--cort-navy)] tracking-tight mb-4">
                            <span className="text-xl text-[var(--text-muted)] font-medium mr-1">PKR</span>
                            {(data.totalSpendMTD / 1000).toLocaleString()}k
                        </div>
                    </div>

                    {/* Bullet Graph / Progress Bar */}
                    <div className="relative pt-1">
                        <div className="flex mb-2 items-center justify-between">
                            <div className="text-xs text-[var(--text-muted)] font-semibold uppercase">Budget Usage</div>
                            <div className="text-xs text-right font-bold text-[var(--cort-navy)]">{percentageUsed.toFixed(0)}%</div>
                        </div>
                        <div className="overflow-hidden h-3 mb-2 text-xs flex rounded-full bg-[var(--border-light)] border border-[var(--border-dark)]">
                            <div style={{ width: `${percentageUsed}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${percentageUsed > 90 ? 'bg-[var(--accent-danger)]' : 'bg-[var(--cort-navy)]'}`}></div>
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] flex justify-between uppercase font-medium">
                            <span>0</span>
                            <span>{(budget / 1000).toLocaleString()}k Goal</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col h-full border-t md:border-t-0 md:border-l border-[var(--border-light)] md:pl-8 pt-6 md:pt-0">
                    <div className="flex flex-col">
                        <div className="flex justify-between items-end mb-1">
                            <div className="text-[var(--text-muted)] text-sm font-medium">Cost per Traveler</div>
                        </div>
                        <div className="text-4xl font-extrabold text-[var(--cort-navy)] tracking-tight">PKR {data.costPerEmployee.toLocaleString()}</div>
                        <div className="text-xs text-[var(--text-muted)] mt-2">Average spend across {data.costPerEmployee > 5000 ? 'active' : 'all'} employees</div>
                    </div>


                    <div className="mt-4 bg-[var(--surface-muted)] rounded-[2rem] p-4 border border-[var(--border-light)]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#fef3c7] text-[var(--cort-orange)] rounded-lg">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-[var(--text-muted)] uppercase">Projection</div>
                                <div className="text-sm font-semibold text-[var(--cort-navy)]">On track to stay within budget</div>
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
        <Card className="bg-white border border-[var(--border-light)]">
            <SectionTitle><span className="flex items-center gap-2"><div className="animate-pulse w-2 h-2 bg-[var(--cort-orange)] rounded-full"></div> Smart Insights</span></SectionTitle>

            <div className="space-y-4">
                {insights.map((insight, idx) => (
                    <div
                        key={idx}
                        className="group flex flex-col gap-1 pb-3 border-b border-[var(--border-light)] last:border-0 last:pb-0 cursor-pointer hover:bg-[var(--surface-muted)] p-2 -mx-2 rounded-lg transition-colors"
                        title="Click to view details"
                    >
                        <div className="flex justify-between items-start gap-2">
                            <div className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--cort-navy)] transition-colors">
                                <span className="text-[var(--cort-orange)] font-bold mr-2">•</span>
                                {insight}
                            </div>
                        </div>
                        {/* Small Sparkline for demand trends */}
                        <div className="self-end mt-1">
                            <Sparkline color="var(--cort-orange)" data={[30 + Math.random() * 20, 40 + Math.random() * 20, 35, 50, 45, 60, 55]} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border-light)] grid grid-cols-2 gap-4">
                <div>
                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-bold">Peak Day</div>
                    <div className="text-[var(--cort-navy)] font-bold text-lg">{seasonality.highDemandDay}</div>
                </div>
                <div>
                    <div className="text-xs text-[var(--text-muted)] uppercase tracking-wide font-bold">Quiet Day</div>
                    <div className="text-[var(--cort-navy)] font-bold text-lg">{seasonality.lowDemandDay}</div>
                </div>
            </div>
        </Card>
    )
}

export const EmployeeUsageSection = ({ data }: { data: DashboardData['employeeUsage'] }) => {
    return (
        <Card className="bg-white border border-[var(--border-light)]">
            <SectionTitle><Users className="w-5 h-5 text-[var(--cort-orange)]" /> Employee Adoption</SectionTitle>

            <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1 min-w-[120px]">
                    <div className="text-3xl font-bold text-[var(--cort-navy)]">{data.activeEmployees}</div>
                    <div className="text-xs text-[var(--text-muted)] uppercase font-bold">Active Passengers</div>
                </div>
                <div className="hidden sm:block w-px h-10 bg-[var(--border-light)]"></div>
                <div className="flex-1 min-w-[120px]">
                    <div className="text-3xl font-bold text-[var(--cort-navy)]">{data.avgRidesPerEmployee}</div>
                    <div className="text-xs text-[var(--text-muted)] uppercase font-bold">Avg Rides/Emp</div>
                </div>
            </div>

            <div className="bg-[var(--cort-navy)] p-4 rounded-2xl mb-6 border border-[var(--cort-navy-border)] flex items-center gap-3">
                <div className="w-10 h-10 bg-[var(--cort-orange)]/20 rounded-full flex items-center justify-center text-[var(--cort-orange)] shrink-0">
                    <Star className="w-5 h-5 fill-[var(--cort-orange)]" />
                </div>
                <div>
                    <div className="text-[11px] text-white text-opacity-70 font-bold uppercase">Top Passenger</div>
                    <div className="font-bold text-white text-sm">
                        {data.topPassenger.name}{' '}
                        <span className="font-normal text-white text-opacity-60">({data.topPassenger.rides} rides)</span>
                    </div>
                </div>
            </div>

            {/* Department Breakdown: list with bar per department (better for long names) */}
            <div>
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">Department Breakdown</div>
                <div className="space-y-2.5">
                    {data.departmentUsage.map((dept, i) => {
                        const colors = ['bg-[var(--cort-navy)]', 'bg-[var(--cort-orange)]', 'bg-[var(--accent-success)]', 'bg-[var(--text-muted)]'];
                        const color = colors[i % colors.length];
                        return (
                            <div key={i} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-[var(--text-secondary)] truncate" title={dept.name}>{dept.name}</span>
                                    <span className="text-xs font-bold text-[var(--cort-navy)] shrink-0">{dept.percentage}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-[var(--border-light)] overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${color}`}
                                        style={{ width: `${dept.percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Card>
    )
}

export const AdoptionHealthSection = ({ data }: { data: DashboardData['adminHealth'] }) => {
    return (
        <Card className="h-full bg-white border border-[var(--border-light)]">
            <SectionTitle><ShieldCheck className="w-5 h-5 text-[var(--accent-success)]" /> System Health</SectionTitle>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-[var(--text-muted)] font-medium">Active Users</div>
                    <div className="text-sm font-bold text-[var(--accent-success)]">{(data.registeredVsActiveRatio * 100).toFixed(0)}%</div>
                </div>
                <div className="w-full bg-[var(--border-light)] h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--accent-success)] h-full rounded-full" style={{ width: `${data.registeredVsActiveRatio * 100}%` }} />
                </div>

                <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-[var(--text-muted)] font-medium">Dept. Adoption</div>
                    <div className="text-sm font-bold text-[var(--cort-navy)]">{data.deptAdoptionRate}%</div>
                </div>
                <div className="w-full bg-[var(--border-light)] h-2 rounded-full overflow-hidden">
                    <div className="bg-[var(--cort-orange)] h-full rounded-full" style={{ width: `${data.deptAdoptionRate}%` }} />
                </div>

                <div className="flex justify-between text-xs text-[var(--text-muted)] pt-2">
                    <span>System wide health checked today</span>
                    <span className="text-[var(--accent-success)] font-bold">Good</span>
                </div>
            </div>
        </Card>
    )
}

export const ServiceUsageSection = ({ data }: { data: DashboardData['services'] }) => {
    const chartData = [
        { label: 'Chauffeur', value: data.chauffeur, color: '#0c225e' }, // navy
        { label: 'Shuttle/Bus', value: data.shuttles, color: '#f47f00' }, // orange
        { label: 'Event Shuttle', value: data.eventShuttle, color: '#e5e7eb' } // light gray
    ];

    return (
        <Card>
            <SectionTitle><Car className="w-5 h-5 text-[#f47f00]" /> Service Split</SectionTitle>

            <div className="flex flex-col items-center justify-center h-full py-2">
                <DonutChart data={chartData} />

                <div className="flex justify-center gap-4 mt-6 w-full">
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[#0c225e] mb-1"></div>
                        <div className="text-lg font-bold text-[#0c225e]">{data.chauffeur}%</div>
                        <div className="text-[10px] text-[#9ca3af] uppercase font-bold">Chauffeur</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[#f47f00] mb-1"></div>
                        <div className="text-lg font-bold text-[#0c225e]">{data.shuttles}%</div>
                        <div className="text-[10px] text-[#9ca3af] uppercase font-bold">Shuttle</div>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-[#e5e7eb] mb-1"></div>
                        <div className="text-lg font-bold text-[#0c225e]">{data.eventShuttle}%</div>
                        <div className="text-[10px] text-[#9ca3af] uppercase font-bold">Event Shuttle</div>
                    </div>
                </div>
            </div>
        </Card>
    )
}

export const PremiumTeaser = () => {
    return (
        <div className="mt-8 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#fef3c7] border border-[#fcd34d] text-[#b45309] text-xs font-medium cursor-not-allowed hover:opacity-100 transition-all opacity-90">
                <Star className="w-3 h-3 fill-[var(--cort-orange)]" />
                Advanced analytics & custom reports available on request
            </div>
        </div>
    )
}
