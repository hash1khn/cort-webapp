import { useState, useCallback, useRef, useEffect } from "react";

export interface AutocompleteSuggestion {
    place_id: string | number;
    display_name: string;
    lat: string;
    lon: string;
    type?: string;
    name?: string;
}

interface UseGeocodeMapsOptions {
    apiKey: string;
}

export function useGeocodeMapsAutocomplete(options: UseGeocodeMapsOptions) {
    const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const search = useCallback(
        async (query: string) => {
            // Clear suggestions if query is too short
            if (query.length < 3) {
                setSuggestions([]);
                setError(null);
                return;
            }

            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            // Clear previous debounce timer
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }

            // Debounce the API call
            debounceTimerRef.current = setTimeout(async () => {
                try {
                    setIsLoading(true);
                    setError(null);

                    abortControllerRef.current = new AbortController();

                    const params = new URLSearchParams({
                        q: query,
                        api_key: options.apiKey,
                        format: "json",
                        limit: "5",
                    });

                    const response = await fetch(
                        `https://geocode.maps.co/search?${params}`,
                        { signal: abortControllerRef.current.signal }
                    );

                    if (!response.ok) {
                        throw new Error("Failed to fetch suggestions");
                    }

                    const data = await response.json();
                    setSuggestions(Array.isArray(data) ? data : []);
                } catch (err: any) {
                    if (err.name !== "AbortError") {
                        setError(err.message || "Failed to fetch suggestions");
                        setSuggestions([]);
                    }
                } finally {
                    setIsLoading(false);
                }
            }, 300); // 300ms debounce
        },
        [options.apiKey]
    );

    const reverseGeocode = useCallback(
        async (lng: number, lat: number): Promise<string | null> => {
            try {
                const params = new URLSearchParams({
                    lat: lat.toString(),
                    lon: lng.toString(),
                    api_key: options.apiKey,
                    format: "json",
                });

                const response = await fetch(
                    `https://geocode.maps.co/reverse?${params}`
                );

                if (!response.ok) {
                    throw new Error("Failed to reverse geocode");
                }

                const data = await response.json();
                return data.display_name || null;
            } catch (err) {
                console.error("Reverse geocoding error:", err);
                return null;
            }
        },
        [options.apiKey]
    );

    const clearSuggestions = useCallback(() => {
        setSuggestions([]);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return {
        suggestions,
        isLoading,
        error,
        search,
        reverseGeocode,
        clearSuggestions,
    };
}
