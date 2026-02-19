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

  // ✅ FIX: Use user's enabled_services as fallback when company profile hasn't loaded yet
  // This prevents showing a second full-page loader
  const servicesEnabled = useMemo(() => {
    if (company?.services_enabled) {
      return company.services_enabled;
    }
    // Fallback to user's enabled services during company profile loading
    return {
      shuttle_enabled: user?.enabled_services?.shuttle ?? false,
      chauffeur_enabled: user?.enabled_services?.chauffeur ?? false,
    };
  }, [company, user]);

  const isLogin = pathname === "/company/login";

  const activeHref = useMemo(() => {
    if (!pathname) return "/company";
    const navGroups = getNavGroups(servicesEnabled);

    // Flatten items for search
    const allItems = navGroups.flatMap(g => g.items);

    const found = allItems.find((n) => pathname === n.href);
    if (found) return found.href;
    const prefix = allItems.find((n) => n.href !== "/company" && pathname.startsWith(n.href));
    return prefix?.href ?? "/company";
  }, [pathname, servicesEnabled]);

  if (isLogin) return <>{children}</>;

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
              {/* Logo Area - Company Logo */}
              <div className="relative h-14 w-full flex items-center justify-center transition-all duration-300">
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name || 'Company'}
                    className={cx("h-14 w-14 object-contain rounded-xl transition-all duration-300", collapsed ? "h-10 w-10" : "h-14 w-14")}
                  />
                ) : (
                  <div className="relative h-14 w-full flex items-center justify-center">
                    <img
                      src="/cort-app-icon.svg"
                      alt="Cort"
                      className={cx("absolute h-14 w-14 object-contain transition-all duration-300", collapsed ? "opacity-100 scale-100" : "opacity-0 scale-90")}
                    />
                    <img
                      src="/logo.svg"
                      alt="Cort"
                      className={cx("absolute h-14 w-auto object-contain transition-all duration-300", collapsed ? "opacity-0 scale-90" : "opacity-100 scale-100")}
                    />
                  </div>
                )}
              </div>
            </div>

            <nav className="px-3 mt-2 space-y-6">
              {getNavGroups(servicesEnabled).map((group, groupIndex) => (
                <div key={groupIndex}>
                  {group.title && (
                    <div className={cx(
                      "px-3 mb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider transition-all duration-300 overflow-hidden whitespace-nowrap",
                      collapsed ? "opacity-0 max-h-0 mb-0" : "opacity-100 max-h-5"
                    )}>
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
                            "whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden",
                            collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]"
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
                <div className={cx(
                  "flex flex-col overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
                  collapsed ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
                )}>
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

