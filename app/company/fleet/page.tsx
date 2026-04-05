"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { CompanyFeature, PoolVehicle, PoolDriver } from "../../lib/services/types/multi-mode";
import { toast } from "sonner";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const VEHICLE_CATEGORIES = ["Sedan", "SUV", "MPV", "Mini Bus", "Coach", "Hatchback", "Pickup", "Van"];
const DRIVER_TYPES = ["PERMANENT", "PART_TIME", "CONTRACT"];

export default function CompanyFleetPage() {
    const company = useAppSelector(selectCompany);
    const companyId = Number(company?.id);

    const [features, setFeatures] = useState<CompanyFeature[]>([]);
    const [featureLoaded, setFeatureLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState<"vehicles" | "drivers">("vehicles");

    // Vehicles state
    const [vehicles, setVehicles] = useState<PoolVehicle[]>([]);
    const [vehiclesLoading, setVehiclesLoading] = useState(false);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [vehicleForm, setVehicleForm] = useState({ plate_number: "", make: "", model: "", year: new Date().getFullYear(), color: "", category: "Sedan", fuel_avg_city: 10, fuel_avg_highway: 13 });
    const [vehicleSaving, setVehicleSaving] = useState(false);

    // Drivers state
    const [drivers, setDrivers] = useState<PoolDriver[]>([]);
    const [driversLoading, setDriversLoading] = useState(false);
    const [showAddDriver, setShowAddDriver] = useState(false);
    const [driverForm, setDriverForm] = useState({ email: "", password: "", full_name: "", phone: "", driver_type: "PERMANENT", cnic_number: "", license_number: "" });
    const [driverSaving, setDriverSaving] = useState(false);

    useEffect(() => {
        if (!companyId) return;
        apiClient.getCompanyFeatures(companyId)
            .then((r) => { setFeatures(r.data); setFeatureLoaded(true); })
            .catch(() => setFeatureLoaded(true));
    }, [companyId]);

    const isEnabled = features.find((f) => f.feature_key === "chauffeur_self_managed")?.is_enabled ?? false;

    const fetchVehicles = useCallback(async () => {
        if (!companyId) return;
        setVehiclesLoading(true);
        try {
            const res = await apiClient.getPoolVehicles(companyId);
            setVehicles(res.data);
        } catch { toast.error("Failed to load pool vehicles"); }
        finally { setVehiclesLoading(false); }
    }, [companyId]);

    const fetchDrivers = useCallback(async () => {
        if (!companyId) return;
        setDriversLoading(true);
        try {
            const res = await apiClient.getPoolDrivers(companyId);
            setDrivers(res.data);
        } catch { toast.error("Failed to load pool drivers"); }
        finally { setDriversLoading(false); }
    }, [companyId]);

    useEffect(() => {
        if (!isEnabled) return;
        if (activeTab === "vehicles") fetchVehicles();
        if (activeTab === "drivers") fetchDrivers();
    }, [activeTab, isEnabled, fetchVehicles, fetchDrivers]);

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        setVehicleSaving(true);
        try {
            await apiClient.createPoolVehicle(companyId, {
                plate_number: vehicleForm.plate_number,
                make: vehicleForm.make,
                model: vehicleForm.model,
                year: vehicleForm.year,
                color: vehicleForm.color || undefined,
                category: vehicleForm.category,
                fuel_avg_city: vehicleForm.fuel_avg_city,
                fuel_avg_highway: vehicleForm.fuel_avg_highway,
            });
            toast.success("Vehicle added to pool");
            setShowAddVehicle(false);
            setVehicleForm({ plate_number: "", make: "", model: "", year: new Date().getFullYear(), color: "", category: "Sedan", fuel_avg_city: 10, fuel_avg_highway: 13 });
            fetchVehicles();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to add vehicle");
        } finally {
            setVehicleSaving(false);
        }
    };

    const handleDeactivateVehicle = async (vehicleId: number) => {
        if (!confirm("Deactivate this pool vehicle?")) return;
        try {
            await apiClient.deactivatePoolVehicle(companyId, vehicleId);
            toast.success("Vehicle deactivated");
            fetchVehicles();
        } catch { toast.error("Failed to deactivate vehicle"); }
    };

    const handleInviteDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        setDriverSaving(true);
        try {
            await apiClient.invitePoolDriver(companyId, {
                email: driverForm.email,
                password: driverForm.password,
                full_name: driverForm.full_name,
                phone: driverForm.phone || undefined,
                driver_type: driverForm.driver_type,
                cnic_number: driverForm.cnic_number || undefined,
                license_number: driverForm.license_number || undefined,
            });
            toast.success("Driver invited to pool");
            setShowAddDriver(false);
            setDriverForm({ email: "", password: "", full_name: "", phone: "", driver_type: "PERMANENT", cnic_number: "", license_number: "" });
            fetchDrivers();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to invite driver");
        } finally {
            setDriverSaving(false);
        }
    };

    const handleDeactivateDriver = async (userId: string) => {
        if (!confirm("Deactivate this pool driver?")) return;
        try {
            await apiClient.deactivatePoolDriver(companyId, userId);
            toast.success("Driver deactivated");
            fetchDrivers();
        } catch { toast.error("Failed to deactivate driver"); }
    };

    if (!featureLoaded) {
        return <div className="p-8 text-sm text-gray-400">Loading…</div>;
    }

    if (!isEnabled) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center max-w-sm">
                    <div className="text-4xl mb-4">🚗</div>
                    <h2 className="text-lg font-bold text-gray-800 mb-2">Pool Fleet Not Enabled</h2>
                    <p className="text-sm text-gray-500">The self-managed fleet feature is not enabled for your company. Contact your CORT account manager to enable it.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0c225e]">Pool Fleet</h1>
                <p className="text-sm text-gray-500 mt-1">Manage your company&apos;s own vehicles and drivers for self-managed chauffeur bookings</p>
            </div>

            {/* Tab Nav */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {(["vehicles", "drivers"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cx(
                                "whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium",
                                activeTab === tab ? "border-[#f47f00] text-[#f47f00]" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            {tab === "vehicles" ? "Pool Vehicles" : "Pool Drivers"}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Vehicles Tab */}
            {activeTab === "vehicles" && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => setShowAddVehicle(true)} className={saveBtnCls}>+ Add Vehicle</button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Plate", "Make / Model", "Year", "Category", "Status", "Actions"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {vehiclesLoading ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                                ) : vehicles.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No pool vehicles yet</td></tr>
                                ) : vehicles.map((v) => (
                                    <tr key={v.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-xs font-medium">{v.plate_number}</td>
                                        <td className="px-4 py-3">{v.make} {v.model}</td>
                                        <td className="px-4 py-3">{v.year}</td>
                                        <td className="px-4 py-3">{v.category}</td>
                                        <td className="px-4 py-3">
                                            <span className={cx("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", v.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                                {v.status ?? "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {v.status === "ACTIVE" && (
                                                <button onClick={() => handleDeactivateVehicle(v.id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Drivers Tab */}
            {activeTab === "drivers" && (
                <div className="space-y-4">
                    <div className="flex justify-end">
                        <button onClick={() => setShowAddDriver(true)} className={saveBtnCls}>+ Invite Driver</button>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    {["Name", "Email", "Phone", "Type", "Status", "Actions"].map((h) => (
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {driversLoading ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
                                ) : drivers.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No pool drivers yet</td></tr>
                                ) : drivers.map((d) => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{d.full_name}</td>
                                        <td className="px-4 py-3 text-gray-600">{d.email}</td>
                                        <td className="px-4 py-3 text-gray-600">{d.phone ?? "—"}</td>
                                        <td className="px-4 py-3 text-gray-600">{d.drivers_profile?.driver_type ?? "—"}</td>
                                        <td className="px-4 py-3">
                                            <span className={cx("inline-flex px-2 py-0.5 rounded-full text-xs font-medium", d.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500")}>
                                                {d.status ?? "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {d.status === "ACTIVE" && (
                                                <button onClick={() => handleDeactivateDriver(d.id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Vehicle Modal */}
            {showAddVehicle && (
                <Modal title="Add Pool Vehicle" onClose={() => setShowAddVehicle(false)}>
                    <form onSubmit={handleAddVehicle} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Plate Number *"><input required value={vehicleForm.plate_number} onChange={(e) => setVehicleForm((f) => ({ ...f, plate_number: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Category">
                                <select value={vehicleForm.category} onChange={(e) => setVehicleForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
                                    {VEHICLE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                                </select>
                            </Field>
                            <Field label="Make *"><input required value={vehicleForm.make} onChange={(e) => setVehicleForm((f) => ({ ...f, make: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Model *"><input required value={vehicleForm.model} onChange={(e) => setVehicleForm((f) => ({ ...f, model: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Year *"><input required type="number" value={vehicleForm.year} onChange={(e) => setVehicleForm((f) => ({ ...f, year: Number(e.target.value) }))} className={inputCls} /></Field>
                            <Field label="Color"><input value={vehicleForm.color} onChange={(e) => setVehicleForm((f) => ({ ...f, color: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Fuel Avg City (km/L)"><input type="number" step="0.1" value={vehicleForm.fuel_avg_city} onChange={(e) => setVehicleForm((f) => ({ ...f, fuel_avg_city: Number(e.target.value) }))} className={inputCls} /></Field>
                            <Field label="Fuel Avg Highway (km/L)"><input type="number" step="0.1" value={vehicleForm.fuel_avg_highway} onChange={(e) => setVehicleForm((f) => ({ ...f, fuel_avg_highway: Number(e.target.value) }))} className={inputCls} /></Field>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowAddVehicle(false)} className={cancelBtnCls}>Cancel</button>
                            <button type="submit" disabled={vehicleSaving} className={saveBtnCls}>{vehicleSaving ? "Adding…" : "Add Vehicle"}</button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Invite Driver Modal */}
            {showAddDriver && (
                <Modal title="Invite Pool Driver" onClose={() => setShowAddDriver(false)}>
                    <form onSubmit={handleInviteDriver} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Full Name *"><input required value={driverForm.full_name} onChange={(e) => setDriverForm((f) => ({ ...f, full_name: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Phone"><input value={driverForm.phone} onChange={(e) => setDriverForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Email *"><input required type="email" value={driverForm.email} onChange={(e) => setDriverForm((f) => ({ ...f, email: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Password *"><input required type="password" minLength={8} value={driverForm.password} onChange={(e) => setDriverForm((f) => ({ ...f, password: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Driver Type">
                                <select value={driverForm.driver_type} onChange={(e) => setDriverForm((f) => ({ ...f, driver_type: e.target.value }))} className={inputCls}>
                                    {DRIVER_TYPES.map((t) => <option key={t}>{t}</option>)}
                                </select>
                            </Field>
                            <Field label="CNIC"><input value={driverForm.cnic_number} onChange={(e) => setDriverForm((f) => ({ ...f, cnic_number: e.target.value }))} className={inputCls} /></Field>
                            <Field label="License No."><input value={driverForm.license_number} onChange={(e) => setDriverForm((f) => ({ ...f, license_number: e.target.value }))} className={inputCls} /></Field>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setShowAddDriver(false)} className={cancelBtnCls}>Cancel</button>
                            <button type="submit" disabled={driverSaving} className={saveBtnCls}>{driverSaving ? "Inviting…" : "Invite Driver"}</button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#f47f00]";
const saveBtnCls = "bg-[#f47f00] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#d96e00] disabled:opacity-50";
const cancelBtnCls = "border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50";
