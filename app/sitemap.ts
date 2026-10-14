import type { MetadataRoute } from "next";

const siteUrl = "https://prysm-clean.onrender.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/forum`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9
    },
    {
      url: `${siteUrl}/rencontres`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7
    },
    {
      url: `${siteUrl}/gaydar`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.6
    }
  ];
}
