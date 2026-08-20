import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}
export function formatDateTime(iso: string) {
    try {
        return new Date(iso).toLocaleString('en-PK', {
            timeZone: 'Asia/Karachi',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch (e) {
        return 'Invalid Date';
    }
}

/** ISO timestamp → 12-hour clock in PKT, e.g. "8:05 AM". */
export function formatPktTime12h(iso: string | null | undefined): string | null {
    if (!iso) return null;
    try {
        return new Date(iso).toLocaleTimeString('en-PK', {
            timeZone: 'Asia/Karachi',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return null;
    }
}

/** Route stop ETA (HH:MM or ISO) → 12-hour clock, e.g. "8:00 AM". */
export function formatEtaTime12h(timeStr: string | null | undefined): string | null {
    if (!timeStr) return null;
    if (timeStr.includes('T')) {
        return formatPktTime12h(timeStr);
    }
    const match = String(timeStr).match(/^(\d{1,2}):(\d{2})/);
    if (!match) return timeStr;
    let hour = Number.parseInt(match[1], 10);
    const minute = match[2];
    if (Number.isNaN(hour)) return timeStr;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12;
    return `${hour}:${minute} ${suffix}`;
}
