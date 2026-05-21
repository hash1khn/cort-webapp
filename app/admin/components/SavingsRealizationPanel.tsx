'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/app/lib/services/api-client';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Building2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type BenchmarkRow = {
  id: number;
  service_type: 'SHUTTLE' | 'CHAUFFEUR';
  vehicle_category: string | null;
  monthly_cost: number;
  quantity: number;
  vendor_name: string | null;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
};

type SavingsBreakdownItem = {
  service_type: string;
  benchmark_pkr: number;
  actual_pkr: number;
  delta_pkr: number;
};

type SavingsResult = {
  period: { from: string; to: string; days: number };
  benchmark_total_pkr: number;
  actual_total_pkr: number;
  delta_pkr: number;
  savings_pct: number | null;
  breakdown: SavingsBreakdownItem[];
  narrative: string;
  benchmarks: BenchmarkRow[];
  has_benchmarks: boolean;
};

type NewBenchmarkForm = {
  service_type: 'SHUTTLE' | 'CHAUFFEUR';
  vehicle_category: string;
  monthly_cost: string;
  quantity: string;
  vendor_name: string;
  effective_from: string;
  effective_to: string;
  notes: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function pkr(n: number) {
  return `PKR ${Math.abs(n).toLocaleString('en-PK')}`;
}

function defaultPeriod(): { from: string; to: string } {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    from: firstOfMonth.toISOString().split('T')[0],
    to: today.toISOString().split('T')[0],
  };
}

const VEHICLE_CATEGORIES = ['SEDAN', 'HATCHBACK', 'SUV', 'HIACE', 'VAN', 'COASTER', 'BUS'];

// ── Component ─────────────────────────────────────────────────────────────────

export function SavingsRealizationPanel({ companyId }: { companyId: number }) {
  const [result, setResult] = useState<SavingsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState(defaultPeriod);

  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const [form, setForm] = useState<NewBenchmarkForm>({
    service_type: 'SHUTTLE',
    vehicle_category: '',
    monthly_cost: '',
    quantity: '1',
    vendor_name: '',
    effective_from: '',
    effective_to: '',
    notes: '',
  });

  const fetchSavings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request<SavingsResult>(
        `/admin/companies/${companyId}/savings-realisation?from=${period.from}&to=${period.to}`,
      );
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load savings data');
    } finally {
      setLoading(false);
    }
  }, [companyId, period]);

  useEffect(() => {
    fetchSavings();
  }, [fetchSavings]);

  async function handleAddBenchmark(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monthly_cost || !form.effective_from) return;
    setSaving(true);
    try {
      await apiClient.request(`/admin/companies/${companyId}/benchmarks`, {
        method: 'POST',
        body: JSON.stringify({
          service_type: form.service_type,
          vehicle_category: form.vehicle_category || null,
          monthly_cost: parseFloat(form.monthly_cost),
          quantity: parseInt(form.quantity, 10) || 1,
          vendor_name: form.vendor_name || null,
          effective_from: form.effective_from,
          effective_to: form.effective_to || null,
          notes: form.notes || null,
        }),
      });
      setShowAddForm(false);
      setForm({
        service_type: 'SHUTTLE',
        vehicle_category: '',
        monthly_cost: '',
        quantity: '1',
        vendor_name: '',
        effective_from: '',
        effective_to: '',
        notes: '',
      });
      await fetchSavings();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save benchmark');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await apiClient.request(`/admin/companies/${companyId}/benchmarks/${id}`, { method: 'DELETE' });
      await fetchSavings();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete benchmark');
    } finally {
      setDeletingId(null);
    }
  }

  const isSaving = result ? result.delta_pkr >= 0 : true;

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-500" />
          <h2 className="text-base font-semibold text-gray-900">Savings Realisation</h2>
          <span className="text-xs text-gray-400 font-normal">vs. pre-Traflinq benchmarks</span>
        </div>
        <button
          onClick={fetchSavings}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Period picker ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs text-gray-500 font-medium">Period</label>
        <input
          type="date"
          value={period.from}
          onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <span className="text-xs text-gray-400">to</span>
        <input
          type="date"
          value={period.to}
          onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
        <button
          onClick={fetchSavings}
          disabled={loading}
          className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* ── No benchmarks prompt ────────────────────────────────────────────── */}
      {result && !result.has_benchmarks && (
        <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-6 py-8 text-center">
          <Building2 className="h-8 w-8 text-emerald-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-emerald-800 mb-1">
            Add your pre-Traflinq transport benchmarks
          </p>
          <p className="text-xs text-emerald-600 max-w-sm mx-auto mb-4">
            Enter what this company was paying before Traflinq — vendor name, cost per month, and number
            of vehicles. We&apos;ll compute the exact PKR delta against your actual Traflinq invoices.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Benchmark
          </button>
        </div>
      )}

      {/* ── Savings summary card ────────────────────────────────────────────── */}
      {result && result.has_benchmarks && (
        <>
          <div
            className={`rounded-2xl border p-5 ${
              isSaving
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`rounded-xl p-2.5 ${
                  isSaving ? 'bg-emerald-100' : 'bg-red-100'
                }`}
              >
                {isSaving ? (
                  <TrendingDown className="h-6 w-6 text-emerald-600" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-0.5">
                  {result.period.from} → {result.period.to} ({result.period.days} days)
                </p>
                <p className="text-2xl font-bold text-gray-900 mb-0.5">
                  {isSaving ? '−' : '+'} {pkr(result.delta_pkr)}
                </p>
                <p className={`text-sm font-medium ${isSaving ? 'text-emerald-700' : 'text-red-700'}`}>
                  {isSaving
                    ? `${result.savings_pct?.toFixed(1) ?? '—'}% less than before Traflinq`
                    : `${result.savings_pct !== null ? Math.abs(result.savings_pct).toFixed(1) : '—'}% more than benchmark`}
                </p>

                {/* Side-by-side numbers */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="bg-white/70 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">Before Traflinq (prorated)</p>
                    <p className="text-base font-semibold text-gray-700">
                      {pkr(result.benchmark_total_pkr)}
                    </p>
                  </div>
                  <div className="bg-white/70 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400 mb-0.5">Actual Traflinq invoiced</p>
                    <p className="text-base font-semibold text-gray-700">
                      {pkr(result.actual_total_pkr)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── AI Narrative ────────────────────────────────────────────────── */}
          {result.narrative && (
            <div className="rounded-xl border border-emerald-100 bg-white px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  AI Summary
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{result.narrative}</p>
            </div>
          )}

          {/* ── Per-service breakdown ────────────────────────────────────────── */}
          {result.breakdown.length > 1 && (
            <div className="rounded-xl border border-gray-100 bg-white">
              <button
                onClick={() => setShowBreakdown((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-600 hover:text-gray-900"
              >
                <span>Per-service breakdown</span>
                {showBreakdown ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
              {showBreakdown && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {result.breakdown.map((b) => (
                    <div key={b.service_type} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{b.service_type}</p>
                        <p className="text-xs text-gray-400">
                          Before: {pkr(b.benchmark_pkr)} → After: {pkr(b.actual_pkr)}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          b.delta_pkr >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {b.delta_pkr >= 0 ? '−' : '+'} {pkr(b.delta_pkr)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Benchmark list ──────────────────────────────────────────────────── */}
      {result && result.benchmarks.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-700">Configured Benchmarks</p>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {result.benchmarks.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800">{b.service_type}</span>
                    {b.vehicle_category && (
                      <span className="text-xs text-gray-400">{b.vehicle_category}</span>
                    )}
                    {b.vendor_name && (
                      <span className="text-xs text-gray-400 truncate">— {b.vendor_name}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pkr(b.monthly_cost * b.quantity)}/month × {b.quantity} unit
                    {b.quantity !== 1 ? 's' : ''} · from {b.effective_from}
                    {b.effective_to ? ` to ${b.effective_to}` : ' (ongoing)'}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  disabled={deletingId === b.id}
                  className="ml-4 text-gray-300 hover:text-red-500 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add benchmark form ──────────────────────────────────────────────── */}
      {showAddForm && (
        <form
          onSubmit={handleAddBenchmark}
          className="rounded-xl border border-gray-200 bg-white p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-gray-700">Add Benchmark</p>

          <div className="grid grid-cols-2 gap-3">
            {/* Service type */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Service type *</label>
              <select
                value={form.service_type}
                onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value as any }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="SHUTTLE">Shuttle</option>
                <option value="CHAUFFEUR">Chauffeur</option>
              </select>
            </div>

            {/* Vehicle category */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Vehicle category</label>
              <select
                value={form.vehicle_category}
                onChange={(e) => setForm((f) => ({ ...f, vehicle_category: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Mixed / any</option>
                {VEHICLE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Vendor name */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Previous vendor</label>
              <input
                type="text"
                placeholder="e.g. Careem for Business"
                value={form.vendor_name}
                onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Monthly cost */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Monthly cost (PKR) *</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 150000"
                required
                value={form.monthly_cost}
                onChange={(e) => setForm((f) => ({ ...f, monthly_cost: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Quantity */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Quantity (vehicles / units)</label>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Effective from */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Effective from *</label>
              <input
                type="date"
                required
                value={form.effective_from}
                onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Effective to */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">
                Effective to{' '}
                <span className="text-gray-400">(leave blank = ongoing baseline)</span>
              </label>
              <input
                type="date"
                value={form.effective_to}
                onChange={(e) => setForm((f) => ({ ...f, effective_to: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Notes</label>
              <textarea
                rows={2}
                placeholder="e.g. Included 3 dedicated Coasters + driver salaries"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Benchmark'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-gray-500 hover:text-gray-800 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && !result && (
        <div className="py-12 text-center text-sm text-gray-400">Computing savings…</div>
      )}
    </div>
  );
}
