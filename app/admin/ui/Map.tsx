'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js/Leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Create custom marker icons
function createCustomIcon(color: string, icon: string = '📍') {
  const size = 32;
  const svgIcon = `
    <svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2" opacity="0.9"/>
      <text x="16" y="22" font-size="16" text-anchor="middle" fill="white">${icon}</text>
    </svg>
  `;
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
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
  type?: string;
};



type MapProps = {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
  className?: string;
};

// Component to handle map click events
function MapClickHandler({
  onMapClick,
}: {
  onMapClick?: (lat: number, lng: number) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!onMapClick) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onMapClick]);

  return null;
}

// Component to handle map resize
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
}

// Component to handle dynamic centering (used only when explicit center is provided)
function MapReCenter({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);

  return null;
}

// Auto-fit the viewport to cover all markers
function FitBoundsToContent({
  markers,
}: {
  markers: MapMarker[];
}) {
  const map = useMap();

  useEffect(() => {
    const coords: [number, number][] = [
      ...markers.map((m) => m.position),
    ];

    if (coords.length === 0) return;

    if (coords.length === 1) {
      map.setView(coords[0], 14);
      return;
    }

    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    // Re-fit whenever content changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // stringify to avoid referential inequality on every render
    JSON.stringify(markers.map((m) => m.position)),
  ]);

  return null;
}

export default function Map({
  center = [24.8607, 67.0011],
  zoom = 13,
  markers = [],
  height = '400px',
  onMapClick,
  onMarkerClick,
  className = '',
}: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Inject custom styles
    const styleId = 'leaflet-custom-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
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
          z-index: 1;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const getMarkerIcon = (marker: MapMarker) => {
    const type = marker.type || marker.id;

    if (type === 'pickup') {
      return createCustomIcon('#22c55e', '📍');
    } else if (type === 'dropoff') {
      return createCustomIcon('#ef4444', '📍');
    } else if (type === 'driver') {
      // Premium pulsing driver marker
      const size = 36;
      const svgIcon = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-12 h-12 bg-[#f47f00] rounded-full opacity-30 animate-ping"></div>
          <div class="absolute w-8 h-8 bg-[#f47f00] rounded-full opacity-20 animate-pulse"></div>
          <div class="relative z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-[#f47f00]">
            <span class="text-xl">🚗</span>
          </div>
        </div>
      `;
      return L.divIcon({
        html: svgIcon,
        className: 'custom-driver-marker',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
      });
    } else if (type === 'chauffeur') {
      return L.icon({
        iconUrl: '/car_birdeye.png',
        iconSize: [38, 38],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20],
      });
    } else if (type === 'shuttle') {
      return L.icon({
        iconUrl: '/bus_birdeye.png',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -24],
      });
    } else if (marker.color) {
      return createCustomIcon(marker.color, '📍');
    }
    // Return explicit DefaultIcon instead of undefined
    return DefaultIcon;
  };

  if (!mounted) {
    return (
      <div className={`rounded-lg overflow-hidden border border-border shadow-lg bg-gray-100 flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">Loading Map...</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg overflow-hidden border border-border shadow-lg ${className}`}
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <MapResizeHandler />
        {/* Auto-fit when there's content; fall back to explicit center otherwise */}
        {markers.length > 0
          ? <FitBoundsToContent markers={markers} />
          : <MapReCenter center={center} />}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={getMarkerIcon(marker)}
            eventHandlers={{
              click: () => onMarkerClick?.(marker.id),
            }}
          >
            {marker.label && (
              <Popup className="custom-popup">{marker.label}</Popup>
            )}
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}
