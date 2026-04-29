import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@brilhio/api-client",
    "@brilhio/contracts",
    "@brilhio/design-system",
    "@brilhio/utils",
  ],
};

export default nextConfig;
