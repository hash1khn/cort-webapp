'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { AlertCircle, Ban, CheckCircle2, Clock } from 'lucide-react';
import type { MapMarker } from '@/app/admin/ui/Map';
import { useChauffeurTracking, type ChauffeurLocationPayload, type ChauffeurStatusPayload } from '@/app/lib/hooks/useChauffeurTracking';
import { useShuttleTracking } from '@/app/lib/hooks/useShuttleTracking';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type RideShareTripType = 'shuttle' | 'chauffeur';

type ShareSnapshot = {
    tripType: RideShareTripType;
    tripId: number;
    status: string;
    ended: boolean;
    lat: number | null;
    lng: number | null;
};

/** Terminal state reached via a live socket event or (rarely) the initial snapshot. */
type EndedKind = 'COMPLETED' | 'ENDED' | 'CANCELLED' | null;

/** Final-state card shown once the ride has ended / the link is no longer usable. */
function EndedCard({ kind }: { kind: EndedKind }) {
    const config = (() => {
        switch (kind) {
            case 'COMPLETED':
                return {
                    Icon: CheckCircle2,
                    iconClass: 'text-green-600 bg-green-50',
                    title: 'Ride completed',
                    subtitle: 'This ride has ended. Thanks for riding with us!',
                };
            case 'ENDED':
                return {
                    Icon: Clock,
                    iconClass: 'text-orange bg-orange/10',
                    title: 'Ride ended',
                    subtitle: 'The trip has finished — finalizing the details now.',
                };
            case 'CANCELLED':
                return {
                    Icon: Ban,
                    iconClass: 'text-danger bg-danger/10',
                    title: 'Ride cancelled',
                    subtitle: 'This ride was cancelled.',
                };
            default:
                return {
                    Icon: AlertCircle,
                    iconClass: 'text-muted bg-surface-subtle',
                    title: 'Tracking link expired',
                    subtitle: 'This link is no longer active — it may have expired or the ride already ended.',
                };
        }
    })();

    const { Icon, iconClass, title, subtitle } = config;

    return (
        <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${iconClass}`}>
                <Icon className="w-7 h-7" />
            </div>
            <p className="text-base font-bold text-navy">{title}</p>
            <p className="text-sm text-muted max-w-xs">{subtitle}</p>
        </div>
    );
}

function RideSharePageInner() {
    const params = useSearchParams();
    const token = params.get('token') ?? '';
    const tripTypeRaw = params.get('tripType') as RideShareTripType | null;
    const tripIdRaw = params.get('tripId') ?? '';
    const tripId = tripIdRaw ? Number(tripIdRaw) : NaN;

    const isValid = Boolean(token) && Boolean(tripTypeRaw) && Number.isFinite(tripId) && tripId > 0;

    // Install share token before child socket effects read localStorage.
    useLayoutEffect(() => {
        if (token) localStorage.setItem('auth_token', token);
    }, [token]);
    const tokenReady = Boolean(token);

    // Exact terminal state, driven by live socket events (preferred) or the
    // initial snapshot (best-effort — the token is usually already revoked
    // by the time a fresh page load can observe it).
    const [endedKind, setEndedKind] = useState<EndedKind>(null);

    // Public snapshot (works with share token — not a JWT).
    const [snapshot, setSnapshot] = useState<ShareSnapshot | null>(null);
    const [snapshotFailed, setSnapshotFailed] = useState(false);
    useEffect(() => {
        if (!token || !isValid) return;
        let cancelled = false;
        fetch(`${API_URL}/rides/share-snapshot?token=${encodeURIComponent(token)}`)
            .then(async (r) => {
                if (!r.ok) throw new Error('invalid');
                return r.json() as Promise<ShareSnapshot>;
            })
            .then((data) => {
                if (cancelled) return;
                setSnapshot(data);
                if (data.ended) {
                    setEndedKind((prev) =>
                        prev ?? (data.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED'),
                    );
                }
            })
            .catch(() => {
                if (!cancelled) setSnapshotFailed(true);
            });
        return () => {
            cancelled = true;
        };
    }, [token, isValid]);

    const {
        driverCoord: shuttleDriverCoord,
        isConnected: shuttleIsConnected,
    } = useShuttleTracking({
        tripId: tokenReady && tripTypeRaw === 'shuttle' && Number.isFinite(tripId) ? tripId : null,
        // Shuttle trips only ever reach RIDE_ENDED via completeTrip (no cancel flow) → always COMPLETED.
        onRideEnded: () => setEndedKind('COMPLETED'),
    });

    const [chauffeurDriverCoord, setChauffeurDriverCoord] = useState<{ lat: number; lng: number } | null>(
        null,
    );
    const [chauffeurStatus, setChauffeurStatus] = useState<string | null>(null);

    const onChauffeurLocationUpdate = useCallback((data: ChauffeurLocationPayload) => {
        setChauffeurDriverCoord({ lat: data.lat, lng: data.lng });
    }, []);

    const onChauffeurStatusChange = useCallback((data: ChauffeurStatusPayload) => {
        setChauffeurStatus(data.status);
        if (data.status === 'COMPLETED') {
            setEndedKind('COMPLETED');
        } else if (data.status === 'ENDED') {
            // Don't downgrade if COMPLETED already arrived first.
            setEndedKind((prev) => prev ?? 'ENDED');
        }
    }, []);

    useChauffeurTracking({
        bookingId: tokenReady && tripTypeRaw === 'chauffeur' && Number.isFinite(tripId) ? tripId : null,
        userId: '',
        onLocationUpdate: onChauffeurLocationUpdate,
        onStatusChange: onChauffeurStatusChange,
        onRideEnded: () => setEndedKind((prev) => prev ?? 'COMPLETED'),
    });

    const seededCoord =
        snapshot?.lat != null && snapshot?.lng != null
            ? { lat: snapshot.lat, lng: snapshot.lng }
            : null;

    const liveCoord = tripTypeRaw === 'shuttle' ? shuttleDriverCoord : chauffeurDriverCoord;
    const driverCoord = liveCoord ?? seededCoord;

    const marker: MapMarker | null = useMemo(() => {
        if (!driverCoord) return null;
        return {
            id: 'driver',
            position: [driverCoord.lat, driverCoord.lng],
            label: 'Driver',
            type: tripTypeRaw ?? undefined,
        };
    }, [driverCoord, tripTypeRaw]);

    // Fallback: if no GPS or terminal event ever arrives, assume the link is dead.
    const [hasTimedOut, setHasTimedOut] = useState(false);
    useEffect(() => {
        if (!isValid || !tokenReady || driverCoord || endedKind || snapshotFailed) return;

        const t = setTimeout(() => setHasTimedOut(true), 12_000);
        return () => clearTimeout(t);
    }, [isValid, tokenReady, driverCoord, endedKind, snapshotFailed]);

    // A ride-ended signal always wins over a stale last-known position — once the
    // trip is over, tracking stops (mirrors Uber/InDrive's post-trip screen).
    // `endedKind` is null when we can't determine the exact reason (e.g. token was
    // already revoked before this page loaded) — EndedCard renders a generic
    // "link expired" message in that case.
    const isEnded = isValid && (endedKind !== null || snapshotFailed || (hasTimedOut && !driverCoord));

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-5xl mx-auto px-4 py-6">
                <h1 className="text-lg font-semibold text-navy">Live Ride Tracking</h1>
                <p className="text-sm text-muted mt-1">
                    {!isValid
                        ? 'Invalid tracking link.'
                        : isEnded
                            ? 'This tracking link is no longer live.'
                            : tripTypeRaw === 'shuttle'
                                ? shuttleIsConnected
                                    ? 'Tracking shuttle…'
                                    : 'Connecting to shuttle…'
                                : 'Tracking chauffeur…'}
                </p>
                {tripTypeRaw === 'chauffeur' && (chauffeurStatus || snapshot?.status) && !isEnded && (
                    <p className="text-xs text-muted mt-2">
                        Current status:{' '}
                        <span className="font-semibold text-navy">
                            {chauffeurStatus ?? snapshot?.status}
                        </span>
                    </p>
                )}

                <div className="mt-4 rounded-xl overflow-hidden border border-border shadow-sm">
                    <div style={{ height: 520, background: '#f8fafc' }}>
                        {!isValid ? (
                            <EndedCard kind={null} />
                        ) : isEnded ? (
                            <EndedCard kind={endedKind} />
                        ) : driverCoord && marker ? (
                            <Map
                                center={[driverCoord.lat, driverCoord.lng]}
                                zoom={13}
                                markers={[marker]}
                                height="100%"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted">
                                {!tokenReady ? 'Preparing…' : 'Waiting for the first GPS update…'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RideSharePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center text-muted">
                    Loading…
                </div>
            }
        >
            <RideSharePageInner />
        </Suspense>
    );
}
