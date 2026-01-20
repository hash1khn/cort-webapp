"use client";

import { useState, useMemo } from "react";
import { useCompanyStore } from "../../store/CompanyStore";
import Map from "../../../admin/ui/Map";

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
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeEmployees = useMemo(() => {
        return employees.filter((e) => e.status === "ACTIVE");
    }, [employees]);

    const canSubmit = useMemo(() => {
        return (
            passengerId.length > 0 &&
            vehicleModel.length > 0 &&
            (timeType === "now" || scheduledDateTime.length > 0) &&
            pickupAddress.length > 0
        );
    }, [passengerId, vehicleModel, timeType, scheduledDateTime, pickupAddress]);

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
            setError("Please fill in all required fields");
            setIsSubmitting(false);
            return;
        }

        const passenger = employees.find((e) => e.id === Number(passengerId));
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
                passenger_employee_id: Number(passengerId),
                vehicle_model: vehicleModel,
                package: packageType,
                trip_type: tripType,
                scheduled_at: scheduledAt,
                status: "pending",
                pickup_address: pickupAddress,
                pickup_lat: pickupLat,
                pickup_lng: pickupLng,
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
                                {e.full_name} {e.employee_id ? `(${e.employee_id})` : ''}
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
                            placeholder="Enter pickup location"
                            required
                        />
                    </Field>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-white p-4">
                <div className="mb-4">
                    <div className="text-xs font-semibold tracking-wider text-muted">PICKUP LOCATION MAP</div>
                    <div className="mt-1 text-sm text-muted">
                        Click on the map to set the pickup location.
                    </div>
                </div>
                <Map
                    height="300px"
                    markers={
                        pickupLat && pickupLng
                            ? [
                                {
                                    id: "pickup",
                                    position: [pickupLat, pickupLng] as [number, number],
                                    label: `Pickup: ${pickupAddress || "Selected"}`,
                                    color: "#22c55e",
                                },
                            ]
                            : []
                    }
                    onMapClick={(lat, lng) => {
                        setPickupLat(lat);
                        setPickupLng(lng);
                        if (!pickupAddress) {
                            setPickupAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                        }
                    }}
                />
                <div className="mt-3 flex items-center gap-4 text-xs text-muted">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-green"></div>
                        <span>Pickup Location</span>
                    </div>
                </div>
            </div>

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
