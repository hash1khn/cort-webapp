'use client';

import { useEffect, useRef, useState } from 'react';

export type MapMarker = {
  id: string;
  position: [number, number]; // [lat, lng]
  label?: string;
  description?: string;
  color?: string;
  type?: string;
};

export type MapPolyline = {
  positions: [number, number][];
  color?: string;
  weight?: number;
  opacity?: number;
  dashArray?: string;
};

type MapProps = {
  center?: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerClick?: (id: string) => void;
  className?: string;
  /** When true, keep panning to `center` even after the user drags (e.g. ride tracking). Default false. */
  followCenter?: boolean;
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

let mapsPromise: Promise<void> | null = null;
function loadMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();
  if (!mapsPromise) {
    mapsPromise = new Promise<void>((resolve, reject) => {
      // Reuse the script tag the Places hook may have already added
      if (document.querySelector('script[data-gm-loader]')) {
        // Script is in-flight; poll until google.maps is available
        const poll = setInterval(() => {
          if (window.google?.maps?.Map) { clearInterval(poll); resolve(); }
        }, 50);
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.dataset.gmLoader = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps'));
      document.head.appendChild(script);
    });
  }
  return mapsPromise;
}

/** Build an SVG string for use as a google.maps.Marker icon data URI */
function makeMarkerSvg(marker: MapMarker): string {
  const type = marker.type ?? marker.id;
  const isVehicle = type === 'driver' || type === 'chauffeur' || type === 'shuttle';
  const bg = isVehicle ? '#f47f00' : (marker.color ?? '#6366f1');
  const emoji = type === 'shuttle' ? '🚌' : isVehicle ? '🚗' : '';
  const labelText = !isVehicle && marker.label
    ? (marker.label.length <= 3 ? marker.label : marker.label.slice(0, 2))
    : '';
  const size = 34;

  return `<svg width="${size}" height="${size}" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
    <circle cx="17" cy="17" r="15" fill="${bg}" stroke="white" stroke-width="3"/>
    ${emoji ? `<text x="17" y="22" font-size="14" text-anchor="middle" dominant-baseline="middle">${emoji}</text>` : ''}
    ${labelText ? `<text x="17" y="17" font-size="11" font-weight="700" fill="white" text-anchor="middle" dominant-baseline="middle">${labelText}</text>` : ''}
  </svg>`;
}

export default function Map({
  center,
  zoom = 13,
  markers = [],
  polylines = [],
  height = '400px',
  onMapClick,
  onMarkerClick,
  className = '',
  followCenter = false,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const gmMarkersRef = useRef<{ marker: google.maps.Marker; id: string }[]>([]);
  const gmPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const userHasPannedRef = useRef(false);
  const lastPannedCenterRef = useRef<[number, number] | null>(null);

  // Keep latest callbacks in refs so effects don't re-run on every render
  const onMapClickRef = useRef(onMapClick);
  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);

  // Inject ping keyframe once
  useEffect(() => {
    const id = 'cort-gmap-styles';
    if (document.getElementById(id)) return;
    const s = document.createElement('style');
    s.id = id;
    s.textContent = '@keyframes cort-ping{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.85}}';
    document.head.appendChild(s);
  }, []);

  // ── Initialise map (once) ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadMaps().then(() => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const defaultCenter = center
        ? { lat: center[0], lng: center[1] }
        : { lat: 24.8607, lng: 67.0011 };

      mapRef.current = new google.maps.Map(containerRef.current, {
        center: defaultCenter,
        zoom,
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      infoWindowRef.current = new google.maps.InfoWindow();

      mapRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (e.latLng) onMapClickRef.current?.(e.latLng.lat(), e.latLng.lng());
      });
      // Stop programmatic re-centering once the user takes control of the camera
      mapRef.current.addListener('dragstart', () => {
        userHasPannedRef.current = true;
      });

      setMapReady(true);
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync markers (update in place when possible so live GPS doesn't rebuild the map) ─
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const nextIds = new Set(markers.map((m) => m.id));
    const existingById = new globalThis.Map(gmMarkersRef.current.map((e) => [e.id, e.marker]));

    // Remove markers that disappeared
    gmMarkersRef.current.forEach(({ marker, id }) => {
      if (!nextIds.has(id)) {
        marker.setMap(null);
        existingById.delete(id);
      }
    });

    const nextRefs: { marker: google.maps.Marker; id: string }[] = [];

    markers.forEach((marker) => {
      const existing = existingById.get(marker.id);
      if (existing) {
        existing.setPosition({ lat: marker.position[0], lng: marker.position[1] });
        existing.setTitle(marker.label ?? '');
        existing.setIcon({
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(makeMarkerSvg(marker))}`,
          scaledSize: new google.maps.Size(34, 34),
          anchor: new google.maps.Point(17, 17),
        });
        nextRefs.push({ marker: existing, id: marker.id });
        return;
      }

      const gmMarker = new google.maps.Marker({
        map: mapRef.current!,
        position: { lat: marker.position[0], lng: marker.position[1] },
        title: marker.label,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(makeMarkerSvg(marker))}`,
          scaledSize: new google.maps.Size(34, 34),
          anchor: new google.maps.Point(17, 17),
        },
      });
      if (marker.label) {
        const iw = infoWindowRef.current!;
        gmMarker.addListener('click', () => {
          const description = marker.description
            ? `<div style="font-size:11px;color:#4b5563;margin-top:4px">${marker.description}</div>`
            : '';
          iw.setContent(
            `<div style="font-size:12px;font-weight:600">${marker.label}</div>${description}`,
          );
          iw.open({ anchor: gmMarker, map: mapRef.current });
          onMarkerClickRef.current?.(marker.id);
        });
      } else {
        gmMarker.addListener('click', () => onMarkerClickRef.current?.(marker.id));
      }
      nextRefs.push({ marker: gmMarker, id: marker.id });
    });

    gmMarkersRef.current = nextRefs;

    // Auto-fit bounds when no explicit center was given (and user hasn't taken over)
    if (!center && markers.length > 0 && !userHasPannedRef.current) {
      if (markers.length === 1) {
        mapRef.current.panTo({ lat: markers[0].position[0], lng: markers[0].position[1] });
        mapRef.current.setZoom(14);
      } else {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach((m) => bounds.extend({ lat: m.position[0], lng: m.position[1] }));
        mapRef.current.fitBounds(bounds, 40);
      }
    }
  }, [mapReady, markers, center]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync polylines ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    gmPolylinesRef.current.forEach((p) => p.setMap(null));
    gmPolylinesRef.current = [];

    polylines.forEach((pl) => {
      const path = pl.positions.map(([lat, lng]) => ({ lat, lng }));
      const isDashed = !!pl.dashArray;
      const line = new google.maps.Polyline({
        path,
        map: mapRef.current!,
        strokeColor: pl.color ?? '#0C225E',
        strokeWeight: pl.weight ?? 4,
        strokeOpacity: isDashed ? 0 : (pl.opacity ?? 0.85),
        ...(isDashed ? {
          icons: [{
            icon: { path: 'M 0,-1 0,1', strokeOpacity: pl.opacity ?? 1, scale: pl.weight ?? 4 },
            offset: '0',
            repeat: '12px',
          }],
        } : {}),
      });
      gmPolylinesRef.current.push(line);
    });
  }, [mapReady, polylines]);

  // ── Pan to explicit center when it changes (respect user pan unless followCenter) ─
  useEffect(() => {
    if (!mapReady || !mapRef.current || !center) return;
    if (!followCenter && userHasPannedRef.current) return;

    const prev = lastPannedCenterRef.current;
    if (prev && prev[0] === center[0] && prev[1] === center[1]) return;

    lastPannedCenterRef.current = center;
    mapRef.current.panTo({ lat: center[0], lng: center[1] });
  }, [mapReady, center, followCenter]);

  return (
    <div
      ref={containerRef}
      className={`rounded-lg overflow-hidden border border-border shadow-lg ${className}`}
      style={{ height, width: '100%' }}
    />
  );
}

