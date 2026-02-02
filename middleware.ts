import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const hostname = request.headers.get("host") || "";
    const { pathname, search } = request.nextUrl;

    // Define domains
    const ADMIN_DOMAIN = "admin.cort.com.pk";
    const PORTAL_DOMAIN = "portal.cort.com.pk";

    // Debugging logs - View these in your Vercel logs or terminal
    const logData = {
        hostname,
        pathname,
        timestamp: new Date().toISOString(),
    };

    // 1. Admin Logic
    if (hostname.includes(ADMIN_DOMAIN)) {
        console.log("DEBUG: Admin Match", logData);

        // Prevent users from accessing /admin directly
        if (pathname.startsWith("/admin")) {
            const newPath = pathname.replace("/admin", "") || "/";
            return NextResponse.redirect(new URL(newPath, request.url));
        }

        const rewriteUrl = new URL(`/admin${pathname}${search}`, request.url);
        console.log(`DEBUG: Rewriting Admin to: ${rewriteUrl.pathname}`);
        return NextResponse.rewrite(rewriteUrl);
    }

    // 2. Portal/Company Logic
    if (hostname.includes(PORTAL_DOMAIN)) {
        console.log("DEBUG: Portal Match", logData);

        // Prevent users from accessing /company directly
        if (pathname.startsWith("/company")) {
            const newPath = pathname.replace("/company", "") || "/";
            return NextResponse.redirect(new URL(newPath, request.url));
        }

        const rewriteUrl = new URL(`/company${pathname}${search}`, request.url);
        console.log(`DEBUG: Rewriting Portal to: ${rewriteUrl.pathname}`);
        return NextResponse.rewrite(rewriteUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};