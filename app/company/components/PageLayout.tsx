"use client";

import React from "react";

/** Shared page header: muted label + navy title. Matches company dashboard pattern. */
export function PageHeader({
  label,
  title,
  description,
  action,
}: {
  label: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-[var(--text-muted)] mb-1">
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--cort-navy)]">{title}</h1>
        {description && (
          <p className="mt-2 text-[var(--text-muted)] max-w-2xl text-sm">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

/** Shared empty state for tables: icon circle + message. */
export function TableEmptyState({
  message,
  icon: Icon,
}: {
  message: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const IconComponent = Icon;
  return (
    <tr>
      <td colSpan={100} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-[var(--text-muted)]">
          <span className="bg-[var(--surface-subtle)] p-4 rounded-full mb-3 inline-flex items-center justify-center">
            {IconComponent ? (
              <IconComponent className="w-6 h-6" />
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
          </span>
          <span>{message}</span>
        </div>
      </td>
    </tr>
  );
}

/** Wrapper for table cards: consistent top bar (optional) + table + optional pagination footer. */
export const TABLE_CARD_CLASS = "min-h-[500px] overflow-hidden !p-0";
export const TABLE_TOP_BAR_CLASS = "border-b border-[var(--border-light)] bg-[var(--surface-subtle)]/50 p-6";
export const TABLE_HEADER_CELL_CLASS = "px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider";
export const TABLE_CELL_CLASS = "px-6 py-4";
export const TABLE_PAGINATION_WRAPPER_CLASS = "p-6 border-t border-[var(--border-light)] flex justify-center";
