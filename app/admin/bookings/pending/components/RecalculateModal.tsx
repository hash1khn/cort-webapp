"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ChauffeurBooking, TripType } from "../../../../lib/services/api-client";
import { ChauffeurFuelBillingSection, type ChauffeurFuelMode } from "./ChauffeurFuelBillingSection";

interface DailyLogRow {
    id: string;
    date: string; // YYYY-MM-DD
    trip_type: TripType;
    is_full_day: boolean;
    hours_used: string;
    apply_accommodation: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: RecalculatePayload, mode: 'info' | 'recalculate') => void;
    booking: ChauffeurBooking | null;
    loading?: boolean;
}

export interface RecalculatePayload {
    package_selected?: string;
    booking_type?: string;
    no_of_days?: number;
    total_duration_minutes?: number;
    total_distance_km?: number;
    expense_toll?: number;
    expense_parking?: number;
    vendor_cost?: number;
    daily_logs?: Array<{
        date: string;
        trip_type: TripType;
        is_full_day: boolean;
        hours_used?: number;
        apply_accommodation?: boolean;
    }>;
    discount_type?: 'NONE' | 'PERCENTAGE' | 'FLAT';
    discount_value?: number;
    fuelMode?: ChauffeurFuelMode;
    selectedFuelPrice?: number;
}

const PACKAGES = [
    { value: "HOURS_5", label: "5 Hours" },
    { value: "HOURS_10", label: "10 Hours" },
    { value: "HOURS_24", label: "24 Hours (Full Day)" },
];

const BOOKING_TYPES = [
    { value: "SPOT", label: "Spot" },
    { value: "MONTHLY", label: "Monthly" },
];

export function RecalculateModal({ isOpen, onClose, onSubmit, booking, loading }: Props) {
    // Booking-level overrides
    const [packageSelected, setPackageSelected] = useState("");
    const [bookingType, setBookingType] = useState("");
    const [noOfDays, setNoOfDays] = useState("");

    // Trip-log overrides
    const [durationMinutes, setDurationMinutes] = useState("");
    const [distanceKm, setDistanceKm] = useState("");
    const [toll, setToll] = useState("");
    const [parking, setParking] = useState("");
    const [vendorCost, setVendorCost] = useState("");

    // Daily logs
    const [showDailyLogs, setShowDailyLogs] = useState(false);
    const [dailyLogs, setDailyLogs] = useState<DailyLogRow[]>([]);

    // Mode: edit info only vs edit + regenerate invoice
    const [mode, setMode] = useState<'info' | 'recalculate'>('recalculate');

    // Discount (only applied when mode = recalculate)
    const [discountType, setDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FLAT'>('NONE');
    const [discountValue, setDiscountValue] = useState('');
    const [fuelMode, setFuelMode] = useState<ChauffeurFuelMode>('CONTRACT');
    const [selectedFuelPrice, setSelectedFuelPrice] = useState('');

    // Pre-fill with existing booking values when modal opens
    useEffect(() => {
        if (isOpen && booking) {
            setPackageSelected(booking.package_selected ?? "");
            setBookingType(booking.booking_type ?? "");
            setNoOfDays(String(booking.no_of_days ?? 1));
            setDurationMinutes(String(booking.chauffeur_trip_logs?.total_duration_minutes ?? ""));
            setDistanceKm(String(booking.chauffeur_trip_logs?.total_distance_km ?? ""));
            setToll(String(booking.chauffeur_trip_logs?.expense_toll ?? "0"));
            setParking(String(booking.chauffeur_trip_logs?.expense_parking ?? "0"));
            setVendorCost(String(booking.chauffeur_trip_logs?.vendor_cost ?? ""));

            // Seed daily logs from existing data
            const existingLogs = (booking.chauffeur_trip_daily_logs ?? []).map((l) => ({
                id: l.log_date,
                date: l.log_date.slice(0, 10),
                trip_type: l.trip_type as TripType,
                is_full_day: l.is_full_day,
                hours_used: String(l.hours_used ?? ""),
                apply_accommodation: l.apply_accommodation,
            }));
            setDailyLogs(existingLogs);
            setShowDailyLogs(existingLogs.length > 0);
            setFuelMode('CONTRACT');
            setSelectedFuelPrice('');
        }
    }, [isOpen, booking]);

    if (!isOpen || !booking) return null;

    const updateLog = (idx: number, field: keyof DailyLogRow, value: any) => {
        setDailyLogs((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    };

    const addLogRow = () => {
        const lastDate = dailyLogs.length > 0 ? new Date(dailyLogs[dailyLogs.length - 1].date) : new Date();
        const nextDate = new Date(lastDate);
        if (dailyLogs.length > 0) nextDate.setDate(nextDate.getDate() + 1);
        const dateStr = nextDate.toISOString().slice(0, 10);
        setDailyLogs((prev) => [
            ...prev,
            {
                id: `${dateStr}-${Date.now()}`,
                date: dateStr,
                trip_type: TripType.IN_CITY,
                is_full_day: packageSelected === "HOURS_24",
                hours_used: "",
                apply_accommodation: false,
            },
        ]);
    };

    const removeLogRow = (idx: number) => {
        setDailyLogs((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = () => {
        const payload: RecalculatePayload = {};

        if (packageSelected && packageSelected !== booking.package_selected) payload.package_selected = packageSelected;
        if (bookingType && bookingType !== booking.booking_type) payload.booking_type = bookingType;
        const parsedDays = parseInt(noOfDays);
        if (!isNaN(parsedDays) && parsedDays !== (booking.no_of_days ?? 1)) payload.no_of_days = parsedDays;

        const parsedDuration = parseInt(durationMinutes);
        if (!isNaN(parsedDuration)) payload.total_duration_minutes = parsedDuration;

        const parsedDist = parseFloat(distanceKm);
        if (!isNaN(parsedDist)) payload.total_distance_km = parsedDist;

        const parsedToll = parseFloat(toll);
        if (!isNaN(parsedToll)) payload.expense_toll = parsedToll;

        const parsedParking = parseFloat(parking);
        if (!isNaN(parsedParking)) payload.expense_parking = parsedParking;

        const parsedVendorCost = parseFloat(vendorCost);
        if (booking.vehicles?.ownership === 'PARTNER' && !isNaN(parsedVendorCost) && parsedVendorCost >= 0) {
            payload.vendor_cost = parsedVendorCost;
        }

        if (showDailyLogs && dailyLogs.length > 0) {
            payload.daily_logs = dailyLogs.map((l) => ({
                date: l.date,
                trip_type: l.trip_type,
                is_full_day: l.is_full_day,
                hours_used: l.hours_used ? parseFloat(l.hours_used) : undefined,
                apply_accommodation: l.apply_accommodation,
            }));
        }

        if (mode === 'recalculate' && discountType !== 'NONE' && discountValue !== '' && parseFloat(discountValue) > 0) {
            payload.discount_type = discountType;
            payload.discount_value = parseFloat(discountValue);
        }

        if (mode === 'recalculate') {
            if (fuelMode === 'SELECTED') {
                const petrol = Number(selectedFuelPrice);
                if (!selectedFuelPrice || Number.isNaN(petrol) || petrol <= 0) {
                    toast.error("Please enter a petrol price to adjust fuel for this invoice.");
                    return;
                }
                payload.fuelMode = 'SELECTED';
                payload.selectedFuelPrice = petrol;
            } else {
                payload.fuelMode = 'CONTRACT';
            }
        }

        onSubmit(payload, mode);
    };

    const tl = booking.chauffeur_trip_logs;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div>
                        <h3 className="text-base font-semibold text-navy">Override & Recalculate</h3>
                        <p className="text-xs text-muted mt-0.5">
                            Booking #{booking.id} · {booking.companies?.name} · {booking.vehicle_model}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-muted hover:text-navy text-xl leading-none">×</button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {/* Current financials banner */}
                    {tl?.total_invoice_amount != null && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm">
                            <span className="font-semibold text-amber-800">Current Invoice: </span>
                            <span className="text-amber-700">
                                PKR {Number(tl.total_invoice_amount).toLocaleString()}
                            </span>
                            <span className="mx-2 text-amber-400">·</span>
                            <span className="text-amber-600 text-xs">
                                Base: PKR {Number(tl.base_package_cost ?? 0).toLocaleString()}
                                {Number(tl.overtime_charge ?? 0) > 0 && ` · OT: PKR ${Number(tl.overtime_charge).toLocaleString()}`}
                                {` · Fuel: PKR ${Number(tl.fuel_cost_calculated ?? 0).toLocaleString()}`}
                                {` · SST: PKR ${Number(tl.sst_amount ?? 0).toLocaleString()}`}
                            </span>
                        </div>
                    )}

                    {/* ── Section 1: Booking Parameters ── */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                            Booking Parameters
                        </h4>
                        <div className="grid grid-cols-3 gap-4">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-navy">Package</span>
                                <select
                                    value={packageSelected}
                                    onChange={(e) => setPackageSelected(e.target.value)}
                                    className="h-9 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                >
                                    {PACKAGES.map((p) => (
                                        <option key={p.value} value={p.value}>{p.label}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-navy">Booking Type</span>
                                <select
                                    value={bookingType}
                                    onChange={(e) => setBookingType(e.target.value)}
                                    className="h-9 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                >
                                    {BOOKING_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-navy">No. of Days</span>
                                <input
                                    type="number"
                                    min={1}
                                    value={noOfDays}
                                    onChange={(e) => setNoOfDays(e.target.value)}
                                    className="h-9 rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                />
                            </label>
                        </div>
                    </div>

                    {/* ── Section 2: Trip Log Data ── */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                            Trip Data Overrides
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-navy">Duration (minutes)</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={durationMinutes}
                                    onChange={(e) => setDurationMinutes(e.target.value)}
                                    placeholder={`Current: ${tl?.total_duration_minutes ?? "—"}`}
                                    className="h-9 rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-navy">Distance (km)</span>
                                <input
                                    type="number"
                                    min={0}
                                    step={0.1}
                                    value={distanceKm}
                                    onChange={(e) => setDistanceKm(e.target.value)}
                                    placeholder={`Current: ${tl?.total_distance_km ?? "—"}`}
                                    className="h-9 rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-navy">Toll (PKR)</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={toll}
                                    onChange={(e) => setToll(e.target.value)}
                                    className="h-9 rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs font-medium text-navy">Parking (PKR)</span>
                                <input
                                    type="number"
                                    min={0}
                                    value={parking}
                                    onChange={(e) => setParking(e.target.value)}
                                    className="h-9 rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                />
                            </label>
                            {booking.vehicles?.ownership === 'PARTNER' && (
                                <label className="flex flex-col gap-1 col-span-2">
                                    <span className="text-xs font-medium text-navy">Vendor Cost (Lumpsum)</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={vendorCost}
                                        onChange={(e) => setVendorCost(e.target.value)}
                                        placeholder="Set or correct manual vendor cost"
                                        className="h-9 rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* ── Section 3: Daily Logs ── */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">
                                Daily Log Breakdown
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowDailyLogs((v) => !v)}
                                className="text-xs text-blue hover:underline"
                            >
                                {showDailyLogs ? "Hide" : "Edit Daily Logs"}
                            </button>
                        </div>

                        {showDailyLogs && (
                            <div className="space-y-2">
                                <div className="border border-border rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-surface text-muted text-left">
                                            <tr>
                                                <th className="px-3 py-2">Date</th>
                                                <th className="px-3 py-2">Type</th>
                                                <th className="px-3 py-2 w-20">Hours</th>
                                                <th className="px-3 py-2 text-center w-18">Full Day</th>
                                                <th className="px-3 py-2 text-center w-18">Accom.</th>
                                                <th className="px-3 py-2 w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {dailyLogs.map((log, idx) => (
                                                <tr key={log.id}>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            type="date"
                                                            value={log.date}
                                                            onChange={(e) => updateLog(idx, "date", e.target.value)}
                                                            className="w-full rounded border border-border p-1 text-xs"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <select
                                                            value={log.trip_type}
                                                            onChange={(e) => updateLog(idx, "trip_type", e.target.value)}
                                                            className="w-full rounded border border-border p-1 text-xs"
                                                        >
                                                            <option value={TripType.IN_CITY}>In City</option>
                                                            <option value={TripType.OUT_STATION}>Out Station</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={0.5}
                                                            value={log.hours_used}
                                                            onChange={(e) => updateLog(idx, "hours_used", e.target.value)}
                                                            disabled={log.is_full_day}
                                                            className="w-full rounded border border-border p-1 text-xs disabled:opacity-40"
                                                            placeholder="hrs"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={log.is_full_day}
                                                            onChange={(e) => updateLog(idx, "is_full_day", e.target.checked)}
                                                            className="rounded border-border"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={log.apply_accommodation}
                                                            onChange={(e) => updateLog(idx, "apply_accommodation", e.target.checked)}
                                                            className="rounded border-border"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeLogRow(idx)}
                                                            className="text-danger hover:text-red-700 text-base leading-none"
                                                            title="Remove row"
                                                        >
                                                            ×
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button
                                    type="button"
                                    onClick={addLogRow}
                                    className="text-xs text-blue hover:underline mt-1"
                                >
                                    + Add Day
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Section 4: Mode Toggle ── */}
                    <div>
                        <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                            What should happen after saving?
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setMode('info')}
                                className={`flex flex-col gap-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                                    mode === 'info'
                                        ? 'border-blue bg-blue/5'
                                        : 'border-border hover:border-blue/30'
                                }`}
                            >
                                <span className="text-sm font-semibold text-navy">Save Info Only</span>
                                <span className="text-xs text-muted">
                                    Updates booking data &amp; trip logs. Invoice stays unchanged.
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('recalculate')}
                                className={`flex flex-col gap-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                                    mode === 'recalculate'
                                        ? 'border-orange bg-orange/5'
                                        : 'border-border hover:border-orange/30'
                                }`}
                            >
                                <span className="text-sm font-semibold text-navy">Save &amp; Regenerate Invoice</span>
                                <span className="text-xs text-muted">
                                    Recalculates all financials and replaces the invoice with new values.
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Warning — only shown in recalculate mode */}
                    {mode === 'recalculate' && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
                        ⚠️ This will <strong>delete the existing invoice</strong> and regenerate it with the new values. This action cannot be undone.
                    </div>
                    )}

                    {mode === 'recalculate' && (
                        <ChauffeurFuelBillingSection
                            companyId={booking.company_id}
                            vehicleModel={booking.vehicle_model}
                            distanceKm={distanceKm}
                            fuelMode={fuelMode}
                            selectedFuelPrice={selectedFuelPrice}
                            onFuelModeChange={setFuelMode}
                            onSelectedFuelPriceChange={setSelectedFuelPrice}
                        />
                    )}

                    {/* ── Section 5: Discount — only in recalculate mode ── */}
                    {mode === 'recalculate' && (
                        <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                                Invoice Discount (Optional)
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-navy">Discount Type</span>
                                    <select
                                        value={discountType}
                                        onChange={(e) => { setDiscountType(e.target.value as any); setDiscountValue(''); }}
                                        className="h-9 rounded-md border border-border px-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange bg-white"
                                    >
                                        <option value="NONE">No Discount</option>
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FLAT">Flat Amount (PKR)</option>
                                    </select>
                                </label>
                                {discountType !== 'NONE' && (
                                    <label className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-navy">
                                            {discountType === 'PERCENTAGE' ? 'Discount %' : 'Discount Amount (PKR)'}
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={discountValue}
                                            onChange={(e) => setDiscountValue(e.target.value)}
                                            placeholder={discountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 5000'}
                                            className="h-9 rounded-md border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange"
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm text-muted hover:bg-surface rounded-md disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-orange rounded-md hover:opacity-90 disabled:opacity-50"
                    >
                        {loading && (
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        )}
                        {loading ? "Saving..." : mode === 'recalculate' ? "Save & Regenerate Invoice" : "Save Info Only"}
                    </button>
                </div>
            </div>
        </div>
    );
}
