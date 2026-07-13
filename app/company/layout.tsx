import type { ReactNode } from "react";
import CompanyLayoutClient from "./CompanyLayoutClient";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return <CompanyLayoutClient>{children}</CompanyLayoutClient>;
}
