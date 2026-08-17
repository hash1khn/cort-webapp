"use client";

import { useState, useEffect, memo } from "react";
import { ChauffeurBooking, TripType } from "../../../../lib/services/api-client";
import { uploadFile } from "../../../../lib/supabase";
import { ChauffeurFuelBillingSection, type ChauffeurFuelMode } from "./ChauffeurFuelBillingSection";

export const EndTripModal = memo(function EndTripModal({ isOpen, onClose, onSubmit, booking, loading }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; booking: ChauffeurBooking | null; loading?: boolean }) {
    const [distance, setDistance] = useState("0");
    const [toll, setToll] = useState("0");
    const [parking, setParking] = useState("0");
    const [vendorCost, setVendorCost] = useState("");
    const [discountType, setDiscountType] = useState<"NONE" | "PERCENTAGE" | "FLAT">("NONE");
    const [discountValue, setDiscountValue] = useState("");
    const [fuelMode, setFuelMode] = useState<ChauffeurFuelMode>("CONTRACT");
    const [selectedFuelPrice, setSelectedFuelPrice] = useState("");
    const [useManualStartTime, setUseManualStartTime] = useState(false);
    const [manualStartTime, setManualStartTime] = useState("");
    const [useManualEndTime, setUseManualEndTime] = useState(false);
    const [manualEndTime, setManualEndTime] = useState("");
    const [dailyLogs, setDailyLogs] = useState<any[]>([]);
    const [showDailyBreakdown, setShowDailyBreakdown] = useState(false);
    const [tollImage, setTollImage] = useState<File | null>(null);
    const [parkingImage, setParkingImage] = useState<File | null>(null);
    const [startMeterImage, setStartMeterImage] = useState<File | null>(null);
    const [endMeterImage, setEndMeterImage] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const isPartnerVehicle = booking?.vehicles?.ownership === 'PARTNER';

    useEffect(() => {
        if (isOpen && booking) {
            const startDate = (useManualStartTime && manualStartTime)
                ? new Date(manualStartTime)
                : booking.chauffeur_trip_logs?.start_time
                    ? new Date(booking.chauffeur_trip_logs.start_time)
                    : new Date(booking.scheduled_for);

            const endDate = (useManualEndTime && manualEndTime)
                ? new Date(manualEndTime)
                : new Date();

            const existingLogDates = new Set(
                (booking.chauffeur_trip_daily_logs || []).map(log => {
                    const d = new Date(log.log_date);
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                })
            );

            const days: any[] = [];
            let currentDate = new Date(startDate);
            const loopEnd = new Date(endDate);

            currentDate.setHours(0, 0, 0, 0);
            loopEnd.setHours(0, 0, 0, 0);

            while (currentDate <= loopEnd) {
                const year = currentDate.getFullYear();
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(currentDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                if (!existingLogDates.has(dateStr)) {
                    const isOutstation = booking.trip_type === TripType.OUT_STATION;
                    const defaultHours = booking.package_selected === 'HOURS_24' ? 0 : (booking.package_selected === 'HOURS_5' ? 5 : 10);

                    days.push({
                        id: dateStr,
                        date: new Date(currentDate),
                        trip_type: isOutstation ? TripType.OUT_STATION : TripType.IN_CITY,
                        is_full_day: booking.package_selected === 'HOURS_24',
                        apply_accommodation: false,
                        hours_used: defaultHours > 0 ? defaultHours.toString() : ''
                    });
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }
            setDailyLogs(days);
            setFuelMode("CONTRACT");
            setSelectedFuelPrice("");
        }
    }, [isOpen, booking, manualEndTime, useManualEndTime, manualStartTime, useManualStartTime]);

    if (!isOpen) return null;

    const updateLog = (index: number, field: string, value: any) => {
        const newLogs = [...dailyLogs];
        newLogs[index] = { ...newLogs[index], [field]: value };
        setDailyLogs(newLogs);
    };

    const handleSubmit = async () => {
        setIsUploading(true);
        let tollImageUrl = "";
        let parkingImageUrl = "";
        let startMeterImageUrl = "";
        let endMeterImageUrl = "";

        try {
            if (tollImage) {
                const path = `receipts/toll/${booking?.id}_${Date.now()}_${tollImage.name}`;
                tollImageUrl = await uploadFile("company-logos", path, tollImage);
            }
            if (parkingImage) {
                const path = `receipts/parking/${booking?.id}_${Date.now()}_${parkingImage.name}`;
                parkingImageUrl = await uploadFile("company-logos", path, parkingImage);
            }
            if (startMeterImage) {
                const path = `receipts/meter/${booking?.id}_start_${Date.now()}_${startMeterImage.name}`;
                startMeterImageUrl = await uploadFile("company-logos", path, startMeterImage);
            }
            if (endMeterImage) {
                const path = `receipts/meter/${booking?.id}_end_${Date.now()}_${endMeterImage.name}`;
                endMeterImageUrl = await uploadFile("company-logos", path, endMeterImage);
            }

            const data: any = {
                total_distance_km: parseFloat(distance),
                expense_toll: parseFloat(toll),
                expense_parking: parseFloat(parking),
                expense_toll_image_url: tollImageUrl || undefined,
                expense_parking_image_url: parkingImageUrl || undefined,
                meter_reading_start_image_url: startMeterImageUrl || undefined,
                meter_reading_end_image_url: endMeterImageUrl || undefined,
            };

            // Include manual vendor cost if entered (partner shuttle lump-sum)
            if (isPartnerVehicle && vendorCost !== "" && parseFloat(vendorCost) >= 0) {
                data.vendor_cost = parseFloat(vendorCost);
            }

            // Discount
            if (discountType !== "NONE" && discountValue !== "" && parseFloat(discountValue) > 0) {
                data.discount_type = discountType;
                data.discount_value = parseFloat(discountValue);
            }

            if (fuelMode === "SELECTED") {
                const petrol = parseFloat(selectedFuelPrice);
                if (!selectedFuelPrice || Number.isNaN(petrol) || petrol <= 0) {
                    alert("Please enter a petrol price to adjust fuel for this invoice.");
                    setIsUploading(false);
                    return;
                }
                data.fuelMode = "SELECTED";
                data.selectedFuelPrice = petrol;
            } else {
                data.fuelMode = "CONTRACT";
            }

            if (useManualEndTime && manualEndTime) {
                data.end_time = new Date(manualEndTime).toISOString();
            }
            if (useManualStartTime && manualStartTime) {
                data.start_time = new Date(manualStartTime).toISOString();
            }

            const existingLogs = (booking?.chauffeur_trip_daily_logs || []).map(log => {
                const d = new Date(log.log_date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return {
                    date: `${year}-${month}-${day}`,
                    trip_type: log.trip_type,
                    is_full_day: log.is_full_day,
                    apply_accommodation: log.apply_accommodation,
                    hours_used: log.hours_used ? parseFloat(log.hours_used.toString()) : 0
                };
            });

            const newLogs = dailyLogs.map(log => {
                const d = log.date;
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return {
                    date: `${year}-${month}-${day}`,
                    trip_type: log.trip_type,
                    is_full_day: log.is_full_day,
                    apply_accommodation: log.apply_accommodation || false,
                    hours_used: log.hours_used ? parseFloat(log.hours_used) : 0
                };
            });

            data.daily_logs = [...existingLogs, ...newLogs];

            onSubmit(data);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload images. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-navy mb-4">End Trip & Enter Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase text-muted">Total Distance (KM)</label>
                            <input type="number" className="mt-1 w-full rounded-md border border-border p-2 text-sm" value={distance} onChange={(e) => setDistance(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase text-muted">Toll Expenses</label>
                            <input type="number" className="mt-1 w-full rounded-md border border-border p-2 text-sm" value={toll} onChange={(e) => setToll(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-semibold uppercase text-muted">Parking Expenses</label>
                            <input type="number" className="mt-1 w-full rounded-md border border-border p-2 text-sm" value={parking} onChange={(e) => setParking(e.target.value)} />
                        </div>
                        {isPartnerVehicle && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                                <label className="text-xs font-semibold uppercase text-amber-700">Vendor Cost (Lumpsum)</label>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Enter total vendor cost"
                                    className="mt-1 w-full rounded-md border border-amber-300 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                                    value={vendorCost}
                                    onChange={(e) => setVendorCost(e.target.value)}
                                />
                                <p className="mt-1 text-[10px] text-amber-600">Manually enter the agreed vendor cost. This overrides auto-calculation.</p>
                            </div>
                        )}
                        <div className="rounded-md border border-border p-3 space-y-2">
                            <label className="text-xs font-semibold uppercase text-muted">Invoice Discount (Optional)</label>
                            <select
                                className="w-full rounded-md border border-border p-2 text-sm bg-white"
                                value={discountType}
                                onChange={(e) => { setDiscountType(e.target.value as any); setDiscountValue(""); }}
                            >
                                <option value="NONE">No Discount</option>
                                <option value="PERCENTAGE">Percentage (%)</option>
                                <option value="FLAT">Flat Amount (PKR)</option>
                            </select>
                            {discountType !== "NONE" && (
                                <input
                                    type="number"
                                    min="0"
                                    placeholder={discountType === "PERCENTAGE" ? "e.g. 10 (for 10%)" : "e.g. 5000"}
                                    className="w-full rounded-md border border-border p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f47f00]"
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                />
                            )}
                        </div>
                        <ChauffeurFuelBillingSection
                            companyId={booking?.company_id}
                            vehicleModel={booking?.vehicle_model}
                            distanceKm={distance}
                            fuelMode={fuelMode}
                            selectedFuelPrice={selectedFuelPrice}
                            onFuelModeChange={setFuelMode}
                            onSelectedFuelPriceChange={setSelectedFuelPrice}
                        />
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase text-muted">Toll Receipt (Optional)</label>
                            <input type="file" accept="image/*" className="mt-1 w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue/10 file:text-blue hover:file:bg-blue/20" onChange={(e) => setTollImage(e.target.files?.[0] || null)} />
                            {tollImage && <p className="text-[10px] text-green-600 mt-1">✓ {tollImage.name}</p>}
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase text-muted">Parking Receipt (Optional)</label>
                            <input type="file" accept="image/*" className="mt-1 w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue/10 file:text-blue hover:file:bg-blue/20" onChange={(e) => setParkingImage(e.target.files?.[0] || null)} />
                            {parkingImage && <p className="text-[10px] text-green-600 mt-1">✓ {parkingImage.name}</p>}
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase text-muted">Start Meter Image (Optional)</label>
                            <input type="file" accept="image/*" className="mt-1 w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue/10 file:text-blue hover:file:bg-blue/20" onChange={(e) => setStartMeterImage(e.target.files?.[0] || null)} />
                            {startMeterImage && <p className="text-[10px] text-green-600 mt-1">✓ {startMeterImage.name}</p>}
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase text-muted">End Meter Image (Optional)</label>
                            <input type="file" accept="image/*" className="mt-1 w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue/10 file:text-blue hover:file:bg-blue/20" onChange={(e) => setEndMeterImage(e.target.files?.[0] || null)} />
                            {endMeterImage && <p className="text-[10px] text-green-600 mt-1">✓ {endMeterImage.name}</p>}
                        </div>

                        <div className="border border-border rounded-md p-3">
                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input type="checkbox" checked={useManualStartTime} onChange={(e) => setUseManualStartTime(e.target.checked)} className="rounded border-border" />
                                <span className="text-xs font-semibold uppercase text-muted">Set Manual Start Time</span>
                            </label>
                            {useManualStartTime && (
                                <div className="mb-3">
                                    <input type="datetime-local" className="w-full rounded-md border border-border p-2 text-sm" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)} />
                                    <p className="mt-1 text-[10px] text-muted">Leave empty to use recorded trip start time</p>
                                </div>
                            )}

                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                <input type="checkbox" checked={useManualEndTime} onChange={(e) => setUseManualEndTime(e.target.checked)} className="rounded border-border" />
                                <span className="text-xs font-semibold uppercase text-muted">Set Manual End Time</span>
                            </label>
                            {useManualEndTime && (
                                <div>
                                    <input type="datetime-local" className="w-full rounded-md border border-border p-2 text-sm" value={manualEndTime} onChange={(e) => setManualEndTime(e.target.value)} />
                                    <p className="mt-1 text-[10px] text-muted">Leave empty to use current time</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Daily Breakdown Section */}
                <div className="mb-6">
                    <button type="button" onClick={() => setShowDailyBreakdown(!showDailyBreakdown)} className="flex items-center gap-2 text-xs font-semibold text-blue hover:text-blue/80 mb-2 transition-colors">
                        <span>{showDailyBreakdown ? "Hide" : "Show"} Daily Breakdown</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showDailyBreakdown ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
                    </button>

                    {showDailyBreakdown && (
                        <div className="border border-border rounded-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="bg-surface/50 px-3 py-2 border-b border-border">
                                <h4 className="text-sm font-semibold text-navy">Daily Breakdown</h4>
                            </div>
                            <table className="w-full text-sm">
                                <thead className="bg-surface text-xs font-semibold text-muted text-left">
                                    <tr>
                                        <th className="px-3 py-2">Date</th>
                                        <th className="px-3 py-2">Type</th>
                                        <th className="px-3 py-2 w-24">Hours</th>
                                        <th className="px-3 py-2 text-center w-20">Full Day</th>
                                        <th className="px-3 py-2 text-center w-20">Accom.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {dailyLogs.map((log, idx) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2 font-medium">
                                                {log.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                                            </td>
                                            <td className="px-3 py-2">
                                                <select className="w-full rounded border border-border p-1 text-xs" value={log.trip_type} onChange={(e) => updateLog(idx, 'trip_type', e.target.value)}>
                                                    <option value={TripType.IN_CITY}>In City</option>
                                                    <option value={TripType.OUT_STATION}>Outstation</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <input type="number" className="w-full rounded border border-border p-1 text-xs disabled:bg-surface/50" placeholder="Hrs" value={log.hours_used} disabled={log.is_full_day} onChange={(e) => updateLog(idx, 'hours_used', e.target.value)} />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input type="checkbox" checked={log.is_full_day} onChange={(e) => {
                                                    const val = e.target.checked;
                                                    const newLogs = [...dailyLogs];
                                                    newLogs[idx] = { ...newLogs[idx], is_full_day: val, hours_used: val ? "0" : newLogs[idx].hours_used };
                                                    setDailyLogs(newLogs);
                                                }} className="rounded border-border" disabled={booking?.package_selected !== 'HOURS_24' && booking?.package_selected !== 'HOURS_10'} />
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <input type="checkbox" checked={log.apply_accommodation} onChange={(e) => updateLog(idx, 'apply_accommodation', e.target.checked)} className="rounded border-border" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {dailyLogs.length === 0 && (
                                <div className="p-4 text-center text-xs text-muted">Calculating days...</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-border">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:bg-surface rounded">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || isUploading}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                    >
                        {(loading || isUploading) && (
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isUploading ? "Uploading..." : loading ? "Ending..." : "End Trip"}
                    </button>
                </div>
            </div>
        </div>
    );
});
