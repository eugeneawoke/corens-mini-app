import type { NextConfig } from "next";

const miniAppCsp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors https://web.telegram.org https://*.telegram.org",
  "script-src 'self' 'unsafe-inline' https://telegram.org",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://telegram.org https://*.telegram.org",
  "frame-src https://web.telegram.org https://*.telegram.org"
].join("; ");

const nextConfig: NextConfig = {
  transpilePackages: ["@corens/domain", "@corens/ui"],
  async headers() {
    return [
      {
        // HTML pages — always revalidate so users get the latest deploy
        // Static assets (/_next/static/) are unaffected; Next.js caches them by content hash
        source: "/((?!_next/static|_next/image|favicon).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: miniAppCsp
          },
          {
            key: "Referrer-Policy",
            value: "no-referrer"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN"
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
