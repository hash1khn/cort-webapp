"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Provider } from "react-redux";
import { CompanyShell } from "./ui/CompanyShell";
import { CompanyThemeProvider } from "./lib/theme-context";
import { CompanyLocaleProvider } from "./lib/locale-context";
import { companyStore } from "../lib/store/company-store";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";

function CompanyLoginWrapper({ children }: { children: ReactNode }) {
  return <CompanyLocaleProvider>{children}</CompanyLocaleProvider>;
}

function CompanyAppWrapper({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute
      allowedRoles={[UserRole.COMPANY_ADMIN, UserRole.EMPLOYEE, UserRole.SUPER_ADMIN]}
      redirectTo="/login"
    >
      <Provider store={companyStore}>
        <CompanyLocaleProvider>
          <CompanyThemeProvider>
            <CompanyShell>{children}</CompanyShell>
          </CompanyThemeProvider>
        </CompanyLocaleProvider>
      </Provider>
    </ProtectedRoute>
  );
}

export default function CompanyLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage =
    pathname === "/login" || pathname === "/company/login" || pathname === "/";

  if (isLoginPage) {
    return <CompanyLoginWrapper>{children}</CompanyLoginWrapper>;
  }

  return <CompanyAppWrapper>{children}</CompanyAppWrapper>;
}
