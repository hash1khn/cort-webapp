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

export function useShuttleTracking(tripId: number | null) {
    const socketRef = useRef<Socket | null>(null);
    const [driverCoord, setDriverCoord] = useState<DriverCoord | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!tripId) return;

        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (!token) return;

        const socket = io(`${API_URL}/rides`, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('join:ride', {
                tripId: String(tripId),
                userId: '',
                role: 'employee',
            });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('driver:location', (payload: { lat: number; lng: number; heading?: number; speed?: number }) => {
            setDriverCoord({
                lat: payload.lat,
                lng: payload.lng,
                heading: payload.heading,
                speed: payload.speed,
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
            setDriverCoord(null);
        };
    }, [tripId]);

    return { driverCoord, isConnected };
}
