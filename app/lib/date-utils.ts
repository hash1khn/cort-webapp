/** Format a Date as YYYY-MM-DD in local timezone (avoids UTC shift from toISOString). */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** First and last calendar day of a month (local timezone). */
export function getCalendarMonthRange(year: number, monthIndex: number): { from: string; to: string } {
  return {
    from: formatLocalDate(new Date(year, monthIndex, 1)),
    to: formatLocalDate(new Date(year, monthIndex + 1, 0)),
  };
}
