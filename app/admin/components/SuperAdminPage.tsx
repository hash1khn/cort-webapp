"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/contexts/auth-context";

type SuperAdminPageProps = {
  redirectTo?: string;
  children: ReactNode;
};

export function SuperAdminPage({ redirectTo = "/admin", children }: SuperAdminPageProps) {
  const { isSuperAdmin, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated && !isSuperAdmin) {
      router.replace(redirectTo);
    }
  }, [loading, isAuthenticated, isSuperAdmin, router, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return <>{children}</>;
}
