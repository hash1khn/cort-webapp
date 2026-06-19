"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppSelector } from "../../lib/store/hooks";
import { selectCompany } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
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
  UserPlus,
  X,
  Phone,
  Mail,
  Building2,
  Home,
  CheckCheck,
} from "lucide-react";
import {
  getPhoneValidationError,
  PHONE_MAX_LENGTH,
  PHONE_PLACEHOLDER,
  sanitizePhoneInput,
} from "../../lib/utils/phone";

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

// ─── Add Employee Panel ───────────────────────────────────────────────────────

type AddEmployeePanelProps = {
  companyId: number;
  routes: CompanyRoute[];
  onClose: () => void;
  onSuccess: () => void;
};

function AddEmployeePanel({ companyId, routes, onClose, onSuccess }: AddEmployeePanelProps) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    department: "",
    home_address: "",
    employee_id: "",
  });
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [aiRec, setAiRec] = useState<AiRecommendation | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function updateField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "home_address") {
      // Debounce AI recommendation when address changes
      if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
      if (value.trim().length > 10) {
        aiDebounceRef.current = setTimeout(() => runAiRecommend(value.trim()), 900);
      } else {
        setAiRec(null);
      }
    }
  }

  async function runAiRecommend(address: string) {
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await apiClient.request<AiRecommendation>("/routes/recommend-for-address", {
        method: "POST",
        body: JSON.stringify({ address, company_id: companyId }),
      });
      setAiRec(data);
      if (data.routeId) setSelectedRouteId(data.routeId);
    } catch {
      setAiError("Could not get AI recommendation");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) return;
    const phoneError = getPhoneValidationError(form.phone);
    if (phoneError) {
      setSubmitError(phoneError);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Create the employee
      const created = await apiClient.request<{ data: { id: string } }>("/employees/create", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          department: form.department.trim() || undefined,
          home_address: form.home_address.trim() || undefined,
          employee_id: form.employee_id.trim() || undefined,
          company_id: companyId,
        }),
      });

      const userId = (created as any)?.data?.id ?? (created as any)?.id;

      // 2. Assign to route if selected
      if (selectedRouteId && userId) {
        await apiClient.request("/employee-route-assignments/assign", {
          method: "POST",
          body: JSON.stringify({ user_id: userId, route_id: selectedRouteId }),
        });
      }

      setDone(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to add employee");
    } finally {
      setSubmitting(false);
    }
  }

  const confidenceColor: Record<string, string> = {
    High: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Medium: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    Low: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  const inputCls = "w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--cort-orange)]/40 focus:border-[var(--cort-orange)] transition-all";
  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5";

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm slideover-overlay"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex flex-col w-full max-w-lg bg-[var(--bg-card)] border-l border-[var(--border-default)] shadow-2xl overflow-y-auto slideover-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-light)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--cort-orange)]/10">
              <UserPlus className="w-5 h-5 text-[var(--cort-orange)]" />
            </div>
            <div>
              <h2 className="font-bold text-[var(--text-primary)]">Add Employee</h2>
              <p className="text-xs text-[var(--text-muted)]">AI will recommend the best route based on their address</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 py-12">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCheck className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <div className="font-bold text-[var(--text-primary)] text-lg">Employee Added!</div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                {form.full_name} has been added and{selectedRouteId ? " assigned to the recommended route" : " created"}.
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col flex-1">
            <div className="flex-1 px-6 py-6 space-y-5 overflow-y-auto">

              {/* Name + Employee ID */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      required
                      type="text"
                      value={form.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      placeholder="Ahmed Khan"
                      className={cx(inputCls, "pl-9")}
                    />
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className={labelCls}>Employee ID</label>
                  <input
                    type="text"
                    value={form.employee_id}
                    onChange={(e) => updateField("employee_id", e.target.value)}
                    placeholder="EMP-001"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className={labelCls}>Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="ahmed@company.com"
                    className={cx(inputCls, "pl-9")}
                  />
                </div>
              </div>

              {/* Phone + Department */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={PHONE_MAX_LENGTH}
                      value={form.phone}
                      onChange={(e) => updateField("phone", sanitizePhoneInput(e.target.value))}
                      placeholder={PHONE_PLACEHOLDER}
                      className={cx(inputCls, "pl-9")}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Department</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={form.department}
                      onChange={(e) => updateField("department", e.target.value)}
                      placeholder="Engineering"
                      className={cx(inputCls, "pl-9")}
                    />
                  </div>
                </div>
              </div>

              {/* Home Address → triggers AI */}
              <div>
                <label className={labelCls}>
                  Home / Pickup Address
                  <span className="ml-2 text-[var(--cort-orange)] normal-case font-normal tracking-normal">
                    — AI will auto-recommend a route
                  </span>
                </label>
                <div className="relative">
                  <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={form.home_address}
                    onChange={(e) => updateField("home_address", e.target.value)}
                    placeholder="e.g. DHA Phase 6, Lahore"
                    className={cx(inputCls, "pl-9")}
                  />
                  {aiLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--cort-orange)] animate-spin" />
                  )}
                </div>
                {aiError && (
                  <p className="mt-1 text-xs text-red-400">{aiError}</p>
                )}
              </div>

              {/* AI recommendation result */}
              {aiRec && (
                <div className="rounded-2xl border border-[var(--cort-orange)]/20 bg-[var(--cort-orange)]/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[var(--cort-orange)]" />
                    <span className="text-xs font-bold text-[var(--cort-orange)] uppercase tracking-wider">AI Recommendation</span>
                    <span className={cx("ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border", confidenceColor[aiRec.confidence] ?? confidenceColor.Low)}>
                      {aiRec.confidence}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{aiRec.routeName}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{aiRec.reason}</p>
                </div>
              )}

              {/* Route selector */}
              <div>
                <label className={labelCls}>
                  Assign to Route
                  {aiRec && <span className="ml-2 text-emerald-400 normal-case font-normal tracking-normal">— AI pre-selected below</span>}
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <div
                    onClick={() => setSelectedRouteId(null)}
                    className={cx(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
                      selectedRouteId === null
                        ? "border-[var(--border-input)] bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                        : "border-[var(--border-light)] hover:bg-[var(--bg-subtle)]"
                    )}
                  >
                    <div className={cx("w-4 h-4 rounded-full border-2 flex-shrink-0", selectedRouteId === null ? "border-[var(--text-muted)]" : "border-[var(--border-default)]")} />
                    <span className="text-sm text-[var(--text-muted)]">No route assignment (create employee only)</span>
                  </div>
                  {routes.map((route) => {
                    const isSelected = selectedRouteId === route.id;
                    const isAiPick = aiRec?.routeId === route.id;
                    return (
                      <div
                        key={route.id}
                        onClick={() => setSelectedRouteId(route.id)}
                        className={cx(
                          "flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",
                          isSelected
                            ? "border-[var(--cort-orange)]/40 bg-[var(--cort-orange)]/5"
                            : "border-[var(--border-light)] hover:bg-[var(--bg-subtle)]"
                        )}
                      >
                        <div className={cx(
                          "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          isSelected ? "border-[var(--cort-orange)] bg-[var(--cort-orange)]" : "border-[var(--border-default)]"
                        )}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--text-primary)]">{route.name}</span>
                            {isAiPick && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--cort-orange)] bg-[var(--cort-orange)]/10 border border-[var(--cort-orange)]/20 px-1.5 py-0.5 rounded-full">
                                <Sparkles className="w-2.5 h-2.5" /> AI Pick
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-muted)]">
                            {route.employee_route_assignments?.length ?? 0} passengers
                            {route.vehicles ? ` · ${route.vehicles.plate_number}` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {submitError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {submitError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-light)] flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <Button
                type="submit"
                disabled={submitting || !form.full_name.trim() || !form.email.trim()}
                className="gap-2 bg-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/90 text-white border-0 px-6 disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                ) : (
                  <><UserPlus className="w-4 h-4" /> Add Employee{selectedRouteId ? " & Assign Route" : ""}</>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>,
    document.body
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
  const [routes, setRoutes] = useState<CompanyRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

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
          <Button
            onClick={() => setShowAddEmployee(true)}
            className="gap-2 bg-[var(--cort-orange)] hover:bg-[var(--cort-orange)]/90 text-white border-0 rounded-xl"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </Button>
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
          <div className="text-sm text-[var(--text-muted)]">No routes assigned yet.</div>
          <div className="mt-1 text-xs text-[var(--text-muted)] opacity-70">Contact Cort Super Admin to assign routes.</div>
        </Card>
      ) : (
        <div>
          <div className="text-sm text-[var(--text-muted)] mb-4">
            {routes.length} route{routes.length !== 1 ? "s" : ""} · Read-only view managed by Cort Operations
          </div>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        </div>
      )}

      {showAddEmployee && (
        <AddEmployeePanel
          companyId={company.id}
          routes={routes}
          onClose={() => setShowAddEmployee(false)}
          onSuccess={() => loadRoutes()}
        />
      )}
    </div>
  );
}
