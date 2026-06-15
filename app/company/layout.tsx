"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompanyShell } from "./ui/CompanyShell";
import { CompanyThemeProvider } from "./lib/theme-context";
import { Provider } from "react-redux";
import { companyStore } from "../lib/store/company-store";
import { useAuth } from "../lib/contexts/auth-context";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";

const SHUTTLE_REQUESTER_PATHS = new Set([
  "/company/overtime-requests",
  "/company/employees",
]);

function isShuttleRequesterPath(pathname: string | null) {
  if (!pathname) return false;
  return SHUTTLE_REQUESTER_PATHS.has(pathname);
}

function ShuttleRequesterRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || user?.role !== UserRole.SHUTTLE_REQUESTER) return;
    if (pathname === "/company" || pathname === "/company/") {
      router.replace("/company/overtime-requests");
      return;
    }
    if (!isShuttleRequesterPath(pathname)) {
      router.replace("/company/overtime-requests");
    }
  }, [loading, user?.role, pathname, router]);

  if (!loading && user?.role === UserRole.SHUTTLE_REQUESTER) {
    const onCompanyRoot = pathname === "/company" || pathname === "/company/";
    if (onCompanyRoot || !isShuttleRequesterPath(pathname)) {
      return null;
    }
  }

  return <>{children}</>;
}

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/company/login" || pathname === "/";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute
      allowedRoles={[UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE, UserRole.SHUTTLE_REQUESTER, UserRole.SUPER_ADMIN]}
      redirectTo="/login"
    >
      <Provider store={companyStore}>
        <CompanyThemeProvider>
          <ShuttleRequesterRouteGuard>
            <CompanyShell>{children}</CompanyShell>
          </ShuttleRequesterRouteGuard>
        </CompanyThemeProvider>
      </Provider>
    </ProtectedRoute>
  );
}
