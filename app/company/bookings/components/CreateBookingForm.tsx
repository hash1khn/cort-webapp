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
        <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold tracking-wider text-muted">
                {label}
                {required && <span className="text-danger"> *</span>}
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
                "h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40",
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
                "h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-blue/40",
                props.className,
            )}
        />
    );
}

interface CreateBookingFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function CreateBookingForm({ onSuccess, onCancel }: CreateBookingFormProps) {
    const { company, employees, allowedVehicleModels, createBooking } = useCompanyStore();

    const [passengerId, setPassengerId] = useState<string>("");
    const [vehicleModel, setVehicleModel] = useState<string>("");
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
            vehicleModel.length > 0 &&
            (timeType === "now" || scheduledDateTime.length > 0) &&
            pickupAddress.length > 0 &&
            pickupLat !== undefined &&
            pickupLng !== undefined;

        if (tripType === "out_station") {
            return basicFields && destinationCities.length > 0;
        }

        return basicFields;
    }, [passengerId, vehicleModel, timeType, scheduledDateTime, pickupAddress, pickupLat, pickupLng, tripType, destinationCities]);

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
                <div className="text-sm text-muted">No company selected</div>
            </div>
        );
    }

    if (!company.services_enabled.chauffeur_enabled) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="rounded-xl border border-border bg-white p-6 text-center">
                    <div className="text-lg font-semibold text-navy">Chauffeur Service Disabled</div>
                    <div className="mt-2 text-sm text-muted">
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
                vehicle_model: vehicleModel,
                package: packageType,
                trip_type: tripType,
                scheduled_at: scheduledAt,
                status: "pending",
                pickup_address: pickupAddress,
                pickup_lat: pickupLat,
                pickup_lng: pickupLng,
                destination_cities: tripType === "out_station" ? destinationCities : [],
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                    </Select>
                    {allowedVehicleModels.length === 0 && (
                        <div className="mt-1 text-xs text-danger">
                            No vehicles whitelisted. Contact Super Admin to enable vehicles.
                        </div>
                    )}
                </Field>

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
                                    className="rounded-md bg-blue/10 px-4 py-2 text-sm font-semibold text-blue hover:bg-blue/20 disabled:opacity-50"
                                >
                                    Add
                                </button>
                            </div>
                            {destinationCities.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {destinationCities.map((city, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-sm font-medium text-navy border border-border"
                                        >
                                            <span>{city}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCity(index)}
                                                className="ml-1 text-muted hover:text-danger"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {destinationCities.length === 0 && (
                                <div className="mt-1 text-xs text-danger">At least one destination city is required</div>
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
                        <div className="mt-1 text-xs text-muted">
                            Enter the specific address for the driver (e.g., "House 123, Street 4, Phase 5...").
                        </div>
                    </Field>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
                <div className="mb-4">
                    <div className="text-xs font-semibold tracking-wider text-muted">PICKUP LOCATION MAP</div>
                    <div className="mt-1 text-sm text-muted">
                        Search and select the location on the map.
                    </div>
                </div>

                {/* Map Search Bar */}
                <div className="relative mb-3 z-[1000] max-w-sm">
                    <TextInput
                        onChange={(e) => search(e.target.value)}
                        placeholder="Search location on map..."
                        className="w-full pr-10"
                    />
                    {isLoadingSuggestions && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue border-t-transparent"></div>
                        </div>
                    )}

                    {/* Suggestions Dropdown */}
                    {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full rounded-md border border-border bg-white shadow-lg max-h-60 overflow-auto">
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion.place_id}
                                    type="button"
                                    onClick={() => {
                                        setPickupLat(parseFloat(suggestion.lat));
                                        setPickupLng(parseFloat(suggestion.lon));
                                        setPickupAddress(suggestion.display_name); // Auto-fill address from map selection
                                        clearSuggestions();
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-blue/5 focus:bg-blue/5 focus:outline-none border-b border-border last:border-b-0"
                                >
                                    <div className="font-medium text-navy">{suggestion.name || suggestion.type || 'Location'}</div>
                                    <div className="text-xs text-muted mt-0.5">{suggestion.display_name}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

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
                        // No reverse geocoding
                    }}
                />
                <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green"></div>
                        <span>Pickup Location Pin</span>
                    </div>
                    {pickupLat && pickupLng && (
                        <span>
                            Coordinates: {pickupLat.toFixed(6)}, {pickupLng.toFixed(6)}
                        </span>
                    )}
                </div>
            </div>

            {searchError && (
                <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger mt-2">
                    Search Error: {searchError}
                </div>
            )}

            {error && (
                <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                    {error}
                </div>
            )}

            <div className="flex items-center gap-3 justify-end pt-4 border-t border-border mt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink hover:bg-surface"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="inline-flex h-10 min-w-[120px] items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {isSubmitting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                        "Create Booking"
                    )}
                </button>
            </div>
        </form>
    );
}
