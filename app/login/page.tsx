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

            // Redirect will happen in useEffect above after user state updates
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Login failed";

            // Provide user-friendly error messages
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

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen bg-surface flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent"></div>
                    <p className="mt-4 text-sm text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-surface text-ink">
            <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
                <div className="rounded-xl border border-border bg-white p-6">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-sm font-medium tracking-wide text-muted">Cort Operations</div>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                                Sign In
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
                        Sign in with your credentials to access your dashboard.
                    </p>

                    <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
                        <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-ink">Email</span>
                            <input
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 rounded-md border border-border px-3 outline-none focus:ring-2 focus:ring-blue/40"
                                placeholder="you@example.com"
                                type="email"
                                autoComplete="username"
                                required
                            />
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-ink">Password</span>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                className="h-11 rounded-md border border-border px-3 outline-none focus:ring-2 focus:ring-blue/40"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                required
                            />
                        </label>

                        {(error || authError) && (
                            <div className="rounded-md border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
                                {error || authError}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || !email || !password}
                            className="mt-1 inline-flex h-11 items-center justify-center rounded-md bg-orange px-4 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-95"
                        >
                            {isSubmitting ? "Signing in..." : "Sign in"}
                        </button>
                    </form>
                </div>

                <div className="text-xs text-muted">
                    <div className="rounded-md border border-border bg-white px-3 py-2">
                        <p className="font-semibold">Access Levels:</p>
                        <ul className="mt-2 space-y-1">
                            <li>• <span className="font-medium">Super Admin</span> - Full system access</li>
                            <li>• <span className="font-medium">Company Admin</span> - Company management</li>
                            <li>• <span className="font-medium">Employee</span> - Company portal access</li>
                        </ul>
                        <p className="mt-2 text-muted">
                            You'll be automatically redirected to the appropriate dashboard based on your role.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
