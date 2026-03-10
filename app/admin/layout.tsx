"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminShell } from "./ui/AdminShell";
// import { AdminStoreProvider } from "./store/AdminStore";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";
import { Provider } from "react-redux";
import { adminStore } from "../lib/store/admin-store";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage =
    pathname === "/login" ||
    pathname === "/admin/login" ||
    pathname === "/admin/forgot-password" ||
    pathname === "/admin/reset-password" ||
    pathname === "/";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} redirectTo="/login">
      <Provider store={adminStore}>
        <AdminShell>{children}</AdminShell>
      </Provider>
    </ProtectedRoute>
  );
}


