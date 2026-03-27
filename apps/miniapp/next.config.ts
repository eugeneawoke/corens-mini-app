import type { NextConfig } from "next";

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
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
