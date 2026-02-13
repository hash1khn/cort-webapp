"use client";

import { useEffect, useState } from "react";
import { CreateVehicleRequest, Vehicle, QueryVehicleParams, VehicleCategory, OwnershipType } from "../../lib/services/api-client";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import {
    fetchAdminVehicles,
    createAdminVehicle,
    updateAdminVehicle,
    deleteAdminVehicle,
    selectAdminVehicles,
    selectAdminVehiclesStatus,
    selectAdminVehiclesError,
    selectAdminVehiclesActionStatus,
    selectVehicleFilters,
    resetVehicleActionStatus,
    selectAdminVehiclesPagination,
} from "../../lib/store/slices/adminVehiclesSlice";
import { fetchAdminVendors, selectAdminVendors } from "../../lib/store/slices/adminVendorsSlice";
import Pagination from "../../components/ui/Pagination";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function Badge({ children, color = "blue" }: { children: React.ReactNode; color?: "blue" | "green" | "red" | "orange" | "purple" | "gray" }) {
    const colors = {
        blue: "bg-blue-100 text-blue-700",
        green: "bg-green-100 text-green-700",
        red: "bg-red-100 text-red-700",
        orange: "bg-orange-100 text-orange-800",
        purple: "bg-purple-100 text-purple-700",
        gray: "bg-slate-100 text-slate-700",
    };
    return (
        <span className={cx("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", colors[color])}>
            {children}
        </span>
    );
}

// Inline Vehicle Form
type VehicleFormData = CreateVehicleRequest;

const initialVehicleFormData: VehicleFormData = {
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    plate_number: "",
    category: VehicleCategory.SEDAN,
    ownership: OwnershipType.OWNED,
    fuel_avg_city: 0,
    fuel_avg_highway: 0,
    rent_per_day_city: 0,
    rent_per_day_outstation: 0,
    is_available_for_pooling: false,
    vendor_id: undefined,
    overnight_rate: 0,
    vendor_overtime_rate: 0,
    vendor_rent_5hr: 0,
    vendor_rent_10hr: 0,
    // Driver fields
    driver_full_name: "",
    driver_email: "",
    driver_phone: "",
    driver_password: "",
    driver_cnic_number: "",
    driver_license_number: "",
    driver_type: undefined,
};

// Password generation function
function generatePassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

function VehicleFormInline({
    vehicle,
    onSave,
    onCancel,
    isSaving
}: {
    vehicle: Vehicle | null;
    onSave: (data: VehicleFormData) => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const [formData, setFormData] = useState<VehicleFormData>(() => {
        if (!vehicle) {
            return initialVehicleFormData;
        }

        // Get the first driver linked to this vehicle (for partner vehicles)
        const driver = vehicle.drivers_profile?.[0];
        const driverUser = driver?.users;

        return {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color || "",
            plate_number: vehicle.plate_number,
            category: vehicle.category,
            ownership: vehicle.ownership,
            fuel_avg_city: vehicle.fuel_avg_city,
            fuel_avg_highway: vehicle.fuel_avg_highway,
            owner_company_id: vehicle.owner_company_id || undefined,
            rent_per_day_city: vehicle.rent_per_day_city || 0,
            rent_per_day_outstation: vehicle.rent_per_day_outstation || 0,
            overnight_rate: vehicle.overnight_rate || 0,
            vendor_overtime_rate: vehicle.vendor_overtime_rate || 0,
            vendor_rent_5hr: vehicle.vendor_rent_5hr || 0,
            vendor_rent_10hr: vehicle.vendor_rent_10hr || 0,
            is_available_for_pooling: vehicle.is_available_for_pooling,
            vendor_id: vehicle.vendor_id || vehicle.vendors?.id || undefined,
            // Populate driver fields if driver exists
            driver_full_name: driverUser?.full_name || "",
            driver_email: driverUser?.email || "",
            driver_phone: driverUser?.phone || "",
            driver_password: "", // Never pre-fill password for security
            driver_cnic_number: driver?.cnic_number || "",
            driver_license_number: driver?.license_number || "",
            driver_type: driver?.driver_type || undefined,
        };
    });

    const [showPassword, setShowPassword] = useState(false);

    const dispatch = useAppDispatch();
    const vendors = useAppSelector(selectAdminVendors);

    useEffect(() => {
        dispatch(fetchAdminVendors({ limit: 100 }));
    }, [dispatch]);

    const handleChange = (field: keyof VehicleFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleGeneratePassword = () => {
        const newPassword = generatePassword();
        handleChange("driver_password", newPassword);
    };

    const handleSave = () => {
        // Validation for partner vehicles
        if (formData.ownership === OwnershipType.PARTNER) {
            // For create mode: validate all driver fields including password
            // For edit mode: password is optional (only validate if provided)
            const isEditMode = vehicle !== null;

            if (!formData.driver_full_name || !formData.driver_email || !formData.driver_type) {
                alert("Please fill in all required driver fields (Full Name, Email, and Driver Type) for partner vehicles.");
                return;
            }

            // Password is required only when creating a new partner vehicle
            if (!isEditMode && !formData.driver_password) {
                alert("Please provide a password for the driver.");
                return;
            }

            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.driver_email)) {
                alert("Please enter a valid email address for the driver.");
                return;
            }

            // Password length validation (only if password is provided)
            if (formData.driver_password && formData.driver_password.length < 6) {
                alert("Driver password must be at least 6 characters long.");
                return;
            }
        }
        onSave(formData);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Make</label>
                    <input
                        type="text"
                        value={formData.make}
                        onChange={(e) => handleChange("make", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                        placeholder="Toyota"
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Model</label>
                    <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => handleChange("model", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                        placeholder="Corolla"
                        disabled={isSaving}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Year</label>
                    <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => handleChange("year", parseInt(e.target.value) || new Date().getFullYear())}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Color</label>
                    <input
                        type="text"
                        value={formData.color || ""}
                        onChange={(e) => handleChange("color", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                        placeholder="White"
                        disabled={isSaving}
                    />
                </div>
            </div>
            <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Plate Number</label>
                <input
                    type="text"
                    value={formData.plate_number}
                    onChange={(e) => handleChange("plate_number", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                    placeholder="ABC-123"
                    disabled={isSaving}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Fuel Avg (City)</label>
                    <input
                        type="number"
                        value={formData.fuel_avg_city}
                        onChange={(e) => handleChange("fuel_avg_city", parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                        disabled={isSaving}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Fuel Avg (Highway)</label>
                    <input
                        type="number"
                        value={formData.fuel_avg_highway}
                        onChange={(e) => handleChange("fuel_avg_highway", parseFloat(e.target.value) || 0)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                        disabled={isSaving}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Category</label>
                    <select
                        value={formData.category}
                        onChange={(e) => handleChange("category", e.target.value as VehicleCategory)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none bg-white"
                        disabled={isSaving}
                    >
                        {Object.values(VehicleCategory).map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Ownership</label>
                    <select
                        value={formData.ownership}
                        onChange={(e) => handleChange("ownership", e.target.value as OwnershipType)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none bg-white"
                        disabled={isSaving}
                    >
                        {Object.values(OwnershipType).map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            {
                formData.ownership === OwnershipType.PARTNER && (
                    <div className="space-y-4 border-t border-slate-100 pt-4 mt-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Vendor</label>
                            <select
                                value={formData.vendor_id || ""}
                                onChange={(e) => handleChange("vendor_id", parseInt(e.target.value) || undefined)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none bg-white"
                                disabled={isSaving}
                            >
                                <option value="">Select Vendor</option>
                                {vendors.map((vendor) => (
                                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Rent Per Day (City)</label>
                                <input
                                    type="number"
                                    value={formData.rent_per_day_city || 0}
                                    onChange={(e) => handleChange("rent_per_day_city", parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                                    disabled={isSaving}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Rent Per Day (Outstation)</label>
                                <input
                                    type="number"
                                    value={formData.rent_per_day_outstation || 0}
                                    onChange={(e) => handleChange("rent_per_day_outstation", parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                                    disabled={isSaving}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Overnight Rate (PKR)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.overnight_rate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, overnight_rate: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Vendor Overtime Rate (PKR/hr)</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={formData.vendor_overtime_rate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, vendor_overtime_rate: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Vendor 5h Rent (Fixed)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.vendor_rent_5hr}
                                onChange={(e) => setFormData(prev => ({ ...prev, vendor_rent_5hr: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Vendor 10h Rent (Fixed)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                value={formData.vendor_rent_10hr}
                                onChange={(e) => setFormData(prev => ({ ...prev, vendor_rent_10hr: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>
                )
            }

            {/* Driver Details Section - Only for PARTNER vehicles */}
            {
                formData.ownership === OwnershipType.PARTNER && (
                    <div className="space-y-4 border-t border-slate-100 pt-4 mt-4">
                        <h4 className="text-sm font-bold text-[#0c225e] uppercase tracking-wide">Driver Details</h4>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Driver Type <span className="text-red-500">*</span></label>
                            <select
                                value={formData.driver_type || ""}
                                onChange={(e) => handleChange("driver_type", e.target.value as any)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none bg-white"
                                disabled={isSaving}
                                required
                            >
                                <option value="">Select Driver Type</option>
                                <option value="CHAUFFEUR">CHAUFFEUR</option>
                                <option value="SHUTTLE">SHUTTLE</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Driver Full Name <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={formData.driver_full_name || ""}
                                onChange={(e) => handleChange("driver_full_name", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                                placeholder="John Driver"
                                disabled={isSaving}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Driver Email <span className="text-red-500">*</span></label>
                            <input
                                type="email"
                                value={formData.driver_email || ""}
                                onChange={(e) => handleChange("driver_email", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                                placeholder="driver@example.com"
                                disabled={isSaving}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Driver Phone</label>
                            <input
                                type="tel"
                                value={formData.driver_phone || ""}
                                onChange={(e) => handleChange("driver_phone", e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                                placeholder="+923001234567"
                                disabled={isSaving}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Driver Password <span className="text-red-500">*</span></label>
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={formData.driver_password || ""}
                                        onChange={(e) => handleChange("driver_password", e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm focus:border-[#f47f00] outline-none"
                                        placeholder="Min 6 characters"
                                        disabled={isSaving}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                        disabled={isSaving}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGeneratePassword}
                                    className="rounded-lg bg-slate-200 hover:bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors"
                                    disabled={isSaving}
                                >
                                    Generate
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Driver CNIC</label>
                                <input
                                    type="text"
                                    value={formData.driver_cnic_number || ""}
                                    onChange={(e) => handleChange("driver_cnic_number", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                                    placeholder="12345-6789012-3"
                                    disabled={isSaving}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Driver License Number</label>
                                <input
                                    type="text"
                                    value={formData.driver_license_number || ""}
                                    onChange={(e) => handleChange("driver_license_number", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#f47f00] outline-none"
                                    placeholder="ABC123456"
                                    disabled={isSaving}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-6">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                    disabled={isSaving}
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    className="rounded-lg bg-[#f47f00] px-4 py-2 text-sm font-bold text-white hover:bg-[#d97000] shadow-md shadow-orange-500/10 disabled:opacity-50"
                    disabled={isSaving}
                >
                    {isSaving ? "Saving..." : "Save Vehicle"}
                </button>
            </div>
        </div >
    );
}

function ModalContainer({
    isOpen,
    onClose,
    title,
    children,
}: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in duration-200 my-auto">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 sticky top-0 bg-white rounded-t-xl z-10">
                    <h3 className="text-lg font-bold text-[#0c225e]">{title}</h3>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}


export default function VehiclesPage() {
    const dispatch = useAppDispatch();
    const vehicles = useAppSelector(selectAdminVehicles);
    const status = useAppSelector(selectAdminVehiclesStatus);
    const error = useAppSelector(selectAdminVehiclesError);
    const actionStatus = useAppSelector(selectAdminVehiclesActionStatus);
    const savedFilters = useAppSelector(selectVehicleFilters);
    const pagination = useAppSelector(selectAdminVehiclesPagination);

    const [search, setSearch] = useState(savedFilters.search);
    const [debouncedSearch, setDebouncedSearch] = useState(savedFilters.search);

    // Filters - Initialize from Redux
    const [category, setCategory] = useState<string>(savedFilters.category);
    const [ownership, setOwnership] = useState<string>(savedFilters.ownership);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    // Primary Data Fetching Effect
    useEffect(() => {
        const filtersChanged =
            debouncedSearch !== savedFilters.search ||
            category !== savedFilters.category ||
            ownership !== savedFilters.ownership;

        const shouldFetch = status === 'idle' || filtersChanged;

        if (shouldFetch) {
            // If filters changed, reset to page 1
            if (filtersChanged && pagination.page !== 1) {
                handlePageChange(1);
            } else {
                // Otherwise fetch current page/filters
                const params: QueryVehicleParams = {
                    limit: 10,
                    page: pagination.page,
                    search: debouncedSearch || undefined,
                };
                if (category) (params as any).category = category;
                if (ownership) (params as any).ownership = ownership;

                dispatch(fetchAdminVehicles(params));
            }
        }
    }, [dispatch, debouncedSearch, category, ownership, status, pagination.page, savedFilters.search, savedFilters.category, savedFilters.ownership]);

    const handlePageChange = (page: number) => {
        const params: QueryVehicleParams = {
            limit: 10,
            page,
            search: debouncedSearch || undefined,
        };
        if (category) (params as any).category = category;
        if (ownership) (params as any).ownership = ownership;

        dispatch(fetchAdminVehicles(params));
    };

    const handleCreateNew = () => {
        setEditingVehicle(null);
        setIsModalOpen(true);
    };

    const handleEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Are you sure you want to delete this vehicle?")) {
            await dispatch(deleteAdminVehicle(id)).unwrap();
            handlePageChange(pagination.page);
        }
    };

    const handleSave = async (data: VehicleFormData) => {
        try {
            if (editingVehicle) {
                // If editing, sanitise data to exclude driver fields to avoid backend validation errors
                // as driver updates should be handled separately or ignored during vehicle edit.
                const {
                    driver_full_name,
                    driver_email,
                    driver_phone,
                    driver_password,
                    driver_cnic_number,
                    driver_license_number,
                    driver_type,
                    ...vehicleData
                } = data;

                await dispatch(updateAdminVehicle({ id: editingVehicle.id, data: vehicleData })).unwrap();
            } else {
                await dispatch(createAdminVehicle(data)).unwrap();
            }
            setIsModalOpen(false);
            setEditingVehicle(null);
            handlePageChange(pagination.page);
        } catch (err: any) {
            console.error("Failed to save vehicle:", err);
            alert(err.message || "Failed to save vehicle");
        }
    };

    const isLoading = status === 'loading';
    const isSaving = actionStatus === 'loading';

    return (
        <div className="flex flex-col gap-6 p-6 mx-auto">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0c225e]">Vehicles</h1>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-[#f47f00] px-5 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-[#d97000] hover:-translate-y-0.5"
                >
                    <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Vehicle
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search vehicles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#f47f00] focus:ring-1 focus:ring-[#f47f00] outline-none"
                        />
                    </div>
                </div>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#f47f00] outline-none bg-white"
                >
                    <option value="">All Categories</option>
                    {Object.values(VehicleCategory).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
                <select
                    value={ownership}
                    onChange={(e) => setOwnership(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#f47f00] outline-none bg-white"
                >
                    <option value="">All Ownership</option>
                    {Object.values(OwnershipType).map((type) => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#f8fafc] text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Vehicle</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Year</th>
                                <th className="px-6 py-4">Ownership</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && vehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">Loading vehicles...</td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-red-500">{error}</td>
                                </tr>
                            ) : vehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="font-medium">No vehicles found</span>
                                            <button onClick={handleCreateNew} className="text-sm text-[#f47f00] hover:underline">
                                                Add your first vehicle
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : vehicles.map((vehicle) => (
                                <tr key={vehicle.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-semibold text-[#0c225e]">{vehicle.make} {vehicle.model}</div>
                                        <div className="text-xs text-slate-500">{vehicle.plate_number} • {vehicle.color}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge color="gray">
                                            {vehicle.category}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {vehicle.year}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col items-start gap-1">
                                            <Badge color={vehicle.ownership === "OWNED" ? "blue" : "purple"}>
                                                {vehicle.ownership}
                                            </Badge>
                                            {vehicle.ownership === "PARTNER" && (
                                                <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500">
                                                    {vehicle.vendors && (
                                                        <div className="font-semibold text-slate-700">
                                                            {vehicle.vendors.name}
                                                        </div>
                                                    )}
                                                    <div className="flex flex-wrap gap-2">
                                                        <span title="City Rent" className="whitespace-nowrap">
                                                            City: <span className="font-medium text-slate-700">{vehicle.rent_per_day_city?.toLocaleString() ?? 0}</span>
                                                        </span>
                                                        <span title="Outstation Rent" className="whitespace-nowrap">
                                                            Out: <span className="font-medium text-slate-700">{vehicle.rent_per_day_outstation?.toLocaleString() ?? 0}</span>
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {vehicle.overnight_rate ? (
                                                            <span title="Overnight Rate" className="whitespace-nowrap">
                                                                Night: <span className="font-medium text-slate-700">{vehicle.overnight_rate?.toLocaleString()}</span>
                                                            </span>
                                                        ) : null}
                                                        {vehicle.vendor_overtime_rate ? (
                                                            <span title="Overtime Rate" className="whitespace-nowrap">
                                                                OT: <span className="font-medium text-slate-700">{vehicle.vendor_overtime_rate?.toLocaleString()}</span>
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {vehicle.vendor_rent_5hr ? (
                                                            <span title="5h Fixed Rent" className="whitespace-nowrap">
                                                                5h: <span className="font-medium text-slate-700">{vehicle.vendor_rent_5hr?.toLocaleString()}</span>
                                                            </span>
                                                        ) : null}
                                                        {vehicle.vendor_rent_10hr ? (
                                                            <span title="10h Fixed Rent" className="whitespace-nowrap">
                                                                10h: <span className="font-medium text-slate-700">{vehicle.vendor_rent_10hr?.toLocaleString()}</span>
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(vehicle)}
                                                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-[#0c225e] transition-colors"
                                                title="Edit Details"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(vehicle.id)}
                                                className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                title="Delete Vehicle"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            </div>

            <ModalContainer
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={!editingVehicle ? "Add New Vehicle" : "Edit Vehicle"}
            >
                <VehicleFormInline
                    vehicle={editingVehicle}
                    onSave={handleSave}
                    onCancel={() => setIsModalOpen(false)}
                    isSaving={isSaving}
                />
            </ModalContainer>

        </div>
    );
}
