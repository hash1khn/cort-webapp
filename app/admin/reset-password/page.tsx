"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { apiClient } from "../../lib/services/api-client";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Supabase puts the recovery access_token in the URL hash.
  // Listen for the PASSWORD_RECOVERY event and capture the token.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session?.access_token) {
          setAccessToken(session.access_token);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!accessToken) {
      setError("Invalid or expired reset link. Please request a new one.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.resetPassword(accessToken, password);
      setSuccess(true);
      setTimeout(() => router.push("/admin/login"), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update password. Please try again."
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
                src="/Asset-1@2x (1).png"
                alt="Cort"
                className="h-28 w-auto"
              />
            </div>
            <h2 className="text-center text-3xl font-bold tracking-tight text-white">
              Set New Password
            </h2>
            <p className="mt-2 text-center text-sm text-slate-400">
              Choose a strong password for your admin account
            </p>
          </div>

          {/* Card */}
          <div className="relative overflow-hidden rounded-2xl bg-white/5 px-8 py-16 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {success ? (
              <div className="relative flex flex-col items-center gap-6 text-center">
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
                  <p className="text-lg font-semibold text-white">
                    Password updated!
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Your password has been changed successfully. Redirecting you
                    to sign in…
                  </p>
                </div>
              </div>
            ) : !accessToken ? (
              <div className="relative flex flex-col items-center gap-4 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#f47f00]" />
                <p className="text-sm text-slate-400">
                  Validating your reset link…
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  If this takes too long, your link may have expired.{" "}
                  <a
                    href="/admin/forgot-password"
                    className="text-[#f47f00] hover:underline"
                  >
                    Request a new one
                  </a>
                  .
                </p>
              </div>
            ) : (
              <form
                className="relative flex flex-col gap-5"
                onSubmit={onSubmit}
              >
                {/* New Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-slate-500 transition-all focus:border-[#f47f00]/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#f47f00]/50"
                      placeholder="Min. 8 characters"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type={showConfirm ? "text" : "password"}
                      className="block w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder-slate-500 transition-all focus:border-[#f47f00]/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[#f47f00]/50"
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Password strength hint */}
                {password && (
                  <PasswordStrengthBar password={password} />
                )}

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
                  disabled={isSubmitting || !password || !confirmPassword}
                  className="mt-2 flex w-full transform items-center justify-center rounded-lg bg-gradient-to-r from-[#f47f00] to-[#d97000] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02] hover:shadow-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                  {isSubmitting ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  ) : (
                    "Update Password"
                  )}
                </button>
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

// ── Password strength bar ──────────────────────────────────────────────────
function getStrength(pwd: string): { label: string; color: string; width: string } {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
  if (score <= 2) return { label: "Fair", color: "bg-yellow-500", width: "w-2/4" };
  if (score <= 3) return { label: "Good", color: "bg-blue-400", width: "w-3/4" };
  return { label: "Strong", color: "bg-green-500", width: "w-full" };
}

function PasswordStrengthBar({ password }: { password: string }) {
  const { label, color, width } = getStrength(password);
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color} ${width}`}
        />
      </div>
      <p className="text-xs text-slate-500">
        Password strength:{" "}
        <span
          className={
            label === "Weak"
              ? "text-red-400"
              : label === "Fair"
              ? "text-yellow-400"
              : label === "Good"
              ? "text-blue-400"
              : "text-green-400"
          }
        >
          {label}
        </span>
      </p>
    </div>
  );
}
