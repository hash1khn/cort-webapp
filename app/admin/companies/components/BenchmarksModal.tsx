'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/app/lib/services/api-client';
import { Plus, Trash2, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type FuelMode = 'LITRES' | 'AVERAGE';

type BenchmarkRow = {
  id: number;
  service_type: 'SHUTTLE' | 'CHAUFFEUR';
  vehicle_category: string | null;
  coaster_seater_size: string | null;
  cost_type: 'FIXED' | 'VARIABLE';
  monthly_cost: number;
  quantity: number;
  vendor_name: string | null;
  fuel_mode: FuelMode | null;
  fuel_litres: number | null;
  claimed_avg_distance_km: number | null;
  fuel_avg_kmpl: number | null;
  notes: string | null;
};

type NewBenchmarkForm = {
  service_type: 'SHUTTLE' | 'CHAUFFEUR';
  vehicle_category: string;
  coaster_seater_size: string;
  cost_type: 'FIXED' | 'VARIABLE';
  monthly_cost: string;
  quantity: string;
  vendor_name: string;
  fuel_mode: FuelMode;
  fuel_litres: string;
  claimed_avg_distance_km: string;
  fuel_avg_kmpl: string;
  notes: string;
};

const VEHICLE_CATEGORIES = ['SEDAN', 'HATCHBACK', 'SUV', 'DOUBLE_CABIN', 'HIACE', 'VAN', 'COASTER', 'BUS'];

const COASTER_SEATER_OPTIONS = ['7 Seater', '14 Seater', '24 Seater', '32 Seater', '48 Seater', '62 Seater'];

const EMPTY_FORM: NewBenchmarkForm = {
  service_type: 'SHUTTLE',
  vehicle_category: '',
  coaster_seater_size: '',
  cost_type: 'VARIABLE',
  monthly_cost: '',
  quantity: '1',
  vendor_name: '',
  fuel_mode: 'LITRES',
  fuel_litres: '',
  claimed_avg_distance_km: '',
  fuel_avg_kmpl: '',
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
    if (!form.monthly_cost || !form.vehicle_category) return;
    if (form.fuel_mode === 'LITRES' && !form.fuel_litres) return;
    if (form.fuel_mode === 'AVERAGE' && (!form.claimed_avg_distance_km || !form.fuel_avg_kmpl)) return;
    setSaving(true);
    setError(null);
    try {
      await apiClient.request(`/admin/companies/${companyId}/benchmarks`, {
        method: 'POST',
        body: JSON.stringify({
          service_type: form.service_type,
          vehicle_category: form.vehicle_category || null,
          coaster_seater_size: form.vehicle_category === 'COASTER' ? (form.coaster_seater_size || null) : null,
          cost_type: form.cost_type,
          monthly_cost: parseFloat(form.monthly_cost),
          quantity: parseInt(form.quantity, 10) || 1,
          vendor_name: form.vendor_name || null,
          fuel_mode: form.fuel_mode,
          fuel_litres: form.fuel_mode === 'LITRES' ? parseFloat(form.fuel_litres) : null,
          claimed_avg_distance_km: form.fuel_mode === 'AVERAGE' ? parseFloat(form.claimed_avg_distance_km) : null,
          fuel_avg_kmpl: form.fuel_mode === 'AVERAGE' ? parseFloat(form.fuel_avg_kmpl) : null,
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
            <h3 className="text-base font-bold text-[#0c225e]">Pre-Traflinq Benchmarks</h3>
            <p className="text-xs text-slate-500 mt-0.5">{companyName} — what they paid before Traflinq</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Info callout */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-600 leading-relaxed">
            Enter each vendor / service line the company had before switching to CORT, including their claimed
            fuel consumption. The system compares this against actual GPS-measured utilisation to compute a
            verified fuel-cost saving each month.
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
                          <span className="text-xs text-gray-500 font-medium">
                            {b.vehicle_category === 'COASTER' && b.coaster_seater_size
                              ? `Coaster (${b.coaster_seater_size})`
                              : b.vehicle_category}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          b.cost_type === 'FIXED' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'
                        }`}>
                          {b.cost_type === 'FIXED' ? 'Fixed' : 'Variable'}
                        </span>
                        {b.fuel_mode && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                            Fuel: {b.fuel_mode === 'LITRES' ? 'Litres' : 'Average'}
                          </span>
                        )}
                        {b.vendor_name && (
                          <span className="text-xs text-gray-400 truncate">— {b.vendor_name}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {b.cost_type === 'FIXED'
                          ? <>{pkr(b.monthly_cost)}<span className="text-gray-400">/month (lump sum · {b.quantity} vehicle{b.quantity === 1 ? '' : 's'})</span></>
                          : <>{pkr(b.monthly_cost * b.quantity)}<span className="text-gray-400">/month ({b.quantity} × {pkr(b.monthly_cost)} rental)</span></>
                        }
                        {b.fuel_mode === 'LITRES' && b.fuel_litres != null && (
                          <span className="text-gray-400"> · {b.fuel_litres} L/vehicle/month claimed</span>
                        )}
                        {b.fuel_mode === 'AVERAGE' && b.claimed_avg_distance_km != null && b.fuel_avg_kmpl != null && (
                          <span className="text-gray-400"> · {b.claimed_avg_distance_km} km/vehicle/month @ {b.fuel_avg_kmpl} km/L claimed</span>
                        )}
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
                Add what this company paid before Traflinq — vendor name, monthly cost, vehicle count, and
                claimed fuel consumption. Savings are calculated from actual GPS utilisation.
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
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Vehicle category *</label>
                  <select
                    value={form.vehicle_category}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_category: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="">— Select category —</option>
                    {VEHICLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Coaster seater size — shown only when COASTER is selected */}
                {form.vehicle_category === 'COASTER' && (
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block font-medium">Coaster seater size</label>
                    <select
                      value={form.coaster_seater_size}
                      onChange={(e) => setForm((f) => ({ ...f, coaster_seater_size: e.target.value }))}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">— Select size —</option>
                      {COASTER_SEATER_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Vendor name */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Current vendor</label>
                  <input
                    type="text"
                    placeholder="e.g. Careem for Business"
                    value={form.vendor_name}
                    onChange={(e) => setForm((f) => ({ ...f, vendor_name: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Cost type */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Cost type *</label>
                  <select
                    value={form.cost_type}
                    onChange={(e) => setForm((f) => ({ ...f, cost_type: e.target.value as 'FIXED' | 'VARIABLE' }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="VARIABLE">Variable (monthly rental × quantity)</option>
                    <option value="FIXED">Fixed (lump sum)</option>
                  </select>
                </div>

                {/* Monthly cost */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">
                    {form.cost_type === 'FIXED' ? 'Monthly lump sum (PKR) *' : 'Monthly rental per vehicle (PKR) *'}
                  </label>
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

                {/* Quantity — used for fuel savings on both FIXED and VARIABLE */}
                <div>
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Number of vehicles / units *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  />
                </div>

                {/* Live cost preview */}
                {form.monthly_cost && (
                  <div className={`col-span-2 rounded-lg px-3 py-2 text-xs font-medium ${form.cost_type === 'FIXED' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-sky-50 text-sky-700 border border-sky-100'}`}>
                    Total monthly: {pkr(
                      form.cost_type === 'FIXED'
                        ? parseFloat(form.monthly_cost) || 0
                        : (parseFloat(form.monthly_cost) || 0) * (parseInt(form.quantity, 10) || 1)
                    )}/month
                    {form.cost_type === 'VARIABLE' && ` (${parseInt(form.quantity, 10) || 1} × ${pkr(parseFloat(form.monthly_cost) || 0)})`}
                    {form.cost_type === 'FIXED' && ` · ${parseInt(form.quantity, 10) || 1} vehicle${(parseInt(form.quantity, 10) || 1) === 1 ? '' : 's'}`}
                  </div>
                )}

                {/* Fuel mode */}
                <div className="col-span-2 border-t border-emerald-100 pt-3 mt-1">
                  <label className="text-xs text-gray-600 mb-1 block font-medium">Fuel benchmark mode *</label>
                  <select
                    value={form.fuel_mode}
                    onChange={(e) => setForm((f) => ({ ...f, fuel_mode: e.target.value as FuelMode }))}
                    className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="LITRES">Litres — company entered claimed litres/month</option>
                    <option value="AVERAGE">Average — company entered claimed distance + their own km/L</option>
                  </select>
                </div>

                {form.fuel_mode === 'LITRES' ? (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-600 mb-1 block font-medium">Claimed litres per vehicle / month *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 350"
                      value={form.fuel_litres}
                      onChange={(e) => setForm((f) => ({ ...f, fuel_litres: e.target.value }))}
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">Compared against the admin-set km/L average for this vehicle category.</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block font-medium">Claimed avg distance (km/vehicle/month) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 1650"
                        value={form.claimed_avg_distance_km}
                        onChange={(e) => setForm((f) => ({ ...f, claimed_avg_distance_km: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block font-medium">Company's claimed fuel avg (km/L) *</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 5"
                        value={form.fuel_avg_kmpl}
                        onChange={(e) => setForm((f) => ({ ...f, fuel_avg_kmpl: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </div>
                  </>
                )}

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
