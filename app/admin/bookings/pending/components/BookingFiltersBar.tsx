"use client";

type BookingFiltersBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
};

export function BookingFiltersBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: BookingFiltersBarProps) {
  return (
    <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl border border-border shadow-sm">
      <div className="flex-1 min-w-[200px]">
        <label className="text-xs font-semibold text-muted uppercase mb-1 block">Search</label>
        <input
          type="text"
          placeholder="Search passenger, company, vehicle..."
          className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="w-[200px]">
        <label className="text-xs font-semibold text-muted uppercase mb-1 block">Status</label>
        <select
          className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="ARRIVED">Arrived</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ENDED">Ended</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
    </div>
  );
}
