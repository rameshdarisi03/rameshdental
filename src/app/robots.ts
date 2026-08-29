import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://gaitphysioclinic.com";

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
          "/articles",
          "/articles/*",
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
