"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "../../lib/services/api-client";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await apiClient.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send reset email. Please try again."
      );
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
              Reset Password
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Enter your admin email and we&apos;ll send you a reset link
            </p>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white/5 px-8 py-16 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {success ? (
              <div className="relative flex flex-col items-center gap-6 text-center">
                {/* Success icon */}
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 ring-1 ring-green-500/30">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-green-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">Check your inbox</p>
                  <p className="mt-2 text-sm text-slate-400">
                    If <span className="font-medium text-slate-200">{email}</span> is
                    registered, you&apos;ll receive a password reset link shortly.
                  </p>
                </div>
                <Link
                  href="/admin/login"
                  className="mt-2 text-sm font-medium text-[#f47f00] hover:text-[#d97000] transition-colors"
                >
                  ← Back to sign in
                </Link>
              </div>
            ) : (
              <form
                className="relative flex flex-col gap-5"
                onSubmit={onSubmit}
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email Address
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 transition-all focus:border-[#f47f00]/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#f47f00]/50"
                    placeholder="admin@cort.com.pk"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="mt-2 flex w-full transform items-center justify-center rounded-lg bg-gradient-to-r from-[#f47f00] to-[#d97000] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  ) : (
                    "Send Reset Link"
                  )}
                </button>

                <div className="text-center">
                  <Link
                    href="/admin/login"
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    ← Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} Cort Operations. All rights
              reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
