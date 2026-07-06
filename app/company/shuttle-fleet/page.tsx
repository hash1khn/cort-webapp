"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy path — fleet is unified at /company/fleet */
export default function ShuttleFleetRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const tab = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab")
      : null;
    router.replace(tab ? `/company/fleet?tab=${tab}` : "/company/fleet");
  }, [router]);

  return null;
}
