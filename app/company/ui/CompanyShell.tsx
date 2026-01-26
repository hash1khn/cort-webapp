"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useCompanyStore } from "../store/CompanyStore";
import {
  LayoutDashboard,
  Users,
  Map,
  Calendar,
  FileBarChart,
  FileSpreadsheet,
  Receipt,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../lib/contexts/auth-context";

const getNavItems = (servicesEnabled: { shuttle_enabled: boolean; chauffeur_enabled: boolean }) => {
  const items = [
    { href: "/company", label: "Dashboard", icon: LayoutDashboard },
    { href: "/company/employees", label: "Employees", icon: Users },
  ];

  if (servicesEnabled.shuttle_enabled) {
    items.push({ href: "/company/routes", label: "Route Roster", icon: Map });
  }

  if (servicesEnabled.chauffeur_enabled) {
    items.push({ href: "/company/bookings", label: "Bookings", icon: Calendar });
  }

  if (servicesEnabled.shuttle_enabled) {
    items.push({ href: "/company/reports/shuttle", label: "Shuttle Reports", icon: FileBarChart });
  }

  if (servicesEnabled.chauffeur_enabled) {
    items.push({ href: "/company/reports/chauffeur", label: "Chauffeur Reports", icon: FileSpreadsheet });
  }

  items.push({ href: "/company/invoicing", label: "Invoices", icon: Receipt });

  return items;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function CompanyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { company } = useCompanyStore();
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // We want to persist the collapsed state if possible, but for now local state is fine.
  // Ideally this would be in a store or localStorage.

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
    <div className="min-h-screen bg-surface text-ink font-sans">
      <div className="flex min-h-screen">
        <aside
          className={cx(
            "sticky top-0 h-screen hidden shrink-0 border-r border-white/5 text-white md:flex md:flex-col transition-all duration-300 ease-in-out relative z-20 shadow-2xl",
            collapsed ? "w-20" : "w-72"
          )}
          style={{
            background: "linear-gradient(145deg, #1a1a1a 0%, #0d0d0d 100%)" // Premium dark gradient
          }}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-9 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-premium-gold text-black shadow-[0_0_10px_rgba(212,175,55,0.4)] hover:scale-110 transition-transform focus:outline-none"
          >
            {collapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
          </button>

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className={cx("flex flex-col gap-6 transition-all duration-300", collapsed ? "items-center py-6 px-2" : "items-center px-4 py-8")}>
              {/* Logo Area */}
              <div className={cx("transition-all duration-300 flex items-center justify-center")}>
                {collapsed ? (
                  <img
                    src="/cort-app-icon.svg"
                    alt="Cort"
                    className="h-14 w-14 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                  />
                ) : (
                  <img
                    src="/Asset-1@2x (1).png"
                    alt="Cort"
                    className="h-14 w-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
                  />
                )}
              </div>
            </div>

            <nav className="px-3 mt-2 space-y-1.5">
              {getNavItems(company.services_enabled).map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cx(
                      "group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                      active
                        ? "bg-gradient-to-r from-premium-gold/20 to-transparent text-premium-gold shadow-[inset_1px_0_0_0_#d4af37]"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {/* Active Indicator Glow */}
                    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-premium-gold shadow-[0_0_12px_#d4af37]" />}

                    <Icon size={20} strokeWidth={active ? 2.5 : 2} className={cx("shrink-0 transition-transform duration-200", active ? "text-premium-gold scale-110" : "group-hover:scale-110")} />

                    <span className={cx(
                      "whitespace-nowrap transition-all duration-300 origin-left",
                      collapsed ? "opacity-0 w-0 hidden scale-90" : "opacity-100 w-auto scale-100"
                    )}>
                      {item.label}
                    </span>

                    {!collapsed && active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-premium-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile Footer */}
          <div className="border-t border-white/5 p-3 mt-auto bg-black/20">
            <div className={cx("flex items-center gap-3 rounded-lg p-2 transition-all duration-300", collapsed ? "justify-center" : "justify-between hover:bg-white/5")}>
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Company Logo in Footer */}
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-white/10"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs text-white/80 ring-1 ring-white/10 shrink-0">
                    {/* Fallback to user icon or company initial */}
                    {company.name?.[0]?.toUpperCase() || <Users size={14} />}
                  </div>
                )}

                <div className={cx("flex flex-col overflow-hidden transition-all duration-200", collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                  <span className="truncate text-xs font-medium text-white/90">
                    {user?.email}
                  </span>
                  <span className="text-[10px] text-premium-gold/80">Company Account</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                className={cx("shrink-0 rounded-md p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors", collapsed ? "hidden" : "block")}
                title="Sign out"
              >
                <LogOut size={16} />
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

