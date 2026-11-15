import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rameshdental.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/book",
          "/book/success",
          "/services",
          "/services/*",
          "/team",
          "/gallery",
          "/articles",
          "/articles/*",
          "/faq",
          "/locate-us",
          "/emergency",
          "/testimonials",
          "/tips",
          "/privacy",
          "/terms",
          "/patienthub",
          "/patienthub/login",
        ],
        disallow: [
          "/dashboard",
          "/dashboard/*",
          "/login",
          "/patienthub/dashboard",
          "/patienthub/appointments",
          "/patienthub/exercises",
          "/patienthub/records",
          "/patienthub/profile",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
