'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Bus, MapPin, Navigation, RefreshCw, Radio, ChevronLeft, X } from 'lucide-react';
import { Button } from '@/app/admin/ui/Button';
import { PageHeader, TABLE_CARD_CLASS, TABLE_TOP_BAR_CLASS } from '@/app/company/components/PageLayout';
import { Card } from '@/app/company/components/DashboardComponents';
import { apiClient } from '@/app/lib/services/api-client';
import { useShuttleTracking } from '@/app/lib/hooks/useShuttleTracking';
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

// ---- Types ----------------------------------------------------------------

type RouteStop = {
    id: number;
    name: string;
    sequence_order: number;
    morning_eta: string | null;
    evening_eta: string | null;
    lat: number | null;
    lng: number | null;
};

type ShuttleTrip = {
    id: number;
    direction: 'MORNING' | 'EVENING';
    status: string;
    started_at: string | null;
    completed_at: string | null;
    current_stop_id: number | null;
    /** Last-known driver GPS position (Redis shuttle:last_coord), embedded by the backend
     * for STARTED/IN_PROGRESS trips — avoids a separate .../last-location request. */
    last_lat?: number | null;
    last_lng?: number | null;
    routes?: {
        id: number;
        name: string;
        vehicles?: { id: number; plate_number: string; model: string | null } | null;
        route_stops?: RouteStop[];
    } | null;
};

type PolylineResponse = {
    points: { lat: number; lng: number }[];
    encodedPolyline: string;
};

// ---- Helpers ---------------------------------------------------------------


// ---- Component -------------------------------------------------------------

export default function CompanyRouteTrackingPage() {
    const params = useParams();
    const router = useRouter();
    const t = useTranslations('company.routes.tracking');
    const tRoutes = useTranslations('company.routes');
    const tCommon = useTranslations('common');
    const routeId = params.id ? +params.id : null;

    const [trips, setTrips] = useState<ShuttleTrip[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
    const [polyline, setPolyline] = useState<PolylineResponse | null>(null);

    const selectedTrip = useMemo(
        () => trips.find((t) => t.id === selectedTripId) ?? null,
        [trips, selectedTripId],
    );

    const { driverCoord, isConnected } = useShuttleTracking({
        tripId: selectedTripId,
        initialLat: selectedTrip?.last_lat ?? null,
        initialLng: selectedTrip?.last_lng ?? null,
    });

    // ---- Data fetching -------------------------------------------------------

    const loadTrips = useCallback(async () => {
        if (!routeId) return;
        try {
            setLoading(true);
            setError(null);
            const now = new Date();
            const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            // Fetch trips for this specific route for today
            const data = await apiClient.request<ShuttleTrip[]>(`/shuttle-trips/today?date=${date}&route_id=${routeId}`);
            const list = Array.isArray(data) ? data : ((data as unknown) as { data: ShuttleTrip[] }).data ?? [];
            setTrips(list);

            // Select the first trip (usually the active one if available due to backend sorting)
            if (list.length > 0 && !selectedTripId) {
                setSelectedTripId(list[0].id);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t('failedToLoadTracking'));
        } finally {
            setLoading(false);
        }
    }, [routeId, selectedTripId]);

    const loadPolyline = useCallback(async (tripId: number) => {
        try {
            const data = await apiClient.request<PolylineResponse>(`/shuttle-trips/${tripId}/polyline`);
            setPolyline(data);
        } catch {
            setPolyline(null);
        }
    }, []);

    useEffect(() => {
        loadTrips();
    }, [loadTrips]);

    useEffect(() => {
        if (selectedTripId) {
            setPolyline(null);
            loadPolyline(selectedTripId);
        }
    }, [selectedTripId, loadPolyline]);

    // ---- Map data -------------------------------------------------------

    const stopMarkers: MapMarker[] = useMemo(() => {
        const stops = selectedTrip?.routes?.route_stops ?? [];
        return stops
            .filter((s) => s.lat !== null && s.lng !== null)
            .map((s) => ({
                id: `stop-${s.id}`,
                position: [s.lat!, s.lng!] as [number, number],
                label: `${s.name}${selectedTrip?.direction === 'MORNING' ? (s.morning_eta ? ` · ${s.morning_eta}` : '') : (s.evening_eta ? ` · ${s.evening_eta}` : '')}`,
                color: s.id === selectedTrip?.current_stop_id ? '#f47f00' : '#6366f1',
            }));
    }, [selectedTrip]);

    const driverMarker: MapMarker | null = useMemo(() => {
        if (!driverCoord) return null;
        return {
            id: 'driver',
            type: 'shuttle',
            position: [driverCoord.lat, driverCoord.lng],
            heading: driverCoord.heading,
            label: driverCoord.speed !== undefined
                ? t('driverLabel', { speed: `${Math.round((driverCoord.speed ?? 0) * 3.6)} km/h` })
                : t('driverLive'),
        };
    }, [driverCoord]);

    const mapMarkers = useMemo(
        () => [...stopMarkers, ...(driverMarker ? [driverMarker] : [])],
        [stopMarkers, driverMarker],
    );

    const mapPolylines: MapPolyline[] = useMemo(() => {
        if (!polyline?.points?.length) return [];
        const allPoints = polyline.points.map((p) => [p.lat, p.lng] as [number, number]);

        const lines: MapPolyline[] = [
            {
                positions: allPoints,
                color: '#0C225E',
                weight: 4,
                opacity: 0.2,
            }
        ];

        if (driverCoord) {
            let minDist = Infinity;
            let nearestIdx = 0;
            for (let i = 0; i < allPoints.length; i++) {
                const dLat = allPoints[i][0] - driverCoord.lat;
                const dLng = allPoints[i][1] - driverCoord.lng;
                const dist = dLat * dLat + dLng * dLng;
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = i;
                }
            }

            // Slice remaining points
            const remainingPoints = allPoints.slice(nearestIdx);

            if (remainingPoints.length >= 2) {
                lines.push({
                    positions: remainingPoints,
                    color: '#f47f00',
                    weight: 6,
                    opacity: 1,
                });
            }
        } else {
            // If no driver yet, show the full line as solid orange or navy
            lines.push({
                positions: allPoints,
                color: '#f47f00',
                weight: 5,
                opacity: 0.8,
                dashArray: '10, 5'
            });
        }

        return lines;
    }, [polyline, driverCoord]);

    const mapCenter = useMemo((): [number, number] => {
        if (driverCoord) return [driverCoord.lat, driverCoord.lng];
        const firstStop = selectedTrip?.routes?.route_stops?.find((s) => s.lat && s.lng);
        if (firstStop) return [firstStop.lat!, firstStop.lng!];
        return [24.8607, 67.0011];
    }, [driverCoord, selectedTrip]);

    // ---- Render ----------------------------------------------------------------

    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12 px-4 md:px-6">
            <PageHeader
                label={tRoutes('shuttleOperations')}
                title={selectedTrip?.routes?.name || t('liveRouteStatus')}
                description={t('description')}
                action={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="text-muted hover:text-navy font-semibold text-xs flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            {tCommon('actions.back')}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={loadTrips}
                            disabled={loading}
                            className="bg-white border-border shadow-sm hover:border-navy/20 h-10 px-4 rounded-lg text-xs font-semibold"
                        >
                            <RefreshCw
                                className={`w-3.5 h-3.5 me-2 ${loading ? 'animate-spin' : ''}`}
                            />
                            {t('refreshData')}
                        </Button>
                    </div>
                }
            />

            <div className="flex flex-col lg:flex-row gap-6 min-h-[700px]">
                {/* Left Sidebar - Structured Selection & Info */}
                <aside className="w-full lg:w-96 shrink-0 flex flex-col gap-6 dashboard-section">
                    <Card className={`overflow-hidden shadow-sm !p-0 ${TABLE_CARD_CLASS}`}>
                        <div className={TABLE_TOP_BAR_CLASS}>
                            <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-4">{t('todaysSchedule')}</h2>
                            <div className="space-y-3 overflow-y-auto max-h-[40vh] pe-1 custom-scrollbar">
                                {trips.length === 0 && !loading && (
                                    <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl">
                                        <Bus className="w-8 h-8 mx-auto mb-2 text-muted/30" />
                                        <p className="text-xs text-muted">{t('noTripsToday')}</p>
                                    </div>
                                )}

                                {trips.map((trip, idx) => (
                                    <button
                                        key={trip.id}
                                        type="button"
                                        onClick={() => setSelectedTripId(trip.id)}
                                        className={`
                                            w-full text-start rounded-xl border-2 transition-all duration-300
                                            p-4
                                            ${selectedTripId === trip.id
                                                ? 'bg-navy text-white border-navy shadow-md ring-1 ring-navy/20'
                                                : 'bg-white border-border text-gray-900 hover:border-navy/20 hover:shadow-sm'
                                            }
                                        `}
                                        style={{ animationDelay: `${(idx + 1) * 80}ms` }}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`
                                                        w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                                                        ${selectedTripId === trip.id ? 'bg-white/10' : 'bg-orange/5'}
                                                    `}
                                                >
                                                    <Bus
                                                        className={`w-4 h-4 ${selectedTripId === trip.id ? 'text-white' : 'text-orange'}`}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm tracking-tight">
                                                        {t('directionTrip', { direction: trip.direction })}
                                                    </p>
                                                    <p className={`text-[10px] mt-0.5 ${selectedTripId === trip.id ? 'text-white/60' : 'text-muted'}`}>
                                                        {trip.routes?.vehicles?.plate_number ?? t('noVehicle')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`
                                                    text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-tighter
                                                    ${selectedTripId === trip.id ? 'bg-white/20 text-white' : 'bg-surface-muted text-navy'}
                                                `}
                                            >
                                                {trip.status}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Active Trip Details - Sidebar Section */}
                        <div className="p-5 space-y-6">
                            {selectedTrip ? (
                                <>
                                    <div>
                                        <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-4">{t('liveTelemetry')}</h2>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-orange/10 flex items-center justify-center">
                                                        <Navigation className="w-4 h-4 text-orange" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-navy">{t('tripStatus')}</span>
                                                </div>
                                                <span className="text-sm font-bold text-orange">{selectedTrip.status}</span>
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-xl bg-surface-subtle border border-border">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue/10 flex items-center justify-center">
                                                        <Radio className={`w-4 h-4 ${isConnected ? 'text-green-500' : 'text-blue'}`} />
                                                    </div>
                                                    <span className="text-sm font-semibold text-navy">{t('connection')}</span>
                                                </div>
                                                <span className={`text-[10px] font-bold uppercase ${isConnected ? 'text-green-600' : 'text-muted'}`}>
                                                    {isConnected ? t('highPrecision') : t('awaitingSignals')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h2 className="text-xs font-bold text-muted uppercase tracking-widest mb-4">{t('routeInfo')}</h2>
                                        <div className="p-4 rounded-xl bg-navy text-white shadow-xl shadow-navy/10">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                    <MapPin className="w-5 h-5 text-orange" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-white/50 uppercase">{t('totalStops')}</p>
                                                    <p className="text-lg font-bold">{t('scheduled', { count: selectedTrip.routes?.route_stops?.length || 0 })}</p>
                                                </div>
                                            </div>
                                            <div className="h-px bg-white/10 w-full mb-4" />
                                            <div className="flex items-center justify-between text-[11px] font-medium text-white/70">
                                                <span>{t('platformStatus')}</span>
                                                <span className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                    {t('cloudIntegrated')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-8 flex flex-col items-center justify-center text-center grayscale opacity-50">
                                    <MapPin className="w-10 h-10 mb-3 text-muted" />
                                    <p className="text-xs font-medium text-muted">{t('selectTripTelemetry')}</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </aside>

                {/* Main Content Area - Map Framed in Card */}
                <main className="flex-1 min-h-[500px] lg:min-h-[700px] dashboard-section dashboard-section-delay-1">
                    <Card className={`w-full h-full overflow-hidden border border-border shadow-sm flex flex-col relative !p-0 ${TABLE_CARD_CLASS}`}>
                        <div className="flex-1 relative">
                            <Map
                                center={mapCenter}
                                zoom={13}
                                markers={mapMarkers}
                                polylines={mapPolylines}
                                height="100%"
                                className="w-full h-full border-none shadow-none rounded-none"
                            />

                            {/* Map Floating Legend */}
                            {selectedTrip && (
                                <div className="absolute top-4 start-4 z-10">
                                    <div className="bg-white/95 border border-border shadow-md p-2 rounded-lg flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 pe-3 border-e border-border font-bold text-[10px] text-navy">
                                            <div className="w-2.5 h-2.5 rounded-full bg-orange animate-pulse" />
                                            {t('liveDriver')}
                                        </div>
                                        <div className="flex items-center gap-1.5 font-bold text-[10px] text-navy/60">
                                            <div className="w-2.5 h-0.5 bg-navy/20" />
                                            {t('plannedRoute')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </main>
            </div>

            {/* Error Overlay */}
            {error && (
                <div className="fixed top-20 start-1/2 -translate-x-1/2 z-50">
                    <div className="bg-white border-2 border-danger text-danger px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-slide-up font-bold text-sm">
                        <X className="w-4 h-4" />
                        {error}
                        <button onClick={() => setError(null)} className="ms-4 text-muted hover:text-danger">
                            <X className="w-4 h-4 font-bold" />
                        </button>
                    </div>
                </div>
            )}

            {/* Global Loading Overlay */}
            {loading && trips.length === 0 && (
                <div className="fixed inset-0 z-[100] bg-navy/5 backdrop-blur-[2px] flex items-center justify-center">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl border border-border flex flex-col items-center gap-4">
                        <div className="w-10 h-10 border-4 border-navy border-t-transparent rounded-full animate-spin" />
                        <p className="text-navy font-bold text-sm uppercase tracking-widest">{t('inSync')}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
