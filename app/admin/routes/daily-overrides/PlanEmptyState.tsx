'use client';

import type { ReactNode } from 'react';
import { Bus } from 'lucide-react';

export function PlanEmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] px-6 py-12 text-center shadow-[var(--shadow-card)]">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cort-navy)] text-white shadow-[var(--shadow-card)]">
                <Bus className="h-7 w-7" />
            </div>
            <p className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{title}</p>
            <p className="mt-2 max-w-md text-sm text-[var(--text-muted)]">{description}</p>
            {action ? <div className="mt-5">{action}</div> : null}
        </div>
    );
}
