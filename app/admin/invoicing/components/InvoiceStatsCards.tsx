"use client";

import type { InvoiceStats } from "../types";
import { adminStatCard } from "../../components/ui/admin-styles";

export function InvoiceStatsCards({ stats }: { stats: InvoiceStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className={adminStatCard}>
        <div className="text-xs font-semibold text-[var(--text-muted)] uppercase">Unpaid / Collectable</div>
        <div className="mt-2 text-2xl font-bold text-red-500">
          PKR {stats.totalCollectable.toLocaleString()}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1">Pending payments</div>
      </div>

      <div className={adminStatCard}>
        <div className="text-xs font-semibold text-[var(--text-muted)] uppercase">Total Collected</div>
        <div className="mt-2 text-2xl font-bold text-emerald-500">
          PKR {stats.totalCollected.toLocaleString()}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1">Successfully recognized revenue</div>
      </div>

      <div className={`${adminStatCard} opacity-70`}>
        <div className="text-xs font-semibold text-[var(--text-muted)] uppercase">Overdue Amount</div>
        <div className="mt-2 text-2xl font-bold text-orange-500">
          PKR {stats.totalOverdue.toLocaleString()}
        </div>
        <div className="text-xs text-[var(--text-muted)] mt-1">Included in Collectable</div>
      </div>
    </div>
  );
}
