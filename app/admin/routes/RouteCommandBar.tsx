'use client';

import type { ReactNode } from 'react';
import { Bus } from 'lucide-react';
import { cx } from '@/app/admin/components/ui/cx';

export function RouteCommandBar({
    title,
    subtitle,
    filters,
    actions,
    tabs,
}: {
    title: string;
    subtitle?: ReactNode;
    filters?: ReactNode;
    actions?: ReactNode;
    tabs?: ReactNode;
}) {
    return (
        <div className="sticky top-0 z-20 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]/95 shadow-[var(--shadow-card)] backdrop-blur-md">
            <div className="h-1 w-full bg-[var(--cort-orange)]" />
            <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-[180px] flex-1">
                    {title.toLowerCase() !== 'shuttle routes' && (
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                            Shuttle routes
                        </div>
                    )}
                    <h1 className={cx('text-2xl font-semibold tracking-tight text-[var(--text-primary)]', title.toLowerCase() !== 'shuttle routes' && 'mt-1')}>{title}</h1>
                    {subtitle ? <div className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</div> : null}
                </div>
                {filters}
                {actions ? <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            {tabs ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-default)] px-5 py-3">
                    {tabs}
                </div>
            ) : null}
        </div>
    );
}

export function RouteEmptyState({
    title,
    description,
    action,
    icon,
}: {
    title: string;
    description: string;
    action?: ReactNode;
    icon?: ReactNode;
}) {
    return (
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-12 text-center shadow-[var(--shadow-card)]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cort-navy)] text-white shadow-[var(--shadow-card)]">
                {icon ?? <Bus className="h-7 w-7" />}
            </div>
            <p className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{title}</p>
            <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}

export function RoutePill({
    active,
    onClick,
    children,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cx(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                active
                    ? 'bg-[var(--cort-navy)] text-white shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            )}
        >
            {children}
        </button>
    );
}

export function initials(name: string | null | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
}

export function format12h(hhmm: string | null | undefined): string | null {
    if (!hhmm) return null;
    const match = String(hhmm).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return hhmm;
    let hour = Number.parseInt(match[1], 10);
    const minute = match[2];
    if (Number.isNaN(hour)) return hhmm;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
}

