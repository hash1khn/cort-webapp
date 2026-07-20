"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import {
  ArrowLeftRight,
  Edit,
  Plus,
  Save,
  Sunrise,
  Sunset,
  Trash2,
  X,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/admin/ui/Button";
import { Card } from "../../components/DashboardComponents";
import StopAddressSearch from "@/app/admin/ui/StopAddressSearch";
import { apiClient } from "../../../lib/services/api-client";
import type { MapMarker } from "@/app/admin/ui/Map";

const Map = dynamic(() => import("@/app/admin/ui/Map"), { ssr: false });

export type CompanyRouteStop = {
  id: number;
  route_id: number;
  name: string;
  sequence_order: number;
  morning_sequence?: number | null;
  evening_sequence?: number | null;
  morning_eta?: string | null;
  evening_eta?: string | null;
  lat?: number | null;
  lng?: number | null;
};

type StopDirection = "MORNING" | "EVENING" | "BOTH";

type RouteStopsEditorProps = {
  routeId: number;
  stops: CompanyRouteStop[];
  onUpdated: () => void;
};

const inputCls =
  "w-full rounded-lg border border-[var(--border-input)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--cort-orange)] focus:ring-1 focus:ring-[var(--cort-orange)] outline-none";
const labelCls = "block text-xs font-semibold text-[var(--text-muted)] mb-1";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "";
  if (/^\d{2}:\d{2}$/.test(timeStr)) return timeStr;
  try {
    const date = new Date(timeStr.includes("T") ? timeStr : `1970-01-01T${timeStr}Z`);
    if (isNaN(date.getTime())) return timeStr;
    return date.toISOString().substring(11, 16);
  } catch {
    return timeStr;
  }
}

function deriveDirection(stop: CompanyRouteStop): StopDirection {
  if (stop.morning_sequence != null && stop.evening_sequence != null) return "BOTH";
  if (stop.morning_sequence != null) return "MORNING";
  if (stop.evening_sequence != null) return "EVENING";
  return "BOTH";
}

function DirectionBadge({ direction, t }: { direction: StopDirection; t: (key: string) => string }) {
  if (direction === "MORNING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20">
        <Sunrise className="w-3 h-3" /> {t("morningOnly")}
      </span>
    );
  }
  if (direction === "EVENING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
        <Sunset className="w-3 h-3" /> {t("eveningOnly")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
      <ArrowLeftRight className="w-3 h-3" /> {t("bothDirections")}
    </span>
  );
}

function SequenceInput({
  label,
  value,
  onChange,
  icon,
  colorClass,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cx("inline-flex items-center gap-1 text-xs font-semibold", colorClass)}>
        {icon} {label}
      </span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 px-2 py-1.5 border border-[var(--border-input)] rounded-lg text-sm text-center bg-[var(--bg-input)] focus:outline-none focus:ring-1 focus:ring-[var(--cort-orange)]"
        placeholder="#"
      />
    </div>
  );
}

export function RouteStopsEditor({ routeId, stops, onUpdated }: RouteStopsEditorProps) {
  const t = useTranslations("company.routes");
  const tCommon = useTranslations("common");

  const [isSaving, setIsSaving] = useState(false);
  const [editingStopId, setEditingStopId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [originalDirection, setOriginalDirection] = useState<StopDirection | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    lat: "",
    lng: "",
    morning_eta: "",
    evening_eta: "",
    direction: "BOTH" as StopDirection,
    morning_sequence: "",
    evening_sequence: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      lat: "",
      lng: "",
      morning_eta: "",
      evening_eta: "",
      direction: "BOTH",
      morning_sequence: "",
      evening_sequence: "",
    });
    setEditingStopId(null);
    setIsAdding(false);
    setOriginalDirection(null);
  };

  const handleEditClick = (stop: CompanyRouteStop) => {
    const dir = deriveDirection(stop);
    setOriginalDirection(dir);
    setFormData({
      name: stop.name,
      lat: stop.lat?.toString() || "",
      lng: stop.lng?.toString() || "",
      morning_eta: stop.morning_eta ? formatTime(stop.morning_eta) : "",
      evening_eta: stop.evening_eta ? formatTime(stop.evening_eta) : "",
      direction: dir,
      morning_sequence: stop.morning_sequence?.toString() ?? "",
      evening_sequence: stop.evening_sequence?.toString() ?? "",
    });
    setEditingStopId(stop.id);
    setIsAdding(false);
  };

  const handleAddClick = () => {
    const nextMorning = Math.max(0, ...stops.map((s) => s.morning_sequence ?? 0)) + 1;
    const nextEvening = Math.max(0, ...stops.map((s) => s.evening_sequence ?? 0)) + 1;
    resetForm();
    setOriginalDirection(null);
    setFormData((f) => ({
      ...f,
      morning_sequence: nextMorning.toString(),
      evening_sequence: nextEvening.toString(),
    }));
    setIsAdding(true);
  };

  const handleDirectionChange = (dir: StopDirection) => {
    const nextMorning = Math.max(0, ...stops.map((s) => s.morning_sequence ?? 0)) + 1;
    const nextEvening = Math.max(0, ...stops.map((s) => s.evening_sequence ?? 0)) + 1;

    setFormData((f) => ({
      ...f,
      direction: dir,
      morning_sequence:
        dir === "EVENING"
          ? ""
          : dir === "BOTH"
            ? (f.morning_sequence || nextMorning.toString())
            : f.morning_sequence,
      evening_sequence:
        dir === "MORNING"
          ? ""
          : dir === "BOTH"
            ? (f.evening_sequence || nextEvening.toString())
            : f.evening_sequence,
    }));
  };

  const handleAddressSelect = useCallback(({ name, lat, lng }: { name: string; lat: number; lng: number }) => {
    setFormData((f) => ({ ...f, name, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setFormData((f) => ({ ...f, lat: lat.toFixed(6), lng: lng.toFixed(6) }));
    toast.message(t("coordinatesUpdatedFromMap"));
  }, [t]);

  const buildPayload = () => {
    if (formData.direction === "BOTH" && (!formData.morning_sequence || !formData.evening_sequence)) {
      if (editingStopId && originalDirection && originalDirection !== "BOTH") {
        toast.error(t("bothSequencesRequiredWhenChangingDirection"));
      } else {
        toast.error(t("bothSequencesRequired"));
      }
      return null;
    }

    const data: Record<string, unknown> = {
      name: formData.name,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng),
      morning_eta: formData.morning_eta || null,
      evening_eta: formData.evening_eta || null,
      direction: formData.direction,
      sequence_order: 0,
    };

    if (formData.morning_sequence !== "" && formData.direction !== "EVENING") {
      data.morning_sequence = parseInt(formData.morning_sequence, 10);
    }
    if (formData.evening_sequence !== "" && formData.direction !== "MORNING") {
      data.evening_sequence = parseInt(formData.evening_sequence, 10);
    }

    return data;
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.lat || !formData.lng) {
      toast.error(t("stopLocationRequired"));
      return;
    }

    const data = buildPayload();
    if (!data) return;

    try {
      setIsSaving(true);
      if (isAdding) {
        await apiClient.addCompanyRouteStop(routeId, data as Parameters<typeof apiClient.addCompanyRouteStop>[1]);
        toast.success(t("stopAddedSuccess"));
      } else if (editingStopId) {
        await apiClient.updateCompanyRouteStop(editingStopId, data);
        toast.success(t("stopUpdatedSuccess"));
      }
      resetForm();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedSaveStop"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("confirmDeleteStop"))) return;
    try {
      await apiClient.deleteCompanyRouteStop(id);
      toast.success(t("stopDeletedSuccess"));
      if (editingStopId === id) resetForm();
      onUpdated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("failedDeleteStop"));
    }
  };

  const morningStops = stops
    .filter((s) => s.morning_sequence != null)
    .sort((a, b) => (a.morning_sequence ?? 0) - (b.morning_sequence ?? 0));

  const eveningStops = stops
    .filter((s) => s.evening_sequence != null)
    .sort((a, b) => (a.evening_sequence ?? 0) - (b.evening_sequence ?? 0));

  const renderFormFields = () => {
    const mapMarkers: MapMarker[] =
      formData.lat && formData.lng
        ? [{
          id: "form-pin",
          position: [parseFloat(formData.lat), parseFloat(formData.lng)],
          label: formData.name || t("newStop"),
          color: "#6366f1",
        }]
        : [];

    return (
      <div className="space-y-4">
        <div>
          <label className={labelCls}>{t("searchLocation")} *</label>
          <StopAddressSearch
            onSelect={handleAddressSelect}
            defaultValue={formData.name}
            placeholder={t("searchLocationPlaceholder")}
            className="mt-1"
          />
        </div>

        <div className="rounded-lg overflow-hidden border border-[var(--border-light)]" style={{ height: 200 }}>
          <Map
            height="100%"
            markers={mapMarkers}
            onMapClick={handleMapClick}
            center={
              formData.lat && formData.lng
                ? [parseFloat(formData.lat), parseFloat(formData.lng)]
                : undefined
            }
          />
        </div>

        {formData.lat && formData.lng && (
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {parseFloat(formData.lat).toFixed(5)}, {parseFloat(formData.lng).toFixed(5)} · {t("clickMapToAdjust")}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>{t("stopName")} *</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputCls}
              placeholder={t("stopNamePlaceholder")}
            />
          </div>

          <div>
            <label className={labelCls}>{t("direction")}</label>
            <select
              value={formData.direction}
              onChange={(e) => handleDirectionChange(e.target.value as StopDirection)}
              className={inputCls}
            >
              <option value="BOTH">{t("bothDirections")}</option>
              <option value="MORNING">{t("morningOnly")}</option>
              <option value="EVENING">{t("eveningOnly")}</option>
            </select>
          </div>

          {(formData.direction === "MORNING" || formData.direction === "BOTH") && (
            <div>
              <label className={labelCls}>{t("morningEta")}</label>
              <input
                type="time"
                value={formData.morning_eta}
                onChange={(e) => setFormData({ ...formData, morning_eta: e.target.value })}
                className={inputCls}
              />
            </div>
          )}

          {(formData.direction === "EVENING" || formData.direction === "BOTH") && (
            <div>
              <label className={labelCls}>{t("eveningEta")}</label>
              <input
                type="time"
                value={formData.evening_eta}
                onChange={(e) => setFormData({ ...formData, evening_eta: e.target.value })}
                className={inputCls}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-6 pt-1 pb-1 px-3 py-3 bg-[var(--bg-subtle)] border border-[var(--border-light)] rounded-lg">
          <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide w-full -mb-2">
            {t("stopPositionInRoute")}
          </span>
          {(formData.direction === "MORNING" || formData.direction === "BOTH") && (
            <SequenceInput
              label={t("morningPosition")}
              value={formData.morning_sequence}
              onChange={(v) => setFormData({ ...formData, morning_sequence: v })}
              icon={<Sunrise className="w-3 h-3" />}
              colorClass="text-amber-600"
            />
          )}
          {(formData.direction === "EVENING" || formData.direction === "BOTH") && (
            <SequenceInput
              label={t("eveningPosition")}
              value={formData.evening_sequence}
              onChange={(v) => setFormData({ ...formData, evening_sequence: v })}
              icon={<Sunset className="w-3 h-3" />}
              colorClass="text-indigo-600"
            />
          )}
          <p className="text-xs text-[var(--text-muted)] italic self-end pb-0.5">
            {t("stopSequenceHint")}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)]">
            {t("manageStops")} ({stops.length})
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{t("manageStopsDescription")}</p>
        </div>
        {!isAdding && !editingStopId && (
          <Button onClick={handleAddClick} className="gap-2 bg-[var(--cort-orange)] hover:bg-[var(--cort-orange-hover)] text-white">
            <Plus className="w-4 h-4" />
            {t("addStop")}
          </Button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {isAdding && (
          <div className="rounded-xl border border-[var(--border-light)] bg-[var(--bg-subtle)] p-4">
            <h4 className="font-medium mb-3 text-[var(--text-primary)] flex items-center gap-2">
              <Plus className="w-4 h-4 text-[var(--cort-orange)]" /> {t("newStop")}
            </h4>
            {renderFormFields()}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> {tCommon("actions.cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={isSaving} className="bg-[var(--cort-orange)] hover:bg-[var(--cort-orange-hover)] text-white">
                {isSaving ? t("savingStop") : t("saveStop")}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {stops.length === 0 && !isAdding && (
            <div className="py-10 text-center text-sm text-[var(--text-muted)]">{t("noStopsConfigured")}</div>
          )}

          {stops.map((stop) => {
            const dir = deriveDirection(stop);
            const isEditingThisStop = editingStopId === stop.id;

            if (isEditingThisStop) {
              return (
                <div key={stop.id} className="rounded-xl border border-[var(--cort-orange)]/30 bg-[var(--cort-orange)]/5 p-4">
                  <h4 className="font-medium mb-3 text-[var(--text-primary)] flex items-center gap-2">
                    <Edit className="w-4 h-4" /> {t("editingStop", { name: stop.name })}
                  </h4>
                  {renderFormFields()}
                  <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={resetForm}>
                      <X className="w-4 h-4 mr-1" /> {tCommon("actions.cancel")}
                    </Button>
                    <Button size="sm" onClick={handleSubmit} disabled={isSaving} className="bg-[var(--cort-orange)] hover:bg-[var(--cort-orange-hover)] text-white">
                      {isSaving ? t("updatingStop") : t("updateStop")}
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={stop.id}
                className="flex items-center justify-between p-3 bg-[var(--bg-card)] border border-[var(--border-light)] rounded-xl hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {stop.morning_sequence != null && (
                      <div className="w-8 h-8 flex items-center justify-center bg-amber-500/10 text-amber-600 rounded-full font-bold text-sm">
                        {stop.morning_sequence}
                      </div>
                    )}
                    {stop.evening_sequence != null && (
                      <div className="w-8 h-8 flex items-center justify-center bg-indigo-500/10 text-indigo-600 rounded-full font-bold text-sm">
                        {stop.evening_sequence}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--text-primary)]">{stop.name}</span>
                      <DirectionBadge direction={dir} t={t} />
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                      {stop.lat != null && stop.lng != null && `${Number(stop.lat).toFixed(5)}, ${Number(stop.lng).toFixed(5)}`}
                      {stop.morning_eta && dir !== "EVENING" && ` · AM: ${formatTime(stop.morning_eta)}`}
                      {stop.evening_eta && dir !== "MORNING" && ` · PM: ${formatTime(stop.evening_eta)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditClick(stop)}
                    className="p-2 text-[var(--text-muted)] hover:text-[var(--cort-orange)] rounded-lg hover:bg-[var(--bg-subtle)]"
                    title={tCommon("actions.edit")}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(stop.id)}
                    className="p-2 text-[var(--text-muted)] hover:text-red-500 rounded-lg hover:bg-[var(--bg-subtle)]"
                    title={tCommon("actions.delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {(morningStops.length > 0 || eveningStops.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20">
                <Sunrise className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">
                  {t("morningRoute")} ({morningStops.length})
                </span>
              </div>
              <ol className="divide-y divide-[var(--border-light)]">
                {morningStops.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-amber-500/10 text-amber-600 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-[var(--text-primary)]">{s.name}</span>
                    {s.morning_eta && (
                      <span className="ml-auto text-xs text-[var(--text-muted)]">{formatTime(s.morning_eta)}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border-b border-indigo-500/20">
                <Sunset className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-700">
                  {t("eveningRoute")} ({eveningStops.length})
                </span>
              </div>
              <ol className="divide-y divide-[var(--border-light)]">
                {eveningStops.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-[var(--text-primary)]">{s.name}</span>
                    {s.evening_eta && (
                      <span className="ml-auto text-xs text-[var(--text-muted)]">{formatTime(s.evening_eta)}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
