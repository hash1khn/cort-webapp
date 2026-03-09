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
    Search
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
            revisedRouteStops: ["Gulshan-e-Iqbal", "National Stadium", "Shahrah-e-Faisal", "Office"]
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
            revisedRouteStops: ["DHA Phase 6", "Sea View", "Clifton Block 4", "Cantt Station", "Office"]
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
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-[var(--surface-muted)] text-[var(--cort-orange)]">
                        <Zap size={20} className="fill-current" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-[var(--cort-navy)]">Cost Leakage Detector</h2>
                        <p className="text-[var(--text-muted)] text-xs font-medium">AI-powered optimization suggestions</p>
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
                        {/* Background Decorative Element */}
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform" />

                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                                    {insight.icon}
                                </div>
                                <div className="p-2 rounded-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight size={20} />
                                </div>
                            </div>

                            <h3 className="text-xl font-black mb-2 tracking-tight">{insight.title}</h3>
                            <p className="text-sm opacity-80 leading-relaxed max-w-[90%]">{insight.description}</p>
                        </div>

                        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 flex items-end justify-between">
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

            {/* Drill-down Modal */}
            <Modal
                isOpen={!!selectedInsight}
                onClose={() => setSelectedInsight(null)}
                title="Optimization Detail"
            >
                {selectedInsight && (
                    <div className="space-y-8 py-2">
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

                                    <div className="mt-8 p-4 rounded-xl bg-[var(--surface-muted)] text-center">
                                        <p className="text-[11px] font-bold text-[var(--text-muted)]">Estimated Travel Time: <span className="text-[var(--cort-navy)]">42 mins</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedInsight(null)}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--cort-navy)] transition-colors"
                            >
                                Dismiss for now
                            </button>
                            <button className="px-8 py-2.5 rounded-xl bg-[var(--cort-navy)] text-white text-sm font-black uppercase tracking-widest hover:bg-[var(--cort-navy-hover)] hover:-translate-y-0.5 transition-all shadow-lg active:translate-y-0">
                                Apply This Optimization
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default CostLeakageDetector;
