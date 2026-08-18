/** GeoJSON polygon ring as [lng, lat] — matches backend completion_geofence_coords. */
export type LngLatCoord = [number, number];
/** UI ring as [lat, lng]. */
export type LatLngCoord = [number, number];

export function parseOfficeGeofenceRing(geojson: unknown): LatLngCoord[] {
    if (!geojson) return [];

    try {
        const parsed = typeof geojson === 'string' ? JSON.parse(geojson) : geojson;
        const ring = parsed?.coordinates?.[0];
        if (!Array.isArray(ring)) return [];

        return ring
            .filter((point): point is LngLatCoord => Array.isArray(point) && point.length >= 2)
            .map(([lng, lat]) => [lat, lng] as LatLngCoord);
    } catch {
        return [];
    }
}

export function latLngRingToCompletionCoords(ring: LatLngCoord[]): LngLatCoord[] {
    return ring.map(([lat, lng]) => [lng, lat]);
}

export function hasValidOfficeGeofence(ring: LatLngCoord[]): boolean {
    const distinct = new Set(ring.map(([lat, lng]) => `${lat},${lng}`));
    return distinct.size >= 3;
}
