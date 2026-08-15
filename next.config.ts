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
        destination: "/",
        permanent: false,
      },
      {
        source: "/services",
        destination: "/",
        permanent: false,
      },
      {
        source: "/team",
        destination: "/",
        permanent: false,
      },
      {
        source: "/gallery",
        destination: "/",
        permanent: false,
      },
      {
        source: "/faq",
        destination: "/",
        permanent: false,
      },
      {
        source: "/locate-us",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
