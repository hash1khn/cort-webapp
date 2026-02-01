"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useCompanyStore } from "../../store/CompanyStore";
import Map from "../../../admin/ui/Map";
import { useGeocodeMapsAutocomplete } from "../../../hooks/useGeocodeMapsAutocomplete";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function Field({
    label,
    children,
    required,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {label}
                {required && <span className="text-rose-500"> *</span>}
            </span>
            {children}
        </label>
    );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className={cx(
                "h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-700",
                props.className,
            )}
        />
    );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className={cx(
                "h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 text-slate-700",
                props.className,
            )}
        />
    );
}

// ... existing interface ...
interface CreateBookingFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function CreateBookingForm({ onSuccess, onCancel }: CreateBookingFormProps) {
    // ... existing state and logic ...
    const { company, employees, allowedVehicleModels, createBooking } = useCompanyStore();

    const [serviceCategory, setServiceCategory] = useState<string>("Chauffeur Ride");
    const [passengerId, setPassengerId] = useState<string>("");
    const [vehicleModel, setVehicleModel] = useState<string>("");
    const [customVehicleModel, setCustomVehicleModel] = useState<string>("");
    const [packageType, setPackageType] = useState<"5hr" | "10hr" | "24hr" | "monthly_10hr" | "monthly_24hr">("10hr");
    const [tripType, setTripType] = useState<"in_city" | "out_station">("in_city");
    const [timeType, setTimeType] = useState<"now" | "scheduled">("now");
    const [scheduledDateTime, setScheduledDateTime] = useState<string>("");
    const [pickupAddress, setPickupAddress] = useState<string>("");
    const [pickupLat, setPickupLat] = useState<number | undefined>();
    const [pickupLng, setPickupLng] = useState<number | undefined>();
    const [destinationCities, setDestinationCities] = useState<string[]>([]);
    const [cityInput, setCityInput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize geocode.maps.co autocomplete
    const geocodeMapsKey = process.env.NEXT_PUBLIC_GEOCODE_MAPS_API_KEY || "";
    const { suggestions, isLoading: isLoadingSuggestions, search, clearSuggestions, error: searchError } = useGeocodeMapsAutocomplete({
        apiKey: geocodeMapsKey,
    });

    const activeEmployees = useMemo(() => {
        return employees.filter((e) => e.status === "ACTIVE");
    }, [employees]);

    const canSubmit = useMemo(() => {
        const basicFields =
            passengerId.length > 0 &&
            passengerId.length > 0 &&
            (vehicleModel === "Other" ? customVehicleModel.length > 0 : vehicleModel.length > 0) &&
            (timeType === "now" || scheduledDateTime.length > 0) &&
            pickupAddress.length > 0 &&
            pickupLat !== undefined &&
            pickupLng !== undefined;

        if (tripType === "out_station") {
            return basicFields && destinationCities.length > 0;
        }

        return basicFields;
    }, [passengerId, vehicleModel, customVehicleModel, timeType, scheduledDateTime, pickupAddress, pickupLat, pickupLng, tripType, destinationCities]);

    const handleAddCity = () => {
        if (cityInput.trim()) {
            setDestinationCities([...destinationCities, cityInput.trim()]);
            setCityInput("");
        }
    };

    const handleRemoveCity = (index: number) => {
        setDestinationCities(destinationCities.filter((_, i) => i !== index));
    };

    const handleCityKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddCity();
        }
    };

    if (!company) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-sm text-slate-500">No company selected</div>
            </div>
        );
    }

    if (!company.services_enabled.chauffeur_enabled) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <div className="text-lg font-bold text-slate-800">Chauffeur Service Disabled</div>
                    <div className="mt-2 text-sm text-slate-500">
                        Chauffeur service is not enabled for your company. Please contact Cort Super Admin.
                    </div>
                </div>
            </div>
        );
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        if (!company) {
            setError("Company not found");
            setIsSubmitting(false);
            return;
        }

        if (!canSubmit) {
            if (!pickupLat || !pickupLng) {
                setError("Please select a location on the map to set coordinates");
            } else {
                setError("Please fill in all required fields");
            }
            setIsSubmitting(false);
            return;
        }

        const passenger = employees.find((e) => e.id === passengerId);
        if (!passenger) {
            setError("Selected passenger not found");
            setIsSubmitting(false);
            return;
        }

        // Determine scheduled_at
        const scheduledAt =
            timeType === "now"
                ? new Date().toISOString()
                : new Date(scheduledDateTime).toISOString();

        try {
            await createBooking({
                company_id: company.id,
                passenger_id: passengerId, // The selected employee's UUID
                vehicle_model: vehicleModel === "Other" ? customVehicleModel : vehicleModel,
                package: packageType,
                trip_type: tripType,
                scheduled_at: scheduledAt,
                status: "pending",
                pickup_address: pickupAddress,
                pickup_lat: pickupLat, // Ensure these are separate fields as per recent fix
                pickup_lng: pickupLng, // Ensure these are separate fields
                destination_cities: tripType === "out_station" ? destinationCities : [],
                service_category: serviceCategory,
            });

            // Reset form handled by parent unmounting or manual reset if needed, but we close modal on success
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create booking");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Get min datetime for scheduled bookings (now)
    const minDateTime = new Date().toISOString().slice(0, 16);

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <Field label="Service Type" required>
                    <Select
                        value={serviceCategory}
                        onChange={(e) => setServiceCategory(e.target.value)}
                        required
                    >
                        <option value="Chauffeur Ride">Chauffeur Ride</option>
                        <option value="Airport Transfer">Airport Transfer</option>
                    </Select>
                </Field>

                <Field label="Passenger" required>
                    <Select
                        value={passengerId}
                        onChange={(e) => setPassengerId(e.target.value)}
                        required
                        autoFocus
                    >
                        <option value="">Select employee</option>
                        {activeEmployees.map((e) => (
                            <option key={e.id} value={e.id}>
                                {e.full_name} {e.employee_id ? `(${e.employee_id})` : ''} {e.department ? `- ${e.department}` : ''}
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label="Car Type" required>
                    <Select
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        required
                        disabled={allowedVehicleModels.length === 0}
                    >
                        <option value="">
                            {allowedVehicleModels.length === 0
                                ? "No vehicles whitelisted"
                                : "Select vehicle"}
                        </option>
                        {allowedVehicleModels.map((model) => (
                            <option key={model} value={model}>
                                {model}
                            </option>
                        ))}
                        <option value="Other">Other (Special Request)</option>
                    </Select>
                    {allowedVehicleModels.length === 0 && (
                        <div className="mt-1 text-xs text-rose-500 font-medium">
                            No vehicles whitelisted. Contact Super Admin.
                        </div>
                    )}
                </Field>

                {vehicleModel === "Other" && (
                    <Field label="Specify Vehicle Model" required>
                        <TextInput
                            value={customVehicleModel}
                            onChange={(e) => setCustomVehicleModel(e.target.value)}
                            placeholder="Enter vehicle model (e.g. Honda Civic)"
                            required
                        />
                    </Field>
                )}

                <Field label="Usage Package" required>
                    <Select
                        value={packageType}
                        onChange={(e) =>
                            setPackageType(
                                e.target.value as "5hr" | "10hr" | "24hr" | "monthly_10hr" | "monthly_24hr",
                            )
                        }
                        required
                    >
                        <optgroup label="Spot">
                            <option value="5hr">5 Hours</option>
                            <option value="10hr">10 Hours</option>
                            <option value="24hr">24 Hours</option>
                        </optgroup>
                        <optgroup label="Monthly">
                            <option value="monthly_10hr">Monthly (10 Hours Daily)</option>
                            <option value="monthly_24hr">Monthly (24 Hours Daily)</option>
                        </optgroup>
                    </Select>
                </Field>

                <Field label="Trip Type" required>
                    <Select
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value as "in_city" | "out_station")}
                        required
                    >
                        <option value="in_city">In-City</option>
                        <option value="out_station">Out-Station</option>
                    </Select>
                </Field>

                {tripType === "out_station" && (
                    <div className="sm:col-span-2">
                        <Field label="Destination Cities" required>
                            <div className="flex gap-2">
                                <TextInput
                                    value={cityInput}
                                    onChange={(e) => setCityInput(e.target.value)}
                                    onKeyDown={handleCityKeyDown}
                                    placeholder="Enter city name (e.g. Lahore)"
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddCity}
                                    disabled={!cityInput.trim()}
                                    className="rounded-xl bg-indigo-50 px-5 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            {destinationCities.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {destinationCities.map((city, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700 border border-slate-200"
                                        >
                                            <span>{city}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCity(index)}
                                                className=" rounded-full p-0.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {destinationCities.length === 0 && (
                                <div className="mt-1 text-xs text-rose-500 font-medium">At least one destination city is required</div>
                            )}
                        </Field>
                    </div>
                )}

                <Field label="Time" required>
                    <Select
                        value={timeType}
                        onChange={(e) => setTimeType(e.target.value as "now" | "scheduled")}
                        required
                    >
                        <option value="now">Now (Immediate Dispatch)</option>
                        <option value="scheduled">Scheduled</option>
                    </Select>
                </Field>

                {timeType === "scheduled" && (
                    <Field label="Scheduled Date & Time" required>
                        <TextInput
                            type="datetime-local"
                            value={scheduledDateTime}
                            onChange={(e) => setScheduledDateTime(e.target.value)}
                            min={minDateTime}
                            required={timeType === "scheduled"}
                        />
                    </Field>
                )}

                <div className="sm:col-span-2">
                    <Field label="Pickup Address" required>
                        <TextInput
                            value={pickupAddress}
                            onChange={(e) => setPickupAddress(e.target.value)}
                            placeholder="Enter full pickup address manually"
                            required
                        />
                        {/* Helper text */}
                        <div className="mt-1.5 text-xs text-slate-400 font-medium">
                            Enter the specific address details (House #, Street, famous landmark).
                        </div>
                    </Field>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                <div className="mb-4">
                    <div className="text-xs font-bold tracking-wider text-slate-500 uppercase">Interactive Map</div>
                    <div className="mt-1 text-sm text-slate-500">
                        Search or tap on the map to pin the exact pickup location.
                    </div>
                </div>

                {/* Map Search Bar */}
                <div className="relative mb-3 z-[1000] max-w-sm">
                    <TextInput
                        onChange={(e) => search(e.target.value)}
                        placeholder="Search location..."
                        className="w-full pr-10 bg-white"
                    />
                    {isLoadingSuggestions && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
                        </div>
                    )}

                    {/* Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-full rounded-xl border border-slate-100 bg-white shadow-xl max-h-60 overflow-auto z-[2000]">
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion.place_id}
                                    type="button"
                                    onClick={() => {
                                        setPickupLat(parseFloat(suggestion.lat));
                                        setPickupLng(parseFloat(suggestion.lon));
                                        clearSuggestions();
                                    }}
                                    className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 border-b border-slate-50 last:border-b-0 transition-colors"
                                >
                                    <div className="font-bold text-slate-800">{suggestion.name || suggestion.type || 'Location'}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 truncate">{suggestion.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                    <Map
                        height="300px"
                        center={pickupLat && pickupLng ? [pickupLat, pickupLng] : undefined}
                        markers={
                            pickupLat && pickupLng
                                ? [
                                    {
                                        id: "pickup",
                                        position: [pickupLat, pickupLng] as [number, number],
                                        label: "Pickup Location",
                                        color: "#22c55e",
                                    },
                                ]
                                : []
                        }
                        onMapClick={(lat, lng) => {
                            setPickupLat(lat);
                            setPickupLng(lng);
                        }}
                    />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-medium text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span>Exact location required for driver</span>
                    </div>
                    {pickupLat && pickupLng && (
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                            {pickupLat.toFixed(5)}, {pickupLng.toFixed(5)}
                        </span>
                    )}
                </div>
            </div>

            {searchError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 font-medium">
                    Search Error: {searchError}
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {error}
                </div>
            )}

            <div className="flex items-center gap-3 justify-end pt-5 border-t border-slate-100">
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="inline-flex h-11 min-w-[140px] items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-bold text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none transition-all"
                >
                    {isSubmitting ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                        "Create Booking"
                    )}
                </button>
            </div>
        </form>
    );
}
