"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
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

// Fix for default marker icons in Next.js
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

// Create custom marker icons
function createCustomIcon(color: string, icon: string = "📍") {
  const size = 32;
  const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2" opacity="0.9"/>
      <text x="16" y="22" font-size="16" text-anchor="middle" fill="white">${icon}</text>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

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
  // Inject custom styles for map
  useEffect(() => {
    const styleId = "leaflet-custom-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .custom-marker {
        background: transparent !important;
        border: none !important;
      }
      .custom-popup .leaflet-popup-content-wrapper {
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }
      .leaflet-container {
        font-family: inherit;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) existingStyle.remove();
    };
  }, []);

  // Create custom icons for different marker types
  const getMarkerIcon = (marker: MapMarker) => {
    if (marker.id === "pickup") {
      return createCustomIcon("#22c55e", "📍"); // Green for pickup
    } else if (marker.id === "dropoff") {
      return createCustomIcon("#ef4444", "📍"); // Red for dropoff
    } else if (marker.id === "driver") {
      return createCustomIcon("#f47f00", "🚗"); // Orange for driver
    } else if (marker.color) {
      return createCustomIcon(marker.color, "📍");
    }
    return undefined; // Use default
  };

  return (
    <div className={`rounded-lg overflow-hidden border border-border shadow-lg ${className}`} style={{ height }}>
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        {/* Use CartoDB Positron for a cleaner, more modern look */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <MapResizeHandler />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        {markers.map((marker) => {
          const icon = getMarkerIcon(marker);
          return (
            <Marker 
              key={marker.id} 
              position={marker.position}
              icon={icon}
            >
              {marker.label && <Popup className="custom-popup">{marker.label}</Popup>}
            </Marker>
          );
        })}
        {polylines.map((polyline, idx) => (
          <Polyline
            key={idx}
            positions={polyline.positions}
            pathOptions={{
              color: polyline.color || "#f47f00", // Cort orange
              weight: 5,
              opacity: 0.8,
              dashArray: "10, 5",
            }}
          />
        ))}
      </MapContainer>
    </div>
  );
}

