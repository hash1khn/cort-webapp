"use client";

import type { InvoiceStats } from "../types";

export function InvoiceStatsCards({ stats }: { stats: InvoiceStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold text-muted uppercase">Unpaid / Collectable</div>
        <div className="mt-2 text-2xl font-bold text-red-600">
          PKR {stats.totalCollectable.toLocaleString()}
        </div>
        <div className="text-xs text-muted mt-1">Pending payments</div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
        <div className="text-xs font-semibold text-muted uppercase">Total Collected</div>
        <div className="mt-2 text-2xl font-bold text-green-600">
          PKR {stats.totalCollected.toLocaleString()}
        </div>
        <div className="text-xs text-muted mt-1">Successfully recognized revenue</div>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 shadow-sm opacity-70">
        <div className="text-xs font-semibold text-muted uppercase">Overdue Amount</div>
        <div className="mt-2 text-2xl font-bold text-orange-600">
          PKR {stats.totalOverdue.toLocaleString()}
        </div>
        <div className="text-xs text-muted mt-1">Included in Collectable</div>
      </div>
    </div>
  );
}
