"use client";

import { useEffect, useRef } from "react";
import { apiClient } from "../services/api-client";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Registers a browser web push subscription when the user is authenticated
 * and unregisters it on logout.
 *
 * @param isAuthenticated - pass `!!user && apiClient.isAuthenticated()`
 */
export function useWebPush(isAuthenticated: boolean) {
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up if user logs out while subscription exists
      if (subscribedRef.current) {
        subscribedRef.current = false;
        apiClient.deleteWebPushSubscription().catch(() => {});
      }
      return;
    }

    if (subscribedRef.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const publicKey = await apiClient.getVapidPublicKey();
        if (!publicKey) return;

        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const existing = await registration.pushManager.getSubscription();
        const sub =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
          }));

        const json = sub.toJSON();
        const keys = json.keys as { p256dh: string; auth: string } | undefined;
        if (!keys?.p256dh || !keys?.auth) return;

        await apiClient.saveWebPushSubscription({
          endpoint: sub.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: navigator.userAgent,
        });

        subscribedRef.current = true;
      } catch (err) {
        console.warn("[WebPush] subscription failed:", err);
      }
    })();
  }, [isAuthenticated]);
}
