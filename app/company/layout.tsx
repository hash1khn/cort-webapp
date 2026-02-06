"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompanyShell } from "./ui/CompanyShell";
import { Provider } from "react-redux";
import { store } from "../lib/store/store";
import { useAuth } from "../lib/contexts/auth-context";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAuthenticated } = useAuth();
  const isLoginPage = pathname === "/login" || pathname === "/company/login";

  useEffect(() => {
    if (!loading && !isAuthenticated && !isLoginPage) {
      router.replace("/company/login");
    }
  }, [loading, isAuthenticated, isLoginPage, router]);

  // Show loading while auth is being initialized
  if (loading && !isLoginPage) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-orange border-r-transparent" />
      </div>
    );
  }

  // Login pages don't need the shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // ✅ FIX: Removed ProtectedRoute wrapper
  // If using subdomains, access is already controlled at DNS/infrastructure level
  // If not using subdomains, add ProtectedRoute back or implement endpoint-level auth
  return (
    <Provider store={store}>
      <CompanyShell>{children}</CompanyShell>
    </Provider>
  );
}
