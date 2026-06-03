"use client";

import type { ReactNode } from "react";
import type { PermissionKey, CrudAction } from "../../lib/types/auth-types";
import { AdminCan } from "../../lib/abilities/AdminAbilityProvider";
import type { AdminSubject } from "../../lib/abilities/admin-subjects";
import { PermissionGate } from "./PermissionGate";

type AdminProtectedPageProps = {
  permission: PermissionKey;
  subject: AdminSubject;
  action?: CrudAction;
  redirectTo?: string;
  children: ReactNode;
};

export function AdminProtectedPage({
  permission,
  subject,
  action = "read",
  redirectTo = "/admin",
  children,
}: AdminProtectedPageProps) {
  return (
    <PermissionGate permission={permission} action={action} redirectTo={redirectTo}>
      <AdminCan I="read" a={subject}>
        {children}
      </AdminCan>
    </PermissionGate>
  );
}
