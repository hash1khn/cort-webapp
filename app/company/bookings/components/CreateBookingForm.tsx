"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import { fetchEmployees, selectEmployees } from "../../../lib/store/slices/employeeSlice";
import { fetchContract, selectAllowedVehicleModels } from "../../../lib/store/slices/contractSlice";
import Map from "../../../admin/ui/Map";
import { useGooglePlacesAutocomplete } from "../../../hooks/useGooglePlacesAutocomplete";
import { AutocompleteInput } from "../../../components/AutocompleteInput";
import { pakistaniCars } from "../../../lib/data/pakistaniCars";
import { pakistaniCities } from "../../../lib/data/pakistaniCities";
import { apiClient } from "../../../lib/services/api-client";
import { selectContract } from "../../../lib/store/slices/contractSlice";
import OutstationEstimatePanel from "./OutstationEstimatePanel";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function CardSection({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
    return (
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-default)] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-500">
            <div className="flex items-center gap-2.5 mb-6 px-1">
                {icon && <div className="text-[#fe8503]">{icon}</div>}
                <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">{title}</h3>
            </div>
            <div className="grid gap-x-6 gap-y-6 sm:grid-cols-2">
                {children}
            </div>
        </div>
    );
}

function Field({
    label,
    children,
    required,
    className,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
    className?: string;
}) {
    return (
        <label className={cx("flex flex-col gap-2", className)}>
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] px-1">
                {label}
                {required && <span className="text-[#fe8503] ml-0.5"> *</span>}
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
                "h-12 rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 text-sm font-medium outline-none transition-all placeholder:text-[var(--text-placeholder)] focus:bg-[var(--bg-input-focus)] focus:border-[#fe8503] focus:ring-4 focus:ring-[#fe8503]/10 text-[var(--text-primary)]",
                props.className,
            )}
        />
    );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="relative group">
            <select
                {...props}
                className={cx(
                    "w-full h-12 rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-4 text-sm font-bold outline-none transition-all focus:bg-[var(--bg-input-focus)] focus:border-[#fe8503] focus:ring-4 focus:ring-[#fe8503]/10 text-[var(--text-primary)] appearance-none",
                    props.className,
                )}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] group-focus-within:text-[var(--cort-orange)] transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        </div>
    );
}

// ... existing interface ...
interface CreateBookingFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function CreateBookingForm({ onSuccess, onCancel }: CreateBookingFormProps) {
    const dispatch = useAppDispatch();
    const company = useAppSelector(selectCompany);
    const employees = useAppSelector(selectEmployees);
    const allowedVehicleModels = useAppSelector(selectAllowedVehicleModels);
    const contract = useAppSelector(selectContract);

    // Legacy store for createBooking action (to be refactored or kept if just an action)


    useEffect(() => {
        if (company?.id) {
            dispatch(fetchEmployees(company.id.toString()));
            dispatch(fetchContract());
        }
    }, [dispatch, company?.id]);

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
    const [bookingCity, setBookingCity] = useState(""); // City for the booking itself
    const [noOfDays, setNoOfDays] = useState<number>(1);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const EVENT_SHUTTLE_SEATER_OPTIONS = [
        "7 Seater",
        "14 Seater AC",
        "14 Seater Non-AC",
        "24 Seater",
        "32 Seater Non-AC",
        "48 Seater",
        "62 Seater AC",
        "62 Seater Non-AC",
    ];

    const isEventShuttle = serviceCategory === "Event Shuttle";

    // Initialize Google Places autocomplete
    const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    const { suggestions, isLoading: isLoadingSuggestions, search, clearSuggestions, refreshToken } = useGooglePlacesAutocomplete({
        apiKey: googleMapsKey,
    });

    const activeEmployees = useMemo(() => {
        return employees.filter((e) => e.status === "ACTIVE");
    }, [employees]);

    // Derive the contract rate for the selected vehicle model (used for outstation cost estimate)
    const selectedContractRate = useMemo(() => {
        if (!contract?.chauffeur_contract_rates || !vehicleModel || vehicleModel === "Other") return null;
        return contract.chauffeur_contract_rates.find(
            (r: any) => r.vehicle_model === vehicleModel
        ) ?? null;
    }, [contract, vehicleModel]);

    const outstationAllowancePerDay = useMemo(() => {
        return Number(contract?.allowance_outstation ?? 0);
    }, [contract]);

    const accommodationAllowancePerNight = useMemo(() => {
        return Number(contract?.allowance_accommodation ?? 0);
    }, [contract]);

    const canSubmit = useMemo(() => {
        const vehicleModelValid = isEventShuttle
            ? vehicleModel.length > 0
            : (vehicleModel === "Other" ? customVehicleModel.length > 0 : vehicleModel.length > 0);

        // For Event Shuttle, passenger is optional (group booking — falls back to auth user)
        const passengerValid = isEventShuttle ? true : passengerId.length > 0;

        const basicFields =
            passengerValid &&
            vehicleModelValid &&
            (timeType === "now" || scheduledDateTime.length > 0) &&
            pickupAddress.length > 0 &&
            bookingCity.length > 0 &&
            pickupLat !== undefined &&
            pickupLng !== undefined &&
            noOfDays >= 1;

        if (tripType === "out_station") {
            return basicFields && destinationCities.length > 0;
        }

        return basicFields;
    }, [passengerId, vehicleModel, customVehicleModel, isEventShuttle, timeType, scheduledDateTime, pickupAddress, pickupLat, pickupLng, tripType, destinationCities, bookingCity, noOfDays]);

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
                <div className="text-sm text-[var(--text-muted)]">No company selected</div>
            </div>
        );
    }

    if (!company.services_enabled.chauffeur_enabled) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] p-6 text-center">
                    <div className="text-lg font-bold text-[var(--text-primary)]">Chauffeur Service Disabled</div>
                    <div className="mt-2 text-sm text-[var(--text-muted)]">
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
        if (!passenger && !isEventShuttle) {
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
            const apiData: any = {
                booking_type: packageType.includes('monthly') ? 'MONTHLY' : 'SPOT' as any,
                vehicle_model: vehicleModel === "Other" ? customVehicleModel : vehicleModel,
                package_selected: transformPackageType(packageType) as any,
                trip_type: transformTripType(tripType) as any,
                pickup_location: {
                    latitude: pickupLat!,
                    longitude: pickupLng!,
                },
                pickup_address: pickupAddress,
                scheduled_for: scheduledAt,
                destination_cities: tripType === "out_station" ? destinationCities : [],
                service_category: serviceCategory,
                city: bookingCity,
                no_of_days: noOfDays,
            };

            // For Chauffeur Ride, passenger is required; for Event Shuttle it's optional (group booking)
            if (passengerId) {
                apiData.passenger_id = passengerId;
            }

            await apiClient.createChauffeurBooking(Number(company.id), apiData);

            // Reset form handled by parent unmounting or manual reset if needed, but we close modal on success
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create booking");
        } finally {
            setIsSubmitting(false);
        }
    }

    // Helpers
    const transformPackageType = useCallback((pkg: string): string => {
        const pkgMap: Record<string, string> = {
            '5hr': 'HOURS_5',
            '10hr': 'HOURS_10',
            '24hr': 'HOURS_24',
            'monthly_10hr': 'HOURS_10',
            'monthly_24hr': 'HOURS_24',
        };
        return pkgMap[pkg] || 'HOURS_10';
    }, []);

    const transformTripType = useCallback((tripType: string): string => {
        return tripType === 'in_city' ? 'IN_CITY' : 'OUT_STATION';
    }, []);

    // No minimum datetime restriction — past dates are allowed for data entry purposes

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            <div className="flex flex-col gap-6">
                {/* Service Configuration Section */}
                <CardSection
                    title="Service Configuration"
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                >
                    <Field label="Service Type" required>
                        <Select
                            value={serviceCategory}
                            onChange={(e) => setServiceCategory(e.target.value)}
                            required
                        >
                            <option value="Chauffeur Ride">Chauffeur Ride</option>
                            <option value="Event Shuttle">Event Shuttle</option>
                        </Select>
                    </Field>

                    <Field label="City" required>
                        <AutocompleteInput
                            value={bookingCity}
                            onChange={setBookingCity}
                            options={pakistaniCities}
                            placeholder="e.g. Karachi"
                            required
                        />
                    </Field>

                    <Field label="Passenger" required={!isEventShuttle} className="sm:col-span-2">
                        <Select
                            value={passengerId}
                            onChange={(e) => setPassengerId(e.target.value)}
                            required={!isEventShuttle}
                            autoFocus
                        >
                            <option value="">{isEventShuttle ? "— None (group booking)" : "Select employee"}</option>
                            {activeEmployees.map((e) => (
                                <option key={e.id} value={e.id}>
                                    {e.full_name} {e.employee_id ? `(${e.employee_id})` : ''}
                                </option>
                            ))}
                        </Select>
                        {isEventShuttle && (
                            <div className="mt-1.5 text-[10px] text-[var(--text-muted)] font-bold px-1 uppercase tracking-tight">
                                Optional — Leave blank for booking creator.
                            </div>
                        )}
                    </Field>
                </CardSection>

                {/* Trip Details Section */}
                <CardSection
                    title="Ride Details"
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                >
                    <Field label={isEventShuttle ? "Seater Type" : "Car Type"} required>
                        {isEventShuttle ? (
                            <Select
                                value={vehicleModel}
                                onChange={(e) => setVehicleModel(e.target.value)}
                                required
                            >
                                <option value="">Select type</option>
                                {EVENT_SHUTTLE_SEATER_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </Select>
                        ) : (
                            <Select
                                value={vehicleModel}
                                onChange={(e) => setVehicleModel(e.target.value)}
                                required
                                disabled={allowedVehicleModels.length === 0}
                            >
                                <option value="">
                                    {allowedVehicleModels.length === 0 ? "No vehicles whitelisted" : "Select vehicle"}
                                </option>
                                {allowedVehicleModels.map((model) => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                                <option value="Other">Other (Special Request)</option>
                            </Select>
                        )}
                        {!isEventShuttle && allowedVehicleModels.length === 0 && (
                            <div className="mt-1 text-[10px] text-rose-500 font-black uppercase">
                                No vehicles whitelisted.
                            </div>
                        )}
                    </Field>

                    {!isEventShuttle && vehicleModel === "Other" && (
                        <Field label="Specify Vehicle" required>
                            <AutocompleteInput
                                value={customVehicleModel}
                                onChange={setCustomVehicleModel}
                                options={pakistaniCars}
                                placeholder="e.g. Honda Civic"
                                required
                            />
                        </Field>
                    )}

                    <Field label="Usage Package" required>
                        <Select
                            value={packageType}
                            onChange={(e) => setPackageType(e.target.value as any)}
                            required
                        >
                            <optgroup label="Spot">
                                <option value="5hr">5 Hours</option>
                                <option value="10hr">10 Hours</option>
                                <option value="24hr">24 Hours</option>
                            </optgroup>
                            <optgroup label="Monthly">
                                <option value="monthly_10hr">Monthly (10h/day)</option>
                                <option value="monthly_24hr">Monthly (24h/day)</option>
                            </optgroup>
                        </Select>
                    </Field>

                    <Field label="Trip Type" required>
                        <Select
                            value={tripType}
                            onChange={(e) => setTripType(e.target.value as any)}
                            required
                        >
                            <option value="in_city">In-City</option>
                            <option value="out_station">Out-Station</option>
                        </Select>
                    </Field>

                    <Field label="Number of Days" required>
                        <TextInput
                            type="number"
                            min={1}
                            value={noOfDays}
                            onChange={(e) => setNoOfDays(parseInt(e.target.value) || 1)}
                            required
                        />
                    </Field>

                    {tripType === "out_station" && (
                        <div className="sm:col-span-2">
                            <Field label="Destination Cities" required>
                                <div className="flex gap-2">
                                    <AutocompleteInput
                                        value={cityInput}
                                        onChange={(val) => setCityInput(val)}
                                        options={pakistaniCities}
                                        placeholder="Search & add city..."
                                        className="flex-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCity}
                                        disabled={!cityInput.trim()}
                                        className="h-12 px-6 rounded-xl bg-[var(--cort-orange)]/10 text-[var(--cort-orange)] text-xs font-black uppercase hover:bg-[var(--cort-orange)]/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        Add
                                    </button>
                                </div>
                                {destinationCities.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {destinationCities.map((city, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center gap-2 rounded-full bg-[var(--bg-subtle)] px-4 py-1.5 text-xs font-black text-[var(--text-primary)] border border-[var(--border-input)]"
                                            >
                                                <span>{city}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCity(index)}
                                                    className="w-4 h-4 rounded-full bg-white/10 text-[var(--text-muted)] flex items-center justify-center hover:bg-rose-500 hover:text-[var(--text-primary)] transition-all"
                                                >
                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Live outstation cost estimate */}
                                <OutstationEstimatePanel
                                    originCity={bookingCity}
                                    destinationCities={destinationCities}
                                    noOfDays={noOfDays}
                                    packageType={packageType}
                                    contractRate={selectedContractRate}
                                    outstationAllowancePerDay={outstationAllowancePerDay}
                                    accommodationAllowancePerNight={accommodationAllowancePerNight}
                                />
                            </Field>
                        </div>
                    )}
                </CardSection>

                {/* Logistics Section */}
                <CardSection
                    title="Logistics & Schedule"
                    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                >
                    <Field label="Pickup Time" required>
                        <Select
                            value={timeType}
                            onChange={(e) => setTimeType(e.target.value as any)}
                            required
                        >
                            <option value="now">Now (Quick Dispatch)</option>
                            <option value="scheduled">Scheduled Later</option>
                        </Select>
                    </Field>

                    {timeType === "scheduled" && (
                        <Field label="Scheduled At" required>
                            <TextInput
                                type="datetime-local"
                                value={scheduledDateTime}
                                onChange={(e) => setScheduledDateTime(e.target.value)}
                                required
                            />
                        </Field>
                    )}

                    <Field label="Exact Address" required className="sm:col-span-2">
                        <TextInput
                            value={pickupAddress}
                            onChange={(e) => setPickupAddress(e.target.value)}
                            placeholder="House #, Street, Landmark..."
                            required
                        />
                    </Field>

                    <div className="sm:col-span-2 space-y-4">
                        <div className="bg-[var(--bg-subtle)] rounded-2xl border border-[var(--border-default)] p-5 mt-2">
                            <div className="flex items-center justify-between mb-4">
                                <div className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Interactive Pin</div>
                                {pickupLat && pickupLng && (
                                    <div className="text-[9px] font-mono text-[var(--cort-orange)] font-bold bg-[var(--cort-orange)]/5 px-2 py-1 rounded-lg">
                                        {pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}
                                    </div>
                                )}
                            </div>

                            {/* Map Search Bar */}
                            <div className="relative mb-4 z-[50]">
                                <TextInput
                                    onChange={(e) => search(e.target.value)}
                                    placeholder="Search location on map..."
                                    className="w-full pl-11 bg-[var(--bg-card)]"
                                />
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                                {isLoadingSuggestions && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--cort-orange)] border-t-transparent"></div>
                                    </div>
                                )}

                                {/* Suggestions Dropdown */}
                                {suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 mt-2 w-full rounded-2xl border border-[var(--border-input)] bg-[var(--bg-card)] shadow-2xl max-h-60 overflow-auto z-[60] py-2">
                                        {suggestions.map((suggestion) => (
                                            <button
                                                key={suggestion.place_id}
                                                type="button"
                                                onClick={() => {
                                                    setPickupLat(suggestion.lat);
                                                    setPickupLng(suggestion.lng);
                                                    setPickupAddress(suggestion.display_name);
                                                    clearSuggestions();
                                                    refreshToken();
                                                }}
                                                className="w-full px-5 py-3 text-left hover:bg-[var(--bg-subtle)] transition-colors group"
                                            >
                                                <div className="text-xs font-black text-[var(--text-primary)] group-hover:text-[#fe8503] transition-colors">{suggestion.name}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] mt-1 truncate font-medium">{suggestion.display_name}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="rounded-2xl overflow-hidden border border-[var(--border-input)] shadow-inner bg-[var(--bg-page)]">
                                <Map
                                    height="280px"
                                    center={pickupLat && pickupLng ? [pickupLat, pickupLng] : undefined}
                                    markers={pickupLat && pickupLng ? [{ id: "pickup", position: [pickupLat, pickupLng] as any, label: "Pickup", color: "#FF6B00" }] : []}
                                    onMapClick={(lat, lng) => { setPickupLat(lat); setPickupLng(lng); }}
                                />
                            </div>
                            <div className="mt-3 flex items-center gap-2 text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-tight">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--cort-orange)] animate-pulse"></span>
                                Pin exact location for seamless dispatch
                            </div>
                        </div>
                    </div>
                </CardSection>
            </div>

            {error && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400 font-black uppercase tracking-tight flex items-start gap-3 animate-shake">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span>{error}</span>
                </div>
            )}

            <div className="flex items-center gap-4 justify-end pt-8 border-t border-[var(--border-input)]">
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-12 px-8 rounded-xl border border-[var(--border-input)] text-xs font-black uppercase text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-all active:scale-95"
                >
                    Discard
                </button>
                <button
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                    className="h-12 min-w-[180px] px-10 rounded-xl bg-[#fe8503] text-xs font-black uppercase text-[var(--text-primary)] shadow-xl shadow-[#fe8503]/20 hover:bg-[#f07a00] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
                >
                    {isSubmitting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    ) : (
                        "Confirm Booking"
                    )}
                </button>
            </div>
        </form>
    );
}
