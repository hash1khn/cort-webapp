'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@/app/lib/services/api-client';
import { AlertTriangle, Fuel, Bus, Navigation, TrendingDown, TrendingUp, Zap, RefreshCw, Map as MapIcon, X } from 'lucide-react';
import type { MapMarker, MapPolyline } from '@/app/admin/ui/Map';

const Map = dynamic(() => import('@/app/admin/ui/Map'), { ssr: false });

// ── Types ─────────────────────────────────────────────────────────────────────

type ShuttleMetricsSummary = {
  count: number;
  avgOccupancy: number;
  avgDetour: number;
  totalIdleMin: number;
};

type ShuttleMetric = {
  id: number;
  shuttle_trip_id: number;
  route_id: number | null;
  trip_date: string;
  direction: string;
  occupancy_pct: string | null;
  detour_ratio: string | null;
  idle_minutes: string | null;
  fuel_variance_pct: string | null;
  actual_distance_km: string | null;
  planned_distance_km: string | null;
};

type RouteComparison = {
  id: number;
  planned_points: { lat: number; lng: number }[];
  actual_points: { lat: number; lng: number }[];
  total_distance_km: number | null;
  idle_minutes: number | null;
  metrics: {
    planned_distance_km: number | null;
    actual_distance_km: number | null;
    detour_ratio: number | null;
    occupancy_pct: number | null;
    fuel_variance_pct: number | null;
  } | null;
};

type FuelFlag = {
  id: number;
  vehicle_id: number;
  flag_date: string;
  variance_pct: string;
  actual_litres: string;
  expected_litres: string;
  consecutive_days: number;
  is_flagged: boolean;
  vehicles: { plate_number: string; fuel_avg_city: string } | null;
};

type FleetInsight = {
  id: number;
  insight_type: string;
  vehicle_id: number | null;
  route_id: number | null;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimated_saving_pkr: string;
  data: {
    summary: string;
    recommendation: string;
    metric_value?: number;
  };
  generated_at: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: string | null | undefined, decimals = 1) {
  if (v == null) return '—';
  const n = parseFloat(v);
  return isNaN(n) ? '—' : n.toFixed(decimals);
}

function pct(v: string | null | undefined) {
  return v == null ? '—' : `${fmt(v, 1)}%`;
}

function severityColor(s: string) {
  if (s === 'CRITICAL') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  if (s === 'HIGH') return 'bg-[var(--cort-orange)]/10 text-[var(--cort-orange)] border-[var(--cort-orange)]/20';
  if (s === 'MEDIUM') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
}

function insightIcon(type: string) {
  if (type === 'FUEL_LEAKAGE') return <Fuel className="h-5 w-5 text-orange-500" />;
  if (type === 'OCCUPANCY') return <Bus className="h-5 w-5 text-blue-500" />;
  if (type === 'CHAUFFEUR_DETOUR' || type === 'ROUTE_DETOUR') return <Navigation className="h-5 w-5 text-purple-500" />;
  if (type === 'IDLE_TIME') return <Zap className="h-5 w-5 text-yellow-500" />;
  return <AlertTriangle className="h-5 w-5 text-gray-500" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FleetEfficiencyPanel() {
  const [summary, setSummary] = useState<ShuttleMetricsSummary | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<ShuttleMetric[]>([]);
  const [fuelFlags, setFuelFlags] = useState<FuelFlag[]>([]);
  const [insights, setInsights] = useState<FleetInsight[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTripForMap, setSelectedTripForMap] = useState<number | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [routeComparison, setRouteComparison] = useState<RouteComparison | null>(null);
  const [mapLoading, setMapLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [metricsRes, fuelRes, insightsRes] = await Promise.allSettled([
        apiClient.request<{ summary: ShuttleMetricsSummary; metrics: ShuttleMetric[] }>('/company/fleet-metrics'),
        apiClient.request<FuelFlag[]>('/company/fuel-variance?flagged_only=true'),
        apiClient.request<FleetInsight[]>('/company/fleet-insights'),
      ]);
      if (metricsRes.status === 'fulfilled') {
        const d = metricsRes.value;
        setSummary(d.summary);
        setRecentMetrics(d.metrics.slice(0, 10));
      }
      if (fuelRes.status === 'fulfilled') setFuelFlags(fuelRes.value);
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const loadRouteComparison = useCallback(async (shuttleTripId: number, routeId: number | null) => {
    if (selectedTripForMap === shuttleTripId) {
      setSelectedTripForMap(null);
      setRouteComparison(null);
      setSelectedRouteId(null);
      return;
    }
    setSelectedTripForMap(shuttleTripId);
    setSelectedRouteId(routeId);
    setRouteComparison(null);
    setMapLoading(true);
    try {
      const data = await apiClient.request<RouteComparison>(`/company/shuttle-trips/${shuttleTripId}/route-comparison`);
      setRouteComparison(data);
    } catch {
      setRouteComparison(null);
    } finally {
      setMapLoading(false);
    }
  }, [selectedTripForMap]);

  const triggerGenerate = async () => {
    setGenerating(true);
    try {
      await apiClient.request<{ generated: number }>('/company/fleet-insights/generate', { method: 'POST' });
      await load();
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" /> Loading fleet metrics…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── KPI Strip ── */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard
            label="Trips analysed"
            value={summary.count.toString()}
            icon={<Bus className="h-5 w-5 text-blue-500" />}
          />
          <KpiCard
            label="Avg occupancy"
            value={`${summary.avgOccupancy.toFixed(1)}%`}
            icon={summary.avgOccupancy >= 70
              ? <TrendingUp className="h-5 w-5 text-green-500" />
              : <TrendingDown className="h-5 w-5 text-orange-500" />}
            good={summary.avgOccupancy >= 70}
          />
          <KpiCard
            label="Avg detour ratio"
            value={summary.avgDetour ? summary.avgDetour.toFixed(2) + '×' : '—'}
            icon={<Navigation className="h-5 w-5 text-purple-500" />}
            good={!summary.avgDetour || summary.avgDetour < 1.1}
          />
          <KpiCard
            label="Total idle (min)"
            value={Math.round(summary.totalIdleMin).toLocaleString()}
            icon={<Zap className="h-5 w-5 text-yellow-500" />}
            good={summary.totalIdleMin < 300}
          />
        </div>
      )}

      {/* ── AI Fleet Insights ── */}
      <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2rem] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span className="text-[var(--cort-orange)]"><Zap className="h-4 w-4" /></span>
            AI Fleet Insights
          </h3>
          <button
            onClick={triggerGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--cort-orange)] px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--cort-orange-hover)] disabled:opacity-60 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : 'Generate Insights'}
          </button>
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No active insights. Click Generate Insights to run the AI analysis.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className={`rounded-xl border p-4 ${severityColor(insight.severity)}`}
              >
                <div className="flex items-start gap-3">
                  {insightIcon(insight.insight_type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wide">
                        {insight.insight_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/10">
                        {insight.severity}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{insight.data.summary}</p>
                    <p className="text-xs mt-1 opacity-80">{insight.data.recommendation}</p>
                    {insight.estimated_saving_pkr && parseFloat(insight.estimated_saving_pkr) > 0 && (
                      <p className="text-xs mt-2 font-semibold">
                        Est. saving: PKR {parseFloat(insight.estimated_saving_pkr).toLocaleString()} / month
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Fuel Leakage Flags ── */}
      {fuelFlags.length > 0 && (
        <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2rem] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
          <div className="p-6 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <span className="text-rose-400"><Fuel className="h-4 w-4" /></span>
                Flagged Fuel Variance
              </h3>
              <span className="inline-flex items-center rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400">
                {fuelFlags.length} flagged
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Variance&nbsp;% = (actual&nbsp;km&nbsp;÷&nbsp;avg&nbsp;city) − (expected&nbsp;km&nbsp;÷&nbsp;avg&nbsp;city) ÷ expected&nbsp;litres × 100.
              Flagged when high for 3+ consecutive days.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-light)]">
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-left">Vehicle</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-left">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Variance</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actual (L)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Expected (L)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]/50">
                {fuelFlags.slice(0, 8).map((f) => (
                  <tr key={f.id} className="group transition-colors hover:bg-[var(--surface-subtle)]/80">
                    <td className="px-6 py-4 font-bold text-[var(--text-primary)]">{f.vehicles?.plate_number ?? f.vehicle_id}</td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{new Date(f.flag_date).toLocaleDateString()}</td>
                    <td className={`px-6 py-4 text-right font-bold ${parseFloat(f.variance_pct) > 20 ? 'text-rose-400' : 'text-[var(--cort-orange)]'}`}>
                      {pct(f.variance_pct)}
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--text-secondary)]">{fmt(f.actual_litres)}</td>
                    <td className="px-6 py-4 text-right text-[var(--text-secondary)]">{fmt(f.expected_litres)}</td>
                    <td className="px-6 py-4 text-right text-[var(--text-muted)]">{f.consecutive_days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Recent Trip Metrics ── */}
      {recentMetrics.length > 0 && (
        <section className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2rem] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
          <div className="p-6 border-b border-[var(--border-light)]">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <span className="text-blue-400"><Bus className="h-4 w-4" /></span>
              Recent Shuttle Trips
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-light)]">
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-left">Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-left">Dir</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Occupancy</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Detour</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Idle (min)</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Fuel Var.</th>
                  <th className="px-6 py-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Route</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-light)]/50">
                {recentMetrics.map((m) => (
                  <tr key={m.id} className={`group transition-colors ${selectedTripForMap === m.shuttle_trip_id ? 'bg-[var(--cort-orange)]/5' : 'hover:bg-[var(--surface-subtle)]/80'}`}>
                    <td className="px-6 py-4 text-[var(--text-secondary)]">{new Date(m.trip_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{m.direction}</td>
                    <td className={`px-6 py-4 text-right font-medium ${m.occupancy_pct && parseFloat(m.occupancy_pct) < 50 ? 'text-[var(--cort-orange)]' : 'text-[var(--text-primary)]'}`}>
                      {pct(m.occupancy_pct)}
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${m.detour_ratio && parseFloat(m.detour_ratio) > 1.2 ? 'text-rose-400' : 'text-[var(--text-primary)]'}`}>
                      {m.detour_ratio ? `${fmt(m.detour_ratio, 2)}×` : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-[var(--text-muted)]">{fmt(m.idle_minutes, 0)}</td>
                    <td className={`px-6 py-4 text-right font-medium ${m.fuel_variance_pct && Math.abs(parseFloat(m.fuel_variance_pct)) > 15 ? 'text-rose-400' : 'text-[var(--text-primary)]'}`}>
                      {pct(m.fuel_variance_pct)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => loadRouteComparison(m.shuttle_trip_id, m.route_id)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                          selectedTripForMap === m.shuttle_trip_id
                            ? 'bg-[var(--cort-orange)]/10 text-[var(--cort-orange)] border border-[var(--cort-orange)]/20'
                            : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-light)]'
                        }`}
                      >
                        <MapIcon className="h-3 w-3" />
                        {selectedTripForMap === m.shuttle_trip_id ? 'Close' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Route Map Overlay ── */}
          {selectedTripForMap !== null && (
            <div className="border-t border-[var(--border-light)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)] bg-[var(--surface-subtle)]/50">
                <div className="flex items-center gap-2">
                  <MapIcon className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">Route Map Overlay</span>
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                    <span className="inline-block h-2.5 w-6 rounded-sm bg-blue-500" /> Planned
                    <span className="inline-block h-2.5 w-6 rounded-sm bg-[var(--cort-orange)] ml-1" /> Actual
                  </span>
                </div>
                <button onClick={() => { setSelectedTripForMap(null); setRouteComparison(null); setSelectedRouteId(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {mapLoading ? (
                <div className="flex items-center justify-center h-64 text-[var(--text-muted)] text-sm">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading route data…
                </div>
              ) : routeComparison ? (
                <RouteMapOverlay comparison={routeComparison} routeInsight={insights.find(i => i.insight_type === 'ROUTE_DETOUR' && i.route_id === selectedRouteId) ?? null} />
              ) : (
                <div className="flex items-center justify-center h-32 text-[var(--text-muted)] text-sm">
                  No route data available for this trip.
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {summary?.count === 0 && fuelFlags.length === 0 && insights.length === 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2rem] p-8 text-center shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--surface-subtle)] mb-4">
            <Bus className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)]">No fleet data yet</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Metrics will appear here once shuttle trips are completed.</p>
        </div>
      )}
    </div>
  );
}

function RouteMapOverlay({ comparison, routeInsight }: { comparison: RouteComparison; routeInsight: FleetInsight | null }) {
  const plannedPolyline: MapPolyline | null = comparison.planned_points.length > 1
    ? { positions: comparison.planned_points.map(p => [p.lat, p.lng] as [number, number]), color: '#2563eb', weight: 4, opacity: 0.85 }
    : null;
  const actualPolyline: MapPolyline | null = comparison.actual_points.length > 1
    ? { positions: comparison.actual_points.map(p => [p.lat, p.lng] as [number, number]), color: '#f97316', weight: 3, opacity: 0.9, dashArray: '6 4' }
    : null;
  const polylines = [plannedPolyline, actualPolyline].filter(Boolean) as MapPolyline[];

  const markers: MapMarker[] = [];
  if (comparison.planned_points.length > 0) {
    const first = comparison.planned_points[0];
    const last = comparison.planned_points[comparison.planned_points.length - 1];
    markers.push({ id: 'start', position: [first.lat, first.lng], label: 'Start', color: '#22c55e', type: 'pickup' });
    markers.push({ id: 'end', position: [last.lat, last.lng], label: 'End', color: '#ef4444', type: 'dropoff' });
  }

  const m = comparison.metrics;
  const detour = m?.detour_ratio ?? null;
  const detourPct = detour !== null ? ((detour - 1) * 100).toFixed(1) : null;

  return (
    <div className="flex flex-col lg:flex-row">
      <div className="flex-1 min-h-0" style={{ height: 360 }}>
        {polylines.length > 0 || markers.length > 0 ? (
          <Map markers={markers} polylines={polylines} height="360px" />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50 text-sm text-gray-400">
            No polyline data recorded for this trip.
          </div>
        )}
      </div>
      <div className="w-full lg:w-64 p-5 border-t lg:border-t-0 lg:border-l border-[var(--border-light)] flex flex-col gap-4 bg-[var(--surface-subtle)]/30">
        {detour !== null && (
          <div className={`rounded-xl px-4 py-3 text-center border ${
            detour > 1.15
              ? 'bg-rose-500/10 border-rose-500/20'
              : detour > 1.05
              ? 'bg-[var(--cort-orange)]/10 border-[var(--cort-orange)]/20'
              : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <p className="text-xs text-[var(--text-muted)] mb-0.5">Detour Ratio</p>
            <p className={`text-2xl font-bold ${
              detour > 1.15 ? 'text-rose-400' : detour > 1.05 ? 'text-[var(--cort-orange)]' : 'text-emerald-400'
            }`}>
              {detour.toFixed(2)}×
            </p>
            {detourPct && <p className="text-xs text-[var(--text-muted)]">+{detourPct}% extra distance</p>}
          </div>
        )}
        <div className="space-y-2 text-sm">
          {m?.planned_distance_km != null && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span className="inline-block h-2 w-4 rounded-sm bg-blue-500" /> Planned
              </span>
              <span className="font-medium text-[var(--text-primary)]">{m.planned_distance_km.toFixed(2)} km</span>
            </div>
          )}
          {m?.actual_distance_km != null && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <span className="inline-block h-2 w-4 rounded-sm bg-[var(--cort-orange)]" /> Actual
              </span>
              <span className="font-medium text-[var(--text-primary)]">{m.actual_distance_km.toFixed(2)} km</span>
            </div>
          )}
          {comparison.idle_minutes != null && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Idle time</span>
              <span className="font-medium text-[var(--text-primary)]">{comparison.idle_minutes.toFixed(0)} min</span>
            </div>
          )}
          {m?.fuel_variance_pct != null && (
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)]">Fuel variance</span>
              <span className={`font-medium ${Math.abs(m.fuel_variance_pct) > 15 ? 'text-rose-400' : 'text-[var(--text-primary)]'}`}>
                {m.fuel_variance_pct > 0 ? '+' : ''}{m.fuel_variance_pct.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        {routeInsight && (
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Navigation className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-xs font-bold text-purple-400">AI Note</span>
            </div>
            <p className="text-xs text-purple-300">{routeInsight.data.recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  good,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  good?: boolean;
}) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-[2rem] p-5 shadow-[0_2px_16px_rgba(0,0,0,0.4)] transition-all duration-200 hover:shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:-translate-y-0.5">
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{label}</span></div>
      <p className={`text-2xl font-extrabold tracking-tight ${
        good === false ? 'text-[var(--cort-orange)]' : 'text-[var(--text-primary)]'
      }`}>{value}</p>
    </div>
  );
}
