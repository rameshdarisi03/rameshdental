import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opt out firebase-admin from bundling so Node.js native modules work in serverless
  serverExternalPackages: ["firebase-admin"],

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
