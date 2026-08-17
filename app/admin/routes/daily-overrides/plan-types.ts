export type Direction = 'MORNING' | 'EVENING';
export type OpsTab = 'passengers' | 'crew';

export interface RouteOption {
    id: number;
    name: string;
    company_id: number | null;
    companies: { id: number; name: string } | null;
}

export interface RosterUser {
    id: string;
    full_name: string;
    phone: string | null;
    department: string | null;
}

export interface RosterEntry {
    user_id: string;
    pickup_stop_id: number | null;
    stop_name: string | null;
    lat: number | null;
    lng: number | null;
    sequence: number | null;
    pickup_time: string | null;
    is_override: boolean;
    override: {
        id: number;
        from_route_id: number | null;
        from_route_name: string | null;
        to_route_id: number;
        scheduled_time: string | null;
    } | null;
    user: RosterUser | null;
}

export interface PendingMove {
    entry: RosterEntry;
    fromRouteId: number;
    toRouteId: number;
    toRouteName: string;
}

export interface PendingUndo {
    overrideId: number;
    entry: RosterEntry;
    toRouteId: number;
    fromRouteId: number | null;
}

export interface PendingCrewChange {
    tripId: number;
    driver_id?: string;
    vehicle_id?: number;
    restore?: boolean;
}

export interface OverrideRow {
    id: number;
    user_id: string;
    from_route_id: number | null;
    to_route_id: number;
    to_sequence: number;
    stop_name: string;
    scheduled_time: string | null;
    routes: { id: number; name: string };
    users_shuttle_daily_stop_overrides_user_idTousers: { id: string; full_name: string; phone: string | null };
}

export const ROUTE_COLORS = ['#0C225E', '#0e7490', '#7c3aed', '#b45309', '#15803d', '#be123c'];

/** HH:mm (24h) → 12-hour clock, e.g. 07:30 → 7:30 AM */
export function format12h(hhmm: string | null | undefined): string | null {
    if (!hhmm) return null;
    const match = hhmm.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return hhmm;
    let hour = Number.parseInt(match[1], 10);
    const minute = match[2];
    if (Number.isNaN(hour)) return hhmm;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
}

export function localTodayYmd(): string {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

export function formatPlanDate(ymd: string): string {
    const [y, m, d] = ymd.split('-').map(Number);
    if (!y || !m || !d) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

export function initials(name: string | null | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p[0]).join('');
    return letters.toUpperCase() || '?';
}
