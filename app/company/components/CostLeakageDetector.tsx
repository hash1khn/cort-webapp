'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
    Zap,
    Bus,
    Navigation,
    Fuel,
    Clock,
    Crown,
    ArrowRight,
    Lock,
    Car,
    Package,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type SavingsInsight = {
    id: number;
    insight_type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    estimated_saving_pkr: number;
    label: string;
    is_preview: boolean;
    data: { summary: string; recommendation: string; metric_value?: number };
    generated_at: string | null;
};

interface CostLeakageDetectorProps {
    data: {
        aiInsightsEnabled: boolean;
        totalPotentialSavingPkr: number;
        insights: SavingsInsight[];
    };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function insightIcon(type: string) {
    if (type === 'FUEL_LEAKAGE') return <Fuel className="w-7 h-7" />;
    if (type === 'OCCUPANCY') return <Bus className="w-7 h-7" />;
    if (type === 'ROUTE_DETOUR' || type === 'CHAUFFEUR_DETOUR') return <Navigation className="w-7 h-7" />;
    if (type === 'IDLE_TIME') return <Clock className="w-7 h-7" />;
    if (type === 'CHAUFFEUR_CONCURRENT') return <Car className="w-7 h-7" />;
    if (type === 'CHAUFFEUR_PACKAGE_UNDERUTILIZATION') return <Package className="w-7 h-7" />;
    if (type === 'POOL_UTILIZATION') return <Car className="w-7 h-7" />;
    return <Zap className="w-7 h-7" />;
}

function insightColors(type: string, severity: string, index: number) {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
        return { card: 'bg-[var(--cort-navy)] text-white', badge: 'bg-red-500 text-white' };
    }
    if (type === 'FUEL_LEAKAGE' || index % 2 === 0) {
        return { card: 'bg-[var(--cort-orange)] text-white', badge: 'bg-white/20 text-white' };
    }
    return { card: 'bg-[var(--cort-navy)] text-white', badge: 'bg-white/20 text-white' };
}

// ── Component ─────────────────────────────────────────────────────────────────

const CostLeakageDetector = ({ data }: CostLeakageDetectorProps) => {
    const t = useTranslations('company.costLeakage');
    const [expanded, setExpanded] = useState<number | null>(null);

    const insights = data?.insights ?? [];
    const aiEnabled = data?.aiInsightsEnabled ?? false;
    const hasCards = insights.length > 0;
    const totalSaving = data?.totalPotentialSavingPkr ?? 0;

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
                            <h2 className="text-3xl font-black text-[var(--cort-navy)] uppercase tracking-tight">{t('powerInsights')}</h2>
                            {!aiEnabled && hasCards && (
                                <span className="flex items-center gap-1 bg-gradient-to-r from-[var(--cort-navy)] to-[var(--cort-navy-hover)] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tighter shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-white/10">
                                    <Crown size={10} className="fill-current" />
                                    {t('preview')}
                                </span>
                            )}
                        </div>
                        <p className="text-[var(--text-muted)] text-sm font-bold mt-1 uppercase tracking-widest opacity-80">
                            {aiEnabled ? t('aiFleetInsights') : t('costLeakageAnalysis')}
                        </p>
                        {hasCards && totalSaving > 0 && (
                            <p className="text-[var(--cort-navy)] text-sm font-bold mt-2">
                                {t('couldSaveUpTo')}{' '}
                                <span className="text-[var(--cort-orange)]">Rs {Math.round(totalSaving).toLocaleString()}</span>
                                {t('perMonth')}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Cards */}
            {hasCards ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {insights.map((insight, index) => {
                        const { card, badge } = insightColors(insight.insight_type, insight.severity, index);
                        const isOpen = expanded === insight.id;

                        return (
                            <div
                                key={insight.id}
                                className={`${card} rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-transparent hover:shadow-[0_8px_40px_rgb(0,0,0,0.16)] hover:-translate-y-1 transition-all flex flex-col justify-between relative overflow-hidden`}
                            >
                                {/* Category — always visible */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md">
                                        {insightIcon(insight.insight_type)}
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wide ${badge}`}>
                                        {insight.severity}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black mb-3 tracking-tight">{insight.label}</h3>

                                {/* How to save — blurred when feature disabled */}
                                <div className="relative">
                                    {!aiEnabled && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[2px] rounded-xl min-h-[72px]">
                                            <div className="bg-white/90 px-5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5">
                                                <Lock size={14} className="text-[var(--cort-navy)] shrink-0" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--cort-navy)] leading-tight text-center">
                                                    {t('enableCostSaving')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    <div className={!aiEnabled ? 'filter blur-[3px] opacity-60 pointer-events-none select-none' : ''}>
                                        <p className="text-sm opacity-80 leading-relaxed">
                                            {aiEnabled ? insight.data.summary : t('lockedSummary')}
                                        </p>
                                        {aiEnabled && isOpen && insight.data.recommendation && (
                                            <p className="text-xs opacity-70 leading-relaxed mt-3 border-t border-white/20 pt-3">
                                                {insight.data.recommendation}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom row — savings always visible */}
                                <div className="mt-6 pt-6 border-t border-white/10 flex items-end justify-between relative z-10">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black uppercase opacity-60 tracking-widest mb-1">
                                            {aiEnabled ? t('estMonthlySaving') : t('potentialMonthlySavings')}
                                        </span>
                                        <div className="text-4xl font-black tracking-tighter flex items-baseline">
                                            <span className="text-xl font-normal opacity-60 me-1.5 uppercase">Rs</span>
                                            {insight.estimated_saving_pkr > 0
                                                ? Math.round(insight.estimated_saving_pkr).toLocaleString()
                                                : '—'}
                                        </div>
                                    </div>
                                    {aiEnabled && insight.data.recommendation && (
                                        <button
                                            onClick={() => setExpanded(isOpen ? null : insight.id)}
                                            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide opacity-70 hover:opacity-100 transition-opacity"
                                        >
                                            {isOpen ? t('less') : t('details')}
                                            <ArrowRight size={12} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-8 px-4">
                    <p className="text-sm text-[var(--text-muted)] font-medium">
                        {t('notEnoughData')}
                        <br />
                        <span className="text-xs opacity-70">{t('insightsAppearHint')}</span>
                    </p>
                </div>
            )}

            {/* Footer CTA when feature disabled */}
            {!aiEnabled && hasCards && (
                <div className="flex flex-col items-center gap-2 text-center px-4">
                    <p className="text-xs text-[var(--text-muted)] max-w-md">
                        {t('footerHint')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default CostLeakageDetector;
