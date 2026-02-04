"use client";

import { useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";

export default function ShuttleReportsPage() {
  const company = useAppSelector(selectCompany);

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled.shuttle_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="rounded-xl border border-border bg-white p-6 text-center">
          <div className="text-lg font-semibold text-navy">Shuttle Service Disabled</div>
          <div className="mt-2 text-sm text-muted">
            Shuttle service is not enabled for your company. Please contact Cort Super Admin.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-muted">Financial Reporting</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Shuttle Reports</h1>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold text-ink opacity-50 cursor-not-allowed"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4">
          <div className="text-xs font-semibold tracking-wider text-muted">SHUTTLE REPORT (INVOICE 1150 FORMAT)</div>
          <div className="mt-1 text-sm text-muted">
            View-only report showing routes, vehicles, and fixed monthly amounts. Matches Invoice 1150 format.
          </div>
        </div>

        <div className="py-12 text-center">
          <div className="text-sm text-muted">No reports available.</div>
          <div className="mt-1 text-xs text-muted">
            Report generation API is currently under development.
          </div>
        </div>
      </div>
    </div>
  );
}
