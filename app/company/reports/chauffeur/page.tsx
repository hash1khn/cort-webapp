"use client";

import { useCompanyStore } from "../../store/CompanyStore";

export default function ChauffeurReportsPage() {
  const { company } = useCompanyStore();

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted">No company selected</div>
      </div>
    );
  }

  if (!company.services_enabled.chauffeur_enabled) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="rounded-xl border border-border bg-white p-6 text-center">
          <div className="text-lg font-semibold text-navy">Chauffeur Service Disabled</div>
          <div className="mt-2 text-sm text-muted">
            Chauffeur service is not enabled for your company. Please contact Cort Super Admin.
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
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">Chauffeur Reports</h1>
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
          <div className="text-xs font-semibold tracking-wider text-muted">CHAUFFEUR REPORT (INVOICE 1151 FORMAT)</div>
          <div className="mt-1 text-sm text-muted">
            View-only report showing completed trips with package cost and fuel cost breakdown. Matches Invoice 1151 format.
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
