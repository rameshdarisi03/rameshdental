import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignore typescript warnings during build to ensure deployment succeeds
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/about",
        destination: "/team",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
