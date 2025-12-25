"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { getMockAuth, setMockAuth } from "../mockAuth";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/pricing", label: "Contracts & Pricing" },
  { href: "/admin/fleet", label: "Fleet" },
  { href: "/admin/ops/shuttle", label: "Ops: Shuttle" },
  { href: "/admin/ops/chauffeur", label: "Ops: Chauffeur" },
  { href: "/admin/invoicing", label: "Invoicing" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    if (isLogin) return;
    if (!getMockAuth()) router.replace("/admin/login");
  }, [isLogin, router]);

  const activeHref = useMemo(() => {
    if (!pathname) return "/admin";
    const found = nav.find((n) => pathname === n.href);
    if (found) return found.href;
    const prefix = nav.find((n) => n.href !== "/admin" && pathname.startsWith(n.href));
    return prefix?.href ?? "/admin";
  }, [pathname]);

  if (isLogin) return <>{children}</>;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-navy text-white md:block">
          <div className="px-6 py-5">
            <div className="text-xs font-semibold tracking-wider text-white/70">
              CORT OPERATIONS
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="px-0 py-0">
                <img
                  src="/Asset-1@2x (1).png"
                  alt="Cort"
                  className="h-8 w-auto drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
                />
              </div>
              <div className="flex flex-col leading-tight">
                <div className="text-sm font-semibold">Super Admin</div>
                <div className="text-xs text-white/70">Portal</div>
              </div>
            </div>
          </div>

          <nav className="px-3 pb-6">
            {nav.map((item) => {
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10",
                    active && "bg-white/15 text-white",
                  )}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 border-b border-border bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
              <div className="flex items-center gap-3">
                <div className="text-sm font-semibold text-navy">Cort Ops</div>
                <div className="text-xs text-muted">Mock Data</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMockAuth(false);
                    router.replace("/admin/login");
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium text-ink hover:bg-surface"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}


