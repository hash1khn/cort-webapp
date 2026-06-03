"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../../lib/contexts/auth-context";
import { PermissionKey } from "../../lib/types/auth-types";
import { BookingNotificationProvider } from "../components/BookingNotificationProvider";
import { cx } from "../components/ui/cx";

type NavItem = {
  href: string;
  label: string;
  permission?: PermissionKey; // undefined = always visible (superadmin only)
};

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", permission: "dashboard" },
  { href: "/admin/companies", label: "Companies", permission: "companies" },
  { href: "/admin/pricing", label: "Contracts & Pricing", permission: "pricing" },
  { href: "/admin/fixed-contracts", label: "↳ Fixed-Term Cars", permission: "fixed_contracts" },
  { href: "/admin/vehicles", label: "Vehicles", permission: "vehicles" },
  { href: "/admin/vehicles/fueling", label: "↳ Fuel Records", permission: "fuel_records" },
  { href: "/admin/vehicles/maintenance", label: "↳ Maintenance", permission: "maintenance" },
  { href: "/admin/vendors", label: "Vendors", permission: "vendors" },
  { href: "/admin/vendors/logs", label: "↳ Trip Logs", permission: "vendor_logs" },
  { href: "/admin/external-vendors", label: "External Vendors", permission: "external_vendors" },
  { href: "/admin/drivers", label: "Drivers", permission: "drivers" },
  { href: "/admin/bookings/pending", label: "Bookings", permission: "bookings" },
  { href: "/admin/routes", label: "Routes", permission: "routes" },
  { href: "/admin/routes/shuttle-trips", label: "↳ Shuttle trip scheduling", permission: "ops_shuttle" },
  { href: "/admin/ops/shuttle", label: "Ops: Shuttle", permission: "ops_shuttle" },
  { href: "/admin/ops/chauffeur", label: "Ops: Chauffeur", permission: "ops_chauffeur" },
  { href: "/admin/reports", label: "Reports", permission: "reports" },
  { href: "/admin/expenses", label: "Expenses", permission: "expenses" },
  { href: "/admin/invoicing", label: "Invoicing", permission: "invoicing" },
  // Permissions management — only visible to SUPER_ADMIN (no permission key needed)
  { href: "/admin/permissions", label: "Staff & Permissions" },
  { href: "/admin/leads", label: "Leads", permission: "dashboard" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user, isSuperAdmin, hasPermission } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLogin = pathname === "/admin/login";

  // Filter nav items based on role/permissions
  const visibleNav = useMemo(() => {
    return nav.filter((item) => {
      // The "Staff & Permissions" page is superadmin-only (no permission key)
      if (!item.permission) return isSuperAdmin;
      // Superadmin sees everything
      if (isSuperAdmin) return true;
      // Internal staff only sees items they have permission for
      return hasPermission(item.permission);
    });
  }, [isSuperAdmin, hasPermission]);

  const activeHref = useMemo(() => {
    if (!pathname) return "/admin";
    const found = visibleNav.find((n) => pathname === n.href);
    if (found) return found.href;
    const prefix = visibleNav.find((n) => n.href !== "/admin" && pathname.startsWith(n.href));
    return prefix?.href ?? "/admin";
  }, [pathname, visibleNav]);

  if (isLogin) return <>{children}</>;

  const NavContent = () => (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center px-6 py-8">
          <img
            src="/traflinq_dark_no_tagline-Photoroom.png"
            alt="TrafLinq"
            className="h-14 w-auto drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
          />
        </div>

        <nav className="px-3 pb-6">
          {visibleNav.map((item, index) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
                className={cx(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10",
                  "animate-fade-slide-up opacity-0",
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
            <span className="text-[10px] text-white/50">
              {isSuperAdmin ? "Super Admin Portal" : "Staff Portal"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="shrink-0 rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-white px-4 md:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-md p-2 text-navy hover:bg-gray-100"
        >
          <Menu size={24} />
        </button>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <img src="/traflinq_light_no_tagline.png" alt="TrafLinq" className="h-10 w-auto" />
        </div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="sticky top-0 h-screen hidden w-72 shrink-0 border-r border-border bg-navy text-white md:flex md:flex-col">
          <NavContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="fixed inset-0 bg-navy/80 backdrop-blur-sm animate-fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-navy text-white animate-slide-in-left">
              <div className="absolute right-0 top-0 -mr-12 pt-4">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-white ring-2 ring-white hover:bg-white/10"
                >
                  <X size={20} />
                </button>
              </div>
              <NavContent />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <BookingNotificationProvider />
          <main className="mx-auto w-full max-w-full flex-1 px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}


