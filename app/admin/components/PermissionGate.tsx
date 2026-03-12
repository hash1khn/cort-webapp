"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/contexts/auth-context";
import { PermissionKey } from "../../lib/types/auth-types";

interface PermissionGateProps {
  /** The permission key required to view this content */
  permission: PermissionKey;
  /** Where to redirect if access is denied (defaults to /admin) */
  redirectTo?: string;
  children: React.ReactNode;
}

/**
 * Wrap page content with this component to enforce permission checks.
 * - SUPER_ADMIN → always renders children.
 * - INTERNAL_STAFF → renders children only if they have the permission.
 * - Other roles → redirects immediately.
 *
 * @example
 * // In /admin/invoicing/page.tsx
 * export default function InvoicingPage() {
 *   return (
 *     <PermissionGate permission="invoicing">
 *       <InvoicingContent />
 *     </PermissionGate>
 *   );
 * }
 */
export function PermissionGate({ permission, redirectTo = "/admin", children }: PermissionGateProps) {
  const { hasPermission, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  const allowed = hasPermission(permission);

  useEffect(() => {
    if (!loading && isAuthenticated && !allowed) {
      router.replace(redirectTo);
    }
  }, [loading, isAuthenticated, allowed, router, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
      </div>
    );
  }

  if (!allowed) {
    return null; // redirect is in progress
  }

  return <>{children}</>;
}
