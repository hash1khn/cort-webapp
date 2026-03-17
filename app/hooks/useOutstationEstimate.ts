'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface LegDistance {
    from: string;
    to: string;
    distanceKm: number;
    durationText: string;
    isReturn?: boolean;
}

export interface OutstationEstimate {
    /** Every road leg including the final return to origin */
    legs: LegDistance[];
    /** Total km including the return leg */
    totalKm: number;
    /** Fuel cost = totalKm × cost_per_km (from selected vehicle's contract rate) */
    fuelCost: number;
    /** allowance_outstation × noOfDays */
    outstationAllowance: number;
    /** accommodation nights = noOfDays - 1 (driver stays away all nights except last) */
    accommodationAllowance: number;
    /** Base package cost calculated exactly as calculateServiceCharges does for OUT_STATION */
    basePackageCost: number;
    /** serviceSubtotal = base + outstation + accommodation (SST is on this) */
    serviceSubtotal: number;
    /** expenseSubtotal = fuelCost only (toll/parking unknown at booking time) */
    expenseSubtotal: number;
    /** SST 10% on serviceSubtotal only */
    sst: number;
    /** Grand total = serviceSubtotal + sst + expenseSubtotal */
    total: number;
}

export interface ContractRateForEstimate {
    cost_per_km: string;
    rate_spot_5hr: string;
    rate_spot_10hr: string;
    rate_spot_24hr: string;
    rate_monthly_10hr: string;
    rate_monthly_24hr: string;
    rate_overtime_per_hr: string;
}

interface UseOutstationEstimateOptions {
    /** Origin city (booking city / pickup city) — driver always returns here */
    originCity: string;
    /** Ordered list of destination cities the user typed */
    destinationCities: string[];
    /** Number of days for the trip */
    noOfDays: number;
    /** Package type selected */
    packageType: '5hr' | '10hr' | '24hr' | 'monthly_10hr' | 'monthly_24hr';
    /** Contract rate for the chosen vehicle model */
    contractRate: ContractRateForEstimate | null;
    /** contract.allowance_outstation (per day) */
    outstationAllowancePerDay: number;
    /** contract.allowance_accommodation (per night) */
    accommodationAllowancePerNight: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base package cost calculation — mirrors calculateServiceCharges OUT_STATION
// path in bookings.service.ts exactly.
//
// We don't know actual hours at booking time, so we use the *contracted hours*
// per day as a proxy (5 → 5 h/day, 10 → 10 h/day, 24 → 24 h/day).
// ─────────────────────────────────────────────────────────────────────────────
function calcBasePackageCost(
    packageType: UseOutstationEstimateOptions['packageType'],
    rate: ContractRateForEstimate,
    noOfDays: number,
): { basePackageCost: number; overtimeCharge: number } {
    const days = Math.max(1, noOfDays);
    // Guard: Prisma Decimal fields come back as strings — Number() handles both.
    // Use || 0 so a missing/null field never produces NaN.
    const r5   = Number(rate.rate_spot_5hr)    || 0;
    const r10  = Number(rate.rate_spot_10hr)   || 0;
    const r24  = Number(rate.rate_spot_24hr)   || 0;
    const rm10 = Number(rate.rate_monthly_10hr) || 0;
    const rm24 = Number(rate.rate_monthly_24hr) || 0;

    switch (packageType) {
        case '24hr':
            // HOURS_24: base = 24hr_rate × days, no overtime
            return { basePackageCost: r24 * days, overtimeCharge: 0 };

        case '10hr':
            // HOURS_10 SPOT: base = 10hr_rate × days, no estimated overtime
            // (we assume the trip runs exactly 10 h/day — overtime unknown at booking time)
            return { basePackageCost: r10 * days, overtimeCharge: 0 };

        case '5hr':
            // HOURS_5 SPOT: if avg > 5h/day → bumps to 10hr rate per day
            // At booking time we conservatively use the 10hr rate (OUT_STATION almost
            // always exceeds 5 h/day) — same bump the backend applies.
            return { basePackageCost: r10 * days, overtimeCharge: 0 };

        case 'monthly_10hr':
            // MONTHLY 10hr: base = monthly_10hr_rate × days
            return { basePackageCost: rm10 * days, overtimeCharge: 0 };

        case 'monthly_24hr':
            // MONTHLY 24hr: base = monthly_24hr_rate × days
            return { basePackageCost: rm24 * days, overtimeCharge: 0 };

        default:
            return { basePackageCost: r10 * days, overtimeCharge: 0 };
    }
}

/**
 * Uses the Google Maps Distance Matrix API (already loaded by useGooglePlacesAutocomplete)
 * to compute ROUND-TRIP road distances:
 *   origin → city1 → city2 → … → last_city → origin (return leg)
 *
 * Then builds a cost estimate that mirrors calculateServiceCharges (OUT_STATION path)
 * in bookings.service.ts:
 *   serviceSubtotal = basePackageCost + outstationAllowance + accommodationAllowance
 *   expenseSubtotal = fuelCost (toll/parking unknown at booking time)
 *   SST             = 10 % of serviceSubtotal
 *   total           = serviceSubtotal + SST + expenseSubtotal
 */
export function useOutstationEstimate(options: UseOutstationEstimateOptions) {
    const [estimate, setEstimate] = useState<OutstationEstimate | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const optsRef = useRef(options);
    useEffect(() => { optsRef.current = options; }, [options]);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const calculate = useCallback(() => {
        const {
            originCity,
            destinationCities,
            noOfDays,
            packageType,
            contractRate,
            outstationAllowancePerDay,
            accommodationAllowancePerNight,
        } = optsRef.current;

        if (!destinationCities.length || !contractRate || !originCity.trim()) {
            setEstimate(null);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            if (typeof window === 'undefined' || !window.google?.maps) {
                setError('Google Maps not loaded');
                return;
            }

            setIsLoading(true);
            setError(null);

            try {
                // Build the ROUND-TRIP waypoint list:
                //   origin → dest1 → dest2 → … → origin
                // The driver always returns to the origin city at the end.
                const waypoints: string[] = [
                    originCity.trim(),
                    ...destinationCities.map(c => c.trim()),
                    originCity.trim(), // return leg
                ];

                const service = new google.maps.DistanceMatrixService();
                const legs: LegDistance[] = [];
                let totalKm = 0;

                // Query each consecutive pair
                for (let i = 0; i < waypoints.length - 1; i++) {
                    const from = waypoints[i];
                    const to   = waypoints[i + 1];
                    const isReturn = i === waypoints.length - 2; // last leg = return

                    const result = await service.getDistanceMatrix({
                        origins:      [`${from}, Pakistan`],
                        destinations: [`${to}, Pakistan`],
                        travelMode:   google.maps.TravelMode.DRIVING,
                        unitSystem:   google.maps.UnitSystem.METRIC,
                    });

                    const element = result.rows[0]?.elements[0];
                    if (element?.status === 'OK' && element.distance) {
                        const km = element.distance.value / 1000;
                        totalKm += km;
                        legs.push({
                            from,
                            to,
                            distanceKm: Math.round(km),
                            durationText: element.duration?.text ?? '',
                            isReturn,
                        });
                    } else {
                        legs.push({ from, to, distanceKm: 0, durationText: 'N/A', isReturn });
                    }
                }

                // ── Mirror calculateServiceCharges (OUT_STATION) ──────────────
                const days   = Math.max(1, noOfDays);
                const nights = Math.max(0, days - 1); // accommodation nights = days - 1

                const { basePackageCost } = calcBasePackageCost(packageType, contractRate, days);

                // allowance_outstation × days  (same as: contract.allowance_outstation.mul(totalDays))
                const outstationAllowance     = Math.round(outstationAllowancePerDay * days);

                // allowance_accommodation × nights  (same as: contract.allowance_accommodation.mul(nights))
                const accommodationAllowance  = Math.round(accommodationAllowancePerNight * nights);

                // serviceSubtotal = base + outstation + accommodation  (SST applies to this)
                const serviceSubtotal = Math.round(basePackageCost + outstationAllowance + accommodationAllowance);

                // fuelCost = totalKm × cost_per_km  (vehicle-specific from contract rate)
                const costPerKm  = Number(contractRate.cost_per_km) || 0;
                const fuelCost   = Math.round(totalKm * costPerKm);

                // expenseSubtotal = fuelCost only (toll & parking unknown at booking time)
                const expenseSubtotal = fuelCost;

                // SST = 10 % of serviceSubtotal only (NOT on expenses)
                const sst   = Math.round(serviceSubtotal * 0.1);
                const total = serviceSubtotal + sst + expenseSubtotal;

                setEstimate({
                    legs,
                    totalKm:              Math.round(totalKm),
                    fuelCost,
                    outstationAllowance,
                    accommodationAllowance,
                    basePackageCost:      Math.round(basePackageCost),
                    serviceSubtotal,
                    expenseSubtotal,
                    sst,
                    total,
                });
            } catch (err: any) {
                setError(err?.message ?? 'Failed to calculate distance');
                setEstimate(null);
            } finally {
                setIsLoading(false);
            }
        }, 700);
    }, []);

    // Re-run whenever any relevant input changes
    useEffect(() => {
        calculate();
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        options.originCity,
        JSON.stringify(options.destinationCities),
        options.noOfDays,
        options.packageType,
        options.contractRate,
        options.outstationAllowancePerDay,
        options.accommodationAllowancePerNight,
        calculate,
    ]);

    return { estimate, isLoading, error };
}
