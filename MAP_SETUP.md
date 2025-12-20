# Map Integration Guide

## ✅ What's Installed

- **react-leaflet** - React wrapper for Leaflet maps
- **leaflet** - Core mapping library
- **@types/leaflet** - TypeScript types

## 🗺️ Map Component

Location: `app/admin/ui/Map.tsx`

A reusable map component that uses **OpenStreetMap** (free, no API key needed).

### Features:
- ✅ No API key required
- ✅ Free and open source
- ✅ Supports markers, polylines (routes), and click events
- ✅ Default center: Karachi (24.8607, 67.0011)

## 📝 Usage Examples

### Basic Map
```tsx
import Map from "../ui/Map";

<Map height="500px" />
```

### Map with Markers (Stops)
```tsx
<Map
  height="500px"
  markers={[
    { id: "1", position: [24.8607, 67.0011], label: "Stop 1" },
    { id: "2", position: [24.9000, 67.0500], label: "Stop 2" },
  ]}
/>
```

### Map with Route (Polyline)
```tsx
<Map
  height="500px"
  polylines={[
    {
      positions: [
        [24.8607, 67.0011], // Start
        [24.9000, 67.0500], // Stop 1
        [24.9500, 67.1000], // Stop 2
      ],
      color: "#f47f00", // Cort orange
    },
  ]}
/>
```

### Map with Click Handler (Add Stops)
```tsx
<Map
  height="500px"
  onMapClick={(lat, lng) => {
    console.log("Clicked at:", lat, lng);
    // Add a new stop at this location
  }}
/>
```

### Full Example: Route Builder
```tsx
const [stops, setStops] = useState<Array<{ id: string; name: string; lat: number; lng: number }>>([]);
const [routePath, setRoutePath] = useState<[number, number][]>([]);

<Map
  height="600px"
  markers={stops.map((s) => ({
    id: s.id,
    position: [s.lat, s.lng],
    label: s.name,
  }))}
  polylines={routePath.length > 1 ? [{ positions: routePath }] : []}
  onMapClick={(lat, lng) => {
    const newStop = {
      id: crypto.randomUUID(),
      name: `Stop ${stops.length + 1}`,
      lat,
      lng,
    };
    setStops([...stops, newStop]);
    setRoutePath([...routePath, [lat, lng]]);
  }}
/>
```

## 🔄 Switching to Google Maps Later

If you need Google Maps in production:

1. Install: `npm install @react-google-maps/api`
2. Get API key from [Google Cloud Console](https://console.cloud.google.com/)
3. Create a new `GoogleMap.tsx` component
4. Replace `Map` imports with `GoogleMap`

**Note:** Google Maps requires:
- API key (with billing enabled)
- Enable "Maps JavaScript API" in Google Cloud Console
- Cost: ~$7 per 1000 map loads (after free tier)

## 📍 Default Location

The map defaults to **Karachi, Pakistan**:
- Latitude: 24.8607
- Longitude: 67.0011

You can change this by passing a different `center` prop.

