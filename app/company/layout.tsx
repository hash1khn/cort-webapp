"use client";

import type { ReactNode } from "react";
import { CompanyShell } from "./ui/CompanyShell";
import { CompanyStoreProvider } from "./store/CompanyStore";
import { getCompanyAuth } from "./mockAuth";
import { AdminStoreProvider } from "../admin/store/AdminStore";
import { useEffect, useState } from "react";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    setCompanyId(getCompanyAuth());
  }, []);

  return (
    <AdminStoreProvider>
      <CompanyStoreProvider companyId={companyId}>
        <CompanyShell>{children}</CompanyShell>
      </CompanyStoreProvider>
    </AdminStoreProvider>
  );
}

