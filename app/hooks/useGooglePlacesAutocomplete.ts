'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface GooglePlaceSuggestion {
    place_id: string;
    display_name: string;       // full formatted address
    name: string;               // short primary text (e.g. business name / street)
    lat: number;
    lng: number;
}

interface UseGooglePlacesOptions {
    apiKey: string;
    /** ISO 3166-1 alpha-2 country bias, e.g. 'pk' */
    country?: string;
}

/**
 * Loads the Google Maps JavaScript API once, then provides a Places
 * Autocomplete-powered search that returns resolved lat/lng for each result.
 */
export function useGooglePlacesAutocomplete(options: UseGooglePlacesOptions) {
    const [suggestions, setSuggestions] = useState<GooglePlaceSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Refs so they never become stale inside callbacks
    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    // ── Load the Google Maps script once ─────────────────────────────────────
    useEffect(() => {
        mountedRef.current = true;

        if (!options.apiKey) return;

        // Already loaded
        if (window.google?.maps?.places) {
            initServices();
            return;
        }

        // Avoid duplicate script tags
        if (document.querySelector('script[data-gm-loader]')) return;

        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${options.apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.dataset.gmLoader = 'true';

        script.onload = () => {
            if (mountedRef.current) initServices();
        };
        script.onerror = () => {
            if (mountedRef.current) setError('Failed to load Google Maps');
        };

        document.head.appendChild(script);

        return () => {
            mountedRef.current = false;
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [options.apiKey]);

    function initServices() {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        // PlacesService needs a DOM element (or a Map) but we only use it for getDetails
        const dummyEl = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(dummyEl);
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }

    // ── Refresh session token after a selection ───────────────────────────────
    const refreshToken = useCallback(() => {
        if (window.google?.maps?.places) {
            sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
        }
    }, []);

    // ── Resolve a place_id to lat/lng ─────────────────────────────────────────
    const getLatLng = useCallback(
        (placeId: string): Promise<{ lat: number; lng: number; name: string; address: string }> => {
            return new Promise((resolve, reject) => {
                if (!placesServiceRef.current) return reject(new Error('PlacesService not ready'));

                placesServiceRef.current.getDetails(
                    {
                        placeId,
                        fields: ['geometry', 'name', 'formatted_address'],
                        sessionToken: sessionTokenRef.current ?? undefined,
                    },
                    (result, status) => {
                        if (
                            status === google.maps.places.PlacesServiceStatus.OK &&
                            result?.geometry?.location
                        ) {
                            resolve({
                                lat: result.geometry.location.lat(),
                                lng: result.geometry.location.lng(),
                                name: result.name ?? '',
                                address: result.formatted_address ?? '',
                            });
                        } else {
                            reject(new Error(`PlacesService error: ${status}`));
                        }
                    }
                );
            });
        },
        []
    );

    // ── Main search function ──────────────────────────────────────────────────
    const search = useCallback(
        (query: string) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (query.length < 3) {
                setSuggestions([]);
                return;
            }

            debounceRef.current = setTimeout(async () => {
                if (!autocompleteServiceRef.current) {
                    // Script not yet loaded
                    return;
                }

                setIsLoading(true);
                setError(null);

                const request: google.maps.places.AutocompletionRequest = {
                    input: query,
                    sessionToken: sessionTokenRef.current ?? undefined,
                };

                if (options.country) {
                    request.componentRestrictions = { country: options.country };
                }

                autocompleteServiceRef.current.getPlacePredictions(
                    request,
                    async (predictions, status) => {
                        if (!mountedRef.current) return;

                        if (
                            status !== google.maps.places.PlacesServiceStatus.OK ||
                            !predictions
                        ) {
                            setSuggestions([]);
                            setIsLoading(false);
                            return;
                        }

                        try {
                            // Resolve all predictions to lat/lng in parallel (max 5)
                            const resolved = await Promise.all(
                                predictions.slice(0, 5).map(async (pred) => {
                                    try {
                                        const details = await getLatLng(pred.place_id);
                                        return {
                                            place_id: pred.place_id,
                                            display_name:
                                                details.address ||
                                                pred.description,
                                            name:
                                                details.name ||
                                                pred.structured_formatting?.main_text ||
                                                pred.description,
                                            lat: details.lat,
                                            lng: details.lng,
                                        } satisfies GooglePlaceSuggestion;
                                    } catch {
                                        return null;
                                    }
                                })
                            );

                            if (mountedRef.current) {
                                setSuggestions(
                                    resolved.filter(Boolean) as GooglePlaceSuggestion[]
                                );
                            }
                        } catch (err: any) {
                            if (mountedRef.current) {
                                setError(err.message ?? 'Failed to resolve places');
                                setSuggestions([]);
                            }
                        } finally {
                            if (mountedRef.current) setIsLoading(false);
                        }
                    }
                );
            }, 300);
        },
        [options.country, getLatLng]
    );

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
    }, []);

    return {
        suggestions,
        isLoading,
        error,
        search,
        clearSuggestions,
        refreshToken,
    };
}
