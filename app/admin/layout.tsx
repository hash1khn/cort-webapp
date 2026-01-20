"use client";

import type { ReactNode } from "react";
import { AdminShell } from "./ui/AdminShell";
import { AdminStoreProvider } from "./store/AdminStore";
import { ProtectedRoute } from "../lib/components/protected-route";
import { UserRole } from "../lib/types/auth-types";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} redirectTo="/login">
      <AdminStoreProvider>
        <AdminShell>{children}</AdminShell>
      </AdminStoreProvider>
    </ProtectedRoute>
  );
}


