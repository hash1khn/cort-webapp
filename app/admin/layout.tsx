import type { ReactNode } from "react";
import { AdminShell } from "./ui/AdminShell";
import { AdminStoreProvider } from "./store/AdminStore";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminStoreProvider>
      <AdminShell>{children}</AdminShell>
    </AdminStoreProvider>
  );
}


