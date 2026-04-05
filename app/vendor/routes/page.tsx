"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../lib/services/api-client";
import { VendorRoute } from "../../lib/services/types/multi-mode";
import { useVendorContext } from "../layout";
import { toast } from "sonner";

export default function VendorRoutesPage() {
    const { selectedLink } = useVendorContext();
    const [routes, setRoutes] = useState<VendorRoute[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: "", stops: [{ name: "", sequence_order: 1, morning_eta: "", evening_eta: "" }] });
    const [saving, setSaving] = useState(false);

    // Guard: only show if serves_shuttle
    const servesShuttle = selectedLink?.serves_shuttle ?? false;

    const load = useCallback(async () => {
        if (!selectedLink) return;
        setLoading(true);
        try {
            const res = await apiClient.getVendorRoutes(selectedLink.id);
            setRoutes(res.data);
        } catch { toast.error("Failed to load routes"); }
        finally { setLoading(false); }
    }, [selectedLink]);

    useEffect(() => { load(); }, [load]);

    const addStop = () => {
        setForm((f) => ({
            ...f,
            stops: [...f.stops, { name: "", sequence_order: f.stops.length + 1, morning_eta: "", evening_eta: "" }],
        }));
    };

    const removeStop = (index: number) => {
        setForm((f) => ({
            ...f,
            stops: f.stops.filter((_, i) => i !== index).map((s, i) => ({ ...s, sequence_order: i + 1 })),
        }));
    };

    const updateStop = (index: number, field: string, value: string) => {
        setForm((f) => ({
            ...f,
            stops: f.stops.map((s, i) => i === index ? { ...s, [field]: value } : s),
        }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLink) return;
        setSaving(true);
        try {
            await apiClient.createVendorRoute({
                name: form.name,
                company_vendor_link_id: selectedLink.id,
                stops: form.stops.map((s) => ({
                    name: s.name,
                    sequence_order: s.sequence_order,
                    morning_eta: s.morning_eta || undefined,
                    evening_eta: s.evening_eta || undefined,
                })),
            });
            toast.success("Route created");
            setShowCreate(false);
            setForm({ name: "", stops: [{ name: "", sequence_order: 1, morning_eta: "", evening_eta: "" }] });
            load();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to create route");
        } finally {
            setSaving(false);
        }
    };

    if (!servesShuttle) {
        return (
            <div className="p-6 flex items-center justify-center min-h-[50vh]">
                <div className="text-center max-w-sm">
                    <div className="text-4xl mb-4">🚌</div>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Shuttle Routes Unavailable</h2>
                    <p className="text-sm text-gray-500">Your link to this company does not include shuttle service. Switch to a shuttle-enabled company link in the sidebar.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[#0c225e]">Shuttle Routes</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {selectedLink ? `For: ${selectedLink.companies?.name ?? `Link #${selectedLink.id}`}` : "Select a company"}
                    </p>
                </div>
                <button onClick={() => setShowCreate(true)} className={saveBtnCls}>+ Create Route</button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            {["Route Name", "Stops", "Vehicle", "Status"].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                        ) : routes.length === 0 ? (
                            <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No routes created yet</td></tr>
                        ) : routes.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                                <td className="px-4 py-3 text-gray-600">{r.route_stops?.length ?? 0} stops</td>
                                <td className="px-4 py-3 text-gray-600">{r.vehicles ? `${r.vehicles.plate_number} — ${r.vehicles.model}` : "—"}</td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                        {r.status ?? "—"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Route Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Create Route</h2>
                            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Route Name *</label>
                                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="e.g. Morning Route A" />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-700">Stops ({form.stops.length})</span>
                                    <button type="button" onClick={addStop} className="text-xs text-[#f47f00] hover:underline">+ Add Stop</button>
                                </div>
                                {form.stops.map((stop, i) => (
                                    <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-500 w-5">{i + 1}.</span>
                                            <input
                                                required
                                                value={stop.name}
                                                onChange={(e) => updateStop(i, "name", e.target.value)}
                                                className={`${inputCls} flex-1`}
                                                placeholder="Stop name"
                                            />
                                            {form.stops.length > 1 && (
                                                <button type="button" onClick={() => removeStop(i)} className="text-red-400 hover:text-red-600 text-lg">×</button>
                                            )}
                                        </div>
                                        <div className="flex gap-2 pl-7">
                                            <input
                                                type="time"
                                                value={stop.morning_eta}
                                                onChange={(e) => updateStop(i, "morning_eta", e.target.value)}
                                                className={`${inputCls} flex-1`}
                                                placeholder="Morning ETA"
                                            />
                                            <input
                                                type="time"
                                                value={stop.evening_eta}
                                                onChange={(e) => updateStop(i, "evening_eta", e.target.value)}
                                                className={`${inputCls} flex-1`}
                                                placeholder="Evening ETA"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className={cancelBtnCls}>Cancel</button>
                                <button type="submit" disabled={saving} className={saveBtnCls}>{saving ? "Creating…" : "Create Route"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#f47f00]";
const saveBtnCls = "bg-[#f47f00] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d96e00] disabled:opacity-50";
const cancelBtnCls = "border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50";
