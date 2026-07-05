"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy magic-link route — redirects to login (credentials are emailed now). */
export default function CompanyTrialLegacyRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/company/login");
  }, [router]);

  return null;
}
