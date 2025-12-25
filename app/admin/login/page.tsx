"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setMockAuth, MOCK_ADMIN_EMAIL, MOCK_ADMIN_PASSWORD } from "../mockAuth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(MOCK_ADMIN_EMAIL);
  const [password, setPassword] = useState(MOCK_ADMIN_PASSWORD);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => email.length > 3 && password.length > 3, [email, password]);

  useEffect(() => {
    // If already logged in, jump to dashboard.
    if (typeof window !== "undefined") {
      const isAuthed = window.localStorage.getItem("cort.admin.authed") === "1";
      if (isAuthed) router.replace("/admin");
    }
  }, [router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (email.trim().toLowerCase() !== MOCK_ADMIN_EMAIL || password !== MOCK_ADMIN_PASSWORD) {
      setError("Invalid credentials (mock). Use the prefilled email/password.");
      return;
    }

    setMockAuth(true);
    router.replace("/admin");
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium tracking-wide text-muted">Cort Ops</div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                Super Admin Login
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
            Mock auth only. No signup. Credentials are “seeded” in the browser.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-md border border-border px-3 outline-none focus:ring-2 focus:ring-blue/40"
                placeholder="admin@cort.local"
                autoComplete="username"
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
              />
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
          Mock credentials:
          <div className="mt-1 rounded-md border border-border bg-white px-3 py-2 font-mono">
            {MOCK_ADMIN_EMAIL} / {MOCK_ADMIN_PASSWORD}
          </div>
        </div>
      </div>
    </div>
  );
}


