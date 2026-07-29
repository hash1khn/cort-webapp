'use client';

/**
 * useLiveMobilityTracking
 *
 * Subscribes to the /rides Socket.IO namespace for multiple trip IDs at once.
 * Used by the dashboard Live Mobility Command Center to track all active
 * shuttle trips AND chauffeur rides simultaneously on the overview map.
 *
 * Backend events handled (mapped from ride.gateway.ts + bookings/shuttle services):
 *  - driver:location          → real-time GPS coord per trip
 *  - trip:distance_update     → cumulative distance meter per trip
 *  - chauffeur:status         → chauffeur booking status changes (OTW → ARRIVED → IN_PROGRESS → DROPPED_OFF → ENDED)
 *  - RIDE_ENDED               → shuttle trip completed; auto-removes from tracking
 *
 * Room strategy:
 *  - Joins ride_<tripId> per tripId via `join:ride` with the correct tripType
 *  - Replays all joins on every `connect` event (server drops rooms on disconnect)
 *  - Prunes stale rooms when tripIds list shrinks
 *  - Seeds shuttle markers from Redis last-location (same as admin ops map)
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface LiveVehicleCoord {
    tripId: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    type: 'shuttle' | 'chauffeur';
    updatedAt: number; // ms timestamp
    distanceKm?: number;
    /** Chauffeur booking status — only populated for type === 'chauffeur' */
    chauffeurStatus?: 'OTW' | 'ARRIVED' | 'IN_PROGRESS' | 'DROPPED_OFF' | 'ENDED' | 'COMPLETED';
    /** True when the backend emitted RIDE_ENDED for this tripId */
    ended?: boolean;
}

type TripType = 'shuttle' | 'chauffeur';

/**
 * Seed last-known shuttle GPS from Redis (mirrors useShuttleTracking).
 * Best-effort — silently ignored on failure / missing data.
 */
async function seedShuttleLastLocation(
    tripId: string,
    token: string,
    apply: (lat: number, lng: number) => void,
) {
    try {
        const res = await fetch(`${API_URL}/shuttle-trips/${tripId}/last-location`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data: { lat: number; lng: number } | null = await res.json();
        if (data?.lat != null && data?.lng != null) {
            apply(data.lat, data.lng);
        }
    } catch {
        /* best-effort */
    }
}

/**
 * @param tripIds  Array of trip IDs to track. Pass [] when nothing to track.
 *                 Each entry is { id: number | string, type: 'shuttle' | 'chauffeur' }
 */
export function useLiveMobilityTracking(
    tripIds: { id: number | string; type: TripType }[],
) {
    const socketRef = useRef<Socket | null>(null);
    const joinedRoomsRef = useRef<Set<string>>(new Set());
    /** Persists tripId → type so reconnect joins include the correct tripType */
    const tripTypeMapRef = useRef<Record<string, TripType>>({});

    const [vehicleCoords, setVehicleCoords] = useState<Record<string, LiveVehicleCoord>>({});
    const [isConnected, setIsConnected] = useState(false);

    // Stable serialisation of tripIds to detect real changes
    const tripIdsKey = tripIds.map((t) => `${t.type}:${t.id}`).sort().join(',');

    // ── Effect 1: establish socket once ────────────────────────────────────
    useEffect(() => {
        const token =
            typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) return;

        const socket = io(`${API_URL}/rides`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            // Never stop retrying — match expo's Infinity approach
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30_000,
            randomizationFactor: 0.5,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            // ✅ Replay all room joins after reconnect — server drops them on disconnect
            joinedRoomsRef.current.forEach((tripId) => {
                socket.emit('join:ride', {
                    tripId,
                    userId: '',
                    role: 'employee',
                    tripType: tripTypeMapRef.current[tripId] ?? 'shuttle',
                });
            });
        });

        socket.on('disconnect', () => setIsConnected(false));

        // ── Real-time GPS coordinates ─────────────────────────────────────
        socket.on(
            'driver:location',
            (payload: { tripId: string | number; lat: number; lng: number; heading?: number; speed?: number }) => {
                const tripId = String(payload.tripId);
                setVehicleCoords((prev) => ({
                    ...prev,
                    [tripId]: {
                        ...(prev[tripId] ?? {}),
                        tripId,
                        lat: payload.lat,
                        lng: payload.lng,
                        heading: payload.heading,
                        speed: payload.speed,
                        type: prev[tripId]?.type ?? tripTypeMapRef.current[tripId] ?? 'shuttle',
                        updatedAt: Date.now(),
                    },
                }));
            },
        );

        // ── Cumulative trip distance ──────────────────────────────────────
        socket.on(
            'trip:distance_update',
            (payload: { tripId: string | number; distanceKm: number }) => {
                const tripId = String(payload.tripId);
                setVehicleCoords((prev) => {
                    const existing = prev[tripId];
                    if (!existing) return prev;
                    return {
                        ...prev,
                        [tripId]: { ...existing, distanceKm: payload.distanceKm },
                    };
                });
            },
        );

        // ── Chauffeur booking status changes (via user room) ─────────────
        // Backend emits chauffeur:status to user_<passengerId>, but the admin/
        // company dashboard is in the ride room — the backend uses emitToUser for
        // this event so we receive it via the ride room only if the passenger is
        // connected to the same socket.  We still listen to it here so that if
        // the server adds a ride-room broadcast in future this just works.
        socket.on(
            'chauffeur:status',
            (payload: { bookingId: number; status: LiveVehicleCoord['chauffeurStatus'] }) => {
                const tripId = String(payload.bookingId);
                setVehicleCoords((prev) => {
                    const existing = prev[tripId];
                    if (!existing) return prev;
                    return {
                        ...prev,
                        [tripId]: {
                            ...existing,
                            chauffeurStatus: payload.status,
                            ended: payload.status === 'ENDED' || payload.status === 'COMPLETED',
                        },
                    };
                });
            },
        );

        // ── Shuttle trip ended ────────────────────────────────────────────
        socket.on(
            'RIDE_ENDED',
            (payload: { tripId: number; endedAt: string }) => {
                const tripId = String(payload.tripId);
                setVehicleCoords((prev) => {
                    const existing = prev[tripId];
                    if (!existing) return prev;
                    return { ...prev, [tripId]: { ...existing, ended: true } };
                });
            },
        );

        return () => {
            socket.disconnect();
            socketRef.current = null;
            joinedRoomsRef.current.clear();
            tripTypeMapRef.current = {};
            setIsConnected(false);
            setVehicleCoords({});
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // socket is created once

    // ── Effect 2: join/leave rooms when tripIds list changes ───────────────
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const token =
            typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

        const desired = new Set(tripIds.map((t) => String(t.id)));
        const typeMap = Object.fromEntries(
            tripIds.map((t) => [String(t.id), t.type]),
        ) as Record<string, TripType>;
        tripTypeMapRef.current = { ...tripTypeMapRef.current, ...typeMap };

        // Join new rooms
        desired.forEach((tripId) => {
            if (!joinedRoomsRef.current.has(tripId)) {
                const tripType = typeMap[tripId] ?? 'shuttle';

                if (socket.connected) {
                    socket.emit('join:ride', {
                        tripId,
                        userId: '',
                        role: 'employee',
                        tripType,
                    });
                }
                joinedRoomsRef.current.add(tripId);

                // Pre-seed type metadata only (no lat/lng) so we know shuttle vs chauffeur
                // before the first GPS ping arrives. updatedAt:0 signals "no real position yet"
                // and is filtered out of the returned coords below.
                setVehicleCoords((prev) => {
                    if (prev[tripId]) return prev;
                    return {
                        ...prev,
                        [tripId]: {
                            tripId,
                            lat: 0,
                            lng: 0,
                            type: tripType,
                            updatedAt: 0,
                        },
                    };
                });

                // Seed Redis last-known GPS for shuttles (same source as admin ops map).
                // Only applies if a live socket update hasn't already arrived.
                if (tripType === 'shuttle' && token) {
                    seedShuttleLastLocation(tripId, token, (lat, lng) => {
                        setVehicleCoords((prev) => {
                            const existing = prev[tripId];
                            // Don't overwrite a fresher live socket position
                            if (existing && existing.updatedAt > 0 && existing.lat !== 0) {
                                return prev;
                            }
                            return {
                                ...prev,
                                [tripId]: {
                                    ...(existing ?? {}),
                                    tripId,
                                    lat,
                                    lng,
                                    type: 'shuttle',
                                    updatedAt: Date.now(),
                                },
                            };
                        });
                    });
                }
            }
        });

        // Prune stale rooms that are no longer active
        joinedRoomsRef.current.forEach((tripId) => {
            if (!desired.has(tripId)) {
                joinedRoomsRef.current.delete(tripId);
                delete tripTypeMapRef.current[tripId];
                setVehicleCoords((prev) => {
                    const next = { ...prev };
                    delete next[tripId];
                    return next;
                });
            }
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripIdsKey]);

    // Exclude pre-seeded placeholder entries (updatedAt === 0) — these have no real GPS
    // position yet and would cause map markers to briefly appear at (0, 0).
    const activeVehicleCoords = Object.fromEntries(
        Object.entries(vehicleCoords).filter(([, v]) => v.updatedAt > 0),
    );

    return { vehicleCoords: activeVehicleCoords, isConnected };
}
