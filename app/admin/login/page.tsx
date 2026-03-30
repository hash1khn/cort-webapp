"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/contexts/auth-context";
import { UserRole, PERMISSION_KEYS } from "../../lib/types/auth-types";
import { normalizeStaffPermissions, staffHasCrud } from "../../lib/utils/staff-permissions";

// Ordered list of nav hrefs mapped to their permission key — matches AdminShell nav order
const NAV_PERMISSION_MAP: { href: string; permission: (typeof PERMISSION_KEYS)[number] }[] = [
  { href: "/admin", permission: "dashboard" },
  { href: "/admin/companies", permission: "companies" },
  { href: "/admin/pricing", permission: "pricing" },
  { href: "/admin/vehicles", permission: "vehicles" },
  { href: "/admin/vehicles/fueling", permission: "fuel_records" },
  { href: "/admin/vehicles/maintenance", permission: "maintenance" },
  { href: "/admin/vendors", permission: "vendors" },
  { href: "/admin/vendors/logs", permission: "vendor_logs" },
  { href: "/admin/drivers", permission: "drivers" },
  { href: "/admin/bookings/pending", permission: "bookings" },
  { href: "/admin/routes", permission: "routes" },
  { href: "/admin/ops/shuttle", permission: "ops_shuttle" },
  { href: "/admin/ops/chauffeur", permission: "ops_chauffeur" },
  { href: "/admin/reports", permission: "reports" },
  { href: "/admin/expenses", permission: "expenses" },
  { href: "/admin/invoicing", permission: "invoicing" },
];

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, loading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Returns the correct landing page for a given user after login */
  function getRedirectPath(loginUser: typeof user): string {
    if (!loginUser) return "/admin/login";
    if (loginUser.role === UserRole.SUPER_ADMIN) return "/admin";
    if (loginUser.role === UserRole.INTERNAL_STAFF) {
      const permissions = normalizeStaffPermissions(loginUser.permissions ?? null);
      const first = NAV_PERMISSION_MAP.find((item) =>
        staffHasCrud(permissions, item.permission, "read"),
      );
      return first?.href ?? "/admin/login"; // no readable section → stay on login
    }
    return "/";
  }

  useEffect(() => {
    // If already authenticated on page load, redirect immediately
    if (!loading && isAuthenticated && user) {
      router.replace(getRedirectPath(user));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // user state is set synchronously inside login() — read it via the closure ref
      // but since state updates are async in React, we derive from the login response
      // by letting the useEffect above pick it up on the next render.
      // We still push to /admin here; for INTERNAL_STAFF the useEffect will correct it.
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      if (errorMessage.includes("Invalid credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (errorMessage.includes("inactive")) {
        setError("Your account is inactive. Please contact support.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Keep user on login page during redirect - button spinner shows loading state

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0f172a] font-sans selection:bg-[#f47f00]/30">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[#f47f00]/10 blur-[120px]" />
      <div className="absolute top-[40%] left-[60%] h-[300px] w-[300px] rounded-full bg-purple-500/10 blur-[100px]" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center">
            <div className="mb-6 rounded-2xl bg-white/5 p-6 backdrop-blur-sm ring-1 ring-white/10">
              <img
                src="/Asset-1@2x (1).png"
                alt="Cort"
                className="h-28 w-auto"
              />
            </div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white">
              Admin Portal
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Sign in to access the admin dashboard
            </p>
          </div>

          {/* Login Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white/5 px-8 py-16 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <form className="relative flex flex-col gap-5" onSubmit={onSubmit}>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <div className="group relative">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-[#f47f00]/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#f47f00]/50"
                    placeholder="admin@cort.com.pk"
                    type="email"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  <Link
                    href="/admin/forgot-password"
                    className="text-xs font-medium text-[#f47f00] hover:text-[#d97000] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="group relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-[#f47f00]/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#f47f00]/50"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {(error || authError) && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {error || authError}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !email || !password}
                className="mt-2 flex w-full transform items-center justify-center rounded-lg bg-gradient-to-r from-[#f47f00] to-[#d97000] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} Cort Operations. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
