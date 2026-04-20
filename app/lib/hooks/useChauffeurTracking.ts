'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/**
 * Chauffeur booking status values emitted by the backend (bookings.service.ts → emitToUser).
 * Sent to the passenger's personal room (user_<passengerId>) on every driver step-action.
 */
export type ChauffeurStatus = 'OTW' | 'ARRIVED' | 'IN_PROGRESS' | 'DROPPED_OFF' | 'ENDED' | 'COMPLETED';

export interface ChauffeurLocationPayload {
    tripId: string;
    lat: number;
    lng: number;
    heading: number;
    speed: number;
}

export interface ChauffeurStatusPayload {
    bookingId: number;
    status: ChauffeurStatus;
}

export interface UseChauffeurTrackingOptions {
    /** Chauffeur booking ID — maps to the ride room `ride_<bookingId>` */
    bookingId: number | null;
    userId?: string;
    onLocationUpdate?: (data: ChauffeurLocationPayload) => void;
    onStatusChange?: (data: ChauffeurStatusPayload) => void;
    onRideEnded?: () => void;
    onDistanceUpdate?: (data: { tripId: string; distanceKm: number }) => void;
}

/**
 * useBookingTracking (chauffeur)
 *
 * Mirrors the expo `useChauffeurSocket` pattern for the web.
 * Joins the ride room for the given bookingId and wires up:
 *  - driver:location      → GPS coords from the chauffeur driver
 *  - chauffeur:status     → booking status changes (OTW / ARRIVED / IN_PROGRESS / DROPPED_OFF / ENDED)
 *  - trip:distance_update → live odometer from the backend Redis accumulator
 *
 * Note: the backend (bookings.service.ts) emits `chauffeur:status` to the
 * PASSENGER's personal room (user_<passengerId>), not the ride room.  The ride
 * room only receives `driver:location` and `trip:distance_update`.  To receive
 * chauffeur:status on this hook, the logged-in user must BE the passenger.
 */
export function useChauffeurTracking({
    bookingId,
    userId = '',
    onLocationUpdate,
    onStatusChange,
    onRideEnded,
    onDistanceUpdate,
}: UseChauffeurTrackingOptions) {
    const socketRef = useRef<Socket | null>(null);

    // Stable callback refs — avoids remounting the socket when callbacks change
    const onLocationUpdateRef = useRef(onLocationUpdate);
    const onStatusChangeRef = useRef(onStatusChange);
    const onRideEndedRef = useRef(onRideEnded);
    const onDistanceUpdateRef = useRef(onDistanceUpdate);
    onLocationUpdateRef.current = onLocationUpdate;
    onStatusChangeRef.current = onStatusChange;
    onRideEndedRef.current = onRideEnded;
    onDistanceUpdateRef.current = onDistanceUpdate;

    useEffect(() => {
        if (!bookingId) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) return;

        const bookingIdStr = String(bookingId);

        const socket = io(`${API_URL}/rides`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 30_000,
            randomizationFactor: 0.5,
        });
        socketRef.current = socket;

        const joinRoom = () => {
            socket.emit('join:ride', {
                tripId: bookingIdStr,
                userId,
                role: 'employee',
                tripType: 'chauffeur',
            });
        };

        socket.on('connect', () => {
            // ✅ Replay join on every reconnect
            joinRoom();
        });

        // ── Driver GPS location ──────────────────────────────────────────────
        socket.on('driver:location', (data: ChauffeurLocationPayload) => {
            onLocationUpdateRef.current?.(data);
        });

        // ── Chauffeur booking status (emitted to passenger's personal room) ─
        socket.on('chauffeur:status', (data: ChauffeurStatusPayload) => {
            onStatusChangeRef.current?.(data);
            if (data.status === 'ENDED' || data.status === 'COMPLETED') {
                onRideEndedRef.current?.();
            }
        });

        // ── Live trip distance meter ─────────────────────────────────────────
        socket.on(
            'trip:distance_update',
            (data: { tripId: string; distanceKm: number }) => {
                onDistanceUpdateRef.current?.(data);
            },
        );

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [bookingId, userId]);

    /** Manually emit an arbitrary event (e.g. chauffeur:request-captain) */
    const emit = useCallback(
        (event: string, data: unknown) => {
            const socket = socketRef.current;
            if (!socket?.connected) {
                console.warn(`[useChauffeurTracking] emit('${event}') dropped — socket not connected`);
                return;
            }
            socket.emit(event, data);
        },
        [],
    );

    return { emit };
}
