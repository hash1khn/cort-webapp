"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AdminShell } from "./ui/AdminShell";
import { AdminStoreProvider } from "./store/AdminStore";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";
import { Provider } from "react-redux";
import { store } from "../lib/store/store";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} redirectTo="/login">
      <Provider store={store}>
        <AdminStoreProvider>
          <AdminShell>{children}</AdminShell>
        </AdminStoreProvider>
      </Provider>
    </ProtectedRoute>
  );
}


