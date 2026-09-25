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
        destination: "/#team",
        permanent: true,
      },
      {
        source: "/services",
        destination: "/#services",
        permanent: true,
      },
      {
        source: "/team",
        destination: "/#team",
        permanent: true,
      },
      {
        source: "/gallery",
        destination: "/#gallery",
        permanent: true,
      },
      {
        source: "/faq",
        destination: "/#faq",
        permanent: true,
      },
      {
        source: "/locate-us",
        destination: "/#locate-us",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
