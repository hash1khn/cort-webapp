'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Legacy query-param share links redirect to the short path form:
 *   /ride-share?token=…&tripType=…&tripId=…  →  /r/{token}
 */
function LegacyRideShareRedirect() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get('token') ?? '';

    useEffect(() => {
        if (token) {
            router.replace(`/r/${encodeURIComponent(token)}`);
        }
    }, [token, router]);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center text-muted">
                Invalid tracking link.
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center text-muted">
            Opening tracking link…
        </div>
    );
}

export default function RideSharePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center text-muted">
                    Loading…
                </div>
            }
        >
            <LegacyRideShareRedirect />
        </Suspense>
    );
}
