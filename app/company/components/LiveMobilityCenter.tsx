'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Users,
    Bus,
    Car,
    Calendar,
    AlertTriangle,
    Navigation,
    Clock,
    RefreshCw,
    Radio,
    MapPin,
    X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Card } from './DashboardComponents';
import { apiClient } from '../../lib/services/api-client';
import { useAppSelector } from '../../lib/store/hooks';
import { selectDashboardStats } from '../../lib/store/slices/dashboardSlice';
import { selectCompany } from '../../lib/store/slices/companySlice';
import { useLiveMobilityTracking } from '../../lib/hooks/useLiveMobilityTracking';
import type { MapMarker } from '../../admin/ui/Map';

// Dynamic import for Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../../admin/ui/Map'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-[var(--surface-muted)] animate-pulse flex items-center justify-center rounded-2xl">
            <span className="text-[var(--text-muted)] text-sm font-medium">Initializing Real-time Map...</span>
        </div>
    ),
});

interface LiveMobilityCenterProps {
    data: {
        activeRides: number;
        employeesTraveling: number;
        shuttlesRunning: number;
        chauffeurRides: number;
        upcomingBookings: number;
    };
}

// ── Internal trip registry ────────────────────────────────────────────────────
interface TripEntry {
    id: number;
    type: 'shuttle' | 'chauffeur';
    label: string;
    /** Last known REST position (stop coord / pickup coord) */
    restLat: number | null;
    restLng: number | null;
    /** Full raw trip object — shuttles only, used for the click detail panel */
    rawTrip?: any;
}

const LiveMobilityCenter = ({ data }: LiveMobilityCenterProps) => {
    const router = useRouter();
    const company = useAppSelector(selectCompany);
    const dashboardStats = useAppSelector(selectDashboardStats);

    const [currentTime, setCurrentTime] = useState(new Date());
    const [trips, setTrips] = useState<TripEntry[]>([]);
    const [tripsLoading, setTripsLoading] = useState(true);
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
    const [defaultCenter, setDefaultCenter] = useState<[number, number]>([24.8607, 67.0011]);
    const [selectedShuttleTrip, setSelectedShuttleTrip] = useState<any | null>(null);
    const [tripEmployees, setTripEmployees] = useState<any[]>([]);
    const [tripEmployeesLoading, setTripEmployeesLoading] = useState(false);

    // Clock tick
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // ── Service gates ──────────────────────────────────────────────────────────
    const hasShuttle = company?.services_enabled?.shuttle_enabled ?? false;
    const hasChauffeur = company?.services_enabled?.chauffeur_enabled ?? false;

    // ── Real counters from mobility block ─────────────────────────────────────
    const mobility = dashboardStats?.mobility ?? data;
    const stats = [
        { label: 'Active rides',         value: mobility.activeRides,        icon: <Navigation size={20} />, show: true },
        { label: 'Employees travelling', value: mobility.employeesTraveling,  icon: <Users size={20} />,     show: true },
        { label: 'Shuttles running',     value: mobility.shuttlesRunning,     icon: <Bus size={20} />,       show: hasShuttle },
        { label: 'Chauffeur rides',      value: mobility.chauffeurRides,      icon: <Car size={20} />,       show: hasChauffeur },
        { label: 'Upcoming rides',       value: mobility.upcomingBookings,    icon: <Calendar size={20} />,  show: true },
    ].filter(s => s.show);

    // ── Fetch active trip IDs: shuttles + chauffeur ────────────────────────────
    const fetchActiveTrips = useCallback(async () => {
        const companyId = company?.id;
        if (!companyId) return;

        setTripsLoading(true);
        try {
            const [shuttleResp, chauffeurResp] = await Promise.allSettled([
                hasShuttle
                    ? apiClient.getTodayShuttleTrips(companyId)
                    : Promise.resolve(null),
                hasChauffeur
                    ? apiClient.getActiveCompanyChauffeurBookings(companyId)
                    : Promise.resolve(null),
            ]);

            const collected: TripEntry[] = [];

            // ── Shuttle trips ────────────────────────────────────────────────
            if (hasShuttle && shuttleResp.status === 'fulfilled' && shuttleResp.value !== null) {
                const raw = shuttleResp.value;
                // The today endpoint returns a plain array directly
                const list: any[] = Array.isArray(raw)
                    ? raw
                    : Array.isArray(raw?.data?.data)
                        ? raw.data.data
                        : Array.isArray(raw?.data)
                            ? raw.data
                            : [];
                const active = list.filter((t: any) =>
                    ['STARTED', 'IN_PROGRESS'].includes(t.status ?? ''),
                );

                for (const trip of active) {
                    const routeName = trip.routes?.name ?? `Route ${trip.route_id}`;
                    const direction = trip.direction === 'MORNING' ? '↑ AM' : '↓ PM';
                    const occupancy = trip.routes?._count?.employee_route_assignments ?? null;
                    const occupancyStr = occupancy !== null ? ` · ${occupancy} emp` : '';

                    const stops: any[] = trip.route_stops_with_coords ?? trip.routes?.route_stops ?? [];
                    let restLat: number | null = null;
                    let restLng: number | null = null;

                    const current = stops.find((s: any) => s.id === trip.current_stop_id);
                    if (current?.lat && current?.lng) {
                        restLat = current.lat;
                        restLng = current.lng;
                    } else {
                        const first = stops.find((s: any) => s.lat && s.lng);
                        if (first) { restLat = first.lat; restLng = first.lng; }
                    }

                    if (collected.length === 0 && restLat !== null && restLng !== null) {
                        setDefaultCenter([restLat, restLng]);
                    }

                    collected.push({
                        id: trip.id as number,
                        type: 'shuttle',
                        label: `${routeName} ${direction} — ${trip.status}${occupancyStr}`,
                        restLat,
                        restLng,
                        rawTrip: trip,
                    });
                }
            }

            // ── Chauffeur bookings ────────────────────────────────────────────
            // Fetch OTW + ARRIVED + IN_PROGRESS in parallel — these are the same
            // three statuses the dashboard activeRides counter uses.
            if (hasChauffeur && chauffeurResp.status === 'fulfilled' && chauffeurResp.value !== null) {
                const [otw, arrived] = await Promise.allSettled([
                    apiClient.request<any>(`/companies/${companyId}/chauffeur-bookings?status=OTW&limit=50`),
                    apiClient.request<any>(`/companies/${companyId}/chauffeur-bookings?status=ARRIVED&limit=50`),
                ]);

                const extractList = (res: PromiseSettledResult<any>): any[] => {
                    if (res.status !== 'fulfilled') return [];
                    const raw = res.value;
                    return Array.isArray(raw)
                        ? raw
                        : Array.isArray(raw?.data?.data)
                            ? raw.data.data
                            : Array.isArray(raw?.data)
                                ? raw.data
                                : [];
                };

                // IN_PROGRESS was already fetched via chauffeurResp
                const inProgressRaw = chauffeurResp.value;
                const inProgressList: any[] = Array.isArray(inProgressRaw)
                    ? inProgressRaw
                    : Array.isArray(inProgressRaw?.data?.data)
                        ? inProgressRaw.data.data
                        : Array.isArray(inProgressRaw?.data)
                            ? inProgressRaw.data
                            : [];

                const allBookings = [...extractList(otw), ...extractList(arrived), ...inProgressList];
                // Deduplicate by id
                const seen = new Set<number>();
                const list = allBookings.filter(b => { if (seen.has(b.id)) return false; seen.add(b.id); return true; });

                for (const booking of list) {
                    const passengerName =
                        booking.passenger_name ??
                        booking.users_chauffeur_bookings_passenger_idTousers?.full_name ??
                        'Passenger';

                    // pickup_lat/lng come from PostGIS and are NOT returned by the standard
                    // Prisma endpoint — they will be null here. The socket tracking hook
                    // (useLiveMobilityTracking) will supply live coordinates once the driver
                    // emits a location update; the marker uses defaultCenter as a temporary
                    // placeholder until the first socket update arrives.
                    collected.push({
                        id: booking.id as number,
                        type: 'chauffeur',
                        label: `Chauffeur · ${passengerName} — ${booking.status}`,
                        restLat: booking.pickup_lat ?? null,
                        restLng: booking.pickup_lng ?? null,
                    });
                }
            }

            setTrips(collected);
            setLastRefreshed(new Date());
        } catch (err) {
            console.error('[LiveMobilityCenter] fetchActiveTrips error', err);
        } finally {
            setTripsLoading(false);
        }
    }, [company?.id, hasShuttle, hasChauffeur]);

    useEffect(() => {
        fetchActiveTrips();
        const interval = setInterval(fetchActiveTrips, 60_000);
        return () => clearInterval(interval);
    }, [fetchActiveTrips]);

    // ── Live socket tracking ───────────────────────────────────────────────────
    // Stable reference: only re-create when the set of ids/types changes
    const trackingInput = useMemo(
        () => trips.map((t) => ({ id: t.id, type: t.type })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [trips.map((t) => `${t.type}:${t.id}`).join(',')],
    );
    const { vehicleCoords, isConnected } = useLiveMobilityTracking(trackingInput);

    // ── Build map markers: socket coords override REST fallback ───────────────
    // If neither source has coords yet (e.g. chauffeur booking before first socket
    // update, since pickup_lat/lng aren't returned by the Prisma endpoint), fall back
    // to the city default so the marker is visible and snaps to real position once the
    // socket fires its first update.
    const markers = useMemo((): MapMarker[] => {
        return trips.flatMap((trip) => {
            const live = vehicleCoords[String(trip.id)];
            const hasLive = live && live.updatedAt > 0 && live.lat !== 0 && live.lng !== 0;
            const lat = hasLive ? live.lat : (trip.restLat ?? defaultCenter[0]);
            const lng = hasLive ? live.lng : (trip.restLng ?? defaultCenter[1]);
            const isPending = !hasLive && trip.restLat === null;
            return [{
                id: `${trip.type}-${trip.id}`,
                position: [lat, lng] as [number, number],
                label: trip.label + (hasLive ? ' 🔴' : isPending ? ' ⏳' : ''),
                type: trip.type,
            }];
        });
    }, [trips, vehicleCoords, defaultCenter]);

    // Auto-center: prefer first live socket coord, then first REST coord
    const mapCenter = useMemo((): [number, number] => {
        for (const trip of trips) {
            const live = vehicleCoords[String(trip.id)];
            if (live && live.updatedAt > 0 && live.lat !== 0) return [live.lat, live.lng];
        }
        return defaultCenter;
    }, [vehicleCoords, trips, defaultCenter]);

    const liveCount = useMemo(
        () => Object.values(vehicleCoords).filter((c) => c.updatedAt > 0 && c.lat !== 0).length,
        [vehicleCoords],
    );
    const shuttleCount = trips.filter((t) => t.type === 'shuttle').length;
    const chauffeurCount = trips.filter((t) => t.type === 'chauffeur').length;

    // ── Shuttle marker click: show onboard detail panel ───────────────────────
    const handleMarkerClick = useCallback(async (markerId: string) => {
        const firstDash = markerId.indexOf('-');
        const type = markerId.slice(0, firstDash);
        const tripId = Number(markerId.slice(firstDash + 1));
        if (type !== 'shuttle' || isNaN(tripId)) return;
        const entry = trips.find(t => t.type === 'shuttle' && t.id === tripId);
        if (!entry) return;
        setSelectedShuttleTrip(entry.rawTrip ?? { id: tripId, label: entry.label });
        setTripEmployees([]);
        setTripEmployeesLoading(true);
        try {
            const data = await apiClient.request<any[]>(`/shuttle-trips/${tripId}/employees`);
            setTripEmployees(Array.isArray(data) ? data : []);
        } catch {
            setTripEmployees([]);
        } finally {
            setTripEmployeesLoading(false);
        }
    }, [trips]);

    // ── Service performance ────────────────────────────────────────────────────
    const onTimeRate = useMemo(() => {
        if (!hasChauffeur) return null;
        if (!dashboardStats || dashboardStats.chauffeur.completedThisMonth <= 0) return null;
        return Math.min(100, Math.round(
            ((dashboardStats.chauffeur.completedThisMonth - (dashboardStats.chauffeur.unassignedBookings || 0))
                / dashboardStats.chauffeur.completedThisMonth) * 100,
        ));
    }, [dashboardStats, hasChauffeur]);

    const fleetUtilization = useMemo(() => {
        if (!hasShuttle) return null;
        if (!dashboardStats || dashboardStats.shuttle.totalRoutes === 0) return null;
        return Math.min(100, Math.round((mobility.shuttlesRunning / dashboardStats.shuttle.totalRoutes) * 100));
    }, [dashboardStats, mobility.shuttlesRunning, hasShuttle]);

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <Card className="p-0 overflow-hidden border-none shadow-2xl bg-[var(--bg-page)] min-h-[600px] flex flex-col rounded-4xl">
            {/* Header Area */}
            <div className="m-4 mb-0 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-card)] text-[var(--text-primary)] rounded-4xl border border-[var(--border-default)]">
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 px-6 rounded-3xl border border-[var(--border-input)]">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                        <div className="relative w-3 h-3 bg-red-500 rounded-full border border-white/20"></div>
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight uppercase text-[var(--text-primary)]">Live Mobility Command Center</h2>
                        <p className="text-[var(--text-secondary)] text-[10px] font-bold tracking-widest uppercase mb-0">Real-time Operational Overview</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Socket live indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors
                        ${isConnected
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-white/5 border-[var(--border-input)] text-[var(--text-muted)]'}`}>
                        <Radio size={11} className={isConnected ? 'text-green-400' : 'text-[var(--text-muted)]'} />
                        {isConnected ? 'Live' : 'Connecting…'}
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">Ops Time</span>
                        <div className="font-mono text-lg font-bold text-orange">
                            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                    </div>
                    <button
                        onClick={fetchActiveTrips}
                        className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                        title="Refresh trips"
                    >
                        <RefreshCw size={16} className={`text-[var(--text-primary)] ${tripsLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Counters Strip */}
            <div className="m-4 mt-5 px-6 py-4 bg-white/5 border border-[var(--border-input)] rounded-4xl flex flex-wrap md:flex-nowrap justify-between gap-4 shadow-sm">
                {stats.map((stat, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                        <div className="flex items-center gap-2 text-[var(--text-primary)] mb-1 justify-center">
                            <span className="p-1 px-1.5 rounded-md bg-white/20 text-orange">{stat.icon}</span>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <div className="text-3xl font-black text-[var(--text-primary)]">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Live Map & Sidebar */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-[400px]">
                {/* Map Area */}
                <div className="flex-1 relative order-2 lg:order-1">
                    <div className="absolute inset-0 p-4">
                        {/* Outer wrapper — clips map to rounded corners */}
                        <div className="w-full h-full rounded-4xl overflow-hidden border border-[var(--border-input)] shadow-inner relative">
                            <Map
                                height="100%"
                                markers={markers}
                                center={mapCenter}
                                zoom={12}
                                className="!rounded-none !border-0 !shadow-none grayscale-[0.2] brightness-[0.9] contrast-[1.1]"
                                onMarkerClick={handleMarkerClick}
                            />
                        </div>

                        {/* Status chip — outside overflow-hidden so it isn't clipped */}
                        <div className="absolute top-8 left-8 z-[500] flex flex-col gap-2 pointer-events-none">
                            <div className={`backdrop-blur-md border p-2 px-4 rounded-xl flex items-center gap-3 shadow-lg
                                ${liveCount > 0
                                    ? 'bg-green-900/80 border-green-500/40'
                                    : trips.length > 0
                                        ? 'bg-[var(--bg-card)]/90 border-white/20'
                                        : 'bg-[var(--bg-card)]/80 border-[var(--border-input)]'}`}>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0
                                    ${liveCount > 0 ? 'bg-green-400 animate-pulse'
                                        : trips.length > 0 ? 'bg-orange animate-pulse'
                                            : 'bg-white/30'}`} />
                                <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-wider">
                                    {tripsLoading
                                        ? 'Syncing…'
                                        : liveCount > 0
                                            ? `${liveCount} vehicle${liveCount !== 1 ? 's' : ''} live`
                                            : trips.length > 0
                                                ? `${trips.length} trip${trips.length !== 1 ? 's' : ''} tracked`
                                                : 'No active trips'}
                                </span>
                            </div>
                            {lastRefreshed && (
                                <div className="bg-[var(--bg-card)]/80 backdrop-blur-md border border-[var(--border-input)] p-1.5 px-3 rounded-xl flex items-center gap-2 shadow-sm">
                                    <Clock size={10} className="text-[var(--text-muted)]" />
                                    <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                        Synced {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Shuttle detail panel — slides in when a shuttle marker is clicked */}
                        {selectedShuttleTrip && (
                            <div className="absolute top-4 right-4 bottom-4 w-72 z-[600] flex flex-col bg-[var(--bg-card)] border border-[var(--border-default)] rounded-4xl shadow-2xl overflow-hidden">
                                {/* Header */}
                                <div className="p-4 border-b border-[var(--border-default)]">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                                    selectedShuttleTrip.direction === 'MORNING'
                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                }`}>
                                                    {selectedShuttleTrip.direction === 'MORNING' ? '↑ Morning' : '↓ Evening'}
                                                </span>
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    {selectedShuttleTrip.status}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-black text-[var(--text-primary)] leading-tight">
                                                {selectedShuttleTrip.routes?.name ?? `Route ${selectedShuttleTrip.route_id}`}
                                            </h3>
                                            {selectedShuttleTrip.routes?.vehicles && (
                                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium">
                                                    {[selectedShuttleTrip.routes.vehicles.model, selectedShuttleTrip.routes.vehicles.plate_number].filter(Boolean).join(' · ')}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setSelectedShuttleTrip(null)}
                                            className="p-1.5 rounded-xl bg-[var(--surface-subtle)] hover:bg-[var(--border-default)] transition-colors flex-shrink-0"
                                        >
                                            <X size={13} className="text-[var(--text-primary)]" />
                                        </button>
                                    </div>
                                </div>

                                {/* Current stop */}
                                {(() => {
                                    const stops: any[] = selectedShuttleTrip.routes?.route_stops ?? [];
                                    const currentStop = stops.find((s: any) => s.id === selectedShuttleTrip.current_stop_id);
                                    if (!currentStop) return null;
                                    return (
                                        <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-[var(--cort-orange)]/10 flex items-center justify-center flex-shrink-0">
                                                <MapPin size={12} className="text-[var(--cort-orange)]" />
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Current Stop</div>
                                                <div className="text-xs font-bold text-[var(--text-primary)]">{currentStop.name}</div>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Occupancy */}
                                <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users size={13} className="text-[var(--text-muted)]" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Passengers</span>
                                    </div>
                                    <span className="text-sm font-black text-[var(--text-primary)]">
                                        {selectedShuttleTrip.routes?._count?.employee_route_assignments ?? '—'}
                                    </span>
                                </div>

                                {/* Employee list */}
                                <div className="flex-1 overflow-y-auto">
                                    <div className="px-4 py-2.5 bg-[var(--surface-subtle)] border-b border-[var(--border-default)]">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)]">Assigned Employees</span>
                                    </div>
                                    <div className="p-3 space-y-2">
                                        {tripEmployeesLoading ? (
                                            Array.from({ length: 4 }).map((_, i) => (
                                                <div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--surface-subtle)] animate-pulse">
                                                    <div className="w-7 h-7 rounded-full bg-[var(--border-default)]" />
                                                    <div className="flex-1 space-y-1.5">
                                                        <div className="h-2.5 bg-[var(--border-default)] rounded w-3/4" />
                                                        <div className="h-2 bg-[var(--border-default)] rounded w-1/2" />
                                                    </div>
                                                </div>
                                            ))
                                        ) : tripEmployees.length === 0 ? (
                                            <div className="py-8 flex flex-col items-center gap-2">
                                                <Users size={20} className="text-[var(--text-muted)] opacity-40" />
                                                <p className="text-[10px] text-[var(--text-muted)] font-bold">No employees assigned</p>
                                            </div>
                                        ) : (
                                            tripEmployees.map((emp: any, i: number) => (
                                                <div key={emp.id ?? i} className="flex items-center gap-3 p-2.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-light)]">
                                                    <div className="w-7 h-7 rounded-full bg-[var(--cort-orange)]/10 flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[10px] font-black text-[var(--cort-orange)]">
                                                            {(emp.users?.full_name ?? '?').charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                                                            {emp.users?.full_name ?? 'Unknown'}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                            {emp.route_stops?.name && (
                                                                <span className="text-[9px] text-[var(--text-muted)] font-medium flex items-center gap-0.5">
                                                                    <MapPin size={8} />
                                                                    {emp.route_stops.name}
                                                                </span>
                                                            )}
                                                            {emp.users?.department && (
                                                                <span className="text-[9px] text-[var(--text-muted)] truncate">{emp.users.department}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Legend — outside overflow-hidden so it isn't clipped */}
                        <div className="absolute bottom-8 right-8 z-[500] bg-[var(--bg-card)] backdrop-blur-md border border-white/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-2 pointer-events-none">
                            <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest mb-1 font-mono">Live Legend</span>
                            {hasShuttle && (
                                <div className="flex items-center gap-3">
                                    <img src="/bus_birdeye.png" alt="shuttle" className="w-6 h-6 object-contain" />
                                    <span className="text-xs text-white font-black tracking-tight">
                                        Shuttle{shuttleCount > 0 ? ` (${shuttleCount})` : ''}
                                    </span>
                                </div>
                            )}
                            {hasChauffeur && (
                                <div className="flex items-center gap-3">
                                    <img src="/car_birdeye.png" alt="chauffeur" className="w-5 h-5 object-contain" />
                                    <span className="text-xs text-white font-black tracking-tight">
                                        Chauffeur{chauffeurCount > 0 ? ` (${chauffeurCount})` : ''}
                                    </span>
                                </div>
                            )}
                            {liveCount > 0 && (
                                <div className="flex items-center gap-2 pt-1 border-t border-white/20">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_6px_#4ade80]" />
                                    <span className="text-[9px] text-green-400 font-black uppercase tracking-wider">Socket Live</span>
                                </div>
                            )}
                            {trips.length === 0 && !tripsLoading && (
                                <p className="text-[9px] text-[var(--text-muted)] font-bold mt-1">No trips today</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="w-full lg:w-80 m-4 lg:ml-0 p-6 flex flex-col gap-4 bg-orange rounded-4xl shadow-2xl order-1 lg:order-2 text-[var(--text-primary)]">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Active Alerts</h3>
                        {hasChauffeur && (dashboardStats?.chauffeur.unassignedBookings ?? 0) > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[var(--text-primary)] text-[9px] font-black uppercase border border-[var(--border-input)]">
                                {dashboardStats!.chauffeur.unassignedBookings} Unassigned
                            </span>
                        )}
                    </div>

                    <div className="space-y-3 flex-1">
                        {/* Unassigned rides — chauffeur only */}
                        {hasChauffeur && (dashboardStats?.chauffeur.unassignedBookings ?? 0) > 0 && (
                            <div
                                className="p-3 rounded-2xl bg-white/15 border border-white/20 hover:bg-white/25 transition-colors cursor-pointer"
                                onClick={() => router.push('/company/bookings')}
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle size={16} className="text-[var(--text-primary)] mt-1 shrink-0" />
                                    <div>
                                        <div className="text-[11px] font-black text-[var(--text-primary)]">Unassigned Bookings</div>
                                        <div className="text-[10px] text-white font-bold leading-tight mt-1">
                                            {dashboardStats!.chauffeur.unassignedBookings} booking{dashboardStats!.chauffeur.unassignedBookings !== 1 ? 's' : ''} pending driver assignment.
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock size={10} className="text-[var(--text-secondary)]" />
                                            <span className="text-[9px] text-[var(--text-secondary)] font-black">Needs attention</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Upcoming rides */}
                        {mobility.upcomingBookings > 0 && (
                            <div
                                className="p-3 rounded-2xl bg-white/20 border border-white/30 hover:bg-white/30 transition-colors cursor-pointer"
                                onClick={() => hasChauffeur ? router.push('/company/bookings') : hasShuttle ? router.push('/company/routes') : undefined}
                            >
                                <div className="flex items-start gap-3">
                                    <Calendar size={16} className="text-[var(--text-primary)] mt-1 shrink-0" />
                                    <div>
                                        <div className="text-[11px] font-black text-[var(--text-primary)]">Upcoming Bookings</div>
                                        <div className="text-[10px] text-white font-bold leading-tight mt-1">
                                            {mobility.upcomingBookings} ride{mobility.upcomingBookings !== 1 ? 's' : ''} in the next 7 days.
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Clock size={10} className="text-[var(--text-secondary)]" />
                                            <span className="text-[9px] text-[var(--text-secondary)] font-black">Next 7 days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* On-map summary */}
                        {trips.length > 0 && (
                            <div className="p-3 rounded-2xl bg-white/10 border border-white/20">
                                <div className="flex items-start gap-3">
                                    <Navigation size={16} className="text-[var(--text-primary)] mt-1 shrink-0" />
                                    <div>
                                        <div className="text-[11px] font-black text-[var(--text-primary)]">On the Map</div>
                                        <div className="text-[10px] text-[var(--text-secondary)] font-bold leading-tight mt-1">
                                            {hasShuttle && shuttleCount > 0 && `${shuttleCount} shuttle${shuttleCount !== 1 ? 's' : ''}`}
                                            {hasShuttle && shuttleCount > 0 && hasChauffeur && chauffeurCount > 0 && ' · '}
                                            {hasChauffeur && chauffeurCount > 0 && `${chauffeurCount} chauffeur ride${chauffeurCount !== 1 ? 's' : ''}`}
                                            {liveCount > 0 && ` · ${liveCount} live 🔴`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* All clear */}
                        {(!hasChauffeur || (dashboardStats?.chauffeur.unassignedBookings ?? 0) === 0) &&
                            mobility.upcomingBookings === 0 &&
                            trips.length === 0 && (
                            <div className="p-3 rounded-2xl bg-white/10 border border-white/20">
                                <div className="text-[11px] font-black text-[var(--text-primary)] text-center py-2">✓ All Clear</div>
                                <div className="text-[10px] text-[var(--text-secondary)] font-bold text-center">No active alerts at this time.</div>
                            </div>
                        )}

                        {/* CTA — adapts to enabled services */}
                        {hasShuttle && (
                            <button
                                onClick={() => router.push('/company/routes')}
                                className="w-full mt-2 py-3 rounded-xl bg-[var(--bg-page)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-black uppercase tracking-widest transition-all shadow-lg active:translate-y-0.5"
                            >
                                Track Routes Live →
                            </button>
                        )}
                        {!hasShuttle && hasChauffeur && (
                            <button
                                onClick={() => router.push('/company/bookings')}
                                className="w-full mt-2 py-3 rounded-xl bg-[var(--bg-page)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-black uppercase tracking-widest transition-all shadow-lg active:translate-y-0.5"
                            >
                                View Bookings →
                            </button>
                        )}
                    </div>

                    {/* Service performance */}
                    <div className="pt-4 border-t border-white/15">
                        <div className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest mb-3 opacity-60">Service Performance</div>
                        <div className="space-y-3">
                            {onTimeRate !== null && (
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-tighter">
                                        <span>On-Time Rate</span>
                                        <span className="text-white font-black">{onTimeRate}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white shadow-[0_0_8px_white]" style={{ width: `${onTimeRate}%` }}></div>
                                    </div>
                                </div>
                            )}
                            {fleetUtilization !== null && (
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-tighter">
                                        <span>Shuttle Utilization</span>
                                        <span className="text-white font-black">{fleetUtilization}%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white shadow-[0_0_8px_white]" style={{ width: `${fleetUtilization}%` }}></div>
                                    </div>
                                </div>
                            )}
                            {onTimeRate === null && fleetUtilization === null && (
                                <p className="text-[10px] text-[var(--text-muted)] font-bold text-center py-1">Collecting data…</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default LiveMobilityCenter;
