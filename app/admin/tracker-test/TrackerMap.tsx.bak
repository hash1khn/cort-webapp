"use client";

import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import type { VehicleLocation } from "./page";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

let mapsPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
    if (typeof google !== "undefined" && google.maps?.Map) return Promise.resolve();
    if (!mapsPromise) {
        const loader = new Loader({ apiKey: API_KEY, version: "weekly", libraries: ["marker"] });
        mapsPromise = loader.load().then(() => { /* noop */ });
    }
    return mapsPromise;
}

function makeMarkerEl(moving: boolean, selected: boolean): HTMLElement {
    const bg = moving ? "#16a34a" : "#6b7280";
    const size = selected ? 44 : 34;
    const border = selected ? "3px solid #f47f00" : "3px solid white";
    const div = document.createElement("div");
    div.style.cssText = [
        `width:${size}px`, `height:${size}px`, `border-radius:50%`,
        `background:${bg}`, `border:${border}`,
        "box-shadow:0 2px 8px rgba(0,0,0,0.35)",
        "display:flex", "align-items:center", "justify-content:center",
        `font-size:${selected ? 18 : 14}px`, "cursor:pointer",
    ].join(";");
    div.textContent = moving ? "🚗" : "🅿";
    return div;
}

interface Props {
    vehicles: VehicleLocation[];
    selected: VehicleLocation | null;
    onSelect: (v: VehicleLocation) => void;
}

export default function TrackerMap({ vehicles, selected, onSelect }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<google.maps.Map | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const fittedRef = useRef(false);

    type MarkerEntry = { adv: google.maps.marker.AdvancedMarkerElement; vehicle: VehicleLocation };
    const markersRef = useRef<Map<string, MarkerEntry>>(new Map());

    const onSelectRef = useRef(onSelect);
    useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;
        loadMaps().then(() => {
            if (cancelled || !containerRef.current || mapRef.current) return;
            mapRef.current = new google.maps.Map(containerRef.current, {
                center: { lat: 24.9, lng: 67.06 },
                zoom: 12,
                mapId: "DEMO_MAP_ID",
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
            });
            infoWindowRef.current = new google.maps.InfoWindow();
            setMapReady(true);
        });
        return () => { cancelled = true; };
    }, []);

    // ── Sync vehicle markers ──────────────────────────────────────────────────
    useEffect(() => {
        if (!mapReady || !mapRef.current) return;
        const existing = markersRef.current;
        const newKeys = new Set(vehicles.map((v) => v.RegNo));

        // Remove stale
        existing.forEach((_, key) => {
            if (!newKeys.has(key)) {
                existing.get(key)!.adv.map = null;
                existing.delete(key);
            }
        });

        vehicles.forEach((v) => {
            const lat = parseFloat(v.Lat);
            const lng = parseFloat(v.Long);
            if (isNaN(lat) || isNaN(lng)) return;
            const moving = v.VehStatus?.toLowerCase() === "moving";
            const isSelected = selected?.RegNo === v.RegNo;

            if (existing.has(v.RegNo)) {
                const entry = existing.get(v.RegNo)!;
                entry.adv.position = { lat, lng };
                entry.adv.content = makeMarkerEl(moving, isSelected);
                entry.vehicle = v;
            } else {
                const adv = new google.maps.marker.AdvancedMarkerElement({
                    map: mapRef.current!,
                    position: { lat, lng },
                    content: makeMarkerEl(moving, isSelected),
                    title: v.RegNo,
                });
                adv.addListener("click", () => {
                    const entry = existing.get(v.RegNo);
                    const vehicle = entry?.vehicle ?? v;
                    onSelectRef.current(vehicle);

                    const content = `
                        <div style="font-size:13px;min-width:180px;line-height:1.6">
                            <p style="font-weight:700;color:#0c225e;margin:0 0 2px">${vehicle.RegNo}</p>
                            <p style="color:#6b7280;margin:0 0 2px">${vehicle.VrnMake} ${vehicle.VrnModle} · ${vehicle.VrnColor}</p>
                            <p style="color:${moving ? "#16a34a" : "#6b7280"};font-weight:${moving ? 600 : 400};margin:0 0 2px">
                                ${vehicle.VehStatus}${moving ? ` · ${vehicle.Speed} km/h` : ""}
                            </p>
                            <p style="color:#9ca3af;font-size:11px;margin:0 0 2px">${vehicle.Location}</p>
                            <p style="color:#d1d5db;font-size:10px;margin:0 0 4px">Updated: ${vehicle.GpsDateTime}</p>
                            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank"
                               style="color:#f47f00;font-size:11px;text-decoration:none">
                                Open in Google Maps →
                            </a>
                        </div>`;
                    infoWindowRef.current?.setContent(content);
                    infoWindowRef.current?.open({ anchor: adv, map: mapRef.current });
                });
                existing.set(v.RegNo, { adv, vehicle: v });
            }
        });

        // Auto-fit on first load
        if (!fittedRef.current && vehicles.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            let valid = 0;
            vehicles.forEach((v) => {
                const lat = parseFloat(v.Lat);
                const lng = parseFloat(v.Long);
                if (!isNaN(lat) && !isNaN(lng)) { bounds.extend({ lat, lng }); valid++; }
            });
            if (valid > 0) { mapRef.current.fitBounds(bounds, 40); fittedRef.current = true; }
        }
    }, [mapReady, vehicles, selected]);

    // ── Pan to selected ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!mapReady || !mapRef.current || !selected) return;
        const lat = parseFloat(selected.Lat);
        const lng = parseFloat(selected.Long);
        if (!isNaN(lat) && !isNaN(lng)) {
            mapRef.current.panTo({ lat, lng });
            mapRef.current.setZoom(16);
        }
    }, [mapReady, selected]);

    return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}

// ── Custom coloured marker ────────────────────────────────────────────────────
function makeIcon(moving: boolean, selected: boolean) {
    const bg = moving ? "#16a34a" : "#6b7280";
    const border = selected ? "#f47f00" : "white";
    const borderW = selected ? 3 : 2;
    const size = selected ? 36 : 30;
    const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
            <circle cx="18" cy="18" r="${size / 2 - 2}" fill="${bg}" stroke="${border}" stroke-width="${borderW}"/>
            <text x="18" y="24" font-size="14" text-anchor="middle" fill="white">${moving ? "🚗" : "🅿"}</text>
        </svg>`;
    return L.divIcon({
        html: svg,
        className: "",
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -(size / 2)],
    });
}

// ── Auto-pan to selected vehicle ─────────────────────────────────────────────
function FlyTo({ vehicle }: { vehicle: VehicleLocation | null }) {
    const map = useMap();
    useEffect(() => {
        if (!vehicle) return;
        const lat = parseFloat(vehicle.Lat);
        const lng = parseFloat(vehicle.Long);
        if (!isNaN(lat) && !isNaN(lng)) {
            map.flyTo([lat, lng], 16, { duration: 1 });
        }
    }, [vehicle, map]);
    return null;
}

// ── Fit all markers into view ─────────────────────────────────────────────────
function FitBounds({ vehicles }: { vehicles: VehicleLocation[] }) {
    const map = useMap();
    const fitted = useRef(false);
    useEffect(() => {
        if (fitted.current || vehicles.length === 0) return;
        const points = vehicles
            .map((v) => [parseFloat(v.Lat), parseFloat(v.Long)] as [number, number])
            .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
        if (points.length > 0) {
            map.fitBounds(points, { padding: [40, 40] });
            fitted.current = true;
        }
    }, [vehicles, map]);
    return null;
}

// ── Main map ──────────────────────────────────────────────────────────────────
interface Props {
    vehicles: VehicleLocation[];
    selected: VehicleLocation | null;
    onSelect: (v: VehicleLocation) => void;
}

export default function TrackerMap({ vehicles, selected, onSelect }: Props) {
    return (
        <MapContainer
            center={[24.9, 67.06]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitBounds vehicles={vehicles} />
            <FlyTo vehicle={selected} />

            {vehicles.map((v) => {
                const lat = parseFloat(v.Lat);
                const lng = parseFloat(v.Long);
                if (isNaN(lat) || isNaN(lng)) return null;
                const moving = v.VehStatus?.toLowerCase() === "moving";
                const isSelected = selected?.RegNo === v.RegNo;

                return (
                    <Marker
                        key={v.RegNo}
                        position={[lat, lng]}
                        icon={makeIcon(moving, isSelected)}
                        eventHandlers={{ click: () => onSelect(v) }}
                        zIndexOffset={isSelected ? 1000 : 0}
                    >
                        <Popup>
                            <div className="text-sm space-y-1 min-w-[180px]">
                                <p className="font-bold text-[#0c225e]">{v.RegNo}</p>
                                <p className="text-gray-600">{v.VrnMake} {v.VrnModle} · {v.VrnColor}</p>
                                <p className={moving ? "text-green-600 font-semibold" : "text-gray-500"}>
                                    {v.VehStatus}{moving ? ` · ${v.Speed} km/h` : ""}
                                </p>
                                <p className="text-gray-500 text-xs">{v.Location}</p>
                                <p className="text-gray-400 text-xs">Updated: {v.GpsDateTime}</p>
                                <a
                                    href={`https://www.google.com/maps?q=${v.Lat},${v.Long}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#f47f00] text-xs hover:underline"
                                >
                                    Open in Google Maps →
                                </a>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
