'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface DriverCoord {
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
}

export interface StopArrivedPayload {
    stopId: number;
    stopName: string;
    arrivedAt: string;
}

export interface RideProceedingPayload {
    nextStopId: number | null;
    nextStopName: string | null;
    departedAt: string;
}

export interface AttendanceMarkedPayload {
    employeeId: string;
    employeeName: string;
    markedBy: 'self' | 'driver';
    timestamp: string;
}

export interface RideEndedPayload {
    tripId: number;
    endedAt: string;
}

export interface UseShuttleTrackingOptions {
    tripId: number | null;
    userId?: string;
    role?: 'driver' | 'employee';
    onStopArrived?: (data: StopArrivedPayload) => void;
    onRideProceeding?: (data: RideProceedingPayload) => void;
    onAttendanceMarked?: (data: AttendanceMarkedPayload) => void;
    onRideEnded?: (data: RideEndedPayload) => void;
    onDistanceUpdate?: (data: { tripId: string; distanceKm: number }) => void;
}

export function useShuttleTracking({
    tripId,
    userId = '',
    role = 'employee',
    onStopArrived,
    onRideProceeding,
    onAttendanceMarked,
    onRideEnded,
    onDistanceUpdate,
}: UseShuttleTrackingOptions) {
    const socketRef = useRef<Socket | null>(null);
    const tripIdRef = useRef<string | null>(null);

    const [driverCoord, setDriverCoord] = useState<DriverCoord | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [distanceKm, setDistanceKm] = useState<number | null>(null);
    const [currentStopName, setCurrentStopName] = useState<string | null>(null);
    const [nextStopName, setNextStopName] = useState<string | null>(null);

    // Keep callback refs stable so we don't remount the socket on every render
    const onStopArrivedRef = useRef(onStopArrived);
    const onRideProceedingRef = useRef(onRideProceeding);
    const onAttendanceMarkedRef = useRef(onAttendanceMarked);
    const onRideEndedRef = useRef(onRideEnded);
    const onDistanceUpdateRef = useRef(onDistanceUpdate);
    onStopArrivedRef.current = onStopArrived;
    onRideProceedingRef.current = onRideProceeding;
    onAttendanceMarkedRef.current = onAttendanceMarked;
    onRideEndedRef.current = onRideEnded;
    onDistanceUpdateRef.current = onDistanceUpdate;

    useEffect(() => {
        if (!tripId) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) return;

        const tripIdStr = String(tripId);
        tripIdRef.current = tripIdStr;

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
                tripId: tripIdStr,
                userId,
                role,
                tripType: 'shuttle',
            });
        };

        socket.on('connect', () => {
            setIsConnected(true);
            // ✅ Replay join on every reconnect — server drops room on disconnect
            joinRoom();
        });

        socket.on('disconnect', () => setIsConnected(false));

        // ── GPS location from driver ─────────────────────────────────────────
        socket.on(
            'driver:location',
            (payload: { lat: number; lng: number; heading?: number; speed?: number }) => {
                setDriverCoord({
                    lat: payload.lat,
                    lng: payload.lng,
                    heading: payload.heading,
                    speed: payload.speed,
                });
            },
        );

        // ── Live trip distance meter ─────────────────────────────────────────
        socket.on(
            'trip:distance_update',
            (payload: { tripId: string; distanceKm: number }) => {
                setDistanceKm(payload.distanceKm);
                onDistanceUpdateRef.current?.(payload);
            },
        );

        // ── Driver arrived at a stop ─────────────────────────────────────────
        socket.on('stop:arrived', (payload: StopArrivedPayload) => {
            setCurrentStopName(payload.stopName);
            onStopArrivedRef.current?.(payload);
        });

        // ── Driver proceeding to next stop ───────────────────────────────────
        socket.on('ride:proceeding', (payload: RideProceedingPayload) => {
            setNextStopName(payload.nextStopName);
            onRideProceedingRef.current?.(payload);
        });

        // ── Boarding/attendance scan ─────────────────────────────────────────
        socket.on('attendance:marked', (payload: AttendanceMarkedPayload) => {
            onAttendanceMarkedRef.current?.(payload);
        });

        // ── Trip completed ───────────────────────────────────────────────────
        socket.on('RIDE_ENDED', (payload: RideEndedPayload) => {
            onRideEndedRef.current?.(payload);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            tripIdRef.current = null;
            setIsConnected(false);
            setDriverCoord(null);
            setDistanceKm(null);
            setCurrentStopName(null);
            setNextStopName(null);
        };
    }, [tripId, userId, role]);

    return { driverCoord, isConnected, distanceKm, currentStopName, nextStopName };
}
