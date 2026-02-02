"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CompanyShell } from "./ui/CompanyShell";
import { CompanyStoreProvider } from "./store/CompanyStore";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";
import { useAuth } from "../lib/contexts/auth-context";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const companyId = user?.company_id?.toString() || null;
  const isLoginPage = pathname === "/login" || pathname === "/company/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute
      allowedRoles={[UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE]}
      requireCompanyId={true}
      redirectTo="/login"
    >
      <CompanyStoreProvider companyId={companyId}>
        <CompanyShell>{children}</CompanyShell>
      </CompanyStoreProvider>
    </ProtectedRoute>
  );
}
