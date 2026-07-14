"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminProtectedPage } from "../../components/AdminProtectedPage";
import { ADMIN_SUBJECTS } from "../../../lib/abilities/admin-subjects";
import { apiClient } from "../../../lib/services/api-client";

type FuelAverageRow = {
  id: number;
  vehicle_category: string;
  fuel_avg_kmpl: number;
  updated_at: string;
};

const VEHICLE_CATEGORIES = ["SEDAN", "HATCHBACK", "SUV", "DOUBLE_CABIN", "VAN", "COASTER", "BUS"];

export default function VehicleFuelAveragesPage() {
  return (
    <AdminProtectedPage permission="ops_shuttle" subject={ADMIN_SUBJECTS.ops_shuttle}>
      <VehicleFuelAveragesContent />
    </AdminProtectedPage>
  );
}

function VehicleFuelAveragesContent() {
  const [rows, setRows] = useState<FuelAverageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.request<FuelAverageRow[]>("/admin/vehicle-category-fuel-averages");
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load fuel averages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const existingByCategory = new Map(rows.map((r) => [r.vehicle_category, r]));

  async function handleSave(category: string) {
    const value = parseFloat(drafts[category] ?? "");
    if (!value || value <= 0) return;
    setSavingCategory(category);
    setError(null);
    try {
      await apiClient.request("/admin/vehicle-category-fuel-averages", {
        method: "POST",
        body: JSON.stringify({ vehicle_category: category, fuel_avg_kmpl: value }),
      });
      await fetchRows();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSavingCategory(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0c225e]">Vehicle Category Fuel Averages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Default km/L used to calculate expected fuel consumption for LITRES-mode benchmarks. This is a
          category-wide assumption for savings comparisons — not the actual per-vehicle spec.
        </p>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Category</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">km/L</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wide">Last updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Loading…</td>
              </tr>
            ) : (
              VEHICLE_CATEGORIES.map((category) => {
                const existing = existingByCategory.get(category);
                const draft = drafts[category] ?? (existing ? String(existing.fuel_avg_kmpl) : "");
                return (
                  <tr key={category}>
                    <td className="px-4 py-3 font-medium text-slate-700">{category}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 5"
                        value={draft}
                        onChange={(e) => setDrafts((d) => ({ ...d, [category]: e.target.value }))}
                        className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {existing ? new Date(existing.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleSave(category)}
                        disabled={savingCategory === category || !draft}
                        className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-semibold"
                      >
                        {savingCategory === category ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
