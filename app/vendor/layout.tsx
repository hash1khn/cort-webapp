"use client";

import { useEffect, useState, createContext, useContext, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/contexts/auth-context";
import { UserRole, VendorLink } from "../lib/types/auth-types";
import {
    LayoutDashboard,
    Inbox,
    Car,
    Users,
    Map,
    LogOut,
    Menu,
    X,
    ChevronDown,
    ClipboardList,
} from "lucide-react";

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

// ─── Vendor Context ──────────────────────────────────────────────────────────

interface VendorContextValue {
    selectedLink: VendorLink | null;
    setSelectedLink: (link: VendorLink) => void;
}

const VendorContext = createContext<VendorContextValue>({
    selectedLink: null,
    setSelectedLink: () => {},
});

export function useVendorContext() {
    return useContext(VendorContext);
}

// ─── Layout ──────────────────────────────────────────────────────────────────

export default function VendorLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, isAuthenticated, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [selectedLink, setSelectedLinkState] = useState<VendorLink | null>(null);
    const [showCompanySwitcher, setShowCompanySwitcher] = useState(false);

    // Guard: only COMPANY_VENDOR
    useEffect(() => {
        if (loading) return;
        if (!isAuthenticated || user?.role !== UserRole.COMPANY_VENDOR) {
            router.replace("/");
        }
    }, [loading, isAuthenticated, user, router]);

    // Initialize selected link from localStorage or first link
    useEffect(() => {
        if (!user?.vendor_links?.length) return;
        const stored = typeof window !== "undefined" ? localStorage.getItem("vendor_link_id") : null;
        const storedLink = stored ? user.vendor_links.find((l) => l.id === Number(stored)) : null;
        const activeLinks = user.vendor_links.filter((l) => l.is_active);
        setSelectedLinkState(storedLink ?? activeLinks[0] ?? user.vendor_links[0]);
    }, [user]);

    const setSelectedLink = useCallback((link: VendorLink) => {
        setSelectedLinkState(link);
        if (typeof window !== "undefined") {
            localStorage.setItem("vendor_link_id", String(link.id));
        }
        setShowCompanySwitcher(false);
    }, []);

    if (loading || !user || user.role !== UserRole.COMPANY_VENDOR) {
        return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-[#f47f00] border-t-transparent rounded-full animate-spin" /></div>;
    }

    const links = user.vendor_links ?? [];
    const activeLinks = links.filter((l) => l.is_active);
    const isLogin = pathname === "/vendor/login";
    if (isLogin) return <>{children}</>;

    const navItems = [
        { href: "/vendor", label: "Dashboard", icon: LayoutDashboard, exact: true },
        { href: "/vendor/requests", label: "Booking Requests", icon: Inbox },
        { href: "/vendor/bookings", label: "Bookings", icon: ClipboardList },
        { href: "/vendor/fleet/vehicles", label: "Vehicles", icon: Car },
        { href: "/vendor/fleet/drivers", label: "Drivers", icon: Users },
        ...(selectedLink?.serves_shuttle ? [{ href: "/vendor/routes", label: "Routes", icon: Map }] : []),
    ];

    const isActive = (href: string, exact?: boolean) => {
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-[#0c225e]">
            {/* Logo */}
            <div className="px-6 py-8 flex items-center gap-3">
                <img src="/cort-app-icon.svg" alt="CORT" className="h-8 w-8" />
                <span className="text-white font-bold text-lg">Vendor Portal</span>
            </div>

            {/* Company Switcher */}
            {activeLinks.length > 0 && (
                <div className="px-4 mb-4 relative">
                    <button
                        onClick={() => setShowCompanySwitcher(!showCompanySwitcher)}
                        className="w-full flex items-center justify-between bg-white/10 rounded-xl px-4 py-3 text-left hover:bg-white/15 transition-colors"
                    >
                        <div>
                            <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold mb-0.5">Company</p>
                            <p className="text-sm font-semibold text-white truncate">
                                {selectedLink?.companies?.name ?? `Link #${selectedLink?.id}`}
                            </p>
                            <div className="flex gap-1 mt-1">
                                {selectedLink?.serves_chauffeur && <span className="text-[10px] bg-[#f47f00]/30 text-[#f47f00] px-1.5 py-0.5 rounded">Chauffeur</span>}
                                {selectedLink?.serves_shuttle && <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">Shuttle</span>}
                            </div>
                        </div>
                        <ChevronDown className={cx("w-4 h-4 text-white/60 transition-transform", showCompanySwitcher && "rotate-180")} />
                    </button>
                    {showCompanySwitcher && (
                        <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-xl shadow-xl z-50 py-1 overflow-hidden">
                            {activeLinks.map((link) => (
                                <button
                                    key={link.id}
                                    onClick={() => setSelectedLink(link)}
                                    className={cx(
                                        "w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors",
                                        selectedLink?.id === link.id && "bg-orange-50 text-[#f47f00] font-semibold"
                                    )}
                                >
                                    <p className="font-medium">{link.companies?.name ?? `Link #${link.id}`}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        {[link.serves_chauffeur && "Chauffeur", link.serves_shuttle && "Shuttle"].filter(Boolean).join(" · ")}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 px-3 space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href, item.exact);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cx(
                                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                active
                                    ? "bg-[#f47f00] text-white shadow-lg shadow-[#f47f00]/30"
                                    : "text-white/70 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <Icon className="w-4 h-4 shrink-0" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User / Logout */}
            <div className="px-4 py-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-[#f47f00] flex items-center justify-center text-white text-sm font-bold">
                        {user.full_name?.[0]?.toUpperCase() ?? "V"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                        <p className="text-xs text-white/50 truncate">{user.email}</p>
                    </div>
                </div>
                <button
                    onClick={logout}
                    className="w-full flex items-center gap-2 text-sm text-white/60 hover:text-white px-2 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </div>
        </div>
    );

    return (
        <VendorContext.Provider value={{ selectedLink, setSelectedLink }}>
            <div className="flex h-screen bg-gray-50">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:flex w-64 shrink-0 flex-col">
                    <SidebarContent />
                </aside>

                {/* Mobile Sidebar */}
                {isMobileMenuOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
                        <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col">
                            <SidebarContent />
                        </aside>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Mobile Header */}
                    <header className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
                            <Menu className="w-5 h-5 text-gray-600" />
                        </button>
                        <span className="text-sm font-semibold text-[#0c225e]">Vendor Portal</span>
                        <div className="w-9" />
                    </header>

                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </VendorContext.Provider>
    );
}
