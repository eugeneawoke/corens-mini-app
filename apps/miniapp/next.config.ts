import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@corens/domain", "@corens/ui"]
};

export default nextConfig;
