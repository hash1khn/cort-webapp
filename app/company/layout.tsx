"use client";

import type { ReactNode } from "react";
import { CompanyShell } from "./ui/CompanyShell";
import { CompanyStoreProvider } from "./store/CompanyStore";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";
import { useAuth } from "../lib/contexts/auth-context";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const companyId = user?.company_id?.toString() || null;

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
