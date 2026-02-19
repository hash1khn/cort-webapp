"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "../../lib/contexts/auth-context";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/companies", label: "Companies" },
  { href: "/admin/pricing", label: "Contracts & Pricing" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/vehicles/fueling", label: "↳ Fuel Records" },
  { href: "/admin/vehicles/maintenance", label: "↳ Maintenance" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/vendors/logs", label: "↳ Trip Logs" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/bookings/pending", label: "Bookings" },
  { href: "/admin/routes", label: "Routes" },
  { href: "/admin/ops/shuttle", label: "Ops: Shuttle" },
  { href: "/admin/ops/chauffeur", label: "Ops: Chauffeur" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/expenses", label: "Expenses" },
  { href: "/admin/invoicing", label: "Invoicing" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLogin = pathname === "/admin/login";

  const activeHref = useMemo(() => {
    if (!pathname) return "/admin";
    const found = nav.find((n) => pathname === n.href);
    if (found) return found.href;
    const prefix = nav.find((n) => n.href !== "/admin" && pathname.startsWith(n.href));
    return prefix?.href ?? "/admin";
  }, [pathname]);

  if (isLogin) return <>{children}</>;

  const NavContent = () => (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center px-6 py-8">
          <img
            src="/Asset-1@2x (1).png"
            alt="Cort"
            className="h-14 w-auto drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
          />
        </div>

        <nav className="px-3 pb-6">
          {nav.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
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
            <span className="text-[10px] text-white/50">Super Admin Portal</span>
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
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Cort" className="h-10 w-auto" />
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="rounded-md p-2 text-navy hover:bg-gray-100"
        >
          <Menu size={24} />
        </button>
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
              className="fixed inset-0 bg-navy/80 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-navy text-white animate-in slide-in-from-left duration-300">
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
          <main className="mx-auto w-full max-w-full flex-1 px-4 py-6 md:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}


