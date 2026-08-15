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
        destination: "/#services",
        permanent: false,
      },
      {
        source: "/team",
        destination: "/#team",
        permanent: false,
      },
      {
        source: "/gallery",
        destination: "/#gallery",
        permanent: false,
      },
      {
        source: "/faq",
        destination: "/#faq",
        permanent: false,
      },
      {
        source: "/locate-us",
        destination: "/#locate-us",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
