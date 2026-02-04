"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CompanyShell } from "./ui/CompanyShell";
import { Provider } from "react-redux";
import { store } from "../lib/store/store";
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
      <Provider store={store}>
        <CompanyShell>{children}</CompanyShell>
      </Provider>
    </ProtectedRoute>
  );
}
