"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), {
  ssr: false,
});
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), {
  ssr: false,
});
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(() => import("react-leaflet").then((mod) => mod.Polyline), {
  ssr: false,
});

export type MapMarker = {
  id: string;
  position: [number, number]; // [lat, lng]
  label?: string;
  color?: string;
};

export type MapPolyline = {
  positions: [number, number][]; // Array of [lat, lng]
  color?: string;
};

type MapProps = {
  center?: [number, number]; // [lat, lng] - default: Karachi
  zoom?: number; // default: 13
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  height?: string; // CSS height, default: "400px"
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
};

// Component to handle map click events
function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    if (!onMapClick) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [map, onMapClick]);

  return null;
}

// Component to handle map resize
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    // Invalidate size on mount to fix rendering issues
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
}

export default function Map({
  center = [24.8607, 67.0011], // Karachi default
  zoom = 13,
  markers = [],
  polylines = [],
  height = "400px",
  onMapClick,
  className = "",
}: MapProps) {
  return (
    <div className={`rounded-lg overflow-hidden border border-border ${className}`} style={{ height }}>
      <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizeHandler />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        {markers.map((marker) => (
          <Marker key={marker.id} position={marker.position}>
            {marker.label && <Popup>{marker.label}</Popup>}
          </Marker>
        ))}
        {polylines.map((polyline, idx) => (
          <Polyline
            key={idx}
            positions={polyline.positions}
            pathOptions={{
              color: polyline.color || "#f47f00", // Cort orange
              weight: 4,
              opacity: 0.7,
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}

