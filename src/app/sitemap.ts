import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rameshdental.vercel.app";
  const now = new Date();

  // Public Dental Service Slugs (8 active clinic procedures)
  const serviceSlugs = [
    "root-canal-treatment",
    "dental-implants",
    "invisible-aligners",
    "teeth-whitening",
    "pediatric-dentistry",
    "wisdom-tooth-extraction",
    "laser-gum-therapy",
    "crowns-and-bridges",
  ];

  // Public Dental Article Slugs
  const articleSlugs = [
    "root-canal-treatment-myth-vs-reality",
    "dental-implants-vs-bridges-guide",
    "invisible-aligners-vs-traditional-braces",
    "bleeding-gums-causes-and-remedies",
    "wisdom-teeth-when-to-extract",
    "teeth-whitening-safe-effective-options",
    "pediatric-dental-care-milestones",
    "dental-emergencies-what-to-do",
  ];

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/book`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/articles`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/emergency`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/patienthub/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = serviceSlugs.map((slug) => ({
    url: `${baseUrl}/services/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const articleRoutes: MetadataRoute.Sitemap = articleSlugs.map((slug) => ({
    url: `${baseUrl}/articles/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...serviceRoutes, ...articleRoutes];
}
