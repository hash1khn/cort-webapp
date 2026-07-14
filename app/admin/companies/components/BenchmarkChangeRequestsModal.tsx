'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/app/lib/services/api-client';
import { Check, X, Clock } from 'lucide-react';

type BenchmarkSnapshot = {
  service_type?: string | null;
  vehicle_category?: string | null;
  coaster_seater_size?: string | null;
  cost_type?: string | null;
  monthly_cost?: number | null;
  quantity?: number | null;
  fuel_mode?: string | null;
  fuel_litres?: number | null;
  claimed_avg_distance_km?: number | null;
  fuel_avg_kmpl?: number | null;
};

type ChangeRequest = {
  id: number;
  company_id?: number;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  previous: BenchmarkSnapshot | null;
  proposed: BenchmarkSnapshot | Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
};

interface BenchmarkChangeRequestsModalProps {
  companyId: number;
  companyName: string;
  isOpen: boolean;
  onClose: () => void;
}

function pkr(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `PKR ${Number(n).toLocaleString('en-PK')}`;
}

function summarize(s: BenchmarkSnapshot | Record<string, unknown> | null | undefined): string {
  if (!s || Object.keys(s).length === 0) return '—';
  const snap = s as BenchmarkSnapshot;
  const parts: string[] = [];
  if (snap.cost_type) parts.push(String(snap.cost_type));
  if (snap.vehicle_category) {
    parts.push(
      snap.coaster_seater_size
        ? `${snap.vehicle_category} (${snap.coaster_seater_size})`
        : String(snap.vehicle_category),
    );
  }
  if (snap.monthly_cost != null) {
    if (snap.cost_type === 'FIXED') parts.push(`lump ${pkr(snap.monthly_cost)}`);
    else parts.push(`${snap.quantity ?? 1} × ${pkr(snap.monthly_cost)}`);
  }
  if (snap.fuel_mode === 'LITRES' && snap.fuel_litres != null) parts.push(`${snap.fuel_litres} L/mo`);
  if (snap.fuel_mode === 'AVERAGE') {
    const dist = snap.claimed_avg_distance_km != null ? `${snap.claimed_avg_distance_km} km/day` : null;
    const avg = snap.fuel_avg_kmpl != null ? `${snap.fuel_avg_kmpl} km/L` : null;
    if (dist || avg) parts.push([dist, avg].filter(Boolean).join(' @ '));
  }
  return parts.length ? parts.join(' · ') : '—';
}

export function BenchmarkChangeRequestsModal({ companyId, companyName, isOpen, onClose }: BenchmarkChangeRequestsModalProps) {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [notesById, setNotesById] = useState<Record<number, string>>({});

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request<ChangeRequest[]>(`/admin/companies/${companyId}/benchmark-change-requests`);
      setRequests(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load change requests');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (isOpen) fetchRequests();
  }, [isOpen, fetchRequests]);

  async function handleDecision(id: number, decision: 'approve' | 'reject') {
    setActingId(id);
    try {
      await apiClient.request(`/admin/companies/${companyId}/benchmark-change-requests/${id}/${decision}`, {
        method: 'POST',
        body: JSON.stringify({ notes: notesById[id] || undefined }),
      });
      await fetchRequests();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Failed to ${decision} request`);
    } finally {
      setActingId(null);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-[#0c225e]">Benchmark Change Requests</h3>
            <p className="text-xs text-slate-500 mt-0.5">{companyName} — review company-submitted changes</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading requests…</div>
          ) : requests.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No pending change requests.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                      <Clock className="h-3 w-3" /> {r.status}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      {r.action}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs space-y-1.5">
                    <div>
                      <span className="font-semibold text-slate-600">Old: </span>
                      <span className="text-slate-800">{summarize(r.previous)}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-600">New: </span>
                      <span className="text-slate-800">
                        {r.action === 'DELETE' ? 'Delete benchmark' : summarize(r.proposed)}
                      </span>
                    </div>
                  </div>
                  {r.status === 'PENDING' && (
                    <>
                      <input
                        type="text"
                        placeholder="Review notes (optional)"
                        value={notesById[r.id] ?? ''}
                        onChange={(e) => setNotesById((n) => ({ ...n, [r.id]: e.target.value }))}
                        className="w-full mt-2 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleDecision(r.id, 'approve')}
                          disabled={actingId === r.id}
                          className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleDecision(r.id, 'reject')}
                          disabled={actingId === r.id}
                          className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50 font-semibold"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
