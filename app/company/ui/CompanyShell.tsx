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
        <aside
          className="sticky top-0 h-screen hidden w-72 shrink-0 border-r border-white/10 text-white md:flex md:flex-col"
          style={{ background: "var(--premium-gradient)" }}
        >
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-8 flex flex-col items-center gap-8">
              <img
                src="/Asset-1@2x (1).png"
                alt="Cort"
                className="h-10 w-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
              />

              <div className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 backdrop-blur-sm transition-colors hover:bg-white/10">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-10 w-10 rounded-full object-cover shrink-0 bg-white/5"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-premium-gold/20 flex items-center justify-center text-premium-gold font-bold shrink-0 font-serif">
                    {company.name?.[0]?.toUpperCase() || "C"}
                  </div>
                )}
                <div className="flex flex-col leading-tight min-w-0">
                  <div className="text-sm font-medium font-serif tracking-wide text-white truncate">
                    {company.name || "Company"}
                  </div>
                </div>
              </div>
            </div>

            <nav className="px-3 pb-6 mt-2 space-y-1">
              {getNavItems(company.services_enabled).map((item) => {
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "group flex items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-all duration-200",
                      active
                        ? "bg-white/10 text-premium-gold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <span>{item.label}</span>
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-premium-gold shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 p-3 hover:bg-white/10 transition-colors">
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-xs font-medium text-white/90">
                  {user?.email}
                </span>
                <span className="text-[10px] text-premium-gold/80">Company Account</span>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="shrink-0 rounded-md p-1.5 text-white/50 hover:text-white transition-colors"
                title="Sign out"
              >
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-full flex-1 px-4 py-6 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

