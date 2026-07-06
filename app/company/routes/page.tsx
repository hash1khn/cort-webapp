"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";
import { Card } from "../components/DashboardComponents";
import { PageHeader } from "../components/PageLayout";
import { Button } from "@/app/admin/ui/Button";
import {
  Activity,
  Bus,
  Users,
  MapPin,
  Car,
  ChevronRight,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ArrowRight,
  Sunrise,
  User,
} from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(value?: string | null) {
  if (!value) return null;
  if (value.includes("T")) {
    const timePart = value.split("T")[1]?.slice(0, 5);
    if (timePart) return timePart;
  }
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 5);
  return value;
}

type RouteStop = {
  id: number;
  route_id: number;
  name: string;
  sequence_order: number;
  morning_sequence?: number | null;
  evening_sequence?: number | null;
  morning_eta?: string | null;
  evening_eta?: string | null;
};

type CompanyRoute = {
  id: number;
  name: string;
  route_stops?: RouteStop[];
  vehicles?: { plate_number: string; model: string } | null;
  users?: { full_name: string; phone: string } | null;
  employee_route_assignments?: {
    users?: { full_name: string; email: string; phone: string } | null;
  }[];
};

type AiRecommendation = {
  routeId: number | null;
  routeName: string;
  reason: string;
  confidence: "High" | "Medium" | "Low";
  alternativeRoutes: { id: number; name: string; reason: string }[];
};

// ─── Stop pills ───────────────────────────────────────────────────────────────

function StopPills({ stops, direction }: { stops: RouteStop[]; direction: "MORNING" | "EVENING" }) {
  const sorted = [...stops]
    .filter((s) => direction === "MORNING" ? s.morning_sequence != null : s.evening_sequence != null)
    .sort((a, b) =>
      direction === "MORNING"
        ? (a.morning_sequence ?? 0) - (b.morning_sequence ?? 0)
        : (a.evening_sequence ?? 0) - (b.evening_sequence ?? 0)
    );
  if (sorted.length === 0) return <span className="text-xs text-[var(--text-muted)] italic">No stops</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {sorted.map((stop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === sorted.length - 1;
        return (
          <span
            key={stop.id}
            className={cx(
              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold border",
              isFirst
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : isLast
                  ? "border-[var(--cort-orange)]/30 bg-[var(--cort-orange)]/10 text-[var(--cort-orange)]"
                  : "border-[var(--border-light)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
            )}
          >
            {stop.name}
          </span>
        );
      })}
    </div>
  );
}

// ─── AI Route Optimizer (standalone panel) ───────────────────────────────────

function AiRouteOptimizer({ companyId }: { companyId: number }) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!address.trim()) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await apiClient.request<AiRecommendation>("/routes/recommend-for-address", {
        method: "POST",
        body: JSON.stringify({ address: address.trim(), company_id: companyId }),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get AI recommendation");
    } finally {
      setLoading(false);
    }
  }

  const confidenceColor: Record<string, string> = {
    High: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    Low: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="rounded-[2rem] border border-[var(--cort-orange)]/20 bg-gradient-to-br from-[var(--bg-card)] to-[var(--bg-subtle)] p-6 shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
      <div className="flex items-start gap-3 mb-5">
        <div className="p-2.5 rounded-xl bg-[var(--cort-orange)]/10 border border-[var(--cort-orange)]/20 flex-shrink-0">
          <Sparkles className="w-5 h-5 text-[var(--cort-orange)]" />
        </div>
        <div>
          <h3 className="font-bold text-[var(--text-primary)]">AI Route Optimizer</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Enter a new employee's address and AI instantly recommends which vehicle/route to assign them to — minimizing cost leakage and maximizing vehicle utilization.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="e.g. DHA Phase 6, Lahore or Block 4 Gulshan-e-Iqbal, Karachi"
            className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cort-orange)]/40 focus:border-[var(--cort-orange)] transition-all"
          />
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={loading || !address.trim()}
          className="gap-2 bg-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/90 text-white border-0 rounded-xl px-5 disabled:opacity-50 flex-shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? "Analyzing…" : "Analyze"}
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[var(--cort-orange)]/30 bg-[var(--cort-orange)]/5 p-5">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--cort-orange)] flex-shrink-0" />
                <span className="font-bold text-[var(--text-primary)]">Best Match: {result.routeName}</span>
              </div>
              <span className={cx("text-xs font-bold px-2.5 py-1 rounded-full border", confidenceColor[result.confidence] ?? confidenceColor.Low)}>
                {result.confidence} Confidence
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{result.reason}</p>
            {result.routeId && (
              <Link href={`/company/routes/${result.routeId}`}>
                <button className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--cort-orange)] hover:underline">
                  View Route Details <ArrowRight className="w-3 h-3" />
                </button>
              </Link>
            )}
          </div>

          {result.alternativeRoutes.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Alternatives</div>
              <div className="space-y-2">
                {result.alternativeRoutes.map((alt) => (
                  <div key={alt.id} className="flex items-start gap-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] px-4 py-3">
                    <TrendingUp className="w-4 h-4 text-[var(--text-muted)] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{alt.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{alt.reason}</div>
                    </div>
                    <Link href={`/company/routes/${alt.id}`}>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--cort-orange)] transition-colors" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Route Card ───────────────────────────────────────────────────────────────

function RouteCard({ route }: { route: CompanyRoute }) {
  const router = useRouter();
  const employees = route.employee_route_assignments?.map((a) => a.users).filter(Boolean) ?? [];
  const stops = route.route_stops ?? [];
  const vehicle = route.vehicles;
  const driver = route.users;
  const morningStops = stops.filter((s) => s.morning_sequence != null).length;

  return (
    <div
      className="group rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 hover:border-[var(--cort-orange)]/30 hover:bg-[var(--bg-subtle)] hover:shadow-md transition-all duration-200 cursor-pointer"
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/company/routes/${route.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/company/routes/${route.id}`);
        }
      }}
    >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--cort-orange)]/10 group-hover:bg-[var(--cort-orange)]/20 transition-colors flex-shrink-0">
              <Bus className="w-5 h-5 text-[var(--cort-orange)]" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-primary)] group-hover:text-[var(--cort-orange)] transition-colors">
                {route.name}
              </h3>
              <div className="text-xs text-[var(--text-muted)]">Route #{route.id}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/company/routes/${route.id}/track`} onClick={(e) => e.stopPropagation()}>
              <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] gap-1 border-[var(--border-input)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                <Activity className="w-3 h-3" />
                Track
              </Button>
            </Link>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--cort-orange)] transition-colors" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            { label: "Passengers", value: employees.length, icon: <Users className="w-3 h-3 text-[var(--cort-orange)]" /> },
            { label: "Stops", value: `${morningStops} stops`, icon: <MapPin className="w-3 h-3 text-emerald-400" /> },
            { label: "Vehicle", value: vehicle?.plate_number ?? "—", icon: <Car className="w-3 h-3 text-blue-400" /> },
            { label: "Driver", value: driver?.full_name ?? "Unassigned", icon: <User className="w-3 h-3 text-purple-400" /> },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-light)] px-3 py-2">
              <div className="flex items-center gap-1.5 mb-0.5">
                {stat.icon}
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{stat.label}</span>
              </div>
              <div className="text-sm font-bold text-[var(--text-primary)] truncate">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Sunrise className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Morning stops</span>
          </div>
          <StopPills stops={stops} direction="MORNING" />
        </div>

        {employees.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-light)] flex items-center gap-2">
            <div className="flex -space-x-2">
              {employees.slice(0, 5).map((emp, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-[var(--cort-orange)]/20 border-2 border-[var(--bg-card)] flex items-center justify-center text-[9px] font-bold text-[var(--cort-orange)]"
                  title={emp?.full_name ?? ""}
                >
                  {emp?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
              ))}
              {employees.length > 5 && (
                <div className="w-6 h-6 rounded-full bg-[var(--bg-subtle)] border-2 border-[var(--bg-card)] flex items-center justify-center text-[9px] font-bold text-[var(--text-muted)]">
                  +{employees.length - 5}
                </div>
              )}
            </div>
            <span className="text-xs text-[var(--text-muted)]">
              {employees.length} passenger{employees.length !== 1 ? "s" : ""} · Click to view all
            </span>
          </div>
        )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RoutesPage() {
  const company = useAppSelector(selectCompany);
  const { user } = useAuth();
  const isTrialUser = !!user?.is_trial;
  const [routes, setRoutes] = useState<CompanyRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadRoutes() {
    if (!company?.id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    apiClient
      .request<CompanyRoute[]>(`/routes?company_id=${company.id}`)
      .then((data) => setRoutes(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load routes"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadRoutes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id]);

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled.shuttle_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md text-center">
          <div className="text-lg font-bold text-[var(--text-primary)]">Shuttle Service Disabled</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Shuttle service is not enabled for your company. Please contact Cort Super Admin.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        label="Shuttle Operations"
        title="Route Roster"
        description="All shuttle routes and vehicles assigned to your company. Click any route to see passengers."
        action={
          isTrialUser && routes.length === 0 ? (
            <Link href="/company/routes/create">
              <Button className="gap-2 bg-[var(--cort-navy)] hover:bg-[var(--cort-navy)]/90 text-white border-0 rounded-xl">
                <Bus className="w-4 h-4" />
                Create route
              </Button>
            </Link>
          ) : undefined
        }
      />

      <AiRouteOptimizer companyId={company.id} />

      {loading ? (
        <Card className="py-16 text-center">
          <Loader2 className="w-5 h-5 mx-auto mb-3 animate-spin text-[var(--text-muted)]" />
          <div className="text-sm text-[var(--text-muted)]">Loading routes…</div>
        </Card>
      ) : error ? (
        <Card className="py-12 text-center">
          <div className="text-sm text-red-500">{error}</div>
        </Card>
      ) : routes.length === 0 ? (
        <Card className="py-16 text-center">
          <Bus className="w-10 h-10 mx-auto mb-3 text-[var(--text-muted)] opacity-30" />
          <div className="text-sm text-[var(--text-muted)]">No routes yet.</div>
          {isTrialUser ? (
            <Link href="/company/routes/create" className="inline-block mt-4 text-sm font-semibold text-[var(--cort-orange)] hover:underline">
              Create your first shuttle route →
            </Link>
          ) : (
            <div className="mt-1 text-xs text-[var(--text-muted)] opacity-70">Contact Cort Super Admin to assign routes.</div>
          )}
        </Card>
      ) : (
        <div>
          <div className="text-sm text-[var(--text-muted)] mb-4">
            {routes.length} route{routes.length !== 1 ? "s" : ""}
            {isTrialUser ? " · Trial account" : " · Read-only view managed by Cort Operations"}
          </div>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
