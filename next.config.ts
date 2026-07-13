import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Disable the X-Powered-By header for security
  poweredByHeader: false,

  // Enable React strict mode for catching common bugs
  reactStrictMode: true,

  // Enable gzip compression
  compress: true,

  // Image optimization — add remote patterns if external images are used
  images: {
    formats: ["image/avif", "image/webp"],
    // Add remote patterns when needed, e.g.:
    // remotePatterns: [
    //   { protocol: "https", hostname: "your-cdn.com" },
    // ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
