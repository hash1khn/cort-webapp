'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { useGooglePlacesAutocomplete } from '@/app/hooks/useGooglePlacesAutocomplete';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

export interface StopSelection {
    name: string;
    lat: number;
    lng: number;
    fullAddress: string;
}

interface StopAddressSearchProps {
    /** Called when the user picks a suggestion from the dropdown */
    onSelect: (stop: StopSelection) => void;
    /** Pre-fill the text input (e.g. existing stop name when editing) */
    defaultValue?: string;
    placeholder?: string;
    className?: string;
    /** Clear input after selection (useful when adding multiple stops) */
    clearOnSelect?: boolean;
}

/** Shorten a geocode display_name to a human-friendly stop label. */
function shortenDisplayName(displayName: string): string {
    const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean);
    // Use first 2 parts (usually the landmark + neighbourhood)
    return parts.slice(0, 2).join(', ');
}

export default function StopAddressSearch({
    onSelect,
    defaultValue = '',
    placeholder = 'Search address or place...',
    className = '',
    clearOnSelect = false,
}: StopAddressSearchProps) {
    const [query, setQuery] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { suggestions, isLoading, search, clearSuggestions, refreshToken } = useGooglePlacesAutocomplete({
        apiKey: GOOGLE_MAPS_API_KEY,
    });

    // Update input value when defaultValue changes (e.g. when editing different stops)
    useEffect(() => {
        setQuery(defaultValue);
    }, [defaultValue]);

    useEffect(() => {
        if (query.length >= 3) {
            search(query);
            setOpen(true);
        } else {
            clearSuggestions();
            setOpen(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = (suggestion: { display_name: string; lat: number; lng: number; name: string }) => {
        const name = suggestion.name || shortenDisplayName(suggestion.display_name);
        const lat = suggestion.lat;
        const lng = suggestion.lng;

        onSelect({ name, lat, lng, fullAddress: suggestion.display_name });

        if (clearOnSelect) {
            setQuery('');
        } else {
            setQuery(name);
        }
        setOpen(false);
        clearSuggestions();
        refreshToken();
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full pl-9 pr-8 py-2 border border-[var(--border-input)] rounded-lg text-sm bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--cort-orange)]/40 focus:border-[var(--cort-orange)]"
                    autoComplete="off"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] animate-spin" />
                )}
            </div>

            {open && suggestions.length > 0 && (
                <ul className="absolute z-50 top-full mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                    {suggestions.map((s) => (
                        <li key={s.place_id}>
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    // Use mousedown to fire before onBlur closes the dropdown
                                    e.preventDefault();
                                    handleSelect(s);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-[var(--bg-subtle)] flex items-start gap-3 border-b border-[var(--border-default)] last:border-b-0 transition-colors"
                            >
                                <MapPin className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                                <span className="text-sm text-[var(--text-primary)] leading-snug">{s.display_name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {open && !isLoading && suggestions.length === 0 && query.length >= 3 && (
                <div className="absolute z-50 top-full mt-1 w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-lg shadow-lg px-4 py-3 text-sm text-[var(--text-muted)]">
                    No results found
                </div>
            )}
        </div>
    );
}
