"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "../../lib/services/api-client";
import { useAuth } from "../../lib/contexts/auth-context";

export default function CompanyImpersonatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const ticket = searchParams.get("ticket");
    if (!ticket) {
      setError("Missing login ticket.");
      return;
    }

    (async () => {
      try {
        await apiClient.exchangeImpersonationTicket(ticket);
        await refreshProfile();
        router.replace("/company");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "This login link is invalid or has expired."
        );
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0f172a] px-4 font-sans">
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[#f47f00]/10 blur-[120px]" />

      <div className="relative w-full max-w-md rounded-2xl bg-white/5 px-8 py-10 text-center shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
        {error ? (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Login link expired</h2>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <a
              href="/company/login"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#f47f00] to-[#d97000] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]"
            >
              Back to login
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f47f00]" />
            <h2 className="text-lg font-semibold text-white">Signing you in&hellip;</h2>
            <p className="mt-2 text-sm text-slate-400">Redirecting to the company dashboard.</p>
          </>
        )}
      </div>
    </div>
  );
}
