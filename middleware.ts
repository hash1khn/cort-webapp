import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const hostname = request.headers.get("host");
    const { pathname } = request.nextUrl;

    // Define domains
    const ADMIN_DOMAIN = "admin.cort.com.pk";
    const PORTAL_DOMAIN = "portal.cort.com.pk";

    // Check if we are on the Admin domain
    if (hostname && hostname.includes(ADMIN_DOMAIN)) {
        // Determine the new URL path
        // We want to serve content from /admin/* without showing /admin in the URL
        // So admin.cort.com.pk/dashboard servers /admin/dashboard

        // If the path already starts with /admin (unlikely if we are hiding it, but possible),
        // we might not need to rewrite, or we might want to handle it.
        // However, usually we rewrite everything that doesn't start with /admin to /admin

        if (!pathname.startsWith("/admin")) {
            return NextResponse.rewrite(new URL(`/admin${pathname}`, request.url));
        }
    }

    // Check if we are on the Portal/Company domain
    if (hostname && hostname.includes(PORTAL_DOMAIN)) {
        // Similar logic for company portal
        if (!pathname.startsWith("/company")) {
            return NextResponse.rewrite(new URL(`/company${pathname}`, request.url));
        }
    }

    // Default behavior: allow request to proceed as is (e.g. for landing page on main domain)
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files with extensions (png, svg, jpg, jpeg, gif, webp)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
