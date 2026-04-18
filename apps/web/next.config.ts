import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@ritmio/api-client",
    "@ritmio/contracts",
    "@ritmio/design-system",
    "@ritmio/utils",
  ],
};

export default nextConfig;
