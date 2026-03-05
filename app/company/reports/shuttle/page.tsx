"use client";

import { useAppSelector } from "../../../lib/store/hooks";
import { selectCompany } from "../../../lib/store/slices/companySlice";
import { Card } from "../../components/DashboardComponents";
import { PageHeader } from "../../components/PageLayout";

export default function ShuttleReportsPage() {
  const company = useAppSelector(selectCompany);

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-[var(--text-muted)]">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled.shuttle_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <Card className="max-w-md text-center">
          <div className="text-lg font-bold text-[var(--cort-navy)]">Shuttle Service Disabled</div>
          <div className="mt-2 text-sm text-[var(--text-muted)]">
            Shuttle service is not enabled for your company. Please contact Cort Super Admin.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-12">
      <PageHeader
        label="Financial Reporting"
        title="Shuttle Reports"
        action={
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[var(--border-light)] bg-white px-4 text-sm font-semibold text-[var(--text-muted)] opacity-50 cursor-not-allowed"
          >
            Export CSV
          </button>
        }
      />

      <Card className="overflow-hidden">
        <div className="mb-4">
          <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)]">SHUTTLE REPORT (INVOICE 1150 FORMAT)</div>
          <div className="mt-1 text-sm text-[var(--text-muted)]">
            View-only report showing routes, vehicles, and fixed monthly amounts. Matches Invoice 1150 format.
          </div>
        </div>

        <div className="py-12 text-center">
          <div className="text-sm text-[var(--text-muted)]">No reports available.</div>
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Report generation API is currently under development.
          </div>
        </div>
      </Card>
    </div>
  );
}
