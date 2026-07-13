"use client";

import { usePathname } from "next/navigation";
import { getSaudiBasePath, withSaudiBase } from "@/app/lib/i18n/saudi-route";

export function useCompanyBasePath() {
  const pathname = usePathname();
  const basePath = getSaudiBasePath(pathname);

  const companyPath = (path: string) => withSaudiBase(path, basePath);

  return { basePath, companyPath };
}
