"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { fetchCompanyProfile, selectCompany } from "../../lib/store/slices/companySlice";
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

const getNavGroups = (servicesEnabled: { shuttle_enabled: boolean; chauffeur_enabled: boolean }) => {
  const groups = [
    {
      title: "",
      items: [
        { href: "/company", label: "Dashboard", icon: LayoutDashboard },
      ]
    },
    {
      title: "Operations",
      items: [] as any[]
    },
    {
      title: "Administration",
      items: [
        { href: "/company/employees", label: "Employees", icon: Users },
        { href: "/company/invoicing", label: "Invoices", icon: Receipt },
      ]
    }
  ];

  if (servicesEnabled.shuttle_enabled) {
    groups[1].items.push({ href: "/company/routes", label: "Route Roster", icon: Map });
  }

  if (servicesEnabled.chauffeur_enabled) {
    groups[1].items.push({ href: "/company/bookings", label: "Bookings", icon: Calendar });
  }

  if (servicesEnabled.shuttle_enabled) {
    groups[1].items.push({ href: "/company/reports/shuttle", label: "Shuttle Reports", icon: FileBarChart });
  }

  if (servicesEnabled.chauffeur_enabled) {
    groups[1].items.push({ href: "/company/reports/chauffeur", label: "Chauffeur Reports", icon: FileSpreadsheet });
  }

  // Filter out empty groups if any
  return groups.filter(g => g.items.length > 0);
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function CompanyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const { logout, user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const companyId = user?.company_id?.toString();

  // ✅ FIX: Add dependency tracking to prevent unnecessary refetches
  useEffect(() => {
    if (companyId && !company) {
      dispatch(fetchCompanyProfile(companyId));
    }
  }, [companyId, company, dispatch]);

  // We want to persist the collapsed state if possible, but for now local state is fine.
  // Ideally this would be in a store or localStorage.

  const isLogin = pathname === "/company/login";

  const activeHref = useMemo(() => {
    if (!pathname || !company) return "/company";
    const navGroups = getNavGroups(company.services_enabled);

    // Flatten items for search
    const allItems = navGroups.flatMap(g => g.items);

    const found = allItems.find((n) => pathname === n.href);
    if (found) return found.href;
    const prefix = allItems.find((n) => n.href !== "/company" && pathname.startsWith(n.href));
    return prefix?.href ?? "/company";
  }, [pathname, company]);

  if (isLogin) return <>{children}</>;

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink font-sans">
      <div className="flex min-h-screen">
        <aside
          className={cx(
            "sticky top-4 h-[calc(100vh-2rem)] hidden shrink-0 border border-gray-100 bg-white text-gray-900 md:flex md:flex-col transition-all duration-300 ease-in-out relative z-20 ml-4 my-4 rounded-3xl shadow-sm",
            collapsed ? "w-20" : "w-72"
          )}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-9 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500 shadow-sm hover:text-gray-900 hover:scale-105 transition-all focus:outline-none"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            <div className={cx("flex flex-col gap-6 transition-all duration-300", collapsed ? "items-center py-8 px-2" : "items-center px-6 py-10")}>
              {/* Logo Area */}
              <div className={cx("transition-all duration-300 flex items-center justify-center mb-2")}>
                {collapsed ? (
                  <img
                    src="/cort-app-icon.svg"
                    alt="Cort"
                    className="h-14 w-14"
                  />
                ) : (
                  <img
                    src="/logo.svg"
                    alt="Cort"
                    className="h-14 w-auto"
                  />
                )}
              </div>
            </div>

            <nav className="px-3 mt-2 space-y-6">
              {getNavGroups(company.services_enabled).map((group, groupIndex) => (
                <div key={groupIndex}>
                  {group.title && !collapsed && (
                    <div className="px-3 mb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      {group.title}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    {group.items.map((item) => {
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
                              ? "bg-purple/5 text-purple shadow-sm"
                              : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                          )}
                        >
                          {/* Active Indicator Bar - Vertical Line on Left */}
                          {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-purple" />}

                          <Icon size={20} strokeWidth={active ? 2 : 1.5} className={cx("shrink-0 transition-transform duration-200", active ? "text-purple" : "group-hover:text-gray-900")} />

                          <span className={cx(
                            "whitespace-nowrap transition-all duration-300 origin-left",
                            collapsed ? "opacity-0 w-0 hidden scale-90" : "opacity-100 w-auto scale-100"
                          )}>
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* User Profile Footer */}
          <div className="border-t border-gray-100 p-3 mt-auto bg-gray-50/50">
            <div className={cx("flex items-center gap-3 rounded-lg p-2 transition-all duration-300", collapsed ? "justify-center" : "justify-between hover:bg-white hover:shadow-sm")}>
              <div className="flex items-center gap-3 overflow-hidden">
                {/* Company Logo in Footer */}
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-gray-100"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-900 flex items-center justify-center text-xs text-white ring-1 ring-gray-100 shrink-0">
                    {/* Fallback to user icon or company initial */}
                    {company.name?.[0]?.toUpperCase() || <Users size={14} />}
                  </div>
                )}

                <div className={cx("flex flex-col overflow-hidden transition-all duration-200", collapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
                  <span className="truncate text-xs font-semibold text-gray-900">
                    {user?.email}
                  </span>
                  <span className="text-[10px] text-gray-500">Company Account</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logout()}
                className={cx("shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors", collapsed ? "hidden" : "block")}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-full flex-1 px-4 py-4 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

