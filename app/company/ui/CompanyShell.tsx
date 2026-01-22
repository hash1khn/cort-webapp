"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useCompanyStore } from "../store/CompanyStore";
import { useAuth } from "../../lib/contexts/auth-context";

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
  const pathname = usePathname();
  const { company } = useCompanyStore();
  const { logout, user } = useAuth();

  const isLogin = pathname === "/company/login";

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
        <aside className="hidden w-72 shrink-0 border-r border-border bg-navy text-white md:flex md:flex-col">
          <div className="flex-1">
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
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3">
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-xs font-medium text-white">
                  {user?.email}
                </span>
                <span className="text-[10px] text-white/50">Signed in</span>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="shrink-0 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                title="Sign out"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-full flex-1 px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

