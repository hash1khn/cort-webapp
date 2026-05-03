'use client';

import React, { useState } from 'react';
import {
    Zap,
    Bus,
    Navigation,
    Fuel,
    Clock,
    Crown,
    ArrowRight,
    RefreshCw,
    Lock,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type RealInsight = {
    id: number;
    insight_type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimated_saving_pkr: number;
    data: { summary: string; recommendation: string; metric_value?: number };
    generated_at: string;
};

interface CostLeakageDetectorProps {
    data: {
        insights: RealInsight[];
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function insightIcon(type: string) {
    if (type === 'FUEL_LEAKAGE') return <Fuel className="w-7 h-7" />;
    if (type === 'OCCUPANCY') return <Bus className="w-7 h-7" />;
    if (type === 'ROUTE_DETOUR' || type === 'CHAUFFEUR_DETOUR') return <Navigation className="w-7 h-7" />;
    if (type === 'IDLE_TIME') return <Clock className="w-7 h-7" />;
    return <Zap className="w-7 h-7" />;
}

function insightColors(type: string, severity: string) {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
        return { card: 'bg-[var(--cort-navy)] text-white', badge: 'bg-red-500 text-white' };
    }
    if (type === 'FUEL_LEAKAGE') return { card: 'bg-[var(--cort-orange)] text-white', badge: 'bg-white/20 text-white' };
    return { card: 'bg-[var(--cort-navy)] text-white', badge: 'bg-white/20 text-white' };
}

function insightLabel(type: string) {
    const map: Record<string, string> = {
        FUEL_LEAKAGE: 'Fuel Leakage',
        OCCUPANCY: 'Occupancy Optimisation',
        ROUTE_DETOUR: 'Route Detour',
        CHAUFFEUR_DETOUR: 'Chauffeur Detour',
        IDLE_TIME: 'Idle Time',
    };
    return map[type] ?? type.replace(/_/g, ' ');
}

// ── Mock teaser shown only when no real data exists ───────────────────────────

const MOCK_TEASERS = [
    {
        title: 'Shuttle Migration Impact',
        description: 'Shift 32% of individual rides to shuttle for morning shift.',
        savings: '186,000',
        iconType: 'bus',
    },
    {
        title: 'Route Consolidation Opportunity',
        description: 'Merge Route 4 & Route 5 to optimise occupancy above 80%.',
        savings: '50,000',
        iconType: 'route',
    },
];

// ── Component ─────────────────────────────────────────────────────────────────

const CostLeakageDetector = ({ data }: CostLeakageDetectorProps) => {
    const [expanded, setExpanded] = useState<number | null>(null);

    const hasReal = data?.insights?.length > 0;

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex flex-col items-center justify-center text-center px-2">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-3 rounded-2xl bg-[var(--surface-muted)] text-[var(--cort-orange)] shadow-sm">
                        <Zap size={24} className="fill-current" />
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-black text-[var(--cort-navy)] uppercase tracking-tight">Power Insights</h2>
                            {!hasReal && (
                                <span className="flex items-center gap-1 bg-gradient-to-r from-[var(--cort-navy)] to-[var(--cort-navy-hover)] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-white/10">
                                    <Crown size={10} className="fill-current" />
                                    Preview
                                </span>
                            )}
                        </div>
                        <p className="text-[var(--text-muted)] text-sm font-bold mt-1 uppercase tracking-widest opacity-80">
                            {hasReal ? 'AI Fleet Insights — Live Analysis' : 'Cost Leakage Detector & Efficiency Analysis'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cards */}
            {hasReal ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.insights.map((insight) => {
                        const { card, badge } = insightColors(insight.insight_type, insight.severity);
                        const isOpen = expanded === insight.id;
                        return (
                            <div
                                key={insight.id}
                                className={`${card} rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-transparent hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] hover:-translate-y-1 transition-all flex flex-col justify-between`}
                            >
                                {/* Top row */}
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                                            {insightIcon(insight.insight_type)}
                                        </div>
                                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${badge}`}>
                                            {insight.severity}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black mb-2 tracking-tight">{insightLabel(insight.insight_type)}</h3>
                                    <p className="text-sm opacity-80 leading-relaxed">{insight.data.summary}</p>

                                    {/* Expandable recommendation */}
                                    {isOpen && (
                                        <p className="text-xs opacity-70 leading-relaxed mt-3 border-t border-white/20 pt-3">
                                            {insight.data.recommendation}
                                        </p>
                                    )}
                                </div>

                                {/* Bottom row */}
                                <div className="mt-6 pt-6 border-t border-white/10 flex items-end justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase opacity-60 tracking-widest mb-1">Est. Monthly Saving</span>
                                        <div className="text-4xl font-black tracking-tighter flex items-baseline">
                                            <span className="text-xl font-normal opacity-60 mr-1.5 uppercase">Rs</span>
                                            {insight.estimated_saving_pkr > 0
                                                ? Math.round(insight.estimated_saving_pkr).toLocaleString()
                                                : '—'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setExpanded(isOpen ? null : insight.id)}
                                        className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide opacity-70 hover:opacity-100 transition-opacity"
                                    >
                                        {isOpen ? 'Less' : 'Details'}
                                        <ArrowRight size={12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Mock teaser when no real insights generated yet */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MOCK_TEASERS.map((teaser) => (
                        <div
                            key={teaser.title}
                            className={`${teaser.iconType === 'bus' ? 'bg-[var(--cort-orange)]' : 'bg-[var(--cort-navy)]'} text-white rounded-[2rem] p-8 min-h-[240px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-transparent relative overflow-hidden group flex flex-col justify-between`}
                        >
                            <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 backdrop-blur-[2px]">
                                <div className="bg-white/90 px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 transform translate-y-4 group-hover:translate-y-0 transition-transform">
                                    <Lock size={16} className="text-[var(--cort-navy)]" />
                                    <span className="text-xs font-black uppercase tracking-[0.1em] text-[var(--cort-navy)]">Generate AI Insights First</span>
                                </div>
                            </div>
                            <div className="relative z-10 filter blur-[3px] opacity-60">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                                        {teaser.iconType === 'bus' ? <Bus className="w-8 h-8" /> : <Navigation className="w-8 h-8" />}
                                    </div>
                                    <div className="p-2 rounded-full bg-white/10">
                                        <Crown size={18} className="fill-current" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black mb-2 tracking-tight">{teaser.title}</h3>
                                <p className="text-sm opacity-80 leading-relaxed">{teaser.description}</p>
                            </div>
                            <div className="relative z-10 mt-6 pt-6 border-t border-white/10 filter blur-[3px] opacity-60">
                                <span className="text-[11px] font-black uppercase opacity-60 tracking-widest mb-1 block">Potential Monthly Savings</span>
                                <div className="text-5xl font-black tracking-tighter flex items-baseline">
                                    <span className="text-2xl font-normal opacity-60 mr-1.5 uppercase">Rs</span>
                                    {teaser.savings}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CTA footer */}
            {!hasReal && (
                <div className="flex justify-center">
                    <Link
                        href="/company/fleet-analytics"
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--cort-navy)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--cort-navy-hover)] transition-all shadow hover:-translate-y-0.5"
                    >
                        <RefreshCw size={13} />
                        Go to Fleet Analytics to Generate Insights
                    </Link>
                </div>
            )}
        </div>
    );
};

export default CostLeakageDetector;
