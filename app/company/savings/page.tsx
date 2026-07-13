'use client';

import { useEffect, useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/app/lib/services/api-client';
import { getCalendarMonthRange } from '@/app/lib/date-utils';
import { formatLocaleNumber } from '@/app/lib/i18n/format';
import type { Locale } from '@/i18n/config';
import {
  TrendingDown,
  TrendingUp,
  Sparkles,
  Car,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  PiggyBank,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface VehicleBreakdownRow {
  vehicle_category: string;
  service_type: string;
  quantity: number;
  vendor_name: string | null;
  benchmark_monthly_pkr: number;
  benchmark_period_pkr: number;
  actual_period_pkr: number;
  delta_pkr: number;
}

interface BenchmarkRow {
  id: number;
  service_type: string;
  vehicle_category: string | null;
  cost_type: 'FIXED' | 'VARIABLE';
  monthly_cost: number;
  quantity: number;
  vendor_name: string | null;
}

interface SavingsResult {
  period: { from: string; to: string; days: number };
  benchmark_total_pkr: number;
  monthly_benchmark_total_pkr: number;
  actual_total_pkr: number;
  delta_pkr: number;
  savings_pct: number | null;
  has_benchmarks: boolean;
  narrative: string;
  vehicle_breakdown?: VehicleBreakdownRow[];
  benchmarks?: BenchmarkRow[];
  breakdown: Array<{
    service_type: string;
    benchmark_pkr: number;
    actual_pkr: number;
    delta_pkr: number;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
] as const;

function formatVehicleLabel(row: VehicleBreakdownRow): string {
  const cat = row.vehicle_category
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return cat;
}

function monthlyBenchmarkTotal(b: BenchmarkRow): number {
  return b.cost_type === 'FIXED' ? b.monthly_cost : b.monthly_cost * b.quantity;
}

/** Use API vehicle_breakdown, or build rows from benchmarks + service breakdown (older API). */
function resolveVehicleRows(result: SavingsResult): VehicleBreakdownRow[] {
  if (result.vehicle_breakdown && result.vehicle_breakdown.length > 0) {
    return result.vehicle_breakdown;
  }

  const benchmarks = result.benchmarks;
  if (!benchmarks?.length) return [];

  const monthlyByService = new Map<string, number>();
  for (const b of benchmarks) {
    const m = monthlyBenchmarkTotal(b);
    monthlyByService.set(b.service_type, (monthlyByService.get(b.service_type) ?? 0) + m);
  }

  const actualByService = new Map(
    (result.breakdown ?? []).map((x) => [x.service_type, x.actual_pkr]),
  );

  return benchmarks.map((b) => {
    const monthlyTotal = monthlyBenchmarkTotal(b);
    const svcMonthly = monthlyByService.get(b.service_type) ?? 0;
    const svcActual = actualByService.get(b.service_type) ?? 0;
    const actualMonth =
      svcMonthly > 0 ? svcActual * (monthlyTotal / svcMonthly) : 0;

    return {
      vehicle_category: b.vehicle_category ?? b.service_type,
      service_type: b.service_type,
      quantity: b.quantity,
      vendor_name: b.vendor_name,
      benchmark_monthly_pkr: Math.round(monthlyTotal),
      benchmark_period_pkr: Math.round(monthlyTotal),
      actual_period_pkr: Math.round(actualMonth),
      delta_pkr: Math.round(monthlyTotal - actualMonth),
    };
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: 'green' | 'red' | 'neutral';
}) {
  const valueColor =
    accent === 'green'
      ? 'text-emerald-400'
      : accent === 'red'
      ? 'text-red-400'
      : 'text-[var(--text-primary)]';

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[1.5rem] p-5 flex flex-col gap-2 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`text-2xl sm:text-3xl font-black tracking-tight ${valueColor}`}>{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{sub}</p>
    </div>
  );
}

function VehicleTable({
  rows,
  formatPkr,
}: {
  rows: VehicleBreakdownRow[];
  formatPkr: (n: number) => string;
}) {
  const t = useTranslations('company.savings');

  if (rows.length === 0) return null;

  const tableHeaders = [
    t('vehicle'),
    t('qty'),
    t('previousVendorName'),
    t('previousVendorMonthly'),
    t('traflinqInvoiceMonth'),
    t('youSaved'),
  ];

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[1.5rem] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <div className="px-6 pt-5 pb-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-[#fe8503]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
            {t('perVehicleBreakdown')}
          </h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          {t('perVehicleDescription')}
        </p>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)]">
              {tableHeaders.map((h) => (
                <th
                  key={h}
                  className="text-start px-5 py-3 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const saved = row.delta_pkr;
              const isSaving = saved >= 0;
              return (
                <tr
                  key={i}
                  className="border-b border-[var(--border-default)] last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#fe8503]/10 flex items-center justify-center flex-shrink-0">
                        <Car className="h-4 w-4 text-[#fe8503]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">
                          {formatVehicleLabel(row)}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">{row.service_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[var(--text-primary)] font-bold">{row.quantity}</td>
                  <td className="px-5 py-4 text-[var(--text-muted)]">
                    {row.vendor_name ?? <span className="italic opacity-50">—</span>}
                  </td>
                  <td className="px-5 py-4 text-[var(--text-primary)]">
                    {formatPkr(row.benchmark_monthly_pkr)}
                  </td>
                  <td className="px-5 py-4 text-[var(--text-primary)]">
                    {formatPkr(row.actual_period_pkr)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 font-bold text-sm ${
                        isSaving ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {isSaving ? (
                        <TrendingDown className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingUp className="h-3.5 w-3.5" />
                      )}
                      {isSaving ? '−' : '+'}
                      {formatPkr(Math.abs(saved))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-[var(--border-default)]">
        {rows.map((row, i) => {
          const saved = row.delta_pkr;
          const isSaving = saved >= 0;
          return (
            <div key={i} className="p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#fe8503]/10 flex items-center justify-center">
                    <Car className="h-4 w-4 text-[#fe8503]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{formatVehicleLabel(row)}</p>
                    <p className="text-xs text-[var(--text-muted)]">{row.service_type} · ×{row.quantity}</p>
                  </div>
                </div>
                <span
                  className={`text-sm font-bold ${isSaving ? 'text-emerald-400' : 'text-red-400'}`}
                >
                  {isSaving ? '−' : '+'}
                  {formatPkr(Math.abs(saved))}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                <div className="bg-white/[0.04] rounded-xl px-3 py-2">
                  <p className="text-[var(--text-muted)]">{t('previousVendor')}</p>
                  <p className="font-semibold text-[var(--text-primary)]">{formatPkr(row.benchmark_monthly_pkr)}</p>
                </div>
                <div className="bg-white/[0.04] rounded-xl px-3 py-2">
                  <p className="text-[var(--text-muted)]">{t('traflinqInvoice')}</p>
                  <p className="font-semibold text-[var(--text-primary)]">{formatPkr(row.actual_period_pkr)}</p>
                </div>
              </div>
              {row.vendor_name && (
                <p className="text-xs text-[var(--text-muted)]">
                  {t('previousVendorColon', { name: row.vendor_name })}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SavingsPage() {
  const t = useTranslations('company.savings');
  const tCommon = useTranslations('common');
  const locale = useLocale() as Locale;

  const formatPkr = useCallback(
    (n: number) => `${tCommon('currency.pkr')} ${formatLocaleNumber(Math.abs(n), locale)}`,
    [tCommon, locale],
  );

  const getMonthName = useCallback(
    (monthIndex: number) => t(`months.${MONTH_KEYS[monthIndex]}`),
    [t],
  );

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [result, setResult] = useState<SavingsResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSavings = useCallback(async (year: number, month: number) => {
    setLoading(true);
    setResult(null);
    try {
      const { from, to } = getCalendarMonthRange(year, month);
      const data = await apiClient.request<SavingsResult>(
        `/company/savings-realisation?from=${from}&to=${to}`,
      );
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSavings(selectedYear, selectedMonth);
  }, [fetchSavings, selectedYear, selectedMonth]);

  function prevMonth() {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    const isCurrentMonth =
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
    if (isCurrentMonth) return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  const selectedMonthName = getMonthName(selectedMonth);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 pb-12 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {t('description')}
          </p>
        </div>

        {/* Period picker */}
        <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl px-4 py-2.5 shadow-sm self-start sm:self-auto">
          <button
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-bold text-[var(--text-primary)] min-w-[130px] text-center">
            {selectedMonthName} {selectedYear}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[1.5rem] p-5 h-28 animate-pulse"
              />
            ))}
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[1.5rem] h-64 animate-pulse" />
        </div>
      )}

      {/* No benchmarks configured */}
      {!loading && result && !result.has_benchmarks && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center">
            <PiggyBank className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{t('noBenchmarks')}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1 max-w-md">
              {t('noBenchmarksDescription')}
            </p>
          </div>
        </div>
      )}

      {/* Error / no data */}
      {!loading && !result && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-[var(--text-primary)]">{tCommon('errors.couldNotLoadSavings')}</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">{tCommon('errors.tryAgainOrContact')}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      {!loading && result && result.has_benchmarks && (
        <>
          {isCurrentMonth && (
            <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 -mt-2">
              {t('monthInProgress')}
            </p>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label={t('previousVendor')}
              value={formatPkr(result.benchmark_total_pkr)}
              sub={t('monthlyCostOldVendor')}
              accent="neutral"
            />
            <SummaryCard
              label={t('traflinqInvoice')}
              value={formatPkr(result.actual_total_pkr)}
              sub={t('invoiceForMonth', { month: selectedMonthName, year: selectedYear })}
              accent="neutral"
            />
            <SummaryCard
              label={result.delta_pkr >= 0 ? t('totalSaved') : t('difference')}
              value={(result.delta_pkr >= 0 ? '−' : '+') + formatPkr(Math.abs(result.delta_pkr))}
              sub={t('thisMonthVsVendor')}
              accent={result.delta_pkr >= 0 ? 'green' : 'red'}
            />
            <SummaryCard
              label={t('savingsPercent')}
              value={
                result.savings_pct != null
                  ? `${result.delta_pkr >= 0 ? '' : '+'}${Math.abs(result.savings_pct).toFixed(1)}%`
                  : '—'
              }
              sub={result.delta_pkr >= 0 ? t('lessThanBefore') : t('moreThanBefore')}
              accent={result.delta_pkr >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Per-vehicle table */}
          {(() => {
            const vehicleRows = resolveVehicleRows(result);
            return vehicleRows.length > 0 ? (
              <VehicleTable rows={vehicleRows} formatPkr={formatPkr} />
            ) : (
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[1.5rem] p-6 text-sm text-[var(--text-muted)]">
                {t('noVehicleBenchmarks')}
              </div>
            );
          })()}

          {/* AI Narrative */}
          {result.narrative && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[1.5rem] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-emerald-400">
                  {t('aiAnalysis')}
                </span>
              </div>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">{result.narrative}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
