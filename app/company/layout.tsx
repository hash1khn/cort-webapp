"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompanyShell } from "./ui/CompanyShell";
import { CompanyThemeProvider } from "./lib/theme-context";import { Provider } from "react-redux";
import { companyStore } from "../lib/store/company-store";
import { useAuth } from "../lib/contexts/auth-context";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/company/login" ||
    pathname === "/company/trial" ||
    pathname === "/";

  // Login and trial entry pages don't need protection
  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute
      allowedRoles={[UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN]}
      redirectTo="/login"
    >
      <Provider store={companyStore}>
        <CompanyThemeProvider>
          <CompanyShell>{children}</CompanyShell>
        </CompanyThemeProvider>
      </Provider>
    </ProtectedRoute>
  );
}
