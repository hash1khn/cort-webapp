'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/app/lib/services/api-client';
import { Plus, Trash2, X } from 'lucide-react';

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

const VEHICLE_CATEGORIES = ['SEDAN', 'HATCHBACK', 'SUV', 'HIACE', 'VAN', 'COASTER', 'BUS'];

const EMPTY_FORM: NewBenchmarkForm = {
  service_type: 'SHUTTLE',
  vehicle_category: '',
  monthly_cost: '',
  quantity: '1',
  vendor_name: '',
  effective_from: '',
  effective_to: '',
  notes: '',
};

function pkr(n: number) {
  return `PKR ${Math.abs(n).toLocaleString('en-PK')}`;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface BenchmarksModalProps {
  companyId: number;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BenchmarksModal({ companyId, companyName, isOpen, onClose }: BenchmarksModalProps) {
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState<NewBenchmarkForm>(EMPTY_FORM);

  const fetchBenchmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request<BenchmarkRow[] | { data: BenchmarkRow[] }>(`/admin/companies/${companyId}/benchmarks`);
      setBenchmarks(Array.isArray(data) ? data : (data as any)?.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load benchmarks');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (isOpen) {
      fetchBenchmarks();
      setShowForm(false);
      setForm(EMPTY_FORM);
    }
  }, [isOpen, fetchBenchmarks]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monthly_cost || !form.effective_from) return;
    setSaving(true);
    setError(null);
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
      setShowForm(false);
      setForm(EMPTY_FORM);
      await fetchBenchmarks();
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
      await fetchBenchmarks();
    } catch (e: any) {
      setError(e?.message ?? 'Failed to delete benchmark');
    } finally {
      setDeletingId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-[#0c225e]">Pre-CORT Benchmarks</h3>
            <p className="text-xs text-slate-500 mt-0.5">{companyName} — what they paid before CORT</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Info callout */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 leading-relaxed">
            Enter each vendor / service line the company had before switching to CORT. Include the
            monthly cost, number of vehicles, and the date range it was active. The AI savings
            analysis on the company dashboard uses these figures to compute the exact PKR delta.
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Benchmark list */}
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading benchmarks…</div>
          ) : benchmarks.length > 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Configured Benchmarks</p>
                <button
                  onClick={() => setShowForm((v) => !v)}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add New
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {benchmarks.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          b.service_type === 'SHUTTLE'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>{b.service_type}</span>
                        {b.vehicle_category && (
                          <span className="text-xs text-gray-500 font-medium">{b.vehicle_category}</span>
                        )}
                        {b.vendor_name && (
                          <span className="text-xs text-gray-400 truncate">— {b.vendor_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {pkr(b.monthly_cost * b.quantity)}/month
                        {b.quantity > 1 ? ` (${b.quantity} × ${pkr(b.monthly_cost)})` : ''}
                        {' · '}from {b.effective_from}
                        {b.effective_to ? ` to ${b.effective_to}` : ' (ongoing)'}
                      </p>
                      {b.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{b.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(b.id)}
                      disabled={deletingId === b.id}
                      className="ml-4 flex-shrink-0 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : !showForm ? (
            <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50 px-6 py-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
                <Plus className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-emerald-800 mb-1">No benchmarks yet</p>
              <p className="text-xs text-emerald-600 max-w-sm mx-auto mb-4">
                Add what this company paid before CORT — vendor name, monthly cost, and vehicle
                count. The AI will compute exact savings against actual CORT invoices.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add First Benchmark
              </button>
            </div>
          ) : null}

          {/* Add form */}
          {showForm && (
            <form
              onSubmit={handleAdd}
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-4"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-emerald-900">New Benchmark</p>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Service type */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Service type *</label>
                  <select
                    value={form.service_type}
                    onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value as any }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="SHUTTLE">Shuttle</option>
                    <option value="CHAUFFEUR">Chauffeur</option>
                  </select>
                </div>

                {/* Vehicle category */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Vehicle category</label>
                  <select
                    value={form.vehicle_category}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_category: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">Mixed / any</option>
                    {VEHICLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Vendor name */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Previous vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Careem for Business"
                    value={form.vendor_name}
                    onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Monthly cost */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Monthly cost (PKR) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 150000"
                    required
                    value={form.monthly_cost}
                    onChange={(e) => setForm((f) => ({ ...f, monthly_cost: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Quantity (vehicles / units)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Effective from */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Effective from *</label>
                  <input
                    type="date"
                    required
                    value={form.effective_from}
                    onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Effective to */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-600 mb-1 block font-medium">
                    Effective to{' '}
                    <span className="text-gray-400 font-normal">(leave blank = ongoing baseline)</span>
                  </label>
                  <input
                    type="date"
                    value={form.effective_to}
                    onChange={(e) => setForm((f) => ({ ...f, effective_to: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Notes */}
                <div className="col-span-2">
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Included 3 dedicated Coasters + driver salaries"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold"
                >
                  {saving ? 'Saving…' : 'Save Benchmark'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                  className="text-xs text-gray-500 hover:text-gray-800 px-3 py-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
