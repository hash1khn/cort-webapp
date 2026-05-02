'use client';

import { useOutstationEstimate, LegDistance, ContractRateForEstimate } from '../../../hooks/useOutstationEstimate';

interface OutstationEstimatePanelProps {
    originCity: string;
    destinationCities: string[];
    noOfDays: number;
    packageType: '5hr' | '10hr' | '24hr' | 'monthly_10hr' | 'monthly_24hr';
    contractRate: ContractRateForEstimate | null;
    outstationAllowancePerDay: number;
    accommodationAllowancePerNight: number;
}

function fmt(n: number) {
    return n.toLocaleString('en-PK');
}

export default function OutstationEstimatePanel(props: OutstationEstimatePanelProps) {
    const { estimate, isLoading, error } = useOutstationEstimate(props);

    if (!props.destinationCities.length) return null;

    const nights = Math.max(0, props.noOfDays - 1);

    return (
        <div className="mt-4 rounded-2xl border border-[#fe8503]/20 bg-[#fe8503]/[0.04] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[var(--cort-orange)]/10">
                <svg className="w-3.5 h-3.5 text-[var(--cort-orange)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                    Estimated Cost
                </span>
                <span className="ml-1 text-[9px] text-[var(--text-muted)] font-bold">(round trip)</span>
                <span className="ml-auto text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    via Google Maps
                </span>
            </div>

            <div className="px-5 py-4">
                {/* Loading */}
                {isLoading && (
                    <div className="flex items-center gap-3 py-3">
                        <div className="h-4 w-4 rounded-full border-2 border-[var(--cort-orange)] border-t-transparent animate-spin shrink-0" />
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">
                            Calculating road distances…
                        </span>
                    </div>
                )}

                {/* Error */}
                {!isLoading && error && (
                    <div className="flex items-center gap-2 py-2 text-[11px] text-rose-500 font-bold">
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        Could not compute distances — check city names and try again.
                    </div>
                )}

                {/* No contract rate */}
                {!isLoading && !error && !props.contractRate && (
                    <div className="text-[11px] text-[var(--text-muted)] font-bold py-2">
                        Select a vehicle model to see cost estimate.
                    </div>
                )}

                {/* No origin city */}
                {!isLoading && !error && props.contractRate && !props.originCity.trim() && (
                    <div className="text-[11px] text-[var(--text-muted)] font-bold py-2">
                        Enter booking city above to calculate route.
                    </div>
                )}

                {/* Result */}
                {!isLoading && !error && estimate && (
                    <div className="flex flex-col gap-4">

                        {/* Route legs */}
                        <div className="flex flex-col gap-0">
                            {estimate.legs.map((leg: LegDistance, i: number) => (
                                <div key={i} className="relative flex items-start gap-3 pb-3 last:pb-0">
                                    {/* Timeline line */}
                                    {i < estimate.legs.length - 1 && (
                                        <div className="absolute left-[7px] top-5 bottom-0 w-px bg-white/10" />
                                    )}
                                    {/* Dot */}
                                    <div className={`relative mt-0.5 shrink-0 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                        leg.isReturn
                                            ? 'border-white/60 bg-white/60'
                                            : i === 0
                                                ? 'border-[#fe8503] bg-[#fe8503]'
                                                : 'border-white/20 bg-white/10'
                                    }`}>
                                        {leg.isReturn && (
                                            <svg className="w-2 h-2 text-[var(--text-primary)]" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
                                            </svg>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[11px] font-black text-[var(--text-primary)] truncate">{leg.from}</span>
                                                <svg className="w-3 h-3 text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                                <span className="text-[11px] font-black text-[var(--text-primary)] truncate">{leg.to}</span>
                                                {leg.isReturn && (
                                                    <span className="shrink-0 text-[9px] font-black uppercase bg-white/10 text-[var(--text-secondary)] px-1.5 py-0.5 rounded-full">
                                                        return
                                                    </span>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <span className="text-[11px] font-black text-[#fe8503]">
                                                    {leg.distanceKm > 0 ? `${leg.distanceKm} km` : '—'}
                                                </span>
                                                {leg.durationText && leg.durationText !== 'N/A' && (
                                                    <span className="ml-1.5 text-[10px] text-[var(--text-muted)] font-bold">({leg.durationText})</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Total distance */}
                            <div className="flex items-center justify-between pt-3 mt-1 border-t border-[#fe8503]/10">
                                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Total Round-Trip Distance</span>
                                <span className="text-[13px] font-black text-[var(--text-primary)]">{estimate.totalKm} km</span>
                            </div>
                        </div>

                        {/* Cost breakdown */}
                        <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] p-4 flex flex-col gap-2.5">

                            {/* Service charges */}
                            <CostRow
                                label="Base Package Cost"
                                value={estimate.basePackageCost}
                                sub={`${props.noOfDays} day${props.noOfDays > 1 ? 's' : ''} × rate`}
                            />
                            {estimate.outstationAllowance > 0 && (
                                <CostRow
                                    label="Outstation Allowance"
                                    value={estimate.outstationAllowance}
                                    sub={`${props.noOfDays} day${props.noOfDays > 1 ? 's' : ''}`}
                                />
                            )}
                            {estimate.accommodationAllowance > 0 && (
                                <CostRow
                                    label="Accommodation"
                                    value={estimate.accommodationAllowance}
                                    sub={`${nights} night${nights > 1 ? 's' : ''}`}
                                />
                            )}

                            {/* SST on service */}
                            <div className="border-t border-dashed border-[var(--border-input)] pt-2.5">
                                <CostRow label="SST (10% on service)" value={estimate.sst} muted />
                            </div>

                            {/* Fuel — separate, not taxed */}
                            <div className="border-t border-dashed border-[var(--border-input)] pt-2.5">
                                <CostRow
                                    label="Fuel Cost"
                                    value={estimate.fuelCost}
                                    sub={`${estimate.totalKm} km × PKR ${Number(props.contractRate?.cost_per_km || 0)}/km`}
                                    accent
                                />
                                <p className="text-[9px] text-[var(--text-muted)] font-bold mt-1">
                                    Toll &amp; parking billed at actuals — not included
                                </p>
                            </div>

                            {/* Grand total */}
                            <div className="border-t-2 border-[var(--border-input)] pt-3 mt-0.5 flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-primary)]">Estimated Total</span>
                                <span className="text-[16px] font-black text-[var(--cort-orange)]">
                                    PKR {fmt(estimate.total)}
                                </span>
                            </div>
                        </div>

                        <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-tight leading-relaxed">
                            ⓘ Estimate only · Round trip via Google Maps road distance · Actual invoice calculated at trip completion
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

function CostRow({ label, value, sub, muted, accent }: {
    label: string;
    value: number;
    sub?: string;
    muted?: boolean;
    accent?: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-bold ${muted ? 'text-[var(--text-muted)]' : 'text-[var(--text-secondary)]'}`}>{label}</span>
                {sub && <span className="text-[9px] text-[var(--text-muted)] font-bold">{sub}</span>}
            </div>
            <span className={`text-[11px] font-black ${
                muted ? 'text-[var(--text-muted)]' : accent ? 'text-[#fe8503]' : 'text-white'
            }`}>
                PKR {value.toLocaleString('en-PK')}
            </span>
        </div>
    );
}
