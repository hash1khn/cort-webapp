'use client';

import React from 'react';
import {
    AlertCircle,
    TrendingDown,
    Zap,
    ArrowRight,
    FileText,
    MessageSquare,
    Layout,
    CheckCircle2
} from 'lucide-react';
import { Card, SectionTitle } from './DashboardComponents';

// --- Scene 1: Chaos Mocks ---
export const ChaosSpreadsheet = () => (
    <div className="w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm opacity-60 grayscale scale-95 blur-[0.5px]">
        <div className="bg-gray-100 p-2 border-b border-gray-200 flex gap-2">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-4 w-16 bg-gray-300 rounded" />)}
        </div>
        <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex gap-4">
                    <div className="h-4 w-24 bg-gray-100 rounded" />
                    <div className="h-4 w-48 bg-gray-200 rounded" />
                    <div className="h-4 w-12 bg-red-100 rounded" />
                    <div className="h-4 w-32 bg-gray-100 rounded" />
                </div>
            ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-red-500 text-white px-4 py-2 rounded-full font-bold text-lg rotate-12 shadow-xl border-4 border-white">
                ZERO VISIBILITY
            </span>
        </div>
    </div>
);

export const WhatsAppMock = () => (
    <div className="max-w-[300px] bg-[#e5ddd5] rounded-2xl overflow-hidden shadow-lg border border-gray-300 transform -rotate-3 scale-90 opacity-80 blur-[0.2px]">
        <div className="bg-[#075e54] p-3 text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-400 rounded-full" />
            <div className="text-sm font-bold">Finance Group</div>
        </div>
        <div className="p-4 space-y-3 h-64 overflow-hidden">
            <div className="bg-white p-2 rounded-lg text-[10px] shadow-sm self-start max-w-[80%]">
                "Where is the invoice for last Friday's ride?"
            </div>
            <div className="bg-[#dcf8c6] p-2 rounded-lg text-[10px] shadow-sm ml-auto max-w-[80%]">
                "He didn't send it yet. Will ask on WhatsApp."
            </div>
            <div className="bg-white p-2 rounded-lg text-[10px] shadow-sm self-start max-w-[80%]">
                "We have 15 requests pending in the spreadsheet."
            </div>
            <div className="bg-[#dcf8c6] p-2 rounded-lg text-[10px] shadow-sm ml-auto max-w-[80%]">
                "😱"
            </div>
        </div>
    </div>
);

export const ScatteredInvoices = () => (
    <div className="relative w-full h-[400px] overflow-hidden">
        {[...Array(6)].map((_, i) => (
            <div
                key={i}
                className="absolute bg-white border border-gray-300 p-4 shadow-xl w-48 h-64 transition-all hover:z-50 hover:scale-110"
                style={{
                    top: `${Math.random() * 50}%`,
                    left: `${Math.random() * 70}%`,
                    transform: `rotate(${Math.random() * 40 - 20}deg)`,
                    opacity: 0.7 + Math.random() * 0.3,
                    zIndex: i
                }}
            >
                <div className="border-b-2 border-dashed border-gray-200 pb-2 mb-4">
                    <div className="h-4 w-12 bg-gray-200 rounded mb-1" />
                    <div className="h-2 w-24 bg-gray-100 rounded" />
                </div>
                <div className="space-y-2">
                    <div className="h-2 w-full bg-gray-50 rounded" />
                    <div className="h-2 w-full bg-gray-50 rounded" />
                    <div className="h-2 w-[80%] bg-gray-50 rounded" />
                </div>
                <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between">
                    <div className="h-4 w-8 bg-gray-200 rounded" />
                    <div className="h-4 w-12 bg-red-100 rounded" />
                </div>
            </div>
        ))}
    </div>
);

export const ZeroVisibilityHero = () => (
    <div className="relative w-full min-h-screen bg-white flex flex-col items-center justify-center overflow-hidden">
        <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes fast-flash {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
            }
            .animate-fast-flash {
                animation: fast-flash 0.5s infinite;
            }
        `}} />

        {/* Rapid Flash Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-10 animate-fast-flash">
            <div className="grid grid-cols-6 gap-2 p-4 h-full">
                {[...Array(24)].map((_, i) => (
                    <div key={i} className="bg-gray-200 rounded-lg border border-gray-300" />
                ))}
            </div>
        </div>

        <div className="relative z-20 text-center px-6 transition-all duration-1000">
            <div className="mb-4 inline-block px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.4em] rounded-full animate-bounce">
                Zero Visibility Alert
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-[var(--cort-navy)] tracking-tight mb-6 leading-[0.9]">
                MOST COMPANIES <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">HAVE ZERO</span> <br />
                VISIBILITY
            </h1>
            <p className="text-2xl text-[var(--text-muted)] font-bold max-w-2xl mx-auto mb-16 opacity-80">
                on employee commute spending.
            </p>

            <div className="flex flex-col md:flex-row items-center gap-16 justify-center scale-110">
                <div className="relative group grayscale hover:grayscale-0 transition-all duration-500">
                    <ChaosSpreadsheet />
                    <div className="absolute -top-4 -right-4 bg-red-600 text-white p-2 rounded-lg font-black text-xs shadow-xl animate-pulse">
                        MANUAL ERROR
                    </div>
                </div>
                <div className="shrink-0 scale-125 hover:rotate-2 transition-transform">
                    <WhatsAppMock />
                </div>
            </div>
        </div>

        {/* Scattered Invoices Overlay */}
        <div className="absolute inset-0 pointer-events-none">
            <ScatteredInvoices />
        </div>

        {/* Cinematic Fade to Black (Bottom) */}
        <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-[var(--cort-navy)] via-[var(--cort-navy)]/80 to-transparent pt-32 flex items-end justify-center pb-12">
            <div className="text-white/20 text-[10px] font-black uppercase tracking-[1em] animate-pulse">
                Fade to Dark Screen
            </div>
        </div>
    </div>
);

// --- Scene 6: Optimization Insight Cards ---
export const OptimizationInsightCard = ({
    title,
    description,
    savings,
    accent = "orange"
}: {
    title: string;
    description: string;
    savings: string;
    accent?: "orange" | "navy"
}) => (
    <div className={`
        relative overflow-hidden rounded-[2.5rem] p-8 
        ${accent === 'orange' ? 'bg-[var(--cort-orange)]' : 'bg-[var(--cort-navy)]'} 
        text-white shadow-2xl transition-all hover:scale-[1.02] group
    `}>
        {/* Glow Effect */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/20 rounded-full blur-[80px] pointer-events-none" />

        <div className="relative z-10 flex gap-6">
            <div className={`
                p-4 rounded-3xl shrink-0 h-fit
                ${accent === 'orange' ? 'bg-white/20' : 'bg-[var(--cort-orange)]/20'}
            `}>
                <Zap className={`w-10 h-10 ${accent === 'orange' ? 'text-white' : 'text-[var(--cort-orange)]'}`} />
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-widest opacity-70">Mobility Insight</span>
                    <div className="h-px flex-1 bg-white/20" />
                </div>

                <h3 className="text-2xl font-extrabold leading-tight">{title}</h3>
                <p className="text-white/80 text-lg max-w-md">{description}</p>

                <div className="flex items-end gap-3 mt-6">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase opacity-60">Potential Savings</span>
                        <div className="text-5xl font-black tracking-tighter">
                            <span className="text-2xl font-normal opacity-60 mr-2">PKR</span>
                            {savings}
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        AI Verified Route Data
                    </div>
                    <ArrowRight className="w-6 h-6 animate-pulse" />
                </div>
            </div>
        </div>
    </div>
);

// --- Layout Wrapper for Demo ---
export const DemoSection = ({
    id,
    title,
    children,
    dark = false
}: {
    id: string;
    title: string;
    children: React.ReactNode;
    dark?: boolean
}) => (
    <section id={id} className={`py-20 px-10 min-h-[600px] flex flex-col items-center justify-center ${dark ? 'bg-[var(--cort-navy)]' : 'bg-gray-50'}`}>
        <div className="max-w-[1200px] w-full">
            <h2 className={`text-sm font-black uppercase tracking-[0.3em] mb-12 text-center ${dark ? 'text-white/40' : 'text-[var(--text-muted)]'}`}>
                {title}
            </h2>
            <div className="flex flex-wrap justify-center gap-12">
                {children}
            </div>
        </div>
    </section>
);
