"use client";

import { useEffect, useState, useCallback } from "react";
import {
    apiClient,
    Vehicle,
    VehicleCategory,
    OwnershipType,
    CreateVehicleRequest,
    UpdateVehicleRequest,
    QueryVehicleParams,
    Vendor
} from "../../lib/services/api-client";

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit">("create");
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

    // Filters
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<VehicleCategory | "ALL">("ALL");
    const [ownership, setOwnership] = useState<OwnershipType | "ALL">("ALL");
    const [filterVendorId, setFilterVendorId] = useState<number | "ALL">("ALL");

    const debouncedSearch = useDebounce(search, 500);

    // Form Data
    const [formData, setFormData] = useState<Partial<CreateVehicleRequest>>({});

    const fetchVehicles = useCallback(async () => {
        setIsLoading(true);
        try {
            const params: QueryVehicleParams = { limit: 100 };
            if (debouncedSearch) params.search = debouncedSearch;
            if (category !== "ALL") params.category = category as VehicleCategory;
            if (ownership !== "ALL") params.ownership = ownership as OwnershipType;
            if (filterVendorId !== "ALL") params.vendor_id = filterVendorId;

            const response = await apiClient.getVehicles(params);
            setVehicles(response.data?.data || []);
        } catch (error) {
            console.error("Failed to fetch vehicles:", error);
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, category, ownership, filterVendorId]);

    useEffect(() => {
        fetchVehicles();
        apiClient.getVendors({ limit: 100 }).then(res => setVendors(res.data?.data || []));
    }, [fetchVehicles]);

    const handleCreate = async () => {
        if (!formData.plate_number || !formData.make || !formData.model || !formData.year || !formData.category || !formData.ownership || !formData.fuel_avg_city || !formData.fuel_avg_highway) {
            alert("Please fill all required fields");
            return;
        }

        try {
            setIsSubmitting(true);
            await apiClient.createVehicle(formData as CreateVehicleRequest);
            closeModal();
            fetchVehicles();
        } catch (error: any) {
            console.error("Failed to create vehicle:", error);
            alert(error.message || "Failed to create vehicle");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!selectedVehicle) return;
        try {
            setIsSubmitting(true);
            await apiClient.updateVehicle(selectedVehicle.id, formData as UpdateVehicleRequest);
            closeModal();
            fetchVehicles();
        } catch (error: any) {
            console.error("Failed to update vehicle:", error);
            alert(error.message || "Failed to update vehicle");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (vehicle: Vehicle) => {
        if (!confirm(`Are you sure you want to delete ${vehicle.plate_number}?`)) return;

        try {
            await apiClient.deleteVehicle(vehicle.id);
            fetchVehicles();
        } catch (error: any) {
            console.error("Failed to delete vehicle:", error);
            alert(error.message || "Failed to delete vehicle");
        }
    };

    const startCreate = () => {
        setSelectedVehicle(null);
        setFormData({
            year: new Date().getFullYear(),
            category: VehicleCategory.SEDAN,
            ownership: OwnershipType.OWNED,
            fuel_avg_city: 10,
            fuel_avg_highway: 12,
        });
        setModalMode("create");
        setIsModalOpen(true);
    };

    const startEdit = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setFormData({
            plate_number: vehicle.plate_number,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color || "",
            category: vehicle.category,
            ownership: vehicle.ownership,
            fuel_avg_city: vehicle.fuel_avg_city,
            fuel_avg_highway: vehicle.fuel_avg_highway,
            vendor_id: vehicle.vendor_id || undefined,
            rent_per_day: vehicle.rent_per_day || undefined,
        });
        setModalMode("edit");
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedVehicle(null);
        setFormData({});
    };

    const renderForm = () => (
        <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Plate Number *</span>
                <input
                    value={formData.plate_number || ""}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="LEA-123"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Make *</span>
                <input
                    value={formData.make || ""}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="Toyota"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Model *</span>
                <input
                    value={formData.model || ""}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="Corolla"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Year *</span>
                <input
                    type="number"
                    value={formData.year || ""}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Color</span>
                <input
                    value={formData.color || ""}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    placeholder="White"
                />
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Category *</span>
                <select
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as VehicleCategory })}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    {Object.values(VehicleCategory).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </label>
            <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold tracking-wider text-muted">Ownership *</span>
                <select
                    value={formData.ownership || ""}
                    onChange={(e) => setFormData({ ...formData, ownership: e.target.value as OwnershipType })}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    {Object.values(OwnershipType).map((own) => (
                        <option key={own} value={own}>{own}</option>
                    ))}
                </select>
            </label>

            {formData.ownership === OwnershipType.PARTNER && (
                <>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wider text-muted">Vendor *</span>
                        <select
                            value={formData.vendor_id || ""}
                            onChange={(e) => setFormData({ ...formData, vendor_id: Number(e.target.value) })}
                            className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                        >
                            <option value="">Select Vendor</option>
                            {vendors.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-xs font-semibold tracking-wider text-muted">Rent Per Day</span>
                        <input
                            type="number"
                            value={formData.rent_per_day || ""}
                            onChange={(e) => setFormData({ ...formData, rent_per_day: Number(e.target.value) })}
                            className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                            placeholder="0.00"
                        />
                    </label>
                </>
            )}

            <div className="col-span-full mt-4 rounded-lg border border-border bg-surface p-4">
                <div className="text-xs font-semibold tracking-wider text-muted">FUEL CONSUMPTION (CRUCIAL FOR BILLING)</div>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-ink">Fuel Avg (KM/L) — In-City *</span>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.fuel_avg_city || ""}
                            onChange={(e) => setFormData({ ...formData, fuel_avg_city: Number(e.target.value) })}
                            className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-ink">Fuel Avg (KM/L) — Highway *</span>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.fuel_avg_highway || ""}
                            onChange={(e) => setFormData({ ...formData, fuel_avg_highway: Number(e.target.value) })}
                            className="h-10 rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                        />
                    </label>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-6">
            <div>
                <div className="text-sm font-medium text-muted">Admin</div>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Vehicles</h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white p-4">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search plate, make, model..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                    />
                </div>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as VehicleCategory | "ALL")}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    <option value="ALL">All Categories</option>
                    {Object.values(VehicleCategory).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value as OwnershipType | "ALL")}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    <option value="ALL">All Ownership</option>
                    {Object.values(OwnershipType).map((own) => (
                        <option key={own} value={own}>{own}</option>
                    ))}
                </select>
                <select
                    value={filterVendorId}
                    onChange={(e) => setFilterVendorId(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                    className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40"
                >
                    <option value="ALL">All Vendors</option>
                    {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                </select>
                <button
                    onClick={startCreate}
                    className="inline-flex h-10 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white hover:opacity-95"
                >
                    Add Vehicle
                </button>
            </div>

            <div className="rounded-xl border border-border bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-surface text-xs font-semibold tracking-wider text-muted">
                            <tr>
                                <th className="px-4 py-3 text-left">Plate</th>
                                <th className="px-4 py-3 text-left">Make / Model</th>
                                <th className="px-4 py-3 text-left">Category</th>
                                <th className="px-4 py-3 text-left">Ownership</th>
                                <th className="px-4 py-3 text-left">Fuel (City/Hwy)</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {vehicles.map((v) => (
                                <tr key={v.id} className="hover:bg-surface/50">
                                    <td className="px-4 py-3 font-medium text-ink">{v.plate_number}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-ink">{v.make} {v.model}</div>
                                        <div className="text-xs text-muted">{v.year} · {v.color || "No Color"}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-full border border-border bg-white px-2 py-0.5 text-xs font-medium text-ink">
                                            {v.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${v.ownership === OwnershipType.OWNED ? "bg-success/10 text-success" : "bg-blue/10 text-blue"
                                            }`}>
                                            {v.ownership}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-xs">
                                            <span className="font-semibold">{v.fuel_avg_city}</span> / <span className="font-semibold">{v.fuel_avg_highway}</span> km/l
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => startEdit(v)}
                                                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-medium text-ink hover:bg-surface"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(v)}
                                                className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-medium text-danger hover:bg-danger/5"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && vehicles.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                                        No vehicles found matching your filters.
                                    </td>
                                </tr>
                            )}
                            {isLoading && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                                        Loading...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <div className="text-xs font-semibold tracking-wider text-muted">
                                    {modalMode === "create" ? "NEW ENTRY" : "EDIT ENTRY"}
                                </div>
                                <h2 className="mt-1 text-2xl font-semibold text-navy">
                                    {modalMode === "create" ? "Add New Vehicle" : `Edit ${selectedVehicle?.plate_number}`}
                                </h2>
                            </div>
                            <button
                                onClick={closeModal}
                                className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto pr-2">
                            {renderForm()}
                        </div>

                        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-6">
                            <button
                                onClick={closeModal}
                                disabled={isSubmitting}
                                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={modalMode === "create" ? handleCreate : handleUpdate}
                                disabled={isSubmitting}
                                className="inline-flex h-10 items-center justify-center rounded-md bg-blue px-6 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? "Saving..." : (modalMode === "create" ? "Create Vehicle" : "Save Changes")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
