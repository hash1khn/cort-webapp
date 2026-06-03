"use client";

import type { ReactNode } from "react";
import { adminEyebrow, adminPageTitle } from "./ui/admin-styles";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function AdminPageHeader({ eyebrow, title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className={adminEyebrow}>{eyebrow}</div>}
        <h1 className={`mt-1 ${adminPageTitle}`}>{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
