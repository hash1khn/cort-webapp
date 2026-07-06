"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useMemo, useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../lib/store/hooks";
import { fetchCompanyProfile, fetchCompanyFeatures, selectCompany, selectCompanyFeatures } from "../../lib/store/slices/companySlice";
import { apiClient } from "../../lib/services/api-client";
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
  BarChart2,
  TrendingDown,
  Building2,
} from "lucide-react";
import { useAuth } from "../../lib/contexts/auth-context";
import type { TrialModules } from "../../lib/types/auth-types";
import { useCompanyTheme } from "../lib/theme-context";
import { Sun, Moon } from "lucide-react";
import { Toaster } from "sonner";
import { TrialOnboardingWalkthrough } from "../components/TrialOnboardingWalkthrough";

type ServicesEnabled = { shuttle_enabled: boolean; chauffeur_enabled: boolean };
type FeatureLike = { feature_key: string; is_enabled: boolean };

const TRIAL_FLEET_PREFIXES = ["/company/fleet"];
const TRIAL_POOL_PREFIXES = ["/company/bookings"];
const TRIAL_SHUTTLE_PREFIXES = ["/company/routes", "/company/employees"];

function trialHasPool(modules?: TrialModules): boolean {
  return modules === "pool" || modules === "both" || !modules;
}

function trialHasShuttle(modules?: TrialModules): boolean {
  return modules === "shuttle" || modules === "both";
}

function isTrialAllowedPath(pathname: string, modules?: TrialModules): boolean {
  if (pathname === "/company") return true;
  const prefixes: string[] = [...TRIAL_FLEET_PREFIXES];
  if (trialHasPool(modules)) prefixes.push(...TRIAL_POOL_PREFIXES);
  if (trialHasShuttle(modules)) prefixes.push(...TRIAL_SHUTTLE_PREFIXES);
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

const getTrialNavGroups = (modules?: TrialModules) => {
  const items: { href: string; label: string; icon: typeof LayoutDashboard }[] = [
    { href: "/company", label: "Dashboard", icon: LayoutDashboard },
  ];

  if (trialHasPool(modules) || trialHasShuttle(modules)) {
    items.push({ href: "/company/fleet", label: "Fleet", icon: Car });
  }

  if (trialHasPool(modules)) {
    items.push({ href: "/company/bookings", label: "Bookings", icon: Calendar });
  }

  if (trialHasShuttle(modules)) {
    items.push({ href: "/company/routes", label: "Routes", icon: Map });
    items.push({ href: "/company/employees", label: "Employees", icon: Users });
  }

  return [{ title: "", items }];
};

const getNavGroups = (
  servicesEnabled: ServicesEnabled,
  features: FeatureLike[],
  hasVendors = false,
  isTrial = false,
  trialModules?: TrialModules,
) => {
  if (isTrial) return getTrialNavGroups(trialModules);

  const hasFeature = (key: string) => features.find((f) => f.feature_key === key)?.is_enabled ?? false;

  const adminItems: any[] = [
    { href: "/company/employees", label: "Employees", icon: Users },
  ];
  if (hasVendors) {
    adminItems.push({ href: "/company/vendors", label: "Vendors", icon: Building2 });
  }

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
      items: adminItems,
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

  // Fleet Analytics — show if shuttle or chauffeur is enabled
  if (servicesEnabled.shuttle_enabled || servicesEnabled.chauffeur_enabled) {
    groups[1].items.push({ href: "/company/fleet-analytics", label: "Fleet Analytics", icon: BarChart2 });
  }

  // Savings — show just below Fleet Analytics
  if (servicesEnabled.shuttle_enabled || servicesEnabled.chauffeur_enabled) {
    groups[1].items.push({ href: "/company/savings", label: "Savings", icon: TrendingDown });
  }


  // Invoices — show if either cort-managed service is enabled
  if (hasFeature("chauffeur_cort_managed") || hasFeature("shuttle_cort_managed")) {
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
  const router = useRouter();
  const dispatch = useAppDispatch();
  const company = useAppSelector(selectCompany);
  const { logout, user } = useAuth();
  const { theme, toggle } = useCompanyTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasVendors, setHasVendors] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
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

  useEffect(() => {
    if (!user?.company_id) return;
    apiClient.getCompanyExternalVendors(user.company_id)
      .then((res: any) => {
        const data = res?.data ?? res;
        setHasVendors(Array.isArray(data) && data.some((l: any) => l.is_active && l.external_vendors?.is_active));
      })
      .catch(() => setHasVendors(false));
  }, [user?.company_id]);

  const isTrialUser = !!user?.is_trial;
  const trialModules = user?.trial_modules;

  useEffect(() => {
    if (!isTrialUser || !pathname) return;
    if (!isTrialAllowedPath(pathname, trialModules)) {
      router.replace("/company");
    }
  }, [isTrialUser, pathname, router, trialModules]);

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
    const navGroups = getNavGroups(servicesEnabled, features, hasVendors, isTrialUser, trialModules);

    // Flatten items for search
    const allItems = navGroups.flatMap(g => g.items);

    const found = allItems.find((n) => pathname === n.href);
    if (found) return found.href;
    const prefix = allItems.find((n) => n.href !== "/company" && pathname.startsWith(n.href));
    return prefix?.href ?? "/company";
  }, [pathname, servicesEnabled, features, hasVendors, isTrialUser, trialModules]);

  if (isLogin) return <>{children}</>;

  const trialInfo = useMemo(() => {
    if (!user?.is_trial || !user.trial_expires_at) return null;
    const expiresAtMs = new Date(user.trial_expires_at).getTime();
    const now = Date.now();
    const remainingMs = expiresAtMs - now;
    const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));
    return { expiresAtMs, remainingHours };
  }, [user?.is_trial, user?.trial_expires_at]);

  const SidebarContent = ({ isMobile = false }) => (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className={cx("flex flex-col gap-6 transition-all duration-300", (collapsed && !isMobile) ? "items-center py-8 px-2" : "items-center px-6 py-10")}>
          {/* Logo Area */}
          <div className="relative h-14 w-full flex items-center justify-center transition-all duration-300">
            <img
              src={theme === "light" ? "/traflinq_light_no_tagline-Photoroom.png" : "/traflinq_dark_no_tagline-Photoroom.png"}
              alt="TrafLinq"
              className={cx("h-14 w-auto object-contain transition-all duration-300", (collapsed && !isMobile) ? "scale-75" : "scale-100")}
            />
          </div>
        </div>

        <nav className="px-3 mt-2 space-y-6">
          {getNavGroups(servicesEnabled, features, hasVendors, isTrialUser, trialModules).map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.title && (
                <div className={cx(
                  "px-3 mb-2 text-[11px] font-bold text-[var(--nav-group-label)] uppercase tracking-wider transition-all duration-300 overflow-hidden whitespace-nowrap",
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
                          ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)]"
                          : "text-[var(--nav-inactive-text)] hover:text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)]"
                      )}
                    >
                      {/* Active Indicator Bar - Vertical Line on Left */}
                      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-[var(--cort-orange)]" />}

                      <Icon size={20} strokeWidth={active ? 2 : 1.5} className={cx("shrink-0 transition-transform duration-200", active ? "text-[var(--nav-active-text)]" : "group-hover:text-[var(--text-primary)]")} />

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
      <div className="border-t border-[var(--nav-border)] p-3 mt-auto bg-[var(--nav-footer-bg)]">
        <div className={cx("flex items-center gap-3 rounded-lg p-2 transition-all duration-300", (collapsed && !isMobile) ? "justify-center" : "justify-between hover:bg-[var(--nav-hover-bg)]")}>
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Company Logo in Footer */}
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt={company.name || 'Company'}
                className="h-8 w-8 rounded-full object-cover shrink-0 ring-1 ring-white/10"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#fe8503]/20 border border-[#fe8503]/30 flex items-center justify-center text-xs text-[#fe8503] ring-1 ring-[var(--border-default)] shrink-0">
                {company?.name?.[0]?.toUpperCase() || <Users size={14} />}
              </div>
            )}

            <div className={cx(
              "flex flex-col overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap",
              (collapsed && !isMobile) ? "max-w-0 opacity-0" : "max-w-[150px] opacity-100"
            )}>
              <span className="truncate text-xs font-semibold text-[var(--text-secondary)]">
                {user?.email}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">Company Account</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className={cx("shrink-0 rounded-md p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors", (collapsed && !isMobile) ? "hidden" : "block")}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
          <button
            type="button"
            onClick={toggle}
            className={cx("shrink-0 rounded-md p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors", (collapsed && !isMobile) ? "hidden" : "block")}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--nav-border)] bg-[var(--bg-header)] px-6 md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-xl p-2.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] active:scale-95 transition-all"
        >
          <Menu size={24} />
        </button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <img src="/traflinq_dark_no_tagline-Photoroom.png" alt="TrafLinq" className="h-10 w-auto" />
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar - colors align with dashboard theme */}
        <aside
          className={cx(
            "sticky top-4 h-[calc(100vh-2rem)] hidden shrink-0 border border-[var(--border-default)] bg-[var(--bg-sidebar)] text-[var(--text-primary)] md:flex md:flex-col transition-all duration-300 ease-in-out relative z-20 ml-4 my-4 rounded-[2rem] shadow-xl",

            collapsed ? "w-20" : "w-72"
          )}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-9 z-50 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--bg-sidebar)] border border-[var(--border-input)] text-[var(--text-muted)] shadow-sm hover:text-[var(--text-primary)] hover:scale-105 transition-all focus:outline-none"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-[var(--bg-sidebar)] animate-slide-in-left">
              <div className="absolute right-2 top-2">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] active:scale-95 transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
              </div>
              <SidebarContent isMobile />
            </div>
          </div>
        )}

        <div className="relative flex min-w-0 flex-1 flex-col">
          <Suspense fallback={null}>
            <TrialOnboardingWalkthrough
              forceOpen={guideOpen}
              onClose={() => setGuideOpen(false)}
              sidebarCollapsed={collapsed}
            />
          </Suspense>
          <main
            data-company-main
            className="mx-auto w-full max-w-full flex-1 px-4 py-4 md:px-8 bg-[var(--bg-page)] min-h-screen"
          >
            {trialInfo && (
              <div className="mb-4 rounded-2xl border border-[#f47f00]/25 bg-[#f47f00]/10 px-4 py-3 text-sm text-white/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col">
                  <div className="font-semibold">Trial access</div>
                  <div className="text-xs text-white/60">
                    Your trial ends in <span className="text-white font-semibold">{trialInfo.remainingHours}h</span>. Book a demo to continue.
                  </div>
                  {!user?.trial_onboarding_completed && (
                    <button
                      type="button"
                      onClick={() => setGuideOpen(true)}
                      className="mt-1 text-left text-xs font-semibold text-[#f47f00] hover:underline w-fit"
                    >
                      View setup guide
                    </button>
                  )}
                </div>
                <a
                  href="https://calendar.app.google/qeHQgMANfWNr77yz6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg bg-[#f47f00] px-4 py-2 text-xs font-bold text-white hover:bg-[#f47f00]/90 transition-colors"
                >
                  Book a demo
                </a>
              </div>
            )}
            <div key={pathname} className="page-transition-enter min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

