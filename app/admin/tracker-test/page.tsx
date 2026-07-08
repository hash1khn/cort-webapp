"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { MapMarker } from "@/app/admin/ui/Map";

const Map = dynamic(() => import("@/app/admin/ui/Map"), { ssr: false });

type TrakkerVehicle = {
  RegNo?: string;
  VrnMake?: string;
  VrnModle?: string;
  VehStatus?: string;
  Speed?: string;
  Location?: string;
  Lat?: string | number;
  Long?: string | number;
};

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function tryPickString(obj: unknown, keys: string[]): string | "" {
  if (!obj || typeof obj !== "object") return "";
  const record = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = record[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}

function safeJsonParse(text: string): { ok: true; value: Json } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(text) as Json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

export default function TrackerTestPage() {
  const HARDCODED_USERID = "Z1X5CVA";
  const HARDCODED_PASSWORD = "c1d8a6b2-9f47-4e3a-b5c1-2a7f9d0e6c44";
  const DEFAULT_PHONE = "03156618471";
  const DEFAULT_YEAR = "1992";

  const [loginBodyText, setLoginBodyText] = useState<string>(
    JSON.stringify(
      {
        // Trakker GetToken expects: { "UserID": "...", "Password": "..." }
        UserID: HARDCODED_USERID,
        Password: HARDCODED_PASSWORD,
      },
      null,
      2
    )
  );

  const [token, setToken] = useState("");
  const [userId, setUserId] = useState(HARDCODED_USERID);
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [mapMarkers, setMapMarkers] = useState<MapMarker[]>([]);

  const [loginStatus, setLoginStatus] = useState<{ status?: number; body?: unknown; error?: string } | null>(null);
  const [locationStatus, setLocationStatus] = useState<{ status?: number; body?: unknown; error?: string } | null>(
    null
  );
  const [busy, setBusy] = useState<"login" | "location" | null>(null);

  const parsedLoginBody = useMemo(() => safeJsonParse(loginBodyText), [loginBodyText]);

  async function doLogin() {
    setBusy("login");
    setLoginStatus(null);
    try {
      const res = await fetch("/api/tracker/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ UserID: HARDCODED_USERID, Password: HARDCODED_PASSWORD }),
      });

      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        // keep text
      }

      setLoginStatus({ status: res.status, body });

      const nextToken =
        tryPickString(body, ["Token", "token", "access_token", "accessToken"]) ||
        tryPickString((body as Record<string, unknown> | undefined)?.data, ["Token", "token", "access_token", "accessToken"]);
      const nextUserId =
        tryPickString(body, ["UserID", "userId", "userid", "UserId"]) ||
        tryPickString((body as Record<string, unknown> | undefined)?.data, ["UserID", "userId", "userid", "UserId"]);

      if (nextToken) setToken(nextToken);
      if (nextUserId) setUserId(nextUserId);
      else setUserId(HARDCODED_USERID);
    } catch (e) {
      setLoginStatus({ error: e instanceof Error ? e.message : "Login failed" });
    } finally {
      setBusy(null);
    }
  }

  async function ensureToken(): Promise<
    { ok: true; userId: string; token: string } | { ok: false; error: string }
  > {
    if (token && userId) return { ok: true, userId, token };
    try {
      const res = await fetch("/api/tracker/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ UserID: HARDCODED_USERID, Password: HARDCODED_PASSWORD }),
      });

      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        // keep text
      }

      setLoginStatus({ status: res.status, body });

      const nextToken =
        tryPickString(body, ["Token", "token", "access_token", "accessToken"]) ||
        tryPickString((body as Record<string, unknown> | undefined)?.data, ["Token", "token", "access_token", "accessToken"]);

      const nextUserId =
        tryPickString(body, ["UserID", "userId", "userid", "UserId"]) ||
        tryPickString((body as Record<string, unknown> | undefined)?.data, ["UserID", "userId", "userid", "UserId"]) ||
        HARDCODED_USERID;

      if (!nextToken) return { ok: false, error: "Token missing in response" };

      setToken(nextToken);
      setUserId(nextUserId);
      return { ok: true, userId: nextUserId, token: nextToken };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Login failed" };
    }
  }

  useEffect(() => {
    void (async () => {
      await ensureToken();
      // Auto-fetch location using defaults
      await doLocation(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function getVehiclesFromBody(body: unknown): TrakkerVehicle[] {
    if (Array.isArray(body)) return body as TrakkerVehicle[];
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (Array.isArray(record.body)) return record.body as TrakkerVehicle[];
      if (Array.isArray(record.data)) return record.data as TrakkerVehicle[];
    }
    return [];
  }

  function extractMarkersFromLocationBody(body: unknown): MapMarker[] {
    const markers: MapMarker[] = [];

    for (const [index, vehicle] of getVehiclesFromBody(body).entries()) {
      const lat = Number(vehicle.Lat);
      const lng = Number(vehicle.Long);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const regNo = vehicle.RegNo || `Vehicle ${index + 1}`;
      const makeModel = [vehicle.VrnMake, vehicle.VrnModle].filter(Boolean).join(" ");
      const status = vehicle.VehStatus || "Unknown";
      const speed = vehicle.Speed ? `${vehicle.Speed} km/h` : "";
      const location = vehicle.Location || "";

      markers.push({
        id: regNo,
        position: [lat, lng],
        label: `${regNo}${makeModel ? ` · ${makeModel}` : ""}`,
        description: [status, speed, location].filter(Boolean).join(" · "),
        type: "driver",
      });
    }

    return markers;
  }

  async function doLocation(silent = false) {
    if (!silent) {
      setBusy("location");
      setLocationStatus(null);
    }
    try {
      const ensured = await ensureToken();
      if (!ensured.ok) {
        setLocationStatus({ error: ensured.error });
        return;
      }
      const qs = new URLSearchParams({ phone, year });
      const res = await fetch(`/api/tracker/location?${qs.toString()}`, {
        method: "GET",
        headers: {
          "x-tracker-userid": ensured.userId,
          "x-tracker-token": ensured.token,
        },
      });

      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        // keep text
      }

      setLocationStatus({ status: res.status, body });
      setMapMarkers(extractMarkersFromLocationBody(body));
    } catch (e) {
      setLocationStatus({ error: e instanceof Error ? e.message : "Location fetch failed" });
    } finally {
      if (!silent) setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Tracker Test</h1>
        <p className="mt-1 text-sm text-gray-600">
          Step 1: POST login to <code className="rounded bg-gray-100 px-1">/api/tracker/token</code> → Step 2: use{" "}
          <code className="rounded bg-gray-100 px-1">UserID</code> + <code className="rounded bg-gray-100 px-1">Token</code>{" "}
          headers to call <code className="rounded bg-gray-100 px-1">/api/tracker/location</code>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">1) Get Token</h2>
            <button
              onClick={doLogin}
              disabled={busy !== null}
              className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "login" ? "Logging in…" : "Login"}
            </button>
          </div>

          <label className="mt-4 block text-sm font-medium">Login JSON body</label>
          <textarea
            value={loginBodyText}
            onChange={(e) => setLoginBodyText(e.target.value)}
            className="mt-2 h-56 w-full rounded border p-2 font-mono text-xs"
            spellCheck={false}
            readOnly
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">UserID</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                placeholder="Will auto-fill after login"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                placeholder="Will auto-fill after login"
                readOnly
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium">Token response</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs">
              {loginStatus ? JSON.stringify(loginStatus, null, 2) : "—"}
            </pre>
          </div>
        </section>

        <section className="rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">2) Get Live Location (GetVLL)</h2>
            <button
              onClick={() => doLocation(false)}
              disabled={busy !== null || !token || !userId || !phone || !year}
              className="rounded bg-black px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "location" ? "Fetching…" : "Fetch location"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                placeholder="e.g. 03156618471"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Year</label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="mt-1 w-full rounded border px-2 py-1.5 text-sm"
                placeholder="e.g. 1992"
              />
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-600">
            Sends headers{" "}
            <code className="rounded bg-gray-100 px-1">x-tracker-userid</code> and{" "}
            <code className="rounded bg-gray-100 px-1">x-tracker-token</code>.
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium">Location response</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-50 p-3 text-xs">
              {locationStatus ? JSON.stringify(locationStatus, null, 2) : "—"}
            </pre>
          </div>
        </section>
      </div>

      <section className="rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Map</h2>
            <p className="mt-1 text-sm text-gray-600">
              Vehicles from GetVLL are plotted using <code className="rounded bg-gray-100 px-1">Lat</code> and{" "}
              <code className="rounded bg-gray-100 px-1">Long</code>.
            </p>
          </div>
          <div className="text-xs text-gray-600">{mapMarkers.length ? `${mapMarkers.length} marker(s)` : "No markers yet"}</div>
        </div>

        <div className="mt-4">
          <Map height="520px" markers={mapMarkers} />
        </div>
      </section>
    </div>
  );
}
