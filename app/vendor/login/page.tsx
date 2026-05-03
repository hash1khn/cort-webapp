"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/contexts/auth-context";
import { UserRole } from "../../lib/types/auth-types";

export default function VendorLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // If already logged in, redirect based on role
    if (!loading && isAuthenticated && user) {
      if (user.role === UserRole.COMPANY_VENDOR) {
        router.replace("/vendor");
      } else {
        // Non-vendor users shouldn't access this portal
        router.replace("/");
      }
    }
  }, [loading, isAuthenticated, user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Redirect happens in useEffect
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
                src="/traflinq_dark_no_tagline-Photoroom.png"
                alt="TrafLinq"
                className="h-28 w-auto"
              />
            </div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white">
              Vendor Portal
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Sign in to manage your fleet and services
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
                    placeholder="vendor@company.com"
                    type="email"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="group relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-[#f47f00]/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#f47f00]/50"
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 p-3 text-center text-sm font-medium text-red-400 ring-1 ring-red-500/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative mt-2 flex w-full items-center justify-center overflow-hidden rounded-lg bg-[#f47f00] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#ff8c00] focus:outline-none focus:ring-2 focus:ring-[#f47f00] focus:ring-offset-2 focus:ring-offset-[#0f172a] disabled:opacity-50"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    "Sign In to Vendor Portal"
                  )}
                </span>
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500">
            &copy; {new Date().getFullYear()} TrafLinq. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
