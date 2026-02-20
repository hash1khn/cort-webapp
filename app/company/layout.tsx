"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CompanyShell } from "./ui/CompanyShell";
import { Provider } from "react-redux";
import { companyStore } from "../lib/store/company-store";
import { useAuth } from "../lib/contexts/auth-context";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/company/login" || pathname === "/";

  // Login pages don't need protection
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute
      allowedRoles={[UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN]}
      redirectTo="/login"
    >
      <Provider store={companyStore}>
        <CompanyShell>{children}</CompanyShell>
      </Provider>
    </ProtectedRoute>
  );
}
