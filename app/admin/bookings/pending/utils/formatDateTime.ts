export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
