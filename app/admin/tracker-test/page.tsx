"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";

// Leaflet must be loaded client-side only
const TrackerMap = dynamic<{ vehicles: VehicleLocation[]; selected: VehicleLocation | null; onSelect: (v: VehicleLocation) => void }>(
    () => import("./TrackerMap"),
    { ssr: false }
);

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const USER_ID = "Z1X5CVA";
const PASSWORD = "c1d8a6b2-9f47-4e3a-b5c1-2a7f9d0e6c44";

export interface VehicleLocation {
    RegNo: string;
    VrnCategory: string;
    VrnModle: string;
    VrnMake: string;
    VrnColor: string;
    VehStatus: string;
    GpsDateTime: string;
    Location: string;
    Speed: string;
    Lat: string;
    Long: string;
    Direction: string;
    Odo: string;
    Ignition: string;
    Link: string;
    [key: string]: unknown;
}

export default function TrackerTestPage() {
    const [token, setToken] = useState("");
    const [manualToken, setManualToken] = useState("");
    const [tokenLoading, setTokenLoading] = useState(false);
    const [tokenOk, setTokenOk] = useState(false);
    const [tokenError, setTokenError] = useState("");

    const [phone, setPhone] = useState("03156618471");
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [locationLoading, setLocationLoading] = useState(false);
    const [locationError, setLocationError] = useState("");
    const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
    const [selected, setSelected] = useState<VehicleLocation | null>(null);
    const [polling, setPolling] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    const effectiveToken = token || manualToken;
    // Keep a stable ref so the interval closure always sees latest values
    const phoneRef = useRef(phone);
    const yearRef = useRef(year);
    const tokenRef = useRef(effectiveToken);
    useEffect(() => { phoneRef.current = phone; }, [phone]);
    useEffect(() => { yearRef.current = year; }, [year]);
    useEffect(() => { tokenRef.current = effectiveToken; }, [effectiveToken]);

    const handleGetToken = async () => {
        setTokenLoading(true);
        setTokenOk(false);
        setTokenError("");
        try {
            const res = await fetch("/api/tracker/token", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ UserID: USER_ID, Password: PASSWORD }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
            const t = json.Token ?? json.token ?? json.AccessToken ?? json.access_token ?? "";
            if (t) { setToken(t); setTokenOk(true); }
            else throw new Error("No token field found in response: " + JSON.stringify(json));
        } catch (err) {
            setTokenError(err instanceof Error ? err.message : "Unknown error");
        } finally {
            setTokenLoading(false);
        }
    };

    const fetchVehicles = useCallback(async (silent = false) => {
        const tok = tokenRef.current;
        const ph = phoneRef.current;
        const yr = yearRef.current;
        if (!tok) { setLocationError("Get a token first."); return; }
        if (!silent) { setLocationLoading(true); setLocationError(""); setVehicles([]); setSelected(null); }
        try {
            const res = await fetch(
                `/api/tracker/location?phone=${encodeURIComponent(ph)}&year=${encodeURIComponent(yr)}`,
                { headers: { "x-tracker-userid": USER_ID, "x-tracker-token": tok } }
            );
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
            if (json === null) throw new Error("API returned null — token may have expired, try Get Token again");
            const arr: VehicleLocation[] = Array.isArray(json) ? json
                : Array.isArray(json?.data) ? json.data
                : Array.isArray(json?.Data) ? json.Data
                : [];
            if (arr.length === 0) throw new Error(
                "API responded but no vehicle array found. Raw: " + JSON.stringify(json).slice(0, 300)
            );
            setVehicles(arr);
            setLastUpdated(new Date());
            // Keep selected in sync with updated position
            setSelected(prev => prev ? (arr.find(v => v.RegNo === prev.RegNo) ?? prev) : null);
        } catch (err) {
            setLocationError(err instanceof Error ? err.message : "Unknown error");
            // If polling and we hit an error, stop polling
            if (silent) stopPolling();
        } finally {
            if (!silent) setLocationLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopPolling = () => {
        if (pollInterval.current) { clearInterval(pollInterval.current); pollInterval.current = null; }
        setPolling(false);
    };

    const startPolling = () => {
        stopPolling();
        setPolling(true);
        pollInterval.current = setInterval(() => fetchVehicles(true), 15_000);
    };

    // Clean up on unmount
    useEffect(() => () => stopPolling(), []);

    const handleGetLocation = async () => {
        stopPolling();
        await fetchVehicles(false);
        // Auto-start polling after first successful load
        startPolling();
    };

    const movingCount = vehicles.filter((v) => v.VehStatus?.toLowerCase() === "moving").length;
    const parkedCount = vehicles.length - movingCount;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[#0c225e]">TPL Trakker — Live Vehicle Map</h1>
                <p className="text-sm text-gray-500 mt-1">Get token → fetch vehicle locations → view on map</p>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                    {/* Step 1 */}
                    <div className="flex-1 min-w-[180px]">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Step 1 — Authentication</p>
                        <button
                            onClick={handleGetToken}
                            disabled={tokenLoading}
                            className="w-full bg-[#0c225e] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#0a1a4a] disabled:opacity-50 transition-colors"
                        >
                            {tokenLoading ? "Getting Token…" : tokenOk ? "✓ Token OK — Refresh" : "Get Token"}
                        </button>
                        {tokenError && <p className="text-xs text-red-500 mt-1">{tokenError}</p>}
                    </div>

                    {/* Divider */}
                    <div className="text-gray-300 font-light text-xl self-end pb-2">→</div>

                    {/* Step 2 */}
                    <div className="flex-1 min-w-[220px]">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Step 2 — Fetch Vehicles</p>
                        <div className="flex gap-2">
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Phone"
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0c225e]"
                            />
                            <input
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="Year"
                                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0c225e]"
                            />
                            <button
                                onClick={handleGetLocation}
                                disabled={locationLoading || !effectiveToken}
                                className={cx(
                                    "px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap",
                                    effectiveToken ? "bg-[#f47f00] text-white hover:bg-[#d96e00] disabled:opacity-50" : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                {locationLoading ? "Loading…" : "Get Vehicles"}
                            </button>
                        </div>
                        {locationError && <p className="text-xs text-red-500 mt-1">{locationError}</p>}
                    </div>

                    {/* Token override */}
                    <div className="w-full">
                        <p className="text-xs text-gray-400 mb-1">
                            Token{" "}
                            {tokenOk ? <span className="text-green-600 font-medium">auto-filled ✓</span>
                                : <span>(or paste manually)</span>}
                        </p>
                        <input
                            value={effectiveToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0c225e]"
                            placeholder="JWT token"
                        />
                    </div>
                </div>

                {/* Stats + live indicator */}
                {vehicles.length > 0 && (
                    <div className="flex gap-3 pt-1 flex-wrap items-center">
                        <Chip color="bg-[#0c225e] text-white">{vehicles.length} Total</Chip>
                        <Chip color="bg-green-100 text-green-800">🟢 {movingCount} Moving</Chip>
                        <Chip color="bg-gray-100 text-gray-700">🔴 {parkedCount} Parked</Chip>
                        {/* Live pulse */}
                        {polling && (
                            <span className="flex items-center gap-1.5 text-xs text-green-700 font-semibold">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                </span>
                                LIVE · refreshing every 15s
                            </span>
                        )}
                        {lastUpdated && (
                            <span className="text-xs text-gray-400">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={polling ? stopPolling : startPolling}
                            className={cx(
                                "ml-auto text-xs font-semibold px-3 py-1 rounded-full border transition-colors",
                                polling
                                    ? "border-red-200 text-red-600 hover:bg-red-50"
                                    : "border-green-200 text-green-700 hover:bg-green-50"
                            )}
                        >
                            {polling ? "⏸ Pause" : "▶ Resume Live"}
                        </button>
                    </div>
                )}
            </div>

            {vehicles.length > 0 && (
                <div className="flex gap-4 h-[600px]">
                    {/* Vehicle List */}
                    <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 overflow-y-auto">
                        <div className="px-4 py-3 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicles</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {vehicles.map((v) => (
                                <button
                                    key={v.RegNo}
                                    onClick={() => setSelected(v)}
                                    className={cx(
                                        "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors",
                                        selected?.RegNo === v.RegNo && "bg-[#0c225e]/5 border-l-2 border-[#0c225e]"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold text-sm text-[#0c225e]">{v.RegNo}</span>
                                        <span className={cx(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                            v.VehStatus?.toLowerCase() === "moving"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-100 text-gray-500"
                                        )}>
                                            {v.VehStatus}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{v.VrnMake} {v.VrnModle}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{v.Location}</p>
                                    {v.VehStatus?.toLowerCase() === "moving" && (
                                        <p className="text-[10px] text-green-600 mt-0.5">{v.Speed} km/h</p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Map */}
                    <div className="flex-1 rounded-xl overflow-hidden border border-gray-200">
                        <TrackerMap vehicles={vehicles} selected={selected} onSelect={setSelected} />
                    </div>
                </div>
            )}

            {/* Selected vehicle detail */}
            {selected && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-[#0c225e] text-lg">{selected.RegNo}</h3>
                            <span className={cx(
                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                selected.VehStatus?.toLowerCase() === "moving" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                            )}>
                                {selected.VehStatus}
                            </span>
                        </div>
                        <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <Detail label="Make / Model" value={`${selected.VrnMake} ${selected.VrnModle}`} />
                        <Detail label="Color" value={selected.VrnColor} />
                        <Detail label="Speed" value={`${selected.Speed} km/h`} />
                        <Detail label="Ignition" value={selected.Ignition} />
                        <Detail label="Odometer" value={`${selected.Odo} km`} />
                        <Detail label="Direction" value={`${selected.Direction}°`} />
                        <Detail label="GPS Time" value={selected.GpsDateTime} />
                        <Detail label="Coordinates" value={`${selected.Lat}, ${selected.Long}`} />
                        <div className="col-span-2 md:col-span-4">
                            <Detail label="Location" value={selected.Location} />
                        </div>
                    </div>
                    <div className="mt-3 flex gap-3">
                        <a
                            href={`https://www.google.com/maps?q=${selected.Lat},${selected.Long}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#f47f00] hover:underline font-medium"
                        >
                            Open in Google Maps →
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
    return (
        <span className={cx("text-xs font-semibold px-3 py-1 rounded-full", color)}>{children}</span>
    );
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
        </div>
    );
}
