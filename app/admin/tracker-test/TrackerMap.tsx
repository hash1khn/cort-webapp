"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { VehicleLocation } from "./page";

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
