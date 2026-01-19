"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { getCompanyAuth, setCompanyAuth } from "../mockAuth";
import { useCompanyStore } from "../store/CompanyStore";

const getNavItems = (servicesEnabled: { shuttle_enabled: boolean; chauffeur_enabled: boolean }) => {
  const items = [
    { href: "/company", label: "Dashboard" },
    { href: "/company/employees", label: "Employees" },
  ];

  if (servicesEnabled.shuttle_enabled) {
    items.push({ href: "/company/routes", label: "Route Roster" });
  }

  if (servicesEnabled.chauffeur_enabled) {
    items.push({ href: "/company/bookings", label: "Bookings" });
    items.push({ href: "/company/bookings/new", label: "New Booking" });
  }

  if (servicesEnabled.shuttle_enabled) {
    items.push({ href: "/company/reports/shuttle", label: "Shuttle Reports" });
  }

  if (servicesEnabled.chauffeur_enabled) {
    items.push({ href: "/company/reports/chauffeur", label: "Chauffeur Reports" });
  }

  return items;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function CompanyShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { company } = useCompanyStore();

  const isLogin = pathname === "/company/login";

  useEffect(() => {
    if (isLogin) return;
    const companyId = getCompanyAuth();
    if (!companyId || !company) {
      router.replace("/company/login");
    }
  }, [isLogin, router, company]);

  const activeHref = useMemo(() => {
    if (!pathname || !company) return "/company";
    const navItems = getNavItems(company.services_enabled);
    const found = navItems.find((n) => pathname === n.href);
    if (found) return found.href;
    const prefix = navItems.find((n) => n.href !== "/company" && pathname.startsWith(n.href));
    return prefix?.href ?? "/company";
  }, [pathname, company]);

  if (isLogin) return <>{children}</>;

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-border bg-navy text-white md:block">
          <div className="px-6 py-5">
            <div className="text-xs font-semibold tracking-wider text-white/70">
              COMPANY PORTAL
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
                <div className="text-sm font-semibold">{company.name || "Company"}</div>
                <div className="text-xs text-white/70">Admin Portal</div>
              </div>
            </div>
          </div>

          <nav className="px-3 pb-6">
            {getNavItems(company.services_enabled).map((item) => {
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
                <div className="text-sm font-semibold text-navy">{company.name}</div>
                <div className="text-xs text-muted">Company Dashboard</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyAuth(null);
                    router.replace("/company/login");
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

