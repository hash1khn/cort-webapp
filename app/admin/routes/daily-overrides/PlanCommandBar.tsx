'use client';

import { CalendarDays, Car, Map, Save, Sun, Sunset, Users } from 'lucide-react';
import type { Company } from '@/app/lib/services/api-client';
import { adminBtnOutline, adminBtnPrimary, adminSelect } from '@/app/admin/components/ui/admin-styles';
import { cx } from '@/app/admin/components/ui/cx';
import { formatPlanDate, type Direction, type OpsTab } from './plan-types';

export function PlanCommandBar({
    companies,
    companyId,
    date,
    direction,
    opsTab,
    canMutate,
    saving,
    hasUnsavedChanges,
    passengerCount,
    routeCount,
    pendingMoves,
    pendingUndos,
    pendingTimes,
    pendingCrew,
    mapOpen,
    showMapToggle,
    onCompanyChange,
    onDateChange,
    onDirectionChange,
    onTabChange,
    onSave,
    onDiscard,
    onToggleMap,
}: {
    companies: Company[];
    companyId: number | '';
    date: string;
    direction: Direction;
    opsTab: OpsTab;
    canMutate: boolean;
    saving: boolean;
    hasUnsavedChanges: boolean;
    passengerCount: number;
    routeCount: number;
    pendingMoves: number;
    pendingUndos: number;
    pendingTimes: number;
    pendingCrew: number;
    mapOpen: boolean;
    showMapToggle: boolean;
    onCompanyChange: (id: number | '') => void;
    onDateChange: (date: string) => void;
    onDirectionChange: (d: Direction) => void;
    onTabChange: (tab: OpsTab) => void;
    onSave: () => void;
    onDiscard: () => void;
    onToggleMap: () => void;
}) {
    const summaryBits: string[] = [];
    if (pendingMoves > 0) summaryBits.push(`${pendingMoves} ${pendingMoves === 1 ? 'move' : 'moves'}`);
    if (pendingUndos > 0) summaryBits.push(`${pendingUndos} undo${pendingUndos === 1 ? '' : 's'}`);
    if (pendingTimes > 0) summaryBits.push(`${pendingTimes} time ${pendingTimes === 1 ? 'edit' : 'edits'}`);
    if (pendingCrew > 0) summaryBits.push(`${pendingCrew} crew ${pendingCrew === 1 ? 'change' : 'changes'}`);

    return (
        <div className="sticky top-0 z-20 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/95 shadow-[var(--shadow-card)] backdrop-blur-md">
            <div className="h-1 w-full bg-[var(--cort-orange)]" />
            <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-[200px] flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        Today&apos;s shuttle plan
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                        {formatPlanDate(date)}
                    </div>
                    {companyId !== '' && opsTab === 'passengers' && routeCount > 0 && (
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {passengerCount} {passengerCount === 1 ? 'passenger' : 'passengers'} on {routeCount} {routeCount === 1 ? 'route' : 'routes'}
                        </p>
                    )}
                </div>

                <label className="flex min-w-[180px] flex-col gap-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Date</span>
                    <span className="relative inline-flex items-center">
                        <CalendarDays className="pointer-events-none absolute left-3 h-4 w-4 text-[var(--cort-orange)]" />
                        <input
                            type="date"
                            className={cx(adminSelect, 'pl-9')}
                            value={date}
                            onChange={(e) => onDateChange(e.target.value)}
                            aria-label="Plan date"
                        />
                    </span>
                </label>

                <div className="flex rounded-full bg-[var(--bg-subtle)] p-1">
                    {(['MORNING', 'EVENING'] as Direction[]).map((d) => {
                        const active = direction === d;
                        const Icon = d === 'MORNING' ? Sun : Sunset;
                        return (
                            <button
                                key={d}
                                type="button"
                                onClick={() => onDirectionChange(d)}
                                className={cx(
                                    'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                                    active
                                        ? 'bg-[var(--cort-navy)] text-white shadow-sm'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                                )}
                            >
                                <Icon className={cx('h-3.5 w-3.5', active ? 'text-[var(--cort-orange)]' : '')} />
                                {d === 'MORNING' ? 'Morning' : 'Evening'}
                            </button>
                        );
                    })}
                </div>

                <select
                    className={cx(adminSelect, 'min-w-[220px] max-w-[280px]')}
                    value={companyId}
                    onChange={(e) => onCompanyChange(e.target.value ? Number(e.target.value) : '')}
                    aria-label="Company"
                >
                    <option value="">Select a company</option>
                    {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {companyId !== '' && (
                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-default)] px-5 py-3">
                    <div className="flex rounded-full bg-[var(--bg-subtle)] p-1">
                        <button
                            type="button"
                            onClick={() => onTabChange('passengers')}
                            className={cx(
                                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                                opsTab === 'passengers'
                                    ? 'bg-[var(--cort-navy)] text-white'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                            )}
                        >
                            <Users className="h-4 w-4" />
                            Passengers
                            {routeCount > 0 && (
                                <span className={cx(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                                    opsTab === 'passengers' ? 'bg-white/15 text-white' : 'bg-[var(--bg-card)] text-[var(--text-secondary)]',
                                )}>
                                    {passengerCount}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => onTabChange('crew')}
                            className={cx(
                                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                                opsTab === 'crew'
                                    ? 'bg-[var(--cort-navy)] text-white'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                            )}
                        >
                            <Car className="h-4 w-4" />
                            Drivers &amp; vehicles
                        </button>
                    </div>

                    <p className="hidden text-xs text-[var(--text-muted)] sm:block">
                        {opsTab === 'passengers'
                            ? 'Passenger moves save when you press Save.'
                            : 'Driver and vehicle changes save when you press Save.'}
                    </p>

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                    {showMapToggle && (
                        <button type="button" onClick={onToggleMap} className={cx(adminBtnOutline, 'h-9 px-3 text-xs')}>
                            <Map className="mr-1.5 h-3.5 w-3.5" />
                            {mapOpen ? 'Hide map' : 'Show map'}
                        </button>
                    )}

                    {!canMutate && (
                        <span className="text-xs italic text-[var(--text-muted)]">
                            View only
                        </span>
                    )}

                    {canMutate && (
                        <>
                            {hasUnsavedChanges && summaryBits.length > 0 && (
                                <span className="hidden text-xs font-medium text-[var(--cort-orange)] lg:inline">
                                    Unsaved · {summaryBits.join(' · ')}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={onDiscard}
                                disabled={saving || !hasUnsavedChanges}
                                className={adminBtnOutline}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={saving || !hasUnsavedChanges}
                                className={
                                    hasUnsavedChanges
                                        ? 'inline-flex items-center justify-center rounded-lg bg-[var(--cort-orange)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cort-orange-hover)] transition-colors disabled:opacity-50'
                                        : adminBtnPrimary
                                }
                            >
                                {saving ? 'Saving…' : (
                                    <><Save className="mr-2 h-4 w-4" /> Save changes</>
                                )}
                            </button>
                        </>
                    )}
                    </div>
                </div>
            )}
        </div>
    );
}

export function PlanFloatingSave({
    summary,
    saving,
    onDiscard,
    onSave,
}: {
    summary: string;
    saving: boolean;
    onDiscard: () => void;
    onSave: () => void;
}) {
    return (
        <div className="fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-full border border-[var(--cort-orange)]/30 bg-[var(--bg-card)] px-3 py-2 shadow-[var(--shadow-modal)]">
            <span className="hidden pl-2 text-xs font-medium text-[var(--text-secondary)] sm:inline">{summary}</span>
            <button type="button" onClick={onDiscard} disabled={saving} className={cx(adminBtnOutline, 'h-9 rounded-full px-3 text-xs')}>
                Discard
            </button>
            <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="inline-flex h-9 items-center rounded-full bg-[var(--cort-orange)] px-4 text-xs font-semibold text-white hover:bg-[var(--cort-orange-hover)] disabled:opacity-50"
            >
                {saving ? 'Saving…' : 'Save changes'}
            </button>
        </div>
    );
}
