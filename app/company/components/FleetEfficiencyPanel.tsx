'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/app/lib/services/api-client';
import { AlertTriangle, Fuel, Bus, Navigation, TrendingDown, TrendingUp, Zap, RefreshCw } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type ShuttleMetricsSummary = {
  count: number;
  avgOccupancy: number;
  avgDetour: number;
  totalIdleMin: number;
};

type ShuttleMetric = {
  id: number;
  trip_date: string;
  direction: string;
  occupancy_pct: string | null;
  detour_ratio: string | null;
  idle_minutes: string | null;
  fuel_variance_pct: string | null;
  actual_distance_km: string | null;
  planned_distance_km: string | null;
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
  if (s === 'CRITICAL') return 'bg-red-100 text-red-800 border-red-200';
  if (s === 'HIGH') return 'bg-orange-100 text-orange-800 border-orange-200';
  if (s === 'MEDIUM') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-blue-100 text-blue-800 border-blue-200';
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
      <div className="flex items-center justify-center py-16 text-gray-400">
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
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">AI Fleet Insights</h3>
          <button
            onClick={triggerGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 rounded-lg bg-[#f47f00] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#d96f00] disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Generating…' : 'Generate Insights'}
          </button>
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-gray-500">No active insights. Click Generate Insights to run the AI analysis.</p>
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
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-white/60">
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
        <section>
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">Flagged Fuel Variance</h3>
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {fuelFlags.length} flagged
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-400">
              Variance&nbsp;% = (actual&nbsp;km&nbsp;÷&nbsp;avg&nbsp;city) − (expected&nbsp;km&nbsp;÷&nbsp;avg&nbsp;city) ÷ expected&nbsp;litres × 100.
              Flagged when high for 3+ consecutive days.
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                  <th className="px-4 py-3 text-right">Actual (L)</th>
                  <th className="px-4 py-3 text-right">Expected (L)</th>
                  <th className="px-4 py-3 text-right">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fuelFlags.slice(0, 8).map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium">{f.vehicles?.plate_number ?? f.vehicle_id}</td>
                    <td className="px-4 py-2.5 text-gray-500">{new Date(f.flag_date).toLocaleDateString()}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${parseFloat(f.variance_pct) > 20 ? 'text-red-600' : 'text-orange-600'}`}>
                      {pct(f.variance_pct)}
                    </td>
                    <td className="px-4 py-2.5 text-right">{fmt(f.actual_litres)}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(f.expected_litres)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{f.consecutive_days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Recent Trip Metrics ── */}
      {recentMetrics.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Shuttle Trips</h3>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Dir</th>
                  <th className="px-4 py-3 text-right">Occupancy</th>
                  <th className="px-4 py-3 text-right">Detour</th>
                  <th className="px-4 py-3 text-right">Idle (min)</th>
                  <th className="px-4 py-3 text-right">Fuel Var.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentMetrics.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">{new Date(m.trip_date).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-gray-500">{m.direction}</td>
                    <td className={`px-4 py-2.5 text-right ${m.occupancy_pct && parseFloat(m.occupancy_pct) < 50 ? 'text-orange-500' : 'text-gray-800'}`}>
                      {pct(m.occupancy_pct)}
                    </td>
                    <td className={`px-4 py-2.5 text-right ${m.detour_ratio && parseFloat(m.detour_ratio) > 1.2 ? 'text-red-600' : 'text-gray-800'}`}>
                      {m.detour_ratio ? `${fmt(m.detour_ratio, 2)}×` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{fmt(m.idle_minutes, 0)}</td>
                    <td className={`px-4 py-2.5 text-right ${m.fuel_variance_pct && Math.abs(parseFloat(m.fuel_variance_pct)) > 15 ? 'text-red-600' : 'text-gray-800'}`}>
                      {pct(m.fuel_variance_pct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {summary?.count === 0 && fuelFlags.length === 0 && insights.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <Bus className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No fleet data yet</p>
          <p className="text-xs text-gray-400 mt-1">Metrics will appear here once shuttle trips are completed.</p>
        </div>
      )}
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
    <div className={`rounded-xl border p-4 bg-white ${good === false ? 'border-orange-200' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className={`text-xl font-bold ${good === false ? 'text-orange-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
