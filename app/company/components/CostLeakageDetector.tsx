'use client';

import React, { useState } from 'react';
import {
    Zap,
    Bus,
    Car,
    ArrowRight,
    TrendingUp,
    Users,
    Route,
    X,
    ChevronRight,
    Search,
    Lock,
    Crown
} from 'lucide-react';
import { Card } from './DashboardComponents';
import Modal from '../bookings/components/Modal';

interface CostLeakageDetectorProps {
    data: {
        insights: Array<{
            id: string;
            title: string;
            description: string;
            savings: number;
            longDescription: string;
            iconType: string;
            affectedEmployees: Array<{ name: string; dept: string; currentCost: number }>;
            revisedRouteName: string;
            revisedRouteStops: string[];
        }>;
    };
}

const CostLeakageDetector = ({ data }: CostLeakageDetectorProps) => {
    const [selectedInsight, setSelectedInsight] = useState<any | null>(null);

    // Simulated AI insights for presentation
    const mockInsights = [
        {
            id: 'shuttle-migration',
            title: "Shuttle Migration Impact",
            description: "Shift 32% of individual rides to shuttle for morning shift.",
            savings: 186000,
            longDescription: "Your company could save Rs 186,000/month by shifting 32% of individual rides to a dedicated shuttle service. This transition significantly reduces the per-head cost and carbon footprint.",
            iconType: 'bus',
            affectedEmployees: [
                { name: "Ahmed Salman", dept: "Engineering", currentCost: 12500 },
                { name: "Zainab Malik", dept: "HR", currentCost: 10200 },
                { name: "Omar Farooq", dept: "Marketing", currentCost: 9800 },
                { name: "Sara Khan", dept: "Engineering", currentCost: 11400 },
                { name: "Bilal Aziz", dept: "Operations", currentCost: 10900 },
            ],
            revisedRouteName: "Alpha Morning Shuttle",
            revisedRouteStops: ["Gulshan-e-Iqbal", "National Stadium", "Shahrah-e-Faisal", "Office"],
            premiumMessage: "Unlock full analysis of individual ride patterns to identify high-potential shuttle migration opportunities and carbon reduction metrics."
        },
        {
            id: 'route-consolidation',
            title: "Route Consolidation Opportunity",
            description: "Merge Shuttle Route 4 and Route 5 to optimize occupancy.",
            savings: 50000,
            longDescription: "Consolidate Route 4 & Route 5 to reduce mobility costs. Current occupancy on both routes is below 60%. Merging them will increase efficiency to 90% and save approximately Rs. 50,000 per month.",
            iconType: 'route',
            affectedEmployees: [
                { name: "Kashif Ali", dept: "Finance", currentCost: 8500 },
                { name: "Madiha Shah", dept: "Tech", currentCost: 7900 },
                { name: "Tariq Jameel", dept: "Admin", currentCost: 8200 },
            ],
            revisedRouteName: "Consolidated Route 4+5",
            revisedRouteStops: ["DHA Phase 6", "Sea View", "Clifton Block 4", "Cantt Station", "Office"],
            premiumMessage: "Get deep-dive occupancy analysis across overlapping routes to maximize passenger density and eliminate fleet redundancies."
        }
    ];

    const currentInsights = data?.insights?.length > 0 ? data.insights : mockInsights;

    const insights = currentInsights.map(insight => ({
        ...insight,
        savings: insight.savings.toLocaleString(),
        icon: insight.iconType === 'bus' ? <Bus className="w-8 h-8" /> : <Route className="w-8 h-8" />,
        color: insight.iconType === 'bus' ? "bg-[var(--cort-orange)] text-white" : "bg-[var(--cort-navy)] text-white",
        affectedEmployees: insight.affectedEmployees.map(emp => ({
            ...emp,
            currentCost: `PKR ${emp.currentCost.toLocaleString()}`
        })),
        revisedRoute: {
            name: insight.revisedRouteName,
            stops: insight.revisedRouteStops
        }
    }));

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col items-center justify-center text-center px-2">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-2xl bg-[var(--surface-muted)] text-[var(--cort-orange)] shadow-sm">
                        <Zap size={24} className="fill-current" />
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-black text-[var(--cort-navy)] uppercase tracking-tight">Power Insights</h2>
                            <span className="flex items-center gap-1 bg-gradient-to-r from-[var(--cort-navy)] to-[var(--cort-navy-hover)] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-white/10">
                                <Crown size={10} className="fill-current" />
                                Premium
                            </span>
                        </div>
                        <p className="text-[var(--text-muted)] text-sm font-bold mt-1 uppercase tracking-widest opacity-80">Cost Leakage Detector & Efficiency Analysis</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {insights.map((insight) => (
                    <div
                        key={insight.id}
                        onClick={() => setSelectedInsight(insight)}
                        className={`${insight.color} rounded-[2rem] p-8 min-h-[240px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-transparent hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden group flex flex-col justify-between`}
                    >
                        {/* Independent Blur and Unlock UI per Card */}
                        <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 backdrop-blur-[2px]">
                            <div className="bg-white/90 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                <Lock size={16} className="text-[var(--cort-navy)]" />
                                <span className="text-xs font-black uppercase tracking-[0.1em] text-[var(--cort-navy)]">Open Full Analysis</span>
                            </div>
                        </div>

                        <div className="relative z-10 filter blur-[4px] opacity-60 group-hover:blur-0 group-hover:opacity-100 transition-all duration-500">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                                    {insight.icon}
                                </div>
                                <div className="p-2 rounded-full bg-white/10">
                                    <Crown size={18} className="fill-current" />
                                </div>
                            </div>

                            <h3 className="text-xl font-black mb-2 tracking-tight">{insight.title}</h3>
                            <p className="text-sm opacity-80 leading-relaxed max-w-[90%]">{insight.description}</p>
                        </div>

                        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex items-end justify-between filter blur-[4px] opacity-60 group-hover:blur-0 group-hover:opacity-100 transition-all duration-500">
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase opacity-60 tracking-widest mb-1">Potential Monthly Savings</span>
                                <div className="text-5xl font-black tracking-tighter flex items-baseline">
                                    <span className="text-2xl font-normal opacity-60 mr-1.5 uppercase">Rs</span>
                                    {insight.savings}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Drill-down Modal with Premium Blur */}
            <Modal
                isOpen={!!selectedInsight}
                onClose={() => setSelectedInsight(null)}
                title="Optimization Detail"
            >
                {selectedInsight && (
                    <div className="relative">
                        {/* Premium Modal Overlay */}
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center">
                            <div className="bg-white/95 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] border border-white/50 max-w-sm w-full animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-gradient-to-tr from-[var(--cort-navy)] to-[var(--cort-navy-hover)] rounded-2xl flex items-center justify-center text-white mb-5 mx-auto shadow-xl">
                                    <Lock size={32} strokeWidth={2.5} />
                                </div>
                                <h3 className="text-2xl font-black text-[var(--cort-navy)] mb-2 tracking-tight">Full Impact Analysis</h3>
                                <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed font-medium">
                                    {selectedInsight.premiumMessage}
                                </p>
                                <button className="w-full py-3.5 bg-[var(--cort-navy)] text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] hover:bg-[var(--cort-navy-hover)] transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2">
                                    <span>Activate Efficiency Suite</span>
                                    <ArrowRight size={14} />
                                </button>
                                <button
                                    onClick={() => setSelectedInsight(null)}
                                    className="mt-4 text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--cort-navy)] uppercase tracking-widest"
                                >
                                    Dismiss for now
                                </button>
                            </div>
                        </div>

                        {/* Blurred Modal Content */}
                        <div className="space-y-8 py-2 filter blur-[2px] opacity-60 select-none pointer-events-none">
                            {/* Header Info */}
                            <div className="flex items-start gap-4">
                                <div className={`p-4 rounded-[1.5rem] ${selectedInsight.color} shrink-0`}>
                                    {selectedInsight.icon}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-[var(--cort-navy)] tracking-tight">{selectedInsight.title}</h3>
                                    <p className="text-[var(--text-secondary)] text-sm mt-1 leading-relaxed">
                                        {selectedInsight.longDescription}
                                    </p>
                                </div>
                            </div>

                            {/* Savings Highlight */}
                            <div className="p-6 rounded-[2rem] bg-[var(--surface-muted)] border border-[var(--border-light)] flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex flex-col items-center md:items-start">
                                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">Estimated Savings</span>
                                    <div className="text-4xl font-black text-[var(--cort-navy)] tracking-tight">
                                        <span className="text-xl font-medium opacity-40 mr-1 uppercase">Rs.</span>
                                        {selectedInsight.savings}
                                        <span className="text-lg font-medium opacity-40 ml-1">/ mo</span>
                                    </div>
                                </div>
                                <div className="h-12 w-px bg-[var(--border-light)] hidden md:block"></div>
                                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                                    <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest mb-1">Impact Radius</span>
                                    <div className="flex items-center gap-2">
                                        <Users className="text-[var(--cort-orange)]" size={24} />
                                        <span className="text-2xl font-black text-[var(--cort-navy)]">{selectedInsight.affectedEmployees.length} Employees</span>
                                    </div>
                                </div>
                            </div>

                            {/* Two Column Section: Employees & Route */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Affected Employees */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Users size={18} className="text-[var(--cort-navy)]" />
                                        <h4 className="text-sm font-black uppercase tracking-widest text-[var(--cort-navy)]">Affected Employees</h4>
                                    </div>
                                    <div className="rounded-2xl border border-[var(--border-light)] overflow-hidden">
                                        <div className="max-h-[300px] overflow-y-auto divide-y divide-[var(--border-light)]">
                                            {selectedInsight.affectedEmployees.map((emp: any, i: number) => (
                                                <div key={i} className="p-4 flex justify-between items-center hover:bg-[var(--surface-subtle)] transition-colors">
                                                    <div>
                                                        <div className="font-bold text-[var(--cort-navy)] text-sm">{emp.name}</div>
                                                        <div className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-tighter">{emp.dept}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs font-bold text-[var(--accent-danger)] opacity-80">{emp.currentCost}</div>
                                                        <div className="text-[9px] text-[var(--text-muted)] font-medium">Monthly Spend</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Revised Route */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Route size={18} className="text-[var(--cort-navy)]" />
                                        <h4 className="text-sm font-black uppercase tracking-widest text-[var(--cort-navy)]">Revised Route</h4>
                                    </div>
                                    <div className="p-6 rounded-[2rem] border border-[var(--border-light)] bg-[var(--surface-card)] h-full">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-[var(--cort-orange)]/10 flex items-center justify-center text-[var(--cort-orange)]">
                                                <Bus size={20} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Route Name</div>
                                                <div className="font-bold text-[var(--cort-navy)]">{selectedInsight.revisedRoute.name}</div>
                                            </div>
                                        </div>

                                        <div className="relative pl-6 space-y-6">
                                            {/* Vertical Line */}
                                            <div className="absolute left-2.5 top-1 bottom-1 w-0.5 bg-gradient-to-b from-[var(--cort-orange)] to-[var(--cort-navy)] opacity-30"></div>

                                            {selectedInsight.revisedRoute.stops.map((stop: string, i: number) => (
                                                <div key={i} className="relative flex items-center gap-4">
                                                    <div className={`absolute -left-[1.125rem] w-3 h-3 rounded-full border-2 border-white ${i === 0 ? 'bg-[var(--cort-orange)]' :
                                                        i === selectedInsight.revisedRoute.stops.length - 1 ? 'bg-[var(--cort-navy)]' :
                                                            'bg-white border-[var(--border-light)]'
                                                        }`}></div>
                                                    <div className="text-sm font-bold text-[var(--cort-navy)]">{stop}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CostLeakageDetector;
