"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { fetchCompanyProfile, fetchCompanyFeatures, selectCompany, selectCompanyFeatures } from "../../lib/store/slices/companySlice";
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
  Menu,
  Car,
} from "lucide-react";
import { useAuth } from "../../lib/contexts/auth-context";

type ServicesEnabled = { shuttle_enabled: boolean; chauffeur_enabled: boolean };
type FeatureLike = { feature_key: string; is_enabled: boolean };

const getNavGroups = (servicesEnabled: ServicesEnabled, features: FeatureLike[]) => {
  const hasFeature = (key: string) => features.find((f) => f.feature_key === key)?.is_enabled ?? false;

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

  // Pool Fleet — only show if chauffeur_self_managed feature is enabled
  if (servicesEnabled.chauffeur_enabled && hasFeature("chauffeur_self_managed")) {
    groups[1].items.push({ href: "/company/fleet", label: "Pool Fleet", icon: Car });
  }

  // Invoices — only show if chauffeur_cort_managed feature is enabled
  if (hasFeature("chauffeur_cort_managed")) {
    groups[2].items.push({ href: "/company/invoicing", label: "Invoices", icon: Receipt });
  }

  // Filter out empty groups
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const features = useAppSelector(selectCompanyFeatures);
  const companyId = user?.company_id?.toString();

  useEffect(() => {
    if (companyId && !company) {
      dispatch(fetchCompanyProfile(companyId));
    }
    if (companyId) {
      dispatch(fetchCompanyFeatures(Number(companyId)));
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
    const navGroups = getNavGroups(servicesEnabled, features);

    // Flatten items for search
    const allItems = navGroups.flatMap(g => g.items);

    const found = allItems.find((n) => pathname === n.href);
    if (found) return found.href;
    const prefix = allItems.find((n) => n.href !== "/company" && pathname.startsWith(n.href));
    return prefix?.href ?? "/company";
  }, [pathname, servicesEnabled, features]);

  if (isLogin) return <>{children}</>;

  const SidebarContent = ({ isMobile = false }) => (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className={cx("flex flex-col gap-6 transition-all duration-300", (collapsed && !isMobile) ? "items-center py-8 px-2" : "items-center px-6 py-10")}>
          {/* Logo Area */}
          <div className="relative h-14 w-full flex items-center justify-center transition-all duration-300">
            <img
              src="/cort-app-icon.svg"
              alt="Cort"
              className={cx("absolute h-14 w-14 object-contain transition-all duration-300", (collapsed && !isMobile) ? "opacity-100 scale-100" : "opacity-0 scale-90")}
            />
            <img
              src="/logo.svg"
              alt="Cort"
              className={cx("absolute h-14 w-auto object-contain transition-all duration-300", (collapsed && !isMobile) ? "opacity-0 scale-90" : "opacity-100 scale-100")}
            />
          </div>
        </div>

        <nav className="px-3 mt-2 space-y-6">
          {getNavGroups(servicesEnabled, features).map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.title && (
                <div className={cx(
                  "px-3 mb-2 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider transition-all duration-300 overflow-hidden whitespace-nowrap",
                  (collapsed && !isMobile) ? "opacity-0 max-h-0 mb-0" : "opacity-100 max-h-5"
                )}>
                  {group.title}
                </div>
              )}
              <div className="space-y-1.5">
                {group.items.map((item, itemIndex) => {
                  const active = item.href === activeHref;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={(collapsed && !isMobile) ? item.label : undefined}
                      onClick={() => isMobile && setIsMobileMenuOpen(false)}
                      style={isMobile ? { animationDelay: `${(itemIndex + 1 + groupIndex * 3) * 50}ms` } : undefined}
                      className={cx(
                        "group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 relative overflow-hidden",
                        isMobile && "animate-fade-slide-up opacity-0",
                        active
                          ? "bg-[var(--cort-navy)]/10 text-[var(--cort-navy)] shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--cort-navy)] hover:bg-[var(--surface-subtle)]"
                      )}
                    >
                      {/* Active Indicator Bar - Vertical Line on Left */}
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-[var(--cort-orange)]" />}

                      <Icon size={20} strokeWidth={active ? 2 : 1.5} className={cx("shrink-0 transition-transform duration-200", active ? "text-[var(--cort-orange)]" : "group-hover:text-[var(--cort-navy)]")} />

                      <span className={cx(
                        "whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden",
                        (collapsed && !isMobile) ? "opacity-0 max-w-0" : "opacity-100 max-w-[200px]"
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

      {/* User Profile Footer - theme aligned with dashboard */}
      <div className="border-t border-[var(--border-light)] p-3 mt-auto bg-[var(--surface-muted)]/50">
        <div className={cx("flex items-center gap-3 rounded-lg p-2 transition-all duration-300", (collapsed && !isMobile) ? "justify-center" : "justify-between hover:bg-white hover:shadow-sm")}>
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Company Logo in Footer */}
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name || 'Company'}
                className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-[var(--border-light)]"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[var(--cort-navy)] flex items-center justify-center text-xs text-white ring-1 ring-[var(--border-light)] shrink-0">
                {company?.name?.[0]?.toUpperCase() || <Users size={14} />}
              </div>
            )}

            <div className={cx(
              "flex flex-col overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
              (collapsed && !isMobile) ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
            )}>
              <span className="truncate text-xs font-semibold text-[var(--cort-navy)]">
                {user?.email}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Company Account</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className={cx("shrink-0 rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--accent-danger)] hover:bg-red-50 transition-colors", (collapsed && !isMobile) ? "hidden" : "block")}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface text-ink font-sans">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--border-light)] bg-white px-6 md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-xl p-2.5 text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] active:scale-95 transition-all"
        >
          <Menu size={24} />
        </button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <img src="/logo.svg" alt="Cort" className="h-10 w-auto" />
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar - colors align with dashboard theme */}
        <aside
          className={cx(
            "sticky top-4 h-[calc(100vh-2rem)] hidden shrink-0 border border-[var(--border-light)] bg-white text-[var(--cort-navy)] md:flex md:flex-col transition-all duration-300 ease-in-out relative z-20 ml-4 my-4 rounded-[2rem] shadow-sm",
            collapsed ? "w-20" : "w-72"
          )}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-9 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-[var(--border-light)] text-[var(--text-muted)] shadow-sm hover:text-[var(--cort-navy)] hover:scale-105 transition-all focus:outline-none"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-[var(--cort-navy)]/60 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white animate-slide-in-left">
              <div className="absolute right-2 top-2">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] active:scale-95 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
              <SidebarContent isMobile />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-full flex-1 px-4 py-4 md:px-8">
            <div key={pathname} className="page-transition-enter min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

