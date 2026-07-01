"use client";

type CompanyOption = {
  id: number;
  name: string;
};

type BookingFiltersBarProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  companyFilter: string;
  onCompanyChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  companies: CompanyOption[];
};

export function BookingFiltersBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  companyFilter,
  onCompanyChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  companies,
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
        <label className="text-xs font-semibold text-muted uppercase mb-1 block">Company</label>
        <select
          className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
          value={companyFilter}
          onChange={(e) => onCompanyChange(e.target.value)}
        >
          <option value="">All Companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </div>
      <div className="w-[160px]">
        <label className="text-xs font-semibold text-muted uppercase mb-1 block">From Date</label>
        <input
          type="date"
          className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>
      <div className="w-[160px]">
        <label className="text-xs font-semibold text-muted uppercase mb-1 block">To Date</label>
        <input
          type="date"
          className="w-full h-10 px-3 rounded-md border border-border bg-surface/50 text-sm focus:outline-none focus:ring-2 focus:ring-blue/20"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
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
