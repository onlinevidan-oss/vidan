import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/checkout", "/account", "/api", "/login"],
    },
    sitemap: "https://www.vidan.mn/sitemap.xml",
    host: "https://www.vidan.mn",
  };
}
