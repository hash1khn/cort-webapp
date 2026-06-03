"use client";

import { cx } from "../../../components/ui/cx";
import type { BookingStats } from "../hooks/usePendingBookings";

type BookingStatsBarProps = {
  stats: BookingStats;
  onFilterByStatus: (status: string) => void;
};

export function BookingStatsBar({ stats, onFilterByStatus }: BookingStatsBarProps) {
  const items = [
    { label: "Total", value: stats.total, color: "bg-navy/5 text-navy", border: "border-navy/10", status: "" },
    { label: "Pending", value: stats.pending, color: "bg-yellow/10 text-yellow-700", border: "border-yellow/20", status: "PENDING" },
    { label: "Assigned", value: stats.assigned, color: "bg-blue/10 text-blue", border: "border-blue/20", status: "ASSIGNED" },
    { label: "Arrived", value: stats.arrived, color: "bg-indigo-50 text-indigo-700", border: "border-indigo-200", status: "ARRIVED" },
    { label: "In Progress", value: stats.in_progress, color: "bg-orange/10 text-orange", border: "border-orange/20", status: "IN_PROGRESS" },
    { label: "Ended", value: stats.ended, color: "bg-purple-50 text-purple-700", border: "border-purple-200", status: "ENDED" },
    { label: "Completed", value: stats.completed, color: "bg-green-50 text-green-700", border: "border-green-200", status: "COMPLETED" },
    { label: "Cancelled", value: stats.cancelled, color: "bg-red-50 text-red-600", border: "border-red-200", status: "CANCELLED" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {items.map(({ label, value, color, border, status }) => (
        <div
          key={label}
          onClick={() => onFilterByStatus(status)}
          className={cx(
            "rounded-xl border p-3 text-center cursor-pointer hover:shadow-sm transition-shadow",
            color,
            border
          )}
        >
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide mt-0.5 opacity-80">{label}</div>
        </div>
      ))}
    </div>
  );
}
