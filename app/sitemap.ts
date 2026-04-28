import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://squircle.micr.dev",
      lastModified: new Date("2026-04-28"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
