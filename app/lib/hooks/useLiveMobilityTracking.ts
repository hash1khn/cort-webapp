'use client';

/**
 * useLiveMobilityTracking
 *
 * Subscribes to the /rides Socket.IO namespace for multiple trip IDs at once.
 * Used by the dashboard Live Mobility Command Center to track all active
 * shuttle trips AND chauffeur rides simultaneously on the overview map.
 *
 * - Joins one socket room per tripId: `ride_<tripId>`
 * - Listens for `driver:location` events and updates per-trip coords
 * - Re-joins rooms when the set of active tripIds changes
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
}

/**
 * @param tripIds  Array of trip IDs to track. Pass [] when nothing to track.
 *                 Each entry is { id: number | string, type: 'shuttle' | 'chauffeur' }
 */
export function useLiveMobilityTracking(
    tripIds: { id: number | string; type: 'shuttle' | 'chauffeur' }[],
) {
    const socketRef = useRef<Socket | null>(null);
    const joinedRoomsRef = useRef<Set<string>>(new Set());

    const [vehicleCoords, setVehicleCoords] = useState<Record<string, LiveVehicleCoord>>({});
    const [isConnected, setIsConnected] = useState(false);

    // Stable serialization of tripIds to detect real changes
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
            reconnectionAttempts: 20,
            reconnectionDelay: 3000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            // Re-join all rooms after reconnect
            joinedRoomsRef.current.forEach((tripId) => {
                socket.emit('join:ride', { tripId, userId: '', role: 'employee' });
            });
        });

        socket.on('disconnect', () => setIsConnected(false));

        socket.on(
            'driver:location',
            (payload: { tripId: string; lat: number; lng: number; heading?: number; speed?: number }) => {
                setVehicleCoords((prev) => ({
                    ...prev,
                    [payload.tripId]: {
                        ...(prev[payload.tripId] ?? {}),
                        tripId: payload.tripId,
                        lat: payload.lat,
                        lng: payload.lng,
                        heading: payload.heading,
                        speed: payload.speed,
                        type: prev[payload.tripId]?.type ?? 'shuttle',
                        updatedAt: Date.now(),
                    },
                }));
            },
        );

        return () => {
            socket.disconnect();
            socketRef.current = null;
            joinedRoomsRef.current.clear();
            setIsConnected(false);
            setVehicleCoords({});
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // socket is created once

    // ── Effect 2: join/leave rooms when tripIds list changes ───────────────
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const desired = new Set(tripIds.map((t) => String(t.id)));
        const typeMap = Object.fromEntries(tripIds.map((t) => [String(t.id), t.type]));

        // Join new rooms
        desired.forEach((tripId) => {
            if (!joinedRoomsRef.current.has(tripId)) {
                if (socket.connected) {
                    socket.emit('join:ride', { tripId, userId: '', role: 'employee' });
                }
                joinedRoomsRef.current.add(tripId);

                // Pre-seed type in coords so we know shuttle vs chauffeur even before first ping
                setVehicleCoords((prev) => {
                    if (prev[tripId]) return prev;
                    return {
                        ...prev,
                        [tripId]: {
                            tripId,
                            lat: 0,
                            lng: 0,
                            type: typeMap[tripId] ?? 'shuttle',
                            updatedAt: 0,
                        },
                    };
                });
            }
        });

        // Prune stale rooms that are no longer active
        joinedRoomsRef.current.forEach((tripId) => {
            if (!desired.has(tripId)) {
                joinedRoomsRef.current.delete(tripId);
                setVehicleCoords((prev) => {
                    const next = { ...prev };
                    delete next[tripId];
                    return next;
                });
            }
        });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tripIdsKey]);

    return { vehicleCoords, isConnected };
}
