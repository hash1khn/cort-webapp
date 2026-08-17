// Shared helpers for identifying "office" stops on a shuttle route.
//
// A route stop's `stop_type` is `'PICKUP' | 'OFFICE'` (default `'PICKUP'`) and is
// returned on every route_stops object the API returns (route creation/edit
// responses, GET /routes/:id, trip responses, etc). A route may have more than
// one OFFICE-type stop (multi-office shuttle support) — always use
// `getOfficeStops` (plural) rather than assuming there is exactly one.

export type StopType = 'PICKUP' | 'OFFICE';

export interface RouteStopLike {
    id: number;
    stop_type?: StopType | string | null;
}

/** True if the given stop is an OFFICE-type stop. */
export function isOfficeStop<T extends RouteStopLike>(stop: T): boolean {
    return stop.stop_type === 'OFFICE';
}

/** All OFFICE-type stops in the given list, in their original order. */
export function getOfficeStops<T extends RouteStopLike>(stops: T[] | null | undefined): T[] {
    return (stops ?? []).filter(isOfficeStop);
}

/** All PICKUP-type stops in the given list (i.e. everything that isn't an office). */
export function getPickupStops<T extends RouteStopLike>(stops: T[] | null | undefined): T[] {
    return (stops ?? []).filter((s) => !isOfficeStop(s));
}
