"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setCompanyAuth, getCompanyAuth } from "../mockAuth";
import { useAdminStore } from "../../admin/store/AdminStore";

export default function CompanyLoginPage() {
  const router = useRouter();
  const { db } = useAdminStore();
  const [companyId, setCompanyId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => companyId.length > 0, [companyId]);

  useEffect(() => {
    // If already logged in, jump to dashboard.
    if (typeof window !== "undefined") {
      const authedId = getCompanyAuth();
      if (authedId && db.companies.find((c) => c.id === authedId)) {
        router.replace("/company");
      }
    }
  }, [router, db.companies]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const company = db.companies.find((c) => c.id === companyId);
    if (!company) {
      setError("Company not found. Please select a valid company.");
      return;
    }

    setCompanyAuth(companyId);
    router.replace("/company");
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium tracking-wide text-muted">Cort Company</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                Company Admin Login
              </h1>
            </div>
            <div className="px-0 py-0">
              <img
                src="/cort-with-at-your.svg"
                alt="Cort"
                className="h-10 w-auto drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]"
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-muted">
            Select your company to access the admin portal.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Company</span>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-11 rounded-md border border-border bg-white px-3 outline-none focus:ring-2 focus:ring-blue/40"
              >
                <option value="">Select a company</option>
                {db.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </label>

            {error ? (
              <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-1 inline-flex h-11 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Sign in
            </button>
          </form>
        </div>

        <div className="text-xs text-muted">
          <div className="rounded-md border border-border bg-white px-3 py-2">
            <div className="font-semibold">Available Companies:</div>
            {db.companies.length === 0 ? (
              <div className="mt-1 text-muted">No companies available. Create one in Super Admin.</div>
            ) : (
              <ul className="mt-1 list-disc list-inside space-y-1">
                {db.companies.map((c) => (
                  <li key={c.id}>
                    {c.name} - {c.email}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

