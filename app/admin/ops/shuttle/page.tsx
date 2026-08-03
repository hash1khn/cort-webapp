'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PermissionGate } from '@/app/admin/components/PermissionGate';
import { AdminCan } from '@/app/lib/abilities/AdminAbilityProvider';
import { Bus, MapPin, Navigation, RefreshCw, Radio, Square } from 'lucide-react';
import { Card } from '@/app/admin/ui/Card';
import { Button } from '@/app/admin/ui/Button';
import { apiClient } from '@/app/lib/services/api-client';
import { useAuth } from '@/app/lib/contexts/auth-context';
import { useShuttleTracking } from '@/app/lib/hooks/useShuttleTracking';
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';
import { useAppDispatch, useAppSelector } from '@/app/lib/store/hooks';
import { fetchAdminCompanies, selectAdminCompanies, selectAdminCompaniesStatus } from '@/app/lib/store/slices/adminCompaniesSlice';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SCHEDULED: 'bg-gray-100 text-gray-600',
    STARTED: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-orange-100 text-orange-700',
    COMPLETED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-600',
  };
  return map[status] ?? 'bg-gray-100 text-gray-600';
}

// ---- Component -------------------------------------------------------------

export default function OpsShuttlePage() {
  return (
    <PermissionGate permission="ops_shuttle">
      <AdminCan I="read" a="OpsShuttle">
        <OpsShuttleContent />
      </AdminCan>
    </PermissionGate>
  );
}

function isActiveShuttleStatus(status: string) {
  return status === 'STARTED' || status === 'IN_PROGRESS';
}

function OpsShuttleContent() {
  const dispatch = useAppDispatch();
  const { hasCrud } = useAuth();
  const canMutate = hasCrud('ops_shuttle', 'update');
  const companies = useAppSelector(selectAdminCompanies);
  const companiesStatus = useAppSelector(selectAdminCompaniesStatus);

  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [trips, setTrips] = useState<ShuttleTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [polyline, setPolyline] = useState<PolylineResponse | null>(null);
  const [polylineLoading, setPolylineLoading] = useState(false);
  const [endingTripId, setEndingTripId] = useState<number | null>(null);
  const [actionBanner, setActionBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const { driverCoord, isConnected } = useShuttleTracking({ tripId: selectedTripId });

  const selectedTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId) ?? null,
    [trips, selectedTripId],
  );

  // ---- Data fetching -------------------------------------------------------

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const params = new URLSearchParams({ date });
      if (selectedCompanyId) params.set('company_id', String(selectedCompanyId));
      const data = await apiClient.request<ShuttleTrip[]>(`/shuttle-trips/today?${params.toString()}`);
      const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
      setTrips(list);
      if (list.length > 0 && !selectedTripId) {
        setSelectedTripId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trips');
    } finally {
      setLoading(false);
    }
  }, [selectedTripId, selectedCompanyId]);

  const loadPolyline = useCallback(async (tripId: number) => {
    try {
      setPolylineLoading(true);
      const data = await apiClient.request<PolylineResponse>(`/shuttle-trips/${tripId}/polyline`);
      setPolyline(data);
    } catch {
      setPolyline(null);
    } finally {
      setPolylineLoading(false);
    }
  }, []);

  useEffect(() => {
    if (companiesStatus === 'idle') {
      dispatch(fetchAdminCompanies({ limit: 100 }));
    }
  }, [dispatch, companiesStatus]);

  useEffect(() => {
    setSelectedTripId(null);
    loadTrips();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      setPolyline(null);
      loadPolyline(selectedTripId);
    }
  }, [selectedTripId, loadPolyline]);

  const handleForceEndTrip = async (trip: ShuttleTrip) => {
    if (!canMutate || !isActiveShuttleStatus(trip.status)) return;
    const label = `${trip.direction} · ${trip.routes?.name ?? `Trip #${trip.id}`}`;
    if (!window.confirm(`Force end this ${label} trip? Use this when the driver forgot to end the ride.`)) {
      return;
    }
    try {
      setEndingTripId(trip.id);
      setActionBanner(null);
      await apiClient.completeShuttleTrip(trip.id);
      setActionBanner({ type: 'ok', text: `${label} marked as completed.` });
      await loadTrips();
    } catch (err) {
      setActionBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to end trip',
      });
    } finally {
      setEndingTripId(null);
    }
  };

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
      position: [driverCoord.lat, driverCoord.lng],
      label: `Driver · ${driverCoord.speed !== undefined ? `${Math.round((driverCoord.speed ?? 0) * 3.6)} km/h` : 'live'}`,
    };
  }, [driverCoord]);

  const mapMarkers = useMemo(
    () => [...stopMarkers, ...(driverMarker ? [driverMarker] : [])],
    [stopMarkers, driverMarker],
  );

  const mapPolylines: MapPolyline[] = useMemo(() => {
    if (!polyline?.points?.length) return [];

    let points = polyline.points;
    const isActiveTrip =
      selectedTrip?.status === 'STARTED' || selectedTrip?.status === 'IN_PROGRESS';
    const shouldGrayDefaultRoute = isActiveTrip && !!driverCoord;

    // Trim already-travelled portion: find the polyline point nearest to the
    // driver and slice from there forward — no extra API calls needed.
    if (driverCoord) {
      let minDist = Infinity;
      let nearestIdx = 0;
      for (let i = 0; i < points.length; i++) {
        const dLat = points[i].lat - driverCoord.lat;
        const dLng = points[i].lng - driverCoord.lng;
        const dist = dLat * dLat + dLng * dLng;
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      points = points.slice(nearestIdx);
    }

    return [{
      positions: points.map((p) => [p.lat, p.lng] as [number, number]),
      color: shouldGrayDefaultRoute ? '#9CA3AF' : '#0C225E',
    }];
  }, [polyline, driverCoord, selectedTrip?.status]);

  const mapCenter = useMemo((): [number, number] => {
    if (driverCoord) return [driverCoord.lat, driverCoord.lng];
    const firstStop = selectedTrip?.routes?.route_stops?.find((s) => s.lat && s.lng);
    if (firstStop) return [firstStop.lat!, firstStop.lng!];
    return [24.8607, 67.0011];
  }, [driverCoord, selectedTrip]);

  // ---- Render ----------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <div className="text-sm font-medium text-gray-400">Operations</div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">Shuttle Tracking</h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0C225E]/30"
            value={selectedCompanyId ?? ''}
            onChange={(e) => setSelectedCompanyId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">All Companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Button variant="outline" onClick={loadTrips} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {actionBanner && (
        <div
          className={`rounded-lg border p-4 text-sm ${
            actionBanner.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {actionBanner.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Trip list */}
        <div className="lg:col-span-1 flex flex-col gap-3 overflow-y-auto max-h-[50vh] lg:max-h-none">
          {loading && (
            <div className="text-center py-12 text-gray-400">
              <p>Loading today&apos;s trips...</p>
            </div>
          )}
          {!loading && trips.length === 0 && (
            <Card className="p-8 text-center text-gray-400">
              <Bus className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No trips scheduled for today.</p>
            </Card>
          )}
          {trips.map((trip) => (
            <div
              key={trip.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedTripId(trip.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedTripId(trip.id);
                }
              }}
              className={`w-full text-left rounded-xl border p-4 transition-all cursor-pointer ${
                selectedTripId === trip.id
                  ? 'border-[#0C225E] bg-[#0C225E]/5 ring-1 ring-[#0C225E]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bus className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {trip.routes?.name ?? `Trip #${trip.id}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {trip.direction} · {trip.routes?.vehicles?.plate_number ?? '—'}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge(trip.status)}`}>
                  {trip.status}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {trip.routes?.route_stops?.length ?? 0} stops
                </span>
                {trip.started_at && (
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    Started {new Date(trip.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {selectedTripId === trip.id && isActiveShuttleStatus(trip.status) && (
                <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${isConnected ? 'text-green-600' : 'text-gray-400'}`}>
                  <Radio className="w-3 h-3" />
                  {isConnected ? 'Live tracking active' : 'Connecting...'}
                </div>
              )}

              {canMutate && isActiveShuttleStatus(trip.status) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Button
                    type="button"
                    size="sm"
                    className="w-full bg-rose-600 text-white hover:bg-rose-700"
                    disabled={endingTripId === trip.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleForceEndTrip(trip);
                    }}
                  >
                    {endingTripId === trip.id ? (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {endingTripId === trip.id ? 'Ending…' : 'Force End Trip'}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {selectedTrip && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-gray-900">{selectedTrip.routes?.name}</p>
                <p className="text-xs text-gray-400">
                  {selectedTrip.direction} route ·{' '}
                  {driverCoord
                    ? `Driver at ${driverCoord.lat.toFixed(5)}, ${driverCoord.lng.toFixed(5)}`
                    : 'Waiting for driver location...'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {polylineLoading && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Loading route...
                  </span>
                )}
                {canMutate && isActiveShuttleStatus(selectedTrip.status) && (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-rose-600 text-white hover:bg-rose-700"
                    disabled={endingTripId === selectedTrip.id}
                    onClick={() => handleForceEndTrip(selectedTrip)}
                  >
                    {endingTripId === selectedTrip.id ? (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Square className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    {endingTripId === selectedTrip.id ? 'Ending…' : 'Force End Trip'}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 'clamp(300px, 55vh, 600px)' }}>
            <Map
              center={mapCenter}
              zoom={13}
              markers={mapMarkers}
              polylines={mapPolylines}
              height="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
