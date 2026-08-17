"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { SuperAdminPage } from "../../components/SuperAdminPage";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { ToggleSwitch } from "../../components/ToggleSwitch";
import { apiClient } from "../../../lib/services/api-client";
import type { MobileAppConfig } from "../../../lib/services/types/app-config";
import {
  adminBtnPrimary,
  adminCardPadding,
  adminInput,
} from "../../components/ui/admin-styles";

const PLAY_STORE_PLACEHOLDER =
  "https://play.google.com/store/apps/details?id=com.corttechnologies.traflinq";
const APP_STORE_PLACEHOLDER = "https://apps.apple.com/app/idXXXXXXXX";

type FormState = {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  iosMinVersion: string;
  androidMinVersion: string;
  iosStoreUrl: string;
  androidStoreUrl: string;
  forceUpdateMessage: string;
};

const EMPTY_FORM: FormState = {
  maintenanceEnabled: false,
  maintenanceMessage: "",
  iosMinVersion: "",
  androidMinVersion: "",
  iosStoreUrl: "",
  androidStoreUrl: "",
  forceUpdateMessage: "",
};

function toForm(config: MobileAppConfig): FormState {
  return {
    maintenanceEnabled: config.maintenanceEnabled,
    maintenanceMessage: config.maintenanceMessage ?? "",
    iosMinVersion: config.iosMinVersion ?? "",
    androidMinVersion: config.androidMinVersion ?? "",
    iosStoreUrl: config.iosStoreUrl ?? "",
    androidStoreUrl: config.androidStoreUrl ?? "",
    forceUpdateMessage: config.forceUpdateMessage ?? "",
  };
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export default function AppConfigPage() {
  return (
    <SuperAdminPage>
      <AppConfigContent />
    </SuperAdminPage>
  );
}

function AppConfigContent() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getAppConfig();
      setForm(toForm(data));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load app config");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const data = await apiClient.updateAppConfig({
        maintenanceEnabled: form.maintenanceEnabled,
        maintenanceMessage: emptyToNull(form.maintenanceMessage),
        iosMinVersion: emptyToNull(form.iosMinVersion),
        androidMinVersion: emptyToNull(form.androidMinVersion),
        iosStoreUrl: emptyToNull(form.iosStoreUrl),
        androidStoreUrl: emptyToNull(form.androidStoreUrl),
        forceUpdateMessage: emptyToNull(form.forceUpdateMessage),
      });
      setForm(toForm(data));
      toast.success("App config saved");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save app config";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
      <AdminPageHeader
        eyebrow="Settings"
        title="App Config"
        description="Control mobile maintenance mode and the minimum iOS / Android versions. Open apps pick up changes the next time they launch or return to the foreground."
      />

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--cort-navy)] border-t-transparent" />
        </div>
      ) : (
        <>
          <section className={adminCardPadding}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Maintenance mode
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Blocks the app for every user, even on the latest version. Use this when the
                  service is temporarily unavailable.
                </p>
              </div>
              <ToggleSwitch
                checked={form.maintenanceEnabled}
                onChange={() => patch("maintenanceEnabled", !form.maintenanceEnabled)}
                disabled={saving}
              />
            </div>
            <label className="mt-4 block text-xs font-medium text-[var(--text-muted)]">
              Message shown in the app
            </label>
            <textarea
              className={`${adminInput} mt-1 min-h-[88px] resize-y`}
              rows={3}
              maxLength={500}
              value={form.maintenanceMessage}
              onChange={(e) => patch("maintenanceMessage", e.target.value)}
              placeholder="Traflinq is temporarily unavailable. Please try again shortly."
              disabled={saving}
            />
          </section>

          <section className={adminCardPadding}>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Force update</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Users on a version below the platform minimum are stopped until they update from
              the store. Leave a version blank to disable force-update for that platform.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  iOS min version
                </label>
                <input
                  className={`${adminInput} mt-1`}
                  value={form.iosMinVersion}
                  onChange={(e) => patch("iosMinVersion", e.target.value)}
                  placeholder="1.3.0"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Android min version
                </label>
                <input
                  className={`${adminInput} mt-1`}
                  value={form.androidMinVersion}
                  onChange={(e) => patch("androidMinVersion", e.target.value)}
                  placeholder="1.3.0"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  App Store URL
                </label>
                <input
                  className={`${adminInput} mt-1`}
                  value={form.iosStoreUrl}
                  onChange={(e) => patch("iosStoreUrl", e.target.value)}
                  placeholder={APP_STORE_PLACEHOLDER}
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Play Store URL
                </label>
                <input
                  className={`${adminInput} mt-1`}
                  value={form.androidStoreUrl}
                  onChange={(e) => patch("androidStoreUrl", e.target.value)}
                  placeholder={PLAY_STORE_PLACEHOLDER}
                  disabled={saving}
                />
              </div>
            </div>

            <label className="mt-4 block text-xs font-medium text-[var(--text-muted)]">
              Update message
            </label>
            <textarea
              className={`${adminInput} mt-1 min-h-[88px] resize-y`}
              rows={3}
              maxLength={500}
              value={form.forceUpdateMessage}
              onChange={(e) => patch("forceUpdateMessage", e.target.value)}
              placeholder="A new version of Traflinq is required. Please update to continue."
              disabled={saving}
            />
          </section>

          <p className="text-xs text-[var(--text-muted)]">
            Already-open apps refresh this config when brought back to the foreground (not
            more than once a minute). This only affects iOS and Android builds that include
            the version-check code.
          </p>

          <div>
            <button
              type="button"
              className={adminBtnPrimary}
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
