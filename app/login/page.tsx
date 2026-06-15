"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/contexts/auth-context";
import { UserRole } from "../lib/types/auth-types";

export default function LoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, user, loading, error: authError } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // If already logged in, redirect based on role
        if (!loading && isAuthenticated && user) {
            if (user.role === UserRole.SUPER_ADMIN) {
                router.replace("/admin");
            } else if (user.role === UserRole.COMPANY_ADMIN || user.role === UserRole.EMPLOYEE) {
                router.replace("/company");
            } else if (user.role === UserRole.SHUTTLE_REQUESTER) {
                router.replace("/company/overtime-requests");
            } else if (user.role === UserRole.COMPANY_VENDOR) {
                router.replace("/vendor");
            } else {
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
                                src="/traflinq_dark_no_tagline-Photoroom.png"
                                alt="TrafLinq"
                                className="h-28 w-auto"
                            />
                        </div>
                        <h2 className="text-center text-3xl font-bold tracking-tight text-white">
                            Welcome Back
                        </h2>
                        <p className="mt-2 text-center text-sm text-slate-400">
                            Sign in to access your premium mobility dashboard
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
                                        placeholder="name@company.com"
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
