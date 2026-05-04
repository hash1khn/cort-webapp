"use client";

import { useEffect, useState, useCallback } from "react";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { CompanyFeature, PoolVehicle, PoolDriver } from "../../lib/services/types/multi-mode";
import { VehicleCategory } from "../../lib/services/types/vehicles";
import { toast } from "sonner";
import { Card } from "../components/DashboardComponents";
import { PageHeader, TABLE_CARD_CLASS, TABLE_TOP_BAR_CLASS, TABLE_HEADER_CELL_CLASS, TABLE_CELL_CLASS } from "../components/PageLayout";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const VEHICLE_CATEGORIES = Object.values(VehicleCategory);
const DRIVER_TYPES = ["PERMANENT", "PART_TIME", "CONTRACT"];

const formatVehicleCategory = (category: string) =>
    category.charAt(0) + category.slice(1).toLowerCase();

const getDefaultVehicleForm = () => ({
    plate_number: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    category: VehicleCategory.SEDAN,
    fuel_avg_city: 10,
    fuel_avg_highway: 13,
});

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
    const [vehicleForm, setVehicleForm] = useState(getDefaultVehicleForm);
    const [vehicleSaving, setVehicleSaving] = useState(false);

    // Drivers state
    const [drivers, setDrivers] = useState<PoolDriver[]>([]);
    const [driversLoading, setDriversLoading] = useState(false);
    const [showAddDriver, setShowAddDriver] = useState(false);
    const [driverForm, setDriverForm] = useState({ email: "", password: "", full_name: "", phone: "", cnic_number: "", license_number: "" });
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
            setVehicleForm(getDefaultVehicleForm());
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
                driver_type: "CHAUFFEUR",
                cnic_number: driverForm.cnic_number || undefined,
                license_number: driverForm.license_number || undefined,
            });
            toast.success("Driver invited to pool");
            setShowAddDriver(false);
            setDriverForm({ email: "", password: "", full_name: "", phone: "", cnic_number: "", license_number: "" });
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
        return (
            <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
                <div className="flex items-center justify-center py-24">
                    <div className="text-sm text-[var(--text-muted)]">Loading fleet data…</div>
                </div>
            </div>
        );
    }

    if (!isEnabled) {
        return (
            <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
                <PageHeader label="Self-Managed Fleet" title="Pool Fleet" description="Manage your company's own vehicles and drivers for self-managed chauffeur bookings" />
                <Card className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center max-w-sm">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-subtle)] mb-4">
                            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                        </div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Pool Fleet Not Enabled</h2>
                        <p className="text-sm text-[var(--text-muted)]">The self-managed fleet feature is not enabled for your company. Contact your CORT account manager to enable it.</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
            <PageHeader
                label="Self-Managed Fleet"
                title="Pool Fleet"
                description="Manage your company's own vehicles and drivers for self-managed chauffeur bookings"
                action={
                    activeTab === "vehicles" ? (
                        <button
                            onClick={() => setShowAddVehicle(true)}
                            className="group relative flex items-center gap-2 rounded-xl bg-[var(--cort-orange)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--cort-orange-hover)] hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(244,127,0,0.25)] hover:shadow-[0_8px_20px_rgba(244,127,0,0.35)] active:translate-y-0"
                        >
                            + Add Vehicle
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowAddDriver(true)}
                            className="group relative flex items-center gap-2 rounded-xl bg-[var(--cort-orange)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] transition-all hover:bg-[var(--cort-orange-hover)] hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(244,127,0,0.25)] hover:shadow-[0_8px_20px_rgba(244,127,0,0.35)] active:translate-y-0"
                        >
                            + Invite Driver
                        </button>
                    )
                }
            />

            {/* Tab Nav */}
            <div className="border-b border-[var(--border-light)]">
                <nav className="-mb-px flex space-x-8">
                    {(["vehicles", "drivers"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cx(
                                "whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors",
                                activeTab === tab
                                    ? "border-[var(--cort-orange)] text-[var(--cort-orange)]"
                                    : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                            )}
                        >
                            {tab === "vehicles" ? "Pool Vehicles" : "Pool Drivers"}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Vehicles Tab */}
            {activeTab === "vehicles" && (
                <Card className={TABLE_CARD_CLASS}>
                    <div className={TABLE_TOP_BAR_CLASS}>
                        <p className="text-sm text-[var(--text-muted)]">Pool vehicles registered under your company for self-managed bookings.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-[var(--border-light)]">
                                    {["Plate", "Make / Model", "Year", "Category", "Status", "Actions"].map((h) => (
                                        <th key={h} className={TABLE_HEADER_CELL_CLASS}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-light)]/50">
                                {vehiclesLoading ? (
                                    <tr><td colSpan={6} className={`${TABLE_CELL_CLASS} py-12 text-center text-[var(--text-muted)]`}>Loading…</td></tr>
                                ) : vehicles.length === 0 ? (
                                    <tr><td colSpan={6} className={`${TABLE_CELL_CLASS} py-12 text-center text-[var(--text-muted)]`}>No pool vehicles yet</td></tr>
                                ) : vehicles.map((v) => (
                                    <tr key={v.id} className="group transition-colors hover:bg-[var(--surface-subtle)]/80">
                                        <td className={`${TABLE_CELL_CLASS} font-mono text-xs text-[var(--text-muted)]`}>{v.plate_number}</td>
                                        <td className={`${TABLE_CELL_CLASS} font-bold text-[var(--text-primary)]`}>{v.make} {v.model}</td>
                                        <td className={`${TABLE_CELL_CLASS} text-[var(--text-secondary)]`}>{v.year}</td>
                                        <td className={`${TABLE_CELL_CLASS} text-[var(--text-secondary)]`}>{formatVehicleCategory(v.category)}</td>
                                        <td className={TABLE_CELL_CLASS}>
                                            <span className={cx(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border",
                                                v.status === "ACTIVE"
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border-light)]"
                                            )}>
                                                <span className={cx("w-1.5 h-1.5 rounded-full mr-1.5", v.status === "ACTIVE" ? "bg-emerald-400" : "bg-[var(--text-muted)]")}></span>
                                                {v.status ?? "—"}
                                            </span>
                                        </td>
                                        <td className={TABLE_CELL_CLASS}>
                                            {v.status === "ACTIVE" && (
                                                <button onClick={() => handleDeactivateVehicle(v.id)} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Deactivate</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Drivers Tab */}
            {activeTab === "drivers" && (
                <Card className={TABLE_CARD_CLASS}>
                    <div className={TABLE_TOP_BAR_CLASS}>
                        <p className="text-sm text-[var(--text-muted)]">Pool drivers assigned to your company for chauffeur bookings.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left">
                            <thead>
                                <tr className="border-b border-[var(--border-light)]">
                                    {["Name", "Email", "Phone", "Type", "Status", "Actions"].map((h) => (
                                        <th key={h} className={TABLE_HEADER_CELL_CLASS}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-light)]/50">
                                {driversLoading ? (
                                    <tr><td colSpan={6} className={`${TABLE_CELL_CLASS} py-12 text-center text-[var(--text-muted)]`}>Loading…</td></tr>
                                ) : drivers.length === 0 ? (
                                    <tr><td colSpan={6} className={`${TABLE_CELL_CLASS} py-12 text-center text-[var(--text-muted)]`}>No pool drivers yet</td></tr>
                                ) : drivers.map((d) => (
                                    <tr key={d.user_id} className="group transition-colors hover:bg-[var(--surface-subtle)]/80">
                                        <td className={`${TABLE_CELL_CLASS} font-bold text-[var(--text-primary)]`}>{d.users.full_name}</td>
                                        <td className={`${TABLE_CELL_CLASS} text-[var(--text-secondary)]`}>{d.users.email}</td>
                                        <td className={`${TABLE_CELL_CLASS} text-[var(--text-muted)]`}>{d.users.phone ?? "—"}</td>
                                        <td className={`${TABLE_CELL_CLASS} text-[var(--text-muted)]`}>{d.driver_type}</td>
                                        <td className={TABLE_CELL_CLASS}>
                                            <span className={cx(
                                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border",
                                                d.users.status === "ACTIVE"
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : "bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border-light)]"
                                            )}>
                                                <span className={cx("w-1.5 h-1.5 rounded-full mr-1.5", d.users.status === "ACTIVE" ? "bg-emerald-400" : "bg-[var(--text-muted)]")}></span>
                                                {d.users.status ?? "—"}
                                            </span>
                                        </td>
                                        <td className={TABLE_CELL_CLASS}>
                                            {d.users.status === "ACTIVE" && (
                                                <button onClick={() => handleDeactivateDriver(d.user_id)} className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Deactivate</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Add Vehicle Modal */}
            {showAddVehicle && (
                <Modal title="Add Pool Vehicle" onClose={() => setShowAddVehicle(false)}>
                    <form onSubmit={handleAddVehicle} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Plate Number *"><input required value={vehicleForm.plate_number} onChange={(e) => setVehicleForm((f) => ({ ...f, plate_number: e.target.value }))} className={inputCls} /></Field>
                            <Field label="Category">
                                <select value={vehicleForm.category} onChange={(e) => setVehicleForm((f) => ({ ...f, category: e.target.value as VehicleCategory }))} className={inputCls}>
                                    {VEHICLE_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{formatVehicleCategory(c)}</option>
                                    ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-2xl leading-none transition-colors">×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full h-9 rounded-lg border border-[var(--border-light)] bg-[var(--bg-card)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--cort-orange)]/20 focus:border-[var(--cort-orange)] transition-all text-[var(--text-primary)] shadow-sm";
const saveBtnCls = "bg-[var(--cort-orange)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[var(--cort-orange-hover)] disabled:opacity-50 transition-colors";
const cancelBtnCls = "border border-[var(--border-light)] text-[var(--text-secondary)] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--surface-subtle)] transition-colors";
