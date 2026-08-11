"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../lib/services/api-client";
import { Check, X, Clock, Fuel, Wrench, Receipt } from "lucide-react";

type EntityType = "FUEL" | "EXPENSE" | "MAINTENANCE";

type DeleteRequest = {
  id: number;
  entity_type: EntityType;
  record_id: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_by: string;
  requested_by_name: string;
  created_at: string;
  summary: string;
};

const ENTITY_LABEL: Record<EntityType, string> = {
  FUEL: "Fuel Record",
  EXPENSE: "Expense",
  MAINTENANCE: "Maintenance Record",
};

const ENTITY_ICON: Record<EntityType, typeof Fuel> = {
  FUEL: Fuel,
  EXPENSE: Receipt,
  MAINTENANCE: Wrench,
};

interface DeleteRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after any approve/reject decision so the caller can refresh a pending count. */
  onChanged?: () => void;
}

export function DeleteRequestsModal({ isOpen, onClose, onChanged }: DeleteRequestsModalProps) {
  const [requests, setRequests] = useState<DeleteRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [notesById, setNotesById] = useState<Record<number, string>>({});

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request<DeleteRequest[]>("/admin/record-delete-requests/pending");
      setRequests(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load delete requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchRequests();
  }, [isOpen, fetchRequests]);

  async function handleDecision(id: number, decision: "approve" | "reject") {
    setActingId(id);
    try {
      await apiClient.request(`/admin/record-delete-requests/${id}/${decision}`, {
        method: "POST",
        body: JSON.stringify({ notes: notesById[id] || undefined }),
      });
      await fetchRequests();
      onChanged?.();
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
            <h3 className="text-base font-bold text-[#0c225e]">Delete Requests</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fuel / expense / maintenance records requested for deletion by staff who didn&apos;t add them
            </p>
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
            <div className="py-8 text-center text-sm text-slate-400">No pending delete requests.</div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => {
                const Icon = ENTITY_ICON[r.entity_type];
                return (
                  <div key={r.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <Clock className="h-3 w-3" /> {r.status}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        <Icon className="h-3 w-3" /> {ENTITY_LABEL[r.entity_type]}
                      </span>
                      <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs space-y-1.5">
                      <div>
                        <span className="font-semibold text-slate-600">Record: </span>
                        <span className="text-slate-800">{r.summary}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-600">Requested by: </span>
                        <span className="text-slate-800">{r.requested_by_name}</span>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Review notes (optional)"
                      value={notesById[r.id] ?? ""}
                      onChange={(e) => setNotesById((n) => ({ ...n, [r.id]: e.target.value }))}
                      className="w-full mt-2 text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleDecision(r.id, "approve")}
                        disabled={actingId === r.id}
                        className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve &amp; Delete
                      </button>
                      <button
                        onClick={() => handleDecision(r.id, "reject")}
                        disabled={actingId === r.id}
                        className="flex items-center gap-1 text-xs bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-100 disabled:opacity-50 font-semibold"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
